package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
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
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/types"
	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

const imageJobRecorderKey = "image_job_recorder"

type jobAPIResponse struct {
	Code    int    `json:"code"`
	Msg     string `json:"msg"`
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
}

type createJobRequest struct {
	Input json.RawMessage `json:"input"`
}

type createJobData struct {
	TaskID string `json:"taskId"`
}

type jobRecordData struct {
	TaskID          string `json:"taskId"`
	Model           string `json:"model"`
	State           string `json:"state"`
	Param           string `json:"param"`
	ResultJSON      string `json:"resultJson"`
	FailCode        string `json:"failCode"`
	FailMsg         string `json:"failMsg"`
	CostTime        int64  `json:"costTime"`
	CompleteTime    int64  `json:"completeTime"`
	CreateTime      int64  `json:"createTime"`
	UpdateTime      int64  `json:"updateTime"`
	Progress        int    `json:"progress"`
	CreditsConsumed int    `json:"creditsConsumed"`
}

func CreateJobTask(c *gin.Context) {
	imageReq, inputBody, param, err := parseCreateJobRequest(c)
	if err != nil {
		respondJobError(c, http.StatusBadRequest, err.Error())
		return
	}

	if imageReq.IsStream(c) {
		respondJobError(c, http.StatusBadRequest, "jobs image generation does not support stream=true")
		return
	}

	c.Set("relay_mode", relayconstant.RelayModeImagesGenerations)
	relayInfo, err := relaycommon.GenRelayInfo(c, types.RelayFormatOpenAIImage, imageReq, nil)
	if err != nil {
		respondJobError(c, http.StatusInternalServerError, err.Error())
		return
	}
	relayInfo.RequestURLPath = constant.TaskImageGenerationRelayPath
	relayInfo.ForcePreConsume = true
	relayInfo.InitChannelMeta(c)

	newAPIError := prepareImageJobBilling(c, relayInfo, imageReq)
	if newAPIError != nil {
		respondJobError(c, newAPIError.StatusCode, newAPIError.Error())
		return
	}

	task := newImageJobTask(relayInfo, imageReq.Model, param)
	if err = task.Insert(); err != nil {
		if relayInfo.Billing != nil {
			relayInfo.Billing.Refund(c)
		}
		respondJobError(c, http.StatusInternalServerError, err.Error())
		return
	}

	bgCtx := cloneImageJobContext(c, inputBody)
	gopool.Go(func() {
		runImageJobTask(bgCtx, relayInfo, task, inputBody)
	})

	respondJobSuccess(c, createJobData{TaskID: task.TaskID})
}

func GetJobRecordInfo(c *gin.Context) {
	taskID := strings.TrimSpace(c.Query("taskId"))
	if taskID == "" {
		respondJobError(c, http.StatusBadRequest, "taskId is required")
		return
	}

	task, exists, err := model.GetByTaskId(c.GetInt("id"), taskID)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("failed to query job task %s: %s", taskID, err.Error()))
		respondJobError(c, http.StatusInternalServerError, "failed to query task")
		return
	}
	if !exists || task == nil || task.Platform != constant.TaskPlatformImage {
		respondJobError(c, http.StatusNotFound, "task not found")
		return
	}

	respondJobSuccess(c, buildJobRecordData(task))
}

func parseCreateJobRequest(c *gin.Context) (*dto.ImageRequest, []byte, string, error) {
	var createReq createJobRequest
	if err := common.UnmarshalBodyReusable(c, &createReq); err != nil {
		return nil, nil, "", err
	}

	inputBody := bytes.TrimSpace(createReq.Input)
	if len(inputBody) == 0 || common.GetJsonType(inputBody) != "object" {
		return nil, nil, "", fmt.Errorf("input object is required")
	}

	imageReq := &dto.ImageRequest{}
	if err := common.Unmarshal(inputBody, imageReq); err != nil {
		return nil, nil, "", fmt.Errorf("invalid input: %w", err)
	}
	if err := normalizeJobImageRequest(imageReq); err != nil {
		return nil, nil, "", err
	}

	paramBytes, err := common.Marshal(map[string]any{
		"model": imageReq.Model,
		"input": json.RawMessage(inputBody),
	})
	if err != nil {
		return nil, nil, "", err
	}

	return imageReq, inputBody, string(paramBytes), nil
}

