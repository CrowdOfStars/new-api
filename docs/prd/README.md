# new-api 模块 PRD 索引

> 日期：2026-07-03  
> 目的：把 `docs/PROJECT_PRD.md` 中的项目模块进一步拆成可独立阅读、可独立承接需求的模块级 PRD。

## 使用方式

- 第一次接手：先读 `../PROJECT_PRD.md`，再按本索引阅读对应模块 PRD。
- 做新功能：先定位影响模块，阅读该模块 PRD 的「范围」「接口/数据」「验收标准」「风险」。
- 做跨模块功能：至少阅读入口模块、数据模块、权限模块、计费/日志模块和前端模块。
- 每个新业务需求建议另建 `docs/prd/features/<feature-name>.md`，并在其中引用相关模块 PRD。

## 模块 PRD 列表

| 序号 | 文档 | 模块 | 适用场景 |
|---|---|---|---|
| 01 | [启动与运行时 PRD](modules/01-bootstrap-runtime.md) | `main.go` / runtime init | 改启动流程、后台任务、全局初始化 |
| 02 | [路由层 PRD](modules/02-router.md) | `router/` | 新增 API 路由、Relay 路由、Web fallback |
| 03 | [控制器层 PRD](modules/03-controller.md) | `controller/` | 新增 handler、管理 API、Relay 顶层入口 |
| 04 | [Service 业务层 PRD](modules/04-service.md) | `service/` | 写核心业务逻辑、计费、选渠道、任务 |
| 05 | [Model 与数据库 PRD](modules/05-model-database.md) | `model/` | 表结构、迁移、查询、缓存同步 |
| 06 | [中间件 PRD](modules/06-middleware.md) | `middleware/` | 鉴权、限流、选渠道、审计、请求体处理 |
| 07 | [Relay 核心 PRD](modules/07-relay-core.md) | `relay/` | AI API 代理主链路、重试、流式响应 |
| 08 | [Provider Adapter PRD](modules/08-provider-adapters.md) | `relay/channel/` | 新增/修改上游供应商适配 |
| 09 | [DTO / Types / Constants PRD](modules/09-dto-types-constants.md) | `dto/` `types/` `constant/` | 协议结构、共享类型、常量扩展 |
| 10 | [Common 基础设施 PRD](modules/10-common.md) | `common/` | JSON、env、Redis、quota、crypto、cache |
| 11 | [Setting 配置域 PRD](modules/11-setting.md) | `setting/` | 系统配置、倍率、模型、支付、性能设置 |
| 12 | [Auth / OAuth / 安全 PRD](modules/12-auth-oauth-security.md) | `oauth/` + auth 相关 | 登录、OAuth、Passkey、2FA、安全验证 |
| 13 | [计费 / 价格 / 订阅 PRD](modules/13-billing-pricing-subscription.md) | billing 相关模块 | 额度、价格、动态计费、订阅、支付 |
| 14 | [渠道 / Token / 模型管理 PRD](modules/14-channel-token-model-management.md) | 渠道与资产管理 | 渠道、API Key、模型元数据、供应商 |
| 15 | [日志 / 统计 / 性能 PRD](modules/15-logging-analytics-performance.md) | log/data/perf | 用量日志、看板、排行、性能指标 |
| 16 | [异步任务与媒体 PRD](modules/16-async-tasks-media.md) | task/video/MJ/Suno | 视频、音乐、MJ、任务轮询与结算 |
| 17 | [默认前端壳层 PRD](modules/17-frontend-default-shell.md) | `web/default` 基础设施 | 路由、状态、请求、主题、i18n |
| 18 | [默认前端 Feature PRD](modules/18-frontend-features.md) | `web/default/src/features` | 后台页面与业务模块开发 |
| 19 | [Classic 前端 PRD](modules/19-frontend-classic.md) | `web/classic` | 兼容 classic 主题 |
| 20 | [内部 pkg PRD](modules/20-internal-pkg.md) | `pkg/` | billingexpr、cachex、ionet、perf_metrics |
| 21 | [部署 / CI / 文档 PRD](modules/21-deployment-ci-docs.md) | Docker / GitHub / docs | 镜像、CI、部署文档、协作流程 |

## 推荐阅读路径

### 后端功能开发

1. `02-router.md`
2. `03-controller.md`
3. `04-service.md`
4. `05-model-database.md`
5. 涉及权限读 `06-middleware.md`、`12-auth-oauth-security.md`
6. 涉及计费读 `13-billing-pricing-subscription.md`

### 新 Provider / Relay 开发

1. `07-relay-core.md`
2. `08-provider-adapters.md`
3. `09-dto-types-constants.md`
4. `13-billing-pricing-subscription.md`
5. `14-channel-token-model-management.md`

### 前端页面开发

1. `17-frontend-default-shell.md`
2. `18-frontend-features.md`
3. 对应后端模块 PRD

### 运维 / 部署 / 配置开发

1. `01-bootstrap-runtime.md`
2. `10-common.md`
3. `11-setting.md`
4. `21-deployment-ci-docs.md`
