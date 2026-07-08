# 06. 中间件模块 PRD

## 1. 背景

中间件模块负责请求进入业务前后的横切能力，包括鉴权、限流、CORS、日志、请求体复用、渠道分发、审计、性能保护和统计。它直接影响安全性、稳定性和 Relay 成功率。

## 2. 模块边界

### 负责

- 用户 Session/Auth 和 API Token Auth。
- 根据模型、分组、token 限制选择渠道。
- 请求限流和模型级限流。
- CORS、gzip、cache、request id、logger。
- 请求体限制、解压、复用和清理。
- 管理操作审计。
- 性能保护和统计采样。
- 特定 provider 的请求转换前置适配。

### 不负责

- 不执行业务数据库写入，除审计/统计外。
- 不做上游 provider 请求转换主体逻辑。
- 不返回复杂业务数据。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `middleware/auth.go` | User/Admin/RootAuth、TokenAuth、TokenOrUserAuth |
| `middleware/distributor.go` | 模型解析、token 模型限制、渠道选择、上下文注入 |
| `middleware/rate-limit.go`、`model-rate-limit.go` | 全局/关键/搜索/模型请求限流 |
| `middleware/audit.go` | 管理/root 写操作审计 |
| `middleware/body_cleanup.go`、`request_body_limit.go` | 请求体存储、限制、清理 |
| `middleware/cors.go`、`gzip.go`、`cache.go` | Web/API 基础中间件 |
| `middleware/performance.go`、`stats.go` | 性能保护、统计 |
| `middleware/i18n.go` | 请求语言处理 |
| `middleware/secure_verification.go` | 安全二次验证 |
| `middleware/jimeng_adapter.go`、`kling_adapter.go` | 视频 provider 请求前置转换 |

## 4. 用户故事

- 作为管理员，我希望后台写操作有权限和审计，以便追踪风险操作。
- 作为 API 用户，我希望请求自动分发到可用渠道，以便提升成功率。
- 作为系统运营者，我希望限流和性能保护在业务前生效，以便避免滥用拖垮系统。

## 5. 功能需求

### P0

- 后台接口必须使用正确 User/Admin/Root 鉴权。
- Relay 接口必须使用 TokenAuth 并写入 token/user/group/quota 上下文。
- Distribute 必须在调用 controller.Relay 前确定可用渠道或明确失败。
- 请求体可在中间件、controller、relay retry 中重复读取。
- 大请求体、匿名请求体、解压后请求体必须受限制。

### P1

- 管理写操作自动审计，手动审计需避免重复。
- 模型请求限流应支持按 token/user/model 维度扩展。
- 特定 provider 前置转换应保持最小化，通用协议转换放 relay/channel。

## 6. 中间件链路

### 管理 API

`RouteTag(api)` → gzip → body cleanup → global API rate limit → auth/rate limit/handler

### Relay API

`CORS` → decompress → body cleanup → stats → route tag → system performance check → TokenAuth → ModelRequestRateLimit → Distribute → controller.Relay

## 7. 验收标准

- [ ] 未登录、用户禁用、权限不足、token 无效均返回预期错误。
- [ ] TokenAuth 兼容 Bearer、Claude `x-api-key`、Gemini `key/x-goog-api-key`、Realtime subprotocol。
- [ ] Distribute 可处理 JSON、form、multipart 请求模型解析。
- [ ] token 模型限制、specific channel、auto group 均按预期生效。
- [ ] 超大请求体返回 413 或明确错误。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 鉴权漏挂 | 数据越权 | 路由 PR 强制标明 Auth |
| 请求体被提前消费 | Relay retry 失败 | 使用统一 BodyStorage |
| Distribute 解析模型失败 | 无法选渠道 | 多 Content-Type 覆盖测试 |
| 限流误杀 | 正常用户受影响 | 配置化并记录限流原因 |

## 9. 后续迭代

- 增加中间件链路图。
- 为 TokenAuth 和 Distribute 建立完整契约测试。
- 将限流命中情况纳入后台可观测指标。
