package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newMappedOpenAITestContext(body string, isStream bool) (*gin.Context, *httptest.ResponseRecorder, *http.Response, *relaycommon.RelayInfo) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}
	if isStream {
		resp.Header.Set("Content-Type", "text/event-stream")
	}

	info := &relaycommon.RelayInfo{
		IsStream:           isStream,
		RelayMode:          relayconstant.RelayModeChatCompletions,
		RelayFormat:        types.RelayFormatOpenAI,
		OriginModelName:    "public-model",
		ShouldIncludeUsage: true,
		DisablePing:        true,
		ChannelMeta: &relaycommon.ChannelMeta{
			IsModelMapped:     true,
			UpstreamModelName: "internal-model",
		},
	}
	return c, recorder, resp, info
}

func TestOpenaiHandlerRewritesMappedResponseModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	body := `{"id":"chatcmpl_1","object":"chat.completion","created":1710000000,"model":"internal-model","choices":[{"index":0,"message":{"role":"assistant","content":"hi"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2},"cost":"0"}`
	c, recorder, resp, info := newMappedOpenAITestContext(body, false)

	usage, err := OpenaiHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)

	var got map[string]interface{}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &got))
	assert.Equal(t, "internal-model", got["model"])
	assert.Equal(t, "v3", got["version"])
	assert.Equal(t, "0", got["cost"])
}

func TestOaiStreamHandlerRewritesMappedResponseModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	body := strings.Join([]string{
		`data: {"id":"chatcmpl_1","object":"chat.completion.chunk","created":1710000000,"model":"internal-model","choices":[{"index":0,"delta":{"content":"hi"},"finish_reason":null}]}`,
		`data: {"id":"chatcmpl_1","object":"chat.completion.chunk","created":1710000000,"model":"internal-model","choices":[],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`,
		`data: [DONE]`,
		``,
	}, "\n")
	c, recorder, resp, info := newMappedOpenAITestContext(body, true)

	usage, err := OaiStreamHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)

	got := recorder.Body.String()
	assert.Contains(t, got, `"model":"internal-model"`)
	assert.Contains(t, got, `"version":"v3"`)
	assert.NotContains(t, got, "public-model")

	var finalUsage dto.ChatCompletionsStreamResponse
	lines := strings.Split(got, "\n")
	for _, line := range lines {
		data := strings.TrimPrefix(line, "data: ")
		if !strings.Contains(data, `"usage"`) {
			continue
		}
		require.NoError(t, common.UnmarshalJsonStr(data, &finalUsage))
		break
	}
	assert.Equal(t, "internal-model", finalUsage.Model)
	assert.Equal(t, "v3", finalUsage.Version)
}

func TestOaiStreamHandlerKeepsModelWhenLastEventHasNoModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	body := strings.Join([]string{
		`data: {"id":"chatcmpl_1","object":"chat.completion.chunk","created":1710000000,"model":"deepseek-v4-flash-free","choices":[{"index":0,"delta":{"content":"hi"},"finish_reason":null}],"usage":null}`,
		`data: {"choices":[],"x-opencode-type":"inference-cost","cost":"0.00000000","normalizedUsage":{"inputTokens":1,"outputTokens":1}}`,
		`data: [DONE]`,
		``,
	}, "\n")
	c, recorder, resp, info := newMappedOpenAITestContext(body, true)
	info.OriginModelName = "deepseek-v4-flash-free"
	info.ChannelMeta.IsModelMapped = false
	info.ChannelMeta.UpstreamModelName = "deepseek-v4-flash-free"

	usage, err := OaiStreamHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)

	got := recorder.Body.String()
	assert.NotContains(t, got, `"model":""`)
	assert.Contains(t, got, `"model":"deepseek-v4-flash-free"`)
}

func TestOaiResponsesToChatStreamHandlerRewritesMappedResponseModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	body := strings.Join([]string{
		`data: {"type":"response.created","response":{"id":"resp_1","model":"internal-model","created_at":1710000000}}`,
		`data: {"type":"response.output_text.delta","delta":"hi"}`,
		`data: {"type":"response.done","response":{"model":"internal-model","status":"completed","usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}`,
		`data: [DONE]`,
		``,
	}, "\n")
	c, recorder, resp, info := newMappedOpenAITestContext(body, true)

	usage, err := OaiResponsesToChatStreamHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)

	got := recorder.Body.String()
	assert.Contains(t, got, `"model":"internal-model"`)
	assert.Contains(t, got, `"version":"v3"`)
	assert.NotContains(t, got, "public-model")
}
