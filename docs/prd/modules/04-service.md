# 04. Service 业务层模块 PRD

## 1. 背景

Service 层承载项目的核心业务规则，是 controller 与 model/relay/common/setting 之间的业务编排层。新增复杂能力时，应优先判断逻辑是否属于 service。

## 2. 模块边界

### 负责

- 渠道选择、渠道亲和性、重试辅助。
- 预扣费、结算、退款、订阅/钱包计费会话。
- token 估算、媒体 token、工具调用计费。
- 异步任务提交、轮询、任务计费、超时处理。
- 支付平台辅助、通知、敏感词、违规扣费。
- 上游 HTTP client、下载、文件解析等业务基础能力。

### 不负责

- 不定义 HTTP 路由。
- 不直接拼接响应 JSON。
- 不定义 GORM 模型结构。
- 不实现 provider 具体协议转换。

## 3. 关键文件族

| 主题 | 文件 | 说明 |
|---|---|---|
| 渠道 | `channel.go`、`channel_select.go`、`channel_affinity.go` | 选渠道、缓存、亲和性、跨组重试 |
| 计费 | `billing.go`、`billing_session.go`、`pre_consume_quota.go`、`quota.go` | 预扣、结算、退款、额度变更 |
| 动态计费 | `tiered_settle.go`、`tool_billing.go`、`violation_fee.go` | tiered expr 结算、工具/违规费用 |
| Token 估算 | `token_counter.go`、`token_estimator.go`、`tokenizer.go`、`text_quota.go` | 估算请求 token 和文本计费 |
| 任务 | `task.go`、`task_billing.go`、`task_polling.go` | 异步任务生命周期 |
| 订阅 | `subscription_reset_task.go` | 周期性订阅额度重置 |
| HTTP/文件 | `http.go`、`http_client.go`、`download.go`、`file_*` | 上游请求与文件处理 |
| 安全/通知 | `sensitive.go`、`notify-limit.go`、`user_notify.go` | 敏感词、通知限流、用户通知 |
| 支付 | `epay.go`、`waffo_pancake.go` | 支付平台辅助逻辑 |

## 4. 用户故事

- 作为后端开发者，我希望业务规则集中在 service，以便能被 controller、relay、后台任务复用。
- 作为账务维护者，我希望所有扣费/退款路径走统一会话，以便避免重复扣费或漏退款。
- 作为运维，我希望渠道选择逻辑可配置、可观测，以便提升成功率。

## 5. 功能需求

### P0

- 计费相关 service 必须保证预扣、结算、退款的一致性。
- 渠道选择必须同时考虑 group、model、channel status、path 支持、权重/优先级和 token 限制。
- 任务 service 必须处理终态：成功、失败、取消、超时。
- 所有 service 错误应保留足够上下文供 controller 返回和日志排查。

### P1

- 业务 service 应避免依赖 Gin context 以外的隐式全局状态；无法避免时应封装清楚。
- 缓存读写应有失效/同步策略。
- 长耗时任务应异步化，不阻塞 Relay 主链路。

## 6. 数据与接口

Service 对 controller/relay 暴露 Go 函数，不直接暴露 HTTP API。设计新 service 时应明确：

| 项 | 要求 |
|---|---|
| 输入 | 是否依赖 `gin.Context`、`RelayInfo`、model、DTO |
| 输出 | 业务结果、可展示错误、内部错误 |
| 副作用 | DB 更新、缓存更新、quota 变化、日志、通知 |
| 幂等 | 支付/计费/任务是否可重试 |
| 并发 | 是否涉及锁、CAS、批量更新 |

## 7. 验收标准

- [ ] 核心业务规则有 deterministic table tests。
- [ ] 计费路径覆盖额度不足、预扣成功、上游失败退款、实际 usage 补扣/返还。
- [ ] 渠道选择覆盖无可用渠道、auto group、模型限制、specific channel。
- [ ] 异步任务覆盖提交失败、轮询成功、轮询失败、超时。
- [ ] 不为了覆盖率添加无意义测试。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 业务规则散落 controller/model | 难维护 | 新复杂逻辑放 service |
| 计费非幂等 | 重复扣费 | 使用 request id / session / CAS |
| 缓存与 DB 不一致 | 选错渠道或额度错误 | 写后失效/同步缓存 |
| 异步 goroutine 丢错误 | 难排障 | 错误写日志和状态 |

## 9. 后续迭代

- 为计费、渠道选择、任务状态机补充模块级设计图。
- 统一 service 错误类型和可展示 message。
- 给关键 service 增加指标：耗时、失败率、缓存命中率。
