package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestShouldUseAsyncImageRequiresExplicitOptIn(t *testing.T) {
	gin.SetMode(gin.TestMode)

	imageRequest := &dto.ImageRequest{Model: "dall-e-3", Prompt: "a small cabin"}

	t.Run("query flag", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations?async=true", nil)

		assert.True(t, shouldUseAsyncImage(c, types.RelayFormatOpenAIImage, imageRequest))
	})

	t.Run("prefer header", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
		c.Request.Header.Set("Prefer", "respond-async")

		assert.True(t, shouldUseAsyncImage(c, types.RelayFormatOpenAIImage, imageRequest))
	})

	t.Run("default sync", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

		assert.False(t, shouldUseAsyncImage(c, types.RelayFormatOpenAIImage, imageRequest))
	})

	t.Run("other image route stays sync", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/edits?async=true", nil)

		assert.False(t, shouldUseAsyncImage(c, types.RelayFormatOpenAIImage, imageRequest))
	})
}

func TestBuildAsyncImageTaskResponseSuccess(t *testing.T) {
	imageBody, err := common.Marshal(dto.ImageResponse{
		Created: 123,
		Data: []dto.ImageData{
			{Url: "https://example.test/image.png", RevisedPrompt: "a refined prompt"},
		},
	})
	require.NoError(t, err)

	task := &model.Task{
		TaskID:     "task_test",
		CreatedAt:  100,
		UpdatedAt:  200,
		SubmitTime: 100,
		Status:     model.TaskStatusSuccess,
		Progress:   "100%",
		Properties: model.Properties{OriginModelName: "dall-e-3"},
		Data:       json.RawMessage(imageBody),
	}

	resp := buildAsyncImageTaskResponse(task)

	require.NotNil(t, resp)
	assert.Equal(t, "task_test", resp.ID)
	assert.Equal(t, "image.generation.task", resp.Object)
	assert.Equal(t, "succeeded", resp.Status)
	assert.Equal(t, "dall-e-3", resp.Model)
	require.Len(t, resp.Data, 1)
	assert.Equal(t, "https://example.test/image.png", resp.Data[0].Url)
	assert.Nil(t, resp.Error)
}

func TestBuildAsyncImageTaskResponseFailure(t *testing.T) {
	task := &model.Task{
		TaskID:     "task_failed",
		SubmitTime: 100,
		Status:     model.TaskStatusFailure,
		Progress:   "100%",
		FailReason: "upstream failed",
	}

	resp := buildAsyncImageTaskResponse(task)

	require.NotNil(t, resp)
	assert.Equal(t, "failed", resp.Status)
	require.NotNil(t, resp.Error)
	assert.Equal(t, "upstream failed", resp.Error.Message)
	assert.Equal(t, "task_failed", resp.Error.Code)
}
