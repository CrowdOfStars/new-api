package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseCreateJobRequestUsesNestedInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := `{"input":{"model":"gpt-image-2","prompt":"A rainy neon street","size":"1024x1024","n":1,"return_base64":true}}`
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/jobs/createTask", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	imageReq, inputBody, param, err := parseCreateJobRequest(c)

	require.NoError(t, err)
	require.NotNil(t, imageReq)
	assert.Equal(t, "gpt-image-2", imageReq.Model)
	assert.Equal(t, "A rainy neon street", imageReq.Prompt)
	require.NotNil(t, imageReq.ReturnBase64)
	assert.True(t, *imageReq.ReturnBase64)
	assert.JSONEq(t, `{"model":"gpt-image-2","prompt":"A rainy neon street","size":"1024x1024","n":1,"return_base64":true}`, string(inputBody))
	assert.JSONEq(t, `{"model":"gpt-image-2","input":{"model":"gpt-image-2","prompt":"A rainy neon street","size":"1024x1024","n":1,"return_base64":true}}`, param)
}

func TestParseCreateJobRequestRejectsTooManyImages(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := `{"input":{"model":"gpt-image-2","prompt":"A rainy neon street","n":129}}`
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/jobs/createTask", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	_, _, _, err := parseCreateJobRequest(c)

	require.EqualError(t, err, "n must be an integer between 1 and 128")
}

func TestCloneImageJobContextUsesImageRelayPath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/jobs/createTask", strings.NewReader(`{"input":{}}`))

	bgCtx := cloneImageJobContext(c, []byte(`{"model":"gpt-image-2"}`))

	require.NotNil(t, bgCtx.Request)
	assert.Equal(t, constant.TaskImageGenerationRelayPath, bgCtx.Request.URL.Path)
	assert.Equal(t, constant.TaskImageGenerationRelayPath, bgCtx.Request.RequestURI)
}

func TestBuildJobRecordDataSuccessPrefersRawMetadata(t *testing.T) {
	metadata := json.RawMessage(`{"resultUrls":["https://example.com/generated-content.jpg"]}`)
	imageBody, err := common.Marshal(dto.ImageResponse{
		Created: 123,
		Data: []dto.ImageData{
			{Url: "https://example.com/generated-content.jpg"},
		},
		Metadata: metadata,
	})
	require.NoError(t, err)

	task := &model.Task{
		TaskID:     "task_12345678",
		CreatedAt:  1698765400,
		UpdatedAt:  1698765415,
		SubmitTime: 1698765400,
		StartTime:  1698765400,
		FinishTime: 1698765415,
		Status:     model.TaskStatusSuccess,
		Progress:   "100%",
		Quota:      50,
		Properties: model.Properties{
			Input:           `{"model":"gpt-image-2","input":{"prompt":"movie portrait"}}`,
			OriginModelName: "gpt-image-2",
		},
		Data: json.RawMessage(imageBody),
	}

	data := buildJobRecordData(task)

	assert.Equal(t, "task_12345678", data.TaskID)
	assert.Equal(t, "gpt-image-2", data.Model)
	assert.Equal(t, "success", data.State)
	assert.JSONEq(t, `{"model":"gpt-image-2","input":{"prompt":"movie portrait"}}`, data.Param)
	assert.JSONEq(t, `{"resultUrls":["https://example.com/generated-content.jpg"]}`, data.ResultJSON)
	assert.Equal(t, int64(15000), data.CostTime)
	assert.Equal(t, int64(1698765400000), data.CreateTime)
	assert.Equal(t, int64(1698765415000), data.CompleteTime)
	assert.Equal(t, 100, data.Progress)
	assert.Equal(t, 50, data.CreditsConsumed)
}

func TestBuildJobRecordDataFailure(t *testing.T) {
	task := &model.Task{
		TaskID:     "task_failed",
		SubmitTime: 100,
		Status:     model.TaskStatusFailure,
		Progress:   "100%",
		FailReason: "upstream failed",
	}

	data := buildJobRecordData(task)

	assert.Equal(t, "fail", data.State)
	assert.Equal(t, "task_failed", data.FailCode)
	assert.Equal(t, "upstream failed", data.FailMsg)
	assert.Equal(t, 100, data.Progress)
}