func normalizeJobImageRequest(imageReq *dto.ImageRequest) error {
	if strings.TrimSpace(imageReq.Model) == "" {
		return fmt.Errorf("input.model is required")
	}
	if strings.Contains(imageReq.Size, "×") {
		return fmt.Errorf("size an unexpected error occurred in the parameter, please use 'x' instead of the multiplication sign '×'")
	}
	if imageReq.N != nil && *imageReq.N > dto.MaxImageN {
		return fmt.Errorf("n must be an integer between 1 and %d", dto.MaxImageN)
	}

	switch imageReq.Model {
	case "dall-e-2", "dall-e":
		if imageReq.Size != "" && imageReq.Size != "256x256" && imageReq.Size != "512x512" && imageReq.Size != "1024x1024" {
			return fmt.Errorf("size must be one of 256x256, 512x512, or 1024x1024 for dall-e-2 or dall-e")
		}
		if imageReq.Size == "" {
			imageReq.Size = "1024x1024"
		}
	case "dall-e-3":
		if imageReq.Size != "" && imageReq.Size != "1024x1024" && imageReq.Size != "1024x1792" && imageReq.Size != "1792x1024" {
			return fmt.Errorf("size must be one of 1024x1024, 1024x1792 or 1792x1024 for dall-e-3")
		}
		if imageReq.Quality == "" {
			imageReq.Quality = "standard"
		}
		if imageReq.Size == "" {
			imageReq.Size = "1024x1024"
		}
	case "gpt-image-1":
		if imageReq.Quality == "" {
			imageReq.Quality = "auto"
		}
	}

	if imageReq.N == nil || *imageReq.N == 0 {
		imageReq.N = common.GetPointer(uint(1))
	}
	return nil
}

func prepareImageJobBilling(c *gin.Context, relayInfo *relaycommon.RelayInfo, imageReq *dto.ImageRequest) *types.NewAPIError {
	needSensitiveCheck := setting.ShouldCheckPromptSensitive()
	needCountToken := constant.CountToken
	var meta *types.TokenCountMeta
	if needSensitiveCheck || needCountToken {
		meta = imageReq.GetTokenCountMeta()
	} else {
		meta = fastTokenCountMetaForPricing(imageReq)
	}

	if needSensitiveCheck && meta != nil {
		contains, words := service.CheckSensitiveText(meta.CombineText)
		if contains {
			logger.LogWarn(c, fmt.Sprintf("user sensitive words detected: %s", strings.Join(words, ", ")))
			return types.NewError(fmt.Errorf("sensitive words detected"), types.ErrorCodeSensitiveWordsDetected)
		}
	}

	tokens, err := service.EstimateRequestToken(c, meta, relayInfo)
	if err != nil {
		return types.NewError(err, types.ErrorCodeCountTokenFailed)
	}
	relayInfo.SetEstimatePromptTokens(tokens)

	priceData, err := helper.ModelPriceHelper(c, relayInfo, tokens, meta)
	if err != nil {
		return types.NewError(err, types.ErrorCodeModelPriceError, types.ErrOptionWithStatusCode(http.StatusBadRequest))
	}
	if priceData.FreeModel {
		logger.LogInfo(c, fmt.Sprintf("模型 %s 免费，跳过预扣费", relayInfo.OriginModelName))
		return nil
	}
	return service.PreConsumeBilling(c, priceData.QuotaToPreConsume, relayInfo)
}

