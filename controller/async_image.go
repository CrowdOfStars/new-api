package controller

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"
	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

const (
	asyncImageContextKey  = "async_image_generation"
	asyncImageRecorderKey = "async_image_recorder"
)

func shouldUseAsyncImage(c *gin.Context, relayFormat types.RelayFormat, request dto.Request) bool {
	if relayFormat != types.RelayFormatOpenAIImage {
		return false
	}
	if relayconstant.Path2RelayMode(c.Request.URL.Path) != relayconstant.RelayModeImagesGenerations {
		return false
	}
	if _, ok := request.(*dto.ImageRequest); !ok {
		return false
	}

	if asyncFlagValue(c.Query("async")) || asyncFlagValue(c.GetHeader("X-New-Api-Async")) {
		return true
	}
	return strings.Contains(strings.ToLower(c.GetHeader("Prefer")), "respond-async")
}

func asyncFlagValue(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func maybeStartAsyncImageTask(c *gin.Context, info *relaycommon.RelayInfo) (bool, *types.NewAPIError) {
	if !c.GetBool(asyncImageContextKey) {
		return false, nil
	}

	info.InitChannelMeta(c)

	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return true, types.NewErrorWithStatusCode(err, types.ErrorCodeReadRequestBodyFailed, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}
	requestBody, err := storage.Bytes()
	if err != nil {
		return true, types.NewErrorWithStatusCode(err, types.ErrorCodeReadRequestBodyFailed, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}
	if _, err = storage.Seek(0, io.SeekStart); err == nil {
		c.Request.Body = io.NopCloser(storage)
	}

	task := newAsyncImageTask(info)
	if err = task.Insert(); err != nil {
		return true, types.NewError(err, types.ErrorCodeUpdateDataError, types.ErrOptionWithSkipRetry())
	}

	bgCtx := cloneAsyncImageContext(c, requestBody)
	gopool.Go(func() {
		runAsyncImageTask(bgCtx, info, task, requestBody)
	})

	c.Header("Location", fmt.Sprintf("/v1/images/generations/%s", task.TaskID))
	c.JSON(http.StatusAccepted, buildAsyncImageTaskResponse(task))
	return true, nil
}

func newAsyncImageTask(info *relaycommon.RelayInfo) *model.Task {
	now := time.Now().Unix()
	task := model.InitTask(constant.TaskPlatformImage, info)
	task.CreatedAt = now
	task.UpdatedAt = now
	task.SubmitTime = now
	task.Status = model.TaskStatusQueued
	task.Progress = "20%"
	task.Action = constant.TaskActionImageGeneration
	task.Quota = info.FinalPreConsumedQuota
	task.PrivateData.BillingSource = info.BillingSource
	task.PrivateData.SubscriptionId = info.SubscriptionId
	task.PrivateData.TokenId = info.TokenId
	task.PrivateData.BillingContext = &model.TaskBillingContext{
		ModelPrice:      info.PriceData.ModelPrice,
		GroupRatio:      info.PriceData.GroupRatioInfo.GroupRatio,
		ModelRatio:      info.PriceData.ModelRatio,
		OtherRatios:     info.PriceData.OtherRatios,
		OriginModelName: info.OriginModelName,
		PerCallBilling:  info.PriceData.UsePrice,
	}
	task.SetData(map[string]any{
		"status": "queued",
	})
	return task
}

func cloneAsyncImageContext(c *gin.Context, requestBody []byte) *gin.Context {
	recorder := httptest.NewRecorder()
	bgCtx, _ := gin.CreateTestContext(recorder)
	bgCtx.Request = c.Request.Clone(context.Background())
	bgCtx.Request.Body = io.NopCloser(bytes.NewReader(requestBody))
	bgCtx.Request.ContentLength = int64(len(requestBody))
	bgCtx.Params = append(gin.Params(nil), c.Params...)
	bgCtx.Set(asyncImageRecorderKey, recorder)

	for k, v := range c.Keys {
		if k == common.KeyBodyStorage || k == common.KeyRequestBody {
			continue
		}
		bgCtx.Set(k, v)
	}
	return bgCtx
}

func runAsyncImageTask(c *gin.Context, info *relaycommon.RelayInfo, task *model.Task, requestBody []byte) {
	defer common.CleanupBodyStorage(c)

	if !markAsyncImageTaskRunning(c, task) {
		return
	}

	c.Request.Body = io.NopCloser(bytes.NewReader(requestBody))
	c.Request.ContentLength = int64(len(requestBody))
	newAPIError := relay.ImageHelper(c, info)
	if newAPIError != nil {
		newAPIError = service.NormalizeViolationFeeError(newAPIError)
		if info.Billing != nil {
			info.Billing.Refund(c)
		}
		service.ChargeViolationFeeIfNeeded(c, info, newAPIError)
		markAsyncImageTaskFailed(c, task, newAPIError.Error())
		return
	}

	responseBody := asyncImageRecorderBody(c)
	markAsyncImageTaskSucceeded(c, info, task, responseBody)
}

func markAsyncImageTaskRunning(c *gin.Context, task *model.Task) bool {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusInProgress
	task.Progress = "30%"
	task.StartTime = now
	task.UpdatedAt = now
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("async image task %s start update failed: %s", task.TaskID, err.Error()))
		return false
	}
	if !won {
		logger.LogWarn(c, fmt.Sprintf("async image task %s already transitioned before start", task.TaskID))
		return false
	}
	return true
}

