# 16. 异步任务与媒体模块 PRD

## 1. 背景

视频、音乐、Midjourney 等生成任务通常不是一次 HTTP 请求即可完成，需要提交任务、保存 task id、轮询上游、查询结果和最终结算。异步任务模块负责这类长生命周期请求。

## 2. 模块边界

### 负责

- 异步任务提交：视频、Suno、Midjourney、Kling、Jimeng、Vidu、Sora、Gemini 视频等。
- 任务参数校验、动作识别、模型识别。
- 任务强制预扣费。
- 任务入库、状态流转、轮询、超时处理。
- 任务成功/失败后的结算或退款。
- 任务结果查询和媒体内容代理。
- OpenAI-compatible video 响应转换。

### 不负责

- 不负责普通 chat/embedding/audio 同步请求。
- 不负责用户登录，但任务接口需要 TokenAuth 或 TokenOrUserAuth。
- 不直接管理前端播放组件之外的 UI 状态。

## 3. 关键文件

| 模块 | 文件 |
|---|---|
| 路由 | `router/video-router.go`、`router/relay-router.go` 中 `/mj`、`/suno` |
| 控制器 | `controller/relay.go` 的 `RelayTask`、`RelayTaskFetch`、`RelayMidjourney` |
| Relay task | `relay/relay_task.go`、`relay/relay_task_fetch` 相关逻辑 |
| Task adapter | `relay/channel/task/*` |
| MJ | `relay/mjproxy_handler.go`、`model/midjourney.go`、`controller/midjourney.go` |
| Task model | `model/task.go` |
| Task service | `service/task.go`、`task_billing.go`、`task_polling.go` |
| Video proxy | `controller/video_proxy*.go` |
| DTO | `dto/task.go`、`dto/video.go`、`dto/midjourney.go`、`dto/suno.go` |

## 4. 用户故事

- 作为 API 用户，我希望用 OpenAI-compatible video API 提交视频任务并查询结果，以便统一接入。
- 作为用户，我希望任务失败或超时时能自动退款，以便额度安全。
- 作为管理员，我希望后台能查看任务状态，以便排查上游任务问题。

## 5. 功能需求

### P0

- 提交任务前必须校验 token、用户、模型、渠道和额度。
- 异步任务必须强制预扣全额，避免任务运行后余额不足。
- 上游返回 task id 后必须可靠入库。
- 轮询必须识别终态：success、failed、cancelled、timeout。
- 失败/超时必须退款或按明确规则处理费用。
- 查询接口必须按 token/user 权限隔离。

### P1

- 任务提交响应应兼容 OpenAI video 或 provider 原始格式。
- 任务完成后可按实际参数调整计费。
- 视频内容代理支持 session 或 token 访问。
- 管理员可批量查看和排查任务。

## 6. 状态机

| 状态 | 说明 |
|---|---|
| submitted | 已提交上游，等待处理 |
| running | 上游处理中 |
| succeeded | 成功完成，可查询结果 |
| failed | 上游失败，需要退款/记录原因 |
| cancelled | 取消或被上游取消 |
| timeout | 超过配置时间未完成，标记失败并退款 |

## 7. 验收标准

- [ ] 提交视频任务后返回 task id 并保存 DB。
- [ ] 查询任务能返回当前状态和结果。
- [ ] 任务失败/超时自动退款。
- [ ] 任务成功后按实际费用结算。
- [ ] 无权限用户不能查询或下载其他用户任务内容。
- [ ] 后台任务轮询不会在 slave 节点重复执行不该执行的任务。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 任务入库失败 | 用户已扣费但无法查询 | 入库失败立即退款并返回错误 |
| 轮询重复结算 | 重复扣费/退款 | 任务状态 CAS 和幂等结算 |
| 上游状态不标准 | 任务卡住 | provider adapter 统一 ParseTaskResult |
| 媒体代理越权 | 数据泄漏 | TokenOrUserAuth + task owner 校验 |

## 9. 后续迭代

- 增加任务状态机图和重试策略文档。
- 提供任务补偿脚本：扫描异常预扣/未终态任务。
- 前端增加任务详情和轮询历史。
