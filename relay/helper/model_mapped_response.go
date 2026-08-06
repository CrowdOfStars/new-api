package helper

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"sync"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
)

const (
	modelMappedStreamWindowSize  = 50
	modelMappedStreamRedundancy  = 25
	modelMappedResponseWriterKey = "model_mapped_response_writer"
)

type modelMappedResponseMode uint8

const (
	modelMappedResponseModeUnset modelMappedResponseMode = iota
	modelMappedResponseModePassthrough
	modelMappedResponseModeNonStream
	modelMappedResponseModeStream
)

type modelMappedResponseWriter struct {
	gin.ResponseWriter

	mu       sync.Mutex
	info     *relaycommon.RelayInfo
	source   []byte
	target   []byte
	buffer   []byte
	mode     modelMappedResponseMode
	writeErr error
	finished bool
}

// WrapModelMappedResponseWriter installs the response rewriter once and returns
// a finalizer that must run after the response, including an error response, is rendered.
func WrapModelMappedResponseWriter(c *gin.Context) func() error {
	if c == nil || c.Writer == nil {
		return func() error { return nil }
	}
	if value, exists := c.Get(modelMappedResponseWriterKey); exists {
		if writer, ok := value.(*modelMappedResponseWriter); ok {
			return writer.finish
		}
	}

	writer := &modelMappedResponseWriter{ResponseWriter: c.Writer}
	c.Writer = writer
	c.Set(modelMappedResponseWriterKey, writer)
	return writer.finish
}

func configureModelMappedResponse(c *gin.Context, info *relaycommon.RelayInfo, source string) error {
	if c == nil {
		return nil
	}
	value, exists := c.Get(modelMappedResponseWriterKey)
	if !exists {
		return nil
	}
	writer, ok := value.(*modelMappedResponseWriter)
	if !ok {
		return nil
	}
	return writer.configure(info, source)
}

func (w *modelMappedResponseWriter) configure(info *relaycommon.RelayInfo, source string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.finished {
		return w.writeErr
	}
	if len(w.buffer) > 0 {
		if err := w.drainFinalLocked(); err != nil {
			return err
		}
	}

	w.info = info
	w.source = append(w.source[:0], source...)
	w.target = w.target[:0]
	w.mode = modelMappedResponseModeUnset
	return w.writeErr
}

func (w *modelMappedResponseWriter) Write(data []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.writeErr != nil {
		return 0, w.writeErr
	}
	if w.finished {
		return 0, io.ErrClosedPipe
	}

	w.resolveModeLocked()
	if w.mode == modelMappedResponseModePassthrough {
		return w.ResponseWriter.Write(data)
	}

	w.ResponseWriter.Header().Del("Content-Length")
	w.buffer = append(w.buffer, data...)
	if w.mode == modelMappedResponseModeStream {
		if err := w.drainStreamLocked(); err != nil {
			return 0, err
		}
	}
	return len(data), nil
}

func (w *modelMappedResponseWriter) WriteString(data string) (int, error) {
	return w.Write([]byte(data))
}

func (w *modelMappedResponseWriter) WriteHeaderNow() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.mode != modelMappedResponseModePassthrough && w.shouldRewriteLocked() {
		w.ResponseWriter.Header().Del("Content-Length")
	}
	w.ResponseWriter.WriteHeaderNow()
}

func (w *modelMappedResponseWriter) Flush() {
	w.mu.Lock()
	if w.mode == modelMappedResponseModeStream && w.writeErr == nil {
		_ = w.drainStreamLocked()
	}
	w.ResponseWriter.Flush()
	w.mu.Unlock()
}

func (w *modelMappedResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *modelMappedResponseWriter) finish() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.finished {
		return w.writeErr
	}
	w.finished = true
	if w.writeErr == nil && len(w.buffer) > 0 {
		_ = w.drainFinalLocked()
	}
	if w.mode == modelMappedResponseModeStream {
		w.ResponseWriter.Flush()
	}
	return w.writeErr
}

func (w *modelMappedResponseWriter) resolveModeLocked() {
	if w.mode != modelMappedResponseModeUnset {
		return
	}
	if !w.shouldRewriteLocked() {
		w.mode = modelMappedResponseModePassthrough
		return
	}
	if w.info.IsStream {
		w.mode = modelMappedResponseModeStream
	} else {
		w.mode = modelMappedResponseModeNonStream
	}
}

func (w *modelMappedResponseWriter) shouldRewriteLocked() bool {
	if len(w.source) == 0 || w.info == nil {
		return false
	}
	if len(w.target) == 0 {
		target := w.info.UpstreamModelName
		if target == "" || target == string(w.source) {
			return false
		}
		w.target = append(w.target[:0], target...)
	}

	contentEncoding := strings.TrimSpace(w.ResponseWriter.Header().Get("Content-Encoding"))
	if contentEncoding != "" && !strings.EqualFold(contentEncoding, "identity") {
		return false
	}
	contentType := strings.ToLower(strings.TrimSpace(w.ResponseWriter.Header().Get("Content-Type")))
	if separator := strings.IndexByte(contentType, ';'); separator >= 0 {
		contentType = strings.TrimSpace(contentType[:separator])
	}
	return contentType == "" ||
		strings.HasPrefix(contentType, "text/") ||
		strings.Contains(contentType, "json") ||
		strings.Contains(contentType, "xml") ||
		contentType == "application/javascript" ||
		contentType == "application/x-ndjson"
}

func (w *modelMappedResponseWriter) drainStreamLocked() error {
	redundancy := modelMappedStreamRedundancy
	if targetOverlap := len(w.target) - 1; targetOverlap > redundancy {
		redundancy = targetOverlap
	}
	windowSize := modelMappedStreamWindowSize + 2*redundancy
	safeLimit := modelMappedStreamWindowSize + redundancy

	for len(w.buffer) >= windowSize {
		output, consumed := replaceMappedPrefix(w.buffer[:windowSize], w.target, w.source, safeLimit)
		if err := w.writeDownstreamLocked(output); err != nil {
			return err
		}
		w.buffer = w.buffer[consumed:]
	}
	return nil
}

func (w *modelMappedResponseWriter) drainFinalLocked() error {
	output := w.buffer
	if bytes.Contains(output, w.target) {
		output = bytes.ReplaceAll(output, w.target, w.source)
	}
	w.buffer = nil
	return w.writeDownstreamLocked(output)
}

func (w *modelMappedResponseWriter) writeDownstreamLocked(data []byte) error {
	if len(data) == 0 {
		return nil
	}
	n, err := w.ResponseWriter.Write(data)
	if err == nil && n != len(data) {
		err = io.ErrShortWrite
	}
	if err != nil {
		w.writeErr = err
	}
	return err
}

func replaceMappedPrefix(data, target, replacement []byte, safeLimit int) ([]byte, int) {
	firstMatch := bytes.Index(data, target)
	if firstMatch < 0 || firstMatch >= safeLimit {
		return data[:safeLimit], safeLimit
	}

	output := make([]byte, 0, safeLimit)
	searchFrom := 0
	for firstMatch >= 0 && firstMatch < safeLimit {
		output = append(output, data[searchFrom:firstMatch]...)
		output = append(output, replacement...)
		searchFrom = firstMatch + len(target)
		nextMatch := bytes.Index(data[searchFrom:], target)
		if nextMatch < 0 {
			break
		}
		firstMatch = searchFrom + nextMatch
	}
	if searchFrom < safeLimit {
		output = append(output, data[searchFrom:safeLimit]...)
		searchFrom = safeLimit
	}
	return output, searchFrom
}