func newImageJobTask(info *relaycommon.RelayInfo, modelName string, param string) *model.Task {
	now := time.Now().Unix()
	task := model.InitTask(constant.TaskPlatformImage, info)
	task.CreatedAt = now
	task.UpdatedAt = now
	task.SubmitTime = now
	task.Status = model.TaskStatusQueued
	task.Progress = "0%"
	task.Action = constant.TaskActionImageGeneration
	task.Quota = info.FinalPreConsumedQuota
	task.Properties.Input = param
	task.Properties.OriginModelName = modelName
	task.PrivateData.BillingSource = info.BillingSource
	task.PrivateData.SubscriptionId = info.SubscriptionId
	task.PrivateData.TokenId = info.TokenId
	task.PrivateData.NodeName = common.NodeName
	task.PrivateData.BillingContext = &model.TaskBillingContext{
		ModelPrice:      info.PriceData.ModelPrice,
		GroupRatio:      info.PriceData.GroupRatioInfo.GroupRatio,
		ModelRatio:      info.PriceData.ModelRatio,
		OtherRatios:     info.PriceData.OtherRatios,
		OriginModelName: modelName,
		PerCallBilling:  info.PriceData.UsePrice,
	}
	return task
}

func cloneImageJobContext(c *gin.Context, requestBody []byte) *gin.Context {
	recorder := httptest.NewRecorder()
	bgCtx, _ := gin.CreateTestContext(recorder)
	bgCtx.Request = c.Request.Clone(context.Background())
	bgCtx.Request.Body = io.NopCloser(bytes.NewReader(requestBody))
	bgCtx.Request.ContentLength = int64(len(requestBody))
	bgCtx.Request.URL.Path = constant.TaskImageGenerationRelayPath
	bgCtx.Request.URL.RawPath = ""
	bgCtx.Request.RequestURI = constant.TaskImageGenerationRelayPath
	bgCtx.Params = append(gin.Params(nil), c.Params...)
	bgCtx.Set(imageJobRecorderKey, recorder)

	for k, v := range c.Keys {
		if k == common.KeyBodyStorage || k == common.KeyRequestBody {
			continue
		}
		bgCtx.Set(k, v)
	}
	return bgCtx
}

func runImageJobTask(c *gin.Context, info *relaycommon.RelayInfo, task *model.Task, requestBody []byte) {
	defer common.CleanupBodyStorage(c)

	if !markImageJobTaskRunning(c, task) {
		if info.Billing != nil {
			info.Billing.Refund(c)
		}
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
		markImageJobTaskFailed(c, task, newAPIError.Error())
		return
	}

	responseBody := imageJobRecorderBody(c)
	markImageJobTaskSucceeded(c, info, task, responseBody)
}

func markImageJobTaskRunning(c *gin.Context, task *model.Task) bool {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusInProgress
	task.Progress = "45%"
	task.StartTime = now
	task.UpdatedAt = now
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("job task %s start update failed: %s", task.TaskID, err.Error()))
		return false
	}
	return won
}

func markImageJobTaskSucceeded(c *gin.Context, info *relaycommon.RelayInfo, task *model.Task, responseBody []byte) {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusSuccess
	task.Progress = "100%"
	task.FinishTime = now
	task.UpdatedAt = now
	task.Properties.UpstreamModelName = info.UpstreamModelName
	if len(responseBody) > 0 {
		task.Data = responseBody
	}
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("job task %s success update failed: %s", task.TaskID, err.Error()))
		return
	}
	if !won {
		logger.LogWarn(c, fmt.Sprintf("job task %s already transitioned before success", task.TaskID))
	}
}

func markImageJobTaskFailed(c *gin.Context, task *model.Task, reason string) {
	oldStatus := task.Status
	now := time.Now().Unix()
	task.Status = model.TaskStatusFailure
	task.Progress = "100%"
	task.FailReason = reason
	task.FinishTime = now
	task.UpdatedAt = now
	won, err := task.UpdateWithStatus(oldStatus)
	if err != nil {
		logger.LogError(c, fmt.Sprintf("job task %s failure update failed: %s", task.TaskID, err.Error()))
		return
	}
	if !won {
		logger.LogWarn(c, fmt.Sprintf("job task %s already transitioned before failure", task.TaskID))
	}
}

