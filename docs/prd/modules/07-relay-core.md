# 07. Relay 核心模块 PRD

## 1. 背景

Relay 核心模块是 new-api 的主价值链路：把客户端 OpenAI/Claude/Gemini 等兼容请求转换、转发到上游渠道，并完成流式响应、重试、计费、日志和错误兼容。

## 2. 模块边界

### 负责

- 识别 Relay format 和 Relay mode。
- 解析并校验客户端请求 DTO。
- 生成 `RelayInfo` 请求上下文。
- 敏感词检查、token 估算、价格计算、预扣费。
- 调用对应 helper 和 provider adapter。
- 支持流式、非流式、WebSocket、图片、音频、embedding、rerank、responses。
- 处理错误、退款、违规费用、自动禁用和重试。
- 记录性能采样和用量日志。

### 不负责

- 不直接定义 HTTP path；path 在 router。
- 不管理用户后台 CRUD。
- 不保存 provider 配置；配置在 channel/model/setting。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `controller/relay.go` | Relay 顶层生命周期和重试 |
| `relay/compatible_handler.go` | OpenAI-compatible 文本请求 |
| `relay/claude_handler.go` | Claude Messages 请求 |
| `relay/gemini_handler.go` | Gemini 请求 |
| `relay/responses_handler.go` | OpenAI Responses 请求 |
| `relay/image_handler.go` | 图片生成/编辑 |
| `relay/audio_handler.go` | TTS/ASR/translation |
| `relay/embedding_handler.go` | embeddings |
| `relay/rerank_handler.go` | rerank |
| `relay/websocket.go` | Realtime WebSocket |
| `relay/common/relay_info.go` | RelayInfo、ChannelMeta、streamSupportedChannels |
| `relay/common/request_conversion.go` | 请求格式转换链记录 |
| `relay/helper/*` | 请求解析、价格计算、响应辅助 |

## 4. 支持协议范围

| 协议/能力 | 路径示例 |
|---|---|
| OpenAI Chat | `/v1/chat/completions` |
| OpenAI Completions | `/v1/completions` |
| OpenAI Responses | `/v1/responses` |
| OpenAI Realtime | `/v1/realtime` |
| OpenAI Images | `/v1/images/generations`、`/v1/images/edits` |
| OpenAI Audio | `/v1/audio/transcriptions`、`/speech` |
| Embeddings | `/v1/embeddings` |
| Rerank | `/v1/rerank` |
| Claude Messages | `/v1/messages` |
| Gemini | `/v1beta/models/*` |
| MJ/Suno/Video | 任务模块处理 |

## 5. 功能需求

### P0

- Relay 成功路径必须完成：鉴权上下文 → 渠道上下文 → request DTO → RelayInfo → 预扣 → 上游 → 结算 → 日志。
- 上游失败时必须按错误类型决定重试、退款、自动禁用。
- 流式响应中 usage、finish reason、错误事件处理必须符合协议。
- `RelayInfo` 不应泄漏密钥到日志。
- 请求格式转换链应能追踪原始格式和最终上游格式。

### P1

- 支持 provider capability 差异：stream options、tools、reasoning、cache、image/audio。
- 支持参数覆盖和 header 覆盖审计。
- 支持 channel affinity 失败后的清理策略。

## 6. 验收标准

- [ ] OpenAI Chat 非流式和流式请求可成功转发并结算。
- [ ] Claude/Gemini 请求按各自格式返回错误和 usage。
- [ ] 上游 4xx/5xx 按配置重试或跳过重试。
- [ ] 预扣后失败会退款；成功后按 actual usage 结算。
- [ ] request id 出现在错误响应或日志中。
- [ ] 显式 `stream=false`、`temperature=0`、`max_tokens=0` 等零值不被误删。

## 7. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 协议兼容不完整 | 客户端 SDK 报错 | 按协议构造错误/stream chunk |
| usage 解析错误 | 扣费错误 | provider fixture 测试 |
| retry 后请求体丢失 | 第二次上游请求失败 | BodyStorage 复用 |
| stream options 误传 | 上游报错 | provider capability map |
| 日志泄漏 key | 安全事故 | RelayInfo 日志统一 mask |

## 8. 后续迭代

- 为每种 RelayFormat 建立端到端 smoke case。
- 抽象 provider capability registry。
- 增加 Relay trace 面板，展示转换链、渠道链、计费链。
