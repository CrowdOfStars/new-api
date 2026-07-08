# 08. Provider Adapter 模块 PRD

## 1. 背景

Provider Adapter 模块负责屏蔽各上游 AI 服务之间的协议差异，让 Relay 核心可以用统一接口调用不同供应商。新增渠道或修复上游兼容问题，通常需要修改本模块。

## 2. 模块边界

### 负责

- 根据 `RelayInfo` 生成上游 URL、Header、Body。
- 将 OpenAI/Claude/Gemini/Responses 等请求转换为 provider 原生格式。
- 发送上游请求或使用 provider SDK。
- 解析上游响应、usage、错误。
- 转换流式响应 chunk。
- 为异步任务 provider 实现提交、轮询、结果解析、计费调整。

### 不负责

- 不决定用户是否有权限。
- 不选择渠道；渠道已由 middleware/service 确定。
- 不直接扣费；只返回 usage/task billing 信息。
- 不定义管理后台页面。

## 3. 关键接口

`relay/channel/adapter.go`：

| 接口 | 说明 |
|---|---|
| `Adaptor.Init` | 初始化 adapter 状态 |
| `GetRequestURL` | 构造上游 URL |
| `SetupRequestHeader` | 设置上游 header |
| `ConvertOpenAIRequest` | OpenAI Chat 类请求转换 |
| `ConvertClaudeRequest` | Claude 请求转换 |
| `ConvertGeminiRequest` | Gemini 请求转换 |
| `ConvertOpenAIResponsesRequest` | Responses 请求转换 |
| `ConvertImageRequest` / `ConvertAudioRequest` / `ConvertEmbeddingRequest` / `ConvertRerankRequest` | 多模态与专用接口转换 |
| `DoRequest` | 发起上游请求 |
| `DoResponse` | 处理上游响应并返回 usage/error |
| `TaskAdaptor` | 异步任务类 provider 的提交/轮询/结算接口 |

## 4. Provider 范围

| 类型 | 示例目录 |
|---|---|
| 通用 LLM | `openai/`、`claude/`、`gemini/`、`aws/`、`mistral/`、`deepseek/`、`xai/` |
| 国内模型 | `ali/`、`baidu/`、`zhipu/`、`volcengine/`、`moonshot/`、`minimax/` |
| Rerank/Embedding | `cohere/`、`jina/` |
| 本地/兼容 | `ollama/`、`advancedcustom/`、`submodel/` |
| 图像/视频/任务 | `task/*`、`jimeng/`、`replicate/` |
| 专用订阅/Codex | `codex/` |

## 5. 新增 Provider 功能需求

### P0

- 新增 channel type、API type、base URL、展示名。
- 实现 `Adaptor` 或 `TaskAdaptor`。
- 注册到 `relay/relay_adaptor.go`。
- 支持模型映射、base_url override、header/param override。
- 正确解析 usage 和错误码。
- 明确是否支持 stream options，并更新 `streamSupportedChannels`。
- 前端渠道配置中支持该 provider 的字段。

### P1

- 支持多 key、key 轮询/随机策略。
- 支持渠道测试、余额查询或模型抓取。
- 支持 provider 特有参数但避免污染通用 DTO。
- 支持任务完成后的实际计费调整。

## 6. DTO 规则

- 客户端 JSON 解析后会重新 marshal 给上游的 optional scalar 字段必须用指针 + `omitempty`。
- absent、`0`、`false`、`0.0` 必须可区分。
- JSON marshal/unmarshal 业务调用使用 `common.*` wrapper。

## 7. 验收标准

- [ ] Provider 可在后台创建渠道并保存。
- [ ] 渠道测试可成功或返回明确错误。
- [ ] 至少一个文本请求可转发成功。
- [ ] 流式和非流式 usage 解析正确；不支持流式时明确失败。
- [ ] 上游错误能映射到统一错误类型，并触发正确重试/禁用策略。
- [ ] 多 key 模式下禁用 key 不会继续被选中。
- [ ] 相关前端表单、模型列表、价格展示同步更新。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| Provider usage 语义不同 | 计费错误 | fixture 覆盖真实响应 |
| Stream chunk 格式不同 | 客户端断流 | 单独测试 SSE/chunk 转换 |
| 误传不支持参数 | 上游报 400 | capability map 和参数过滤 |
| Key 格式特殊 | 鉴权失败 | adapter 内隔离 key 解析 |

## 9. 后续迭代

- 建立 Provider adapter 模板目录。
- 维护 provider capability 表：stream、tools、reasoning、images、audio、responses、rerank。
- 为每个 provider 保存真实脱敏 fixture，用于回归测试。
