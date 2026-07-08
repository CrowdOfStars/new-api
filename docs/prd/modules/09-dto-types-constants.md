# 09. DTO / Types / Constants 模块 PRD

## 1. 背景

DTO、Types 和 Constants 是跨模块共享的协议与类型边界。它们决定了客户端请求、上游请求、错误、价格、Relay 格式、渠道类型等基础契约。

## 2. 模块边界

### 负责

- 定义请求/响应 DTO。
- 定义跨层共享类型，如错误、价格、relay format、request meta。
- 定义全局常量，如 channel type、API type、context key、task platform。
- 保持协议字段语义稳定，避免上游/下游兼容性破坏。

### 不负责

- 不实现业务逻辑。
- 不访问数据库。
- 不发起 HTTP 请求。
- 不处理前端展示。

## 3. 关键目录

| 目录/文件 | 说明 |
|---|---|
| `dto/openai_request.go`、`openai_response.go` | OpenAI-compatible 请求/响应 |
| `dto/claude.go` | Claude Messages DTO |
| `dto/gemini.go` | Gemini DTO |
| `dto/openai_image.go`、`audio.go`、`embedding.go`、`rerank.go` | 多模态/专用接口 DTO |
| `dto/task.go`、`video.go`、`midjourney.go`、`suno.go` | 异步任务和媒体 DTO |
| `dto/pricing.go`、`channel_settings.go` | 价格和渠道设置 DTO |
| `types/error.go`、`channel_error.go` | 统一错误类型 |
| `types/relay_format.go`、`request_meta.go`、`price_data.go` | Relay 格式与计费类型 |
| `constant/channel.go`、`api_type.go` | 渠道类型和 API 类型 |
| `constant/context_key.go` | Gin context key |
| `constant/task.go` | 异步任务平台常量 |

## 4. 用户故事

- 作为 provider 开发者，我希望 DTO 能保留用户显式传入的零值，以便请求语义不被破坏。
- 作为业务开发者，我希望常量统一定义，以便跨模块引用时不出现魔法数字。
- 作为 API 用户，我希望响应结构兼容原协议，以便 SDK 正常解析。

## 5. 功能需求

### P0

- 对客户端 JSON 解析后再发给上游的 optional scalar 字段，必须使用指针类型 + `omitempty`。
- DTO 字段命名和 json tag 必须与目标协议一致。
- 新 channel type/API type/task platform 必须在常量、映射和前端配置中同步。
- 错误类型必须能转换为 OpenAI/Claude 等协议错误格式。
- 新 context key 必须集中定义，避免字符串散落。

### P1

- DTO 应提供明确 helper 方法处理模型名、stream、usage、token meta。
- 类型变更要考虑前端 types 同步。
- 常量命名应稳定，不因短期 UI 文案变化修改。

## 6. 兼容性规则

| 场景 | 规则 |
|---|---|
| Optional int/float/bool | 使用 `*int` / `*uint` / `*float64` / `*bool` |
| 显式零值 | `0` / `false` 必须保留并发给上游 |
| Raw JSON | 可用 `json.RawMessage` 类型，但 marshal/unmarshal 走 `common.*` |
| 协议错误 | 保持目标协议字段，如 OpenAI `error.message/type/code` |
| 常量扩展 | channel type 不要复用旧值；新增后更新映射表 |

## 7. 验收标准

- [ ] 新 DTO 的 absent 与显式零值测试通过。
- [ ] 新常量在后端映射、前端展示和数据库存储中一致。
- [ ] 错误转换不会丢失 status code、error code、message。
- [ ] DTO helper 不引入数据库或 HTTP 依赖。
- [ ] 修改协议结构时补充或更新兼容性测试。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| `omitempty` 丢零值 | 上游请求语义错误 | optional scalar 全部用指针 |
| 常量值冲突 | 渠道类型错乱 | 新增常量只追加，不复用 |
| DTO 过度耦合业务 | 难复用 | 业务逻辑放 service/relay |
| 前后端类型不一致 | UI 保存错误 | API/types 同步更新 |

## 9. 后续迭代

- 生成 DTO 兼容性测试模板。
- 建立 channel type/API type/provider 前端配置同步清单。
- 为常用协议添加脱敏 fixture。
