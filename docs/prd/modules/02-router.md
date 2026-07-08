# 02. 路由层模块 PRD

## 1. 背景

路由层负责把 HTTP 请求分派到对应 controller，是后台管理 API、AI Relay API、视频任务 API、旧 dashboard 兼容接口和前端 SPA 的边界层。

## 2. 模块边界

### 负责

- 定义 URL path、HTTP method、路由分组。
- 为路由挂载鉴权、限流、CORS、gzip、分发、性能保护等中间件。
- 区分管理 API、Relay API、Web 静态资源和兼容接口。
- SPA fallback 与前端主题静态资源服务。

### 不负责

- 不写业务逻辑。
- 不直接访问数据库。
- 不做复杂参数校验；参数校验放 controller/service/dto。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `router/main.go` | 总入口，调用各子路由注册函数 |
| `router/api-router.go` | `/api` 后台/管理 REST API |
| `router/relay-router.go` | `/v1`、`/v1beta`、`/mj`、`/suno` AI Relay API |
| `router/video-router.go` | OpenAI-compatible video、Kling、Jimeng 等视频任务 API |
| `router/dashboard.go` | 旧 dashboard billing/usage 兼容接口 |
| `router/web-router.go` | 前端静态资源、default/classic 主题、SPA fallback |

## 4. 路由分类

| 分类 | 前缀 | 鉴权 | 响应格式 |
|---|---|---|---|
| 管理 API | `/api/...` | User/Admin/RootAuth 或公开 | `{ success, message, data }` |
| Relay API | `/v1/...` `/v1beta/...` `/mj/...` | API Token | OpenAI/Claude/Gemini/MJ 兼容格式 |
| Playground | `/pg/chat/completions` | UserAuth + Distribute | 后台测试流 |
| Video/Task | `/v1/video...` `/kling/v1...` `/jimeng` | API Token 或 Token/User | 任务兼容格式 |
| Web | `/...` | 无 | 静态资源或 `index.html` |
| Dashboard 兼容 | `/dashboard/...` `/v1/dashboard/...` | TokenAuth | 兼容旧 API |

## 5. 用户故事

- 作为前端开发者，我希望后台 API 路由结构稳定，以便 feature API 能明确映射。
- 作为 API 用户，我希望 OpenAI/Claude/Gemini 路径兼容原生客户端，以便少改代码接入。
- 作为系统维护者，我希望路由层清晰区分管理请求和 Relay 请求，以便安全策略正确挂载。

## 6. 功能需求

### P0

- 所有新增管理接口必须挂载正确角色鉴权。
- 所有新增 Relay 接口必须挂载 `TokenAuth`、必要的 rate limit、`Distribute`。
- Web fallback 不应吞掉 `/api`、`/v1`、`/assets` 的错误。
- 流式接口不得被会破坏 SSE/stream 的 gzip 链路包裹。

### P1

- 路由命名应和 feature 模块保持一致。
- 兼容类路由应标明兼容原因和废弃计划。
- 视频/任务类 provider 路径应统一标注 task platform。

## 7. 验收标准

- [ ] 新路由能通过正确鉴权访问。
- [ ] 未授权访问返回预期状态码和格式。
- [ ] Relay 路由错误格式与目标协议兼容。
- [ ] SPA 页面刷新不会 404。
- [ ] `/api`、`/v1` 未命中不会返回前端 HTML。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 路由挂错鉴权 | 越权访问 | 新接口 PR 必须标明 Auth 级别 |
| Relay 路由误挂 gzip | SSE/stream 失败 | 流式路径保持 relay 专用链路 |
| 通配路由过宽 | API 被 SPA fallback 吞掉 | `web-router.go` 中保留 API 前缀排除 |
| 兼容路径混乱 | 客户端行为不一致 | 新兼容路由写明协议来源 |

## 9. 后续迭代

- 生成路由清单文档，包含 path、method、auth、controller。
- 增加路由级别的安全审计 checklist。
- 对 deprecated/compat 路由增加注释和迁移计划。
