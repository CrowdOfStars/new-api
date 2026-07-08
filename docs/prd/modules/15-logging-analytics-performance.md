# 15. 日志 / 统计 / 性能模块 PRD

## 1. 背景

日志、统计和性能模块为用户、管理员和运维提供请求可追踪性、用量分析、成本解释、模型排行和系统健康视图。它是排障、对账和运营决策的重要基础。

## 2. 模块边界

### 负责

- 记录用户请求日志、渠道日志、错误日志、计费信息。
- 提供用户和管理员日志查询、搜索、统计。
- 生成用量看板数据：用户、模型、渠道、流量、quota。
- 提供排行榜、市场份额、趋势数据。
- 采样 Relay 性能指标：延迟、成功率、模型/渠道维度指标。
- 系统性能管理：GC、磁盘缓存、日志文件、perf metrics。

### 不负责

- 不决定是否扣费；扣费在 billing/service。
- 不发起 provider 调用。
- 不作为强一致账务流水替代，除非后续专门设计流水表。

## 3. 关键文件

| 模块 | 文件 |
|---|---|
| 日志模型 | `model/log.go` |
| 日志控制器 | `controller/log.go` |
| 日志信息生成 | `service/log_info_generate.go`、`usage_helpr.go` |
| 用量数据 | `model/usedata.go`、`usedata_flow.go`、`usedata_rankings.go`、`controller/usedata.go` |
| 排行 | `controller/rankings.go`、`service/rankings.go` |
| 性能指标 | `pkg/perf_metrics/`、`controller/perf_metrics.go` |
| 系统性能 | `controller/performance.go`、`common/system_monitor*.go` |
| 前端日志 | `web/default/src/features/usage-logs` |
| 前端看板 | `web/default/src/features/dashboard`、`features/rankings`、`features/performance-metrics` |

## 4. 用户故事

- 作为用户，我希望查看自己的 API 调用记录和额度消耗，以便排查调用和控制成本。
- 作为管理员，我希望查看全站日志、错误和渠道表现，以便运营和排障。
- 作为运维，我希望看到模型/渠道性能指标，以便发现慢渠道或故障渠道。
- 作为财务/运营，我希望日志能解释扣费来源，以便处理用户疑问。

## 5. 功能需求

### P0

- Relay 请求成功或失败后必须记录必要日志，包含 user、token、model、channel、quota、usage、耗时、stream、错误信息。
- 日志查询必须支持分页、搜索和权限隔离。
- 用户只能查看自己的日志；管理员可查看全站日志。
- 错误日志应脱敏，不记录完整 key 或敏感内容。
- 计费相关 other 信息应能解释动态计费和 matched tier。

### P1

- 看板数据定时聚合，降低日志大表查询压力。
- 性能指标按模型、渠道、时间窗口聚合。
- 排行页展示模型趋势、市场份额、增长变化。
- 管理员可清理历史日志和日志文件。

## 6. 数据维度

| 维度 | 说明 |
|---|---|
| 时间 | created_time、日期聚合、时间窗口 |
| 用户 | user_id、group、token_id |
| 模型 | original_model、upstream_model、model mapping |
| 渠道 | channel_id、channel_type、channel_name |
| 费用 | prompt/completion/total tokens、quota、pre-consume、billing source |
| 性能 | first response time、total latency、success/fail |
| 错误 | status code、error type、error code、masked message |

## 7. 验收标准

- [ ] 成功 Relay 请求能在用户日志中查到。
- [ ] 上游错误请求能在管理员日志中看到渠道和错误原因。
- [ ] 用户无法访问其他用户日志。
- [ ] 日志搜索有分页和限流，不会全表拖垮 DB。
- [ ] 动态计费请求日志展示 expr/tier/breakdown。
- [ ] 性能指标能按模型/渠道聚合展示。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 日志写入阻塞 Relay | 请求延迟上升 | 异步或轻量写入 |
| 日志泄漏敏感信息 | 安全事故 | mask key/email/prompt/error |
| 大表查询慢 | 后台不可用 | 分页、索引、预聚合、归档 |
| 计费解释不完整 | 用户投诉难处理 | other 中记录 billing metadata |

## 9. 后续迭代

- 引入账务流水和日志的关联 ID。
- 增加日志归档/压缩/保留策略。
- 增加渠道健康趋势和自动告警接口。