func imageJobRecorderBody(c *gin.Context) []byte {
	v, exists := c.Get(imageJobRecorderKey)
	if !exists {
		return nil
	}
	recorder, ok := v.(*httptest.ResponseRecorder)
	if !ok || recorder.Body == nil {
		return nil
	}
	return recorder.Body.Bytes()
}

func buildJobRecordData(task *model.Task) jobRecordData {
	data := jobRecordData{
		TaskID:          task.TaskID,
		Model:           task.Properties.OriginModelName,
		State:           jobTaskState(task.Status),
		Param:           task.Properties.Input,
		ResultJSON:      jobTaskResultJSON(task),
		CostTime:        jobTaskCostTime(task),
		CompleteTime:    unixSecondsToMillis(task.FinishTime),
		CreateTime:      unixSecondsToMillis(firstNonZeroTimestamp(task.CreatedAt, task.SubmitTime)),
		UpdateTime:      unixSecondsToMillis(task.UpdatedAt),
		Progress:        jobTaskProgress(task),
		CreditsConsumed: task.Quota,
	}
	if task.Status == model.TaskStatusFailure {
		data.FailCode = "task_failed"
		data.FailMsg = task.FailReason
	}
	return data
}

func jobTaskState(status model.TaskStatus) string {
	switch status {
	case model.TaskStatusSuccess:
		return "success"
	case model.TaskStatusFailure:
		return "fail"
	case model.TaskStatusInProgress:
		return "running"
	default:
		return "waiting"
	}
}

func jobTaskResultJSON(task *model.Task) string {
	if task.Status != model.TaskStatusSuccess || len(task.Data) == 0 {
		return ""
	}
	var imageResp dto.ImageResponse
	if err := common.Unmarshal(task.Data, &imageResp); err == nil && len(imageResp.Metadata) > 0 {
		return string(imageResp.Metadata)
	}
	return string(task.Data)
}

func jobTaskCostTime(task *model.Task) int64 {
	if task.StartTime > 0 && task.FinishTime > 0 && task.FinishTime >= task.StartTime {
		return (task.FinishTime - task.StartTime) * 1000
	}
	if task.CreatedAt > 0 && task.UpdatedAt > 0 && task.UpdatedAt >= task.CreatedAt {
		return (task.UpdatedAt - task.CreatedAt) * 1000
	}
	return 0
}

func jobTaskProgress(task *model.Task) int {
	progress := strings.TrimSpace(strings.TrimSuffix(task.Progress, "%"))
	if progress != "" {
		if value, err := strconv.Atoi(progress); err == nil && value >= 0 {
			if value > 100 {
				return 100
			}
			return value
		}
	}
	if task.Status == model.TaskStatusSuccess || task.Status == model.TaskStatusFailure {
		return 100
	}
	if task.Status == model.TaskStatusInProgress {
		return 45
	}
	return 0
}

func unixSecondsToMillis(value int64) int64 {
	if value <= 0 {
		return 0
	}
	return value * 1000
}

func firstNonZeroTimestamp(values ...int64) int64 {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}

func respondJobSuccess(c *gin.Context, data any) {
	c.JSON(http.StatusOK, jobAPIResponse{
		Code:    http.StatusOK,
		Msg:     "success",
		Success: true,
		Data:    data,
	})
}

func respondJobError(c *gin.Context, statusCode int, message string) {
	if statusCode < http.StatusBadRequest {
		statusCode = http.StatusBadRequest
	}
	c.JSON(statusCode, jobAPIResponse{
		Code:    statusCode,
		Msg:     message,
		Success: false,
	})
}