func markAsyncImageTaskSucceeded(c *gin.Context, info *relaycommon.RelayInfo, task *model.Task, responseBody []byte) {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	task.FinishTime = now
	task.UpdatedAt = now
	task.Properties.UpstreamModelName = info.UpstreamModelName
	task.Properties.OriginModelName = info.OriginModelName
	if len(responseBody) > 0 {
		task.Data = responseBody
	}
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("async image task %s success update failed: %s", task.TaskID, err.Error()))
		return
	}
	if !won {
		logger.LogWarn(c, fmt.Sprintf("async image task %s already transitioned before success", task.TaskID))
	}
}

func markAsyncImageTaskFailed(c *gin.Context, task *model.Task, reason string) {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusFailure
	task.Progress = "100%"
	task.FailReason = reason
	task.FinishTime = now
	task.UpdatedAt = now
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("async image task %s failure update failed: %s", task.TaskID, err.Error()))
		return
	}
	if !won {
		logger.LogWarn(c, fmt.Sprintf("async image task %s already transitioned before failure", task.TaskID))
	}
}

func asyncImageRecorderBody(c *gin.Context) []byte {
	v, exists := c.Get(asyncImageRecorderKey)
	if !exists {
		return nil
	}
	recorder, ok := v.(*httptest.ResponseRecorder)
	if !ok || recorder.Body == nil {
		return nil
	}
	return recorder.Body.Bytes()
}

func RelayImageTaskFetch(c *gin.Context) {
	taskID := c.Param("task_id")
	if strings.TrimSpace(taskID) == "" {
		respondOpenAIImageTaskError(c, http.StatusBadRequest, "task_id is required", "invalid_request_error", "invalid_task_id")
		return
	}

	task, exists, err := model.GetByTaskId(c.GetInt("id"), taskID)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("failed to query async image task %s: %s", taskID, err.Error()))
		respondOpenAIImageTaskError(c, http.StatusInternalServerError, "failed to query task", "server_error", "query_task_failed")
		return
	}
	if !exists || task == nil || task.Platform != constant.TaskPlatformImage {
		respondOpenAIImageTaskError(c, http.StatusNotFound, "task not found", "invalid_request_error", "task_not_found")
		return
	}

	c.JSON(http.StatusOK, buildAsyncImageTaskResponse(task))
}

func respondOpenAIImageTaskError(c *gin.Context, statusCode int, message string, typ string, code string) {
	c.JSON(statusCode, gin.H{
		"error": types.OpenAIError{
			Message: message,
			Type:    typ,
			Code:    code,
		},
	})
}

func buildAsyncImageTaskResponse(task *model.Task) *dto.AsyncImageTaskResponse {
	created := task.CreatedAt
	if created == 0 {
		created = task.SubmitTime
	}

	resp := &dto.AsyncImageTaskResponse{
		ID:        task.TaskID,
		TaskID:    task.TaskID,
		Object:    "image.generation.task",
		Created:   created,
		UpdatedAt: task.UpdatedAt,
		Status:    asyncImageTaskStatus(task.Status),
		Progress:  task.Progress,
		Model:     task.Properties.OriginModelName,
	}

	switch task.Status {
	case model.TaskStatusSuccess:
		var imageResp dto.ImageResponse
		if len(task.Data) > 0 && common.Unmarshal(task.Data, &imageResp) == nil {
			resp.Data = imageResp.Data
			resp.Metadata = imageResp.Metadata
		}
	case model.TaskStatusFailure:
		resp.Error = &dto.AsyncImageTaskError{
			Message: task.FailReason,
			Type:    "image_generation_failed",
			Code:    "task_failed",
		}
	}

	return resp
}

func asyncImageTaskStatus(status model.TaskStatus) string {
	switch status {
	case model.TaskStatusNotStart, model.TaskStatusSubmitted, model.TaskStatusQueued:
		return "queued"
	case model.TaskStatusInProgress:
		return "in_progress"
	case model.TaskStatusSuccess:
		return "succeeded"
	case model.TaskStatusFailure:
		return "failed"
	default:
		return "unknown"
	}
}
