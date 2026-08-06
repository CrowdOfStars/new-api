package helper

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testMappedSource = "deepseek-v4-pro"
	testMappedTarget = "cline-pass/deepseek-v4-pro"
)

func setupModelMappedResponseTest(t *testing.T, isStream bool) (*gin.Context, *httptest.ResponseRecorder, func() error) {
	t.Helper()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	finish := WrapModelMappedResponseWriter(c)
	c.Set("model_mapping", `{"deepseek-v4-pro":"cline-pass/deepseek-v4-pro"}`)

	info := &relaycommon.RelayInfo{
		OriginModelName: testMappedSource,
		IsStream:        isStream,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: testMappedSource,
		},
	}
	require.NoError(t, ModelMappedHelper(c, info, nil))
	require.Equal(t, testMappedTarget, info.UpstreamModelName)
	return c, recorder, finish
}

func TestModelMappedResponseWriterReplacesNonStreamResponse(t *testing.T) {
	c, recorder, finish := setupModelMappedResponseTest(t, false)
	c.Header("Content-Type", "application/json")
	c.Header("Content-Length", "999")

	_, err := c.Writer.Write([]byte(`{"model":"cline-pass/deep`))
	require.NoError(t, err)
	_, err = c.Writer.Write([]byte(`seek-v4-pro","detail":"cline-pass/deepseek-v4-pro"}`))
	require.NoError(t, err)
	require.NoError(t, finish())

	assert.JSONEq(t, `{"model":"deepseek-v4-pro","detail":"deepseek-v4-pro"}`, recorder.Body.String())
	assert.Empty(t, recorder.Header().Get("Content-Length"))
}

func TestModelMappedResponseWriterReplacesAcrossStreamWindowBoundary(t *testing.T) {
	c, recorder, finish := setupModelMappedResponseTest(t, true)
	c.Header("Content-Type", "text/event-stream")

	payload := strings.Repeat("a", 74) + testMappedTarget + strings.Repeat("b", 80)
	_, err := c.Writer.Write([]byte(payload[:80]))
	require.NoError(t, err)
	c.Writer.Flush()
	_, err = c.Writer.Write([]byte(payload[80:]))
	require.NoError(t, err)
	c.Writer.Flush()
	require.NoError(t, finish())

	expected := strings.ReplaceAll(payload, testMappedTarget, testMappedSource)
	assert.Equal(t, expected, recorder.Body.String())
	assert.NotContains(t, recorder.Body.String(), testMappedTarget)
}

func TestModelMappedResponseWriterReplacesChannelErrors(t *testing.T) {
	for _, isStream := range []bool{false, true} {
		t.Run(map[bool]string{false: "non-stream", true: "stream"}[isStream], func(t *testing.T) {
			c, recorder, finish := setupModelMappedResponseTest(t, isStream)

			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"message": "upstream rejected model " + testMappedTarget,
				},
			})
			require.NoError(t, finish())

			assert.Equal(t, http.StatusBadRequest, recorder.Code)
			assert.Contains(t, recorder.Body.String(), "upstream rejected model "+testMappedSource)
			assert.NotContains(t, recorder.Body.String(), testMappedTarget)
		})
	}
}
