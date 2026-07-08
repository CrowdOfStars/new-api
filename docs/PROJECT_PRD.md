# new-api 项目模块拆解与后续开发 PRD

> 版本：v0.1  
> 日期：2026-07-03  
> 适用读者：第一次接手本项目的后端、前端、全栈、测试、运维开发者  
> 文档目的：把现有代码按业务域和工程域拆开，说明模块边界、核心流程、开发入口、验收标准与后续演进方向，作为后续需求开发的共同基线。

---

## 1. 项目定位

new-api 是一个 **AI API 网关 / 代理 / 资产管理系统**。它把 OpenAI、Claude、Gemini、Azure、AWS Bedrock、阿里、百度、火山、Cohere、Jina、Midjourney、Suno、Sora/视频类任务等多个上游 AI 服务，聚合到统一入口，并提供：

- 统一 API 兼容层：OpenAI Chat/Responses/Images/Embeddings/Audio/Realtime、Claude Messages、Gemini、Rerank、视频/异步任务等。
- 渠道管理：多供应商、多 Key、多分组、多模型映射、优先级、权重、自动禁用、余额/连通性测试、上游模型同步。
- 用户与鉴权：用户、管理员/root、会话、访问令牌、API Token、OAuth、OIDC、Passkey、2FA。
- 计费与额度：钱包额度、令牌额度、分组倍率、模型倍率、动态/表达式计费、订阅、充值、兑换码、支付回调。
- 运营后台：仪表盘、用量日志、排名、价格、系统设置、渠道管理、用户管理、模型管理、订阅与钱包。
- 部署运维：SQLite/MySQL/PostgreSQL、Redis/内存缓存、Docker、前后端一体化嵌入、主从节点、性能指标、日志。

### 1.1 一句话理解

> 客户端只对接 new-api；new-api 负责鉴权、选渠道、改写请求、调用上游、流式转发、统计 usage、扣费、记录日志、异常重试和后台管理。

---

## 2. 目标与非目标

### 2.1 本文档目标

1. 解释每个主要目录/模块负责什么。
2. 说明最关键的业务链路：启动、登录鉴权、API Token、渠道选择、Relay、计费、日志、异步任务、前端后台。
3. 给出后续开发时应遵守的工程约束和检查清单。
4. 为新功能拆需求提供 PRD 模板与模块映射。

### 2.2 本文档非目标

- 不替代官方 API 文档、部署文档或 README。
- 不列出所有 endpoint 的完整参数定义，参数以 `dto/`、`controller/` 和前端 feature API 为准。
- 不改变现有项目品牌、模块命名、许可证或归属信息。
- 不评审现有代码质量；仅描述现状与开发准则。

---

## 3. 技术栈与运行形态

### 3.1 后端

| 项 | 说明 |
|---|---|
| 语言 | Go，`go.mod` 当前声明 Go 1.25.1；项目约定 Go 1.22+ |
| Web 框架 | Gin |
| ORM | GORM v2 |
| 数据库 | SQLite、MySQL、PostgreSQL 均需兼容 |
| 缓存 | Redis + 内存缓存 |
| 鉴权 | Session、Access Token、API Token、OAuth/OIDC、WebAuthn/Passkey、2FA |
| 国际化 | `go-i18n`，后端 locale 在 `i18n/locales/` |
| 上游调用 | `relay/` + `relay/channel/*` adapter |

### 3.2 前端

| 项 | 默认前端 `web/default` | 经典前端 `web/classic` |
|---|---|---|
| 框架 | React 19 + TypeScript | React 19，历史 classic UI |
| 构建 | Rsbuild | Rsbuild |
| 包管理 | Bun | Bun |
| 路由 | TanStack Router | React Router DOM |
| 状态/请求 | Zustand、TanStack Query、Axios | Axios 等历史实现 |
| UI | Base UI、Tailwind CSS、Hugeicons | Semi Design |
| i18n | i18next | i18next |

### 3.3 部署形态

- 默认服务端口：`3000`。
- Docker 构建分三段：
  1. `web/default` 构建产物；
  2. `web/classic` 构建产物；
  3. Go 编译并通过 `//go:embed` 将两个前端 dist 嵌入二进制。
- 运行时工作目录常见为 `/data`，SQLite 与日志等可落盘。
- 可通过 `FRONTEND_BASE_URL` 使用外置前端；master 节点会忽略该变量。

---

## 4. 顶层目录职责

| 路径 | 类型 | 职责 | 开发时重点 |
|---|---|---|---|
| `main.go` | 后端入口 | 加载 env、初始化 DB/Redis/i18n/OAuth/HTTP client/tokenizer/任务、注册 Gin 路由、启动服务 | 修改启动项、全局后台任务、嵌入前端时看这里 |
| `router/` | 路由层 | 挂载 `/api` 管理接口、`/v1` relay、dashboard 兼容接口、web 静态资源、视频任务路由 | 新 endpoint 首先确认属于管理 API 还是 relay API |
| `controller/` | 控制器层 | Gin handler；解析参数、调用 service/model、组织响应 | 保持薄控制器，业务逻辑尽量下沉到 service/model |
| `service/` | 业务服务层 | 计费、选渠道、token 计数、任务轮询、HTTP 客户端、敏感词、通知、支付辅助等 | 复杂业务与跨模块逻辑优先放这里 |
| `model/` | 数据模型与 DB | GORM 模型、迁移、CRUD、缓存同步、统计查询 | 必须兼容 SQLite/MySQL/PostgreSQL |
| `middleware/` | 中间件 | Session/Auth、TokenAuth、CORS、限流、选渠道、审计、性能、请求体复用/解压等 | Relay 链路核心在 `TokenAuth` + `Distribute` |
| `relay/` | Relay 编排 | 按请求类型选择 handler，做协议转换、上游请求、流式/非流式响应、结算入口 | 新 provider 或新 API 格式的主战场 |
| `relay/channel/` | Provider Adapter | 各供应商协议适配；含文本、图片、音频、embedding、rerank、task/video 等 | 新渠道需实现 adapter 接口并接入 `relay_adaptor.go` |
| `dto/` | DTO | 对外/对上游请求响应结构体 | 可选 scalar 字段必须用指针 + `omitempty` 保留显式零值 |
| `types/` | 通用类型 | Relay format、错误、价格数据、文件来源、并发 map 等 | 跨层共享类型放这里 |
| `constant/` | 常量 | 渠道类型、API 类型、上下文 key、任务平台、环境常量等 | 新渠道/新任务平台通常要新增常量 |
| `common/` | 基础设施工具 | JSON wrapper、env、Redis、crypto、限流、quota、cache、request body、系统监控等 | JSON marshal/unmarshal 必须走 `common/json.go` 包装 |
| `setting/` | 配置域 | ratio/model/operation/system/performance/billing/payment 等设置加载和转换 | 系统设置页面/DB options 对应这里 |
| `i18n/` | 后端 i18n | 后端多语言初始化、key、YAML locale | 新后端用户可见文案需加 key |
| `oauth/` | OAuth | GitHub、Discord、OIDC、LinuxDO、自定义 OAuth 注册和回调 | 新 OAuth provider 接入这里 |
| `logger/` | 日志 | 业务日志和 quota 格式化 | 不要在业务层散落不可控日志 |
| `pkg/billingexpr/` | 动态计费表达式 | 表达式编译、运行、结算、文档 | 改动态计费前必须读 `pkg/billingexpr/expr.md` |
| `pkg/cachex/` | 内部缓存组件 | hybrid cache、codec、namespace | 可复用缓存基础能力 |
| `pkg/ionet/` | io.net 客户端 | 部署、容器、硬件、价格等接口封装 | 模型部署功能依赖它 |
| `web/default/` | 默认前端 | 新版 React 19 管理后台和官网 | 新前端功能优先改这里 |
| `web/classic/` | 经典前端 | 历史 UI/兼容主题 | 只有 classic 兼容需求才改 |
| `docs/` | 文档 | 安装、渠道设置、翻译词汇、专项说明 | 新的项目 PRD/开发文档建议放这里 |
| `.github/` | 协作/CI | PR 模板、Issue 模板、GitHub Actions | 发 PR 必须沿用模板 |
| `Dockerfile` | 镜像构建 | 前端构建 + Go 编译 + runtime 镜像 | 修改构建链路时看这里 |

---

## 5. 后端模块拆解

### 5.1 启动与资源初始化

**关键文件**

- `main.go`
- `common/init.go`
- `model/main.go`
- `router/main.go`

**启动流程**

1. `InitResources()`：
   - 加载 `.env`。
   - `common.InitEnv()` 解析环境变量和命令行参数。
   - 初始化 logger、ratio 设置、HTTP client、tokenizer。
   - `model.InitDB()` 连接主数据库并迁移。
   - `model.CheckSetup()` 判断系统是否初始化。
   - `model.InitOptionMap()` 加载 DB options。
   - 清理磁盘缓存，加载 pricing。
   - `model.InitLogDB()` 初始化日志 DB。
   - 初始化 Redis、性能指标、系统监控、后端 i18n、自定义 OAuth provider。
2. main 中启动后台任务：
   - 渠道缓存同步、配置热更新、额度看板更新。
   - 自动更新/测试渠道。
   - Codex 凭证自动刷新。
   - 订阅额度重置。
   - Midjourney/视频等异步任务轮询。
   - 性能 profiling / pyroscope。
3. 创建 Gin server，挂载全局中间件：
   - recovery、request id、powered by、i18n、logger、session。
4. `router.SetRouter()` 挂载 API、Relay、Dashboard、Video、Web 路由。
5. 监听端口并运行。

**后续开发注意**

- 全局后台任务需考虑 master/slave 节点：主节点才应执行迁移和多数定时任务。
- 初始化顺序很重要：DB → options → pricing/log DB/Redis/i18n/OAuth。
- 启动失败应返回明确 error；非关键功能如 i18n/OAuth 自定义 provider 当前采取记录错误但不阻塞。

---

### 5.2 路由层 `router/`

| 文件 | 职责 |
|---|---|
| `router/main.go` | 总入口，按 API/Dashboard/Relay/Video/Web 分组挂载 |
| `router/api-router.go` | `/api` 管理后台、用户、渠道、令牌、日志、计费、模型、部署等 REST API |
| `router/relay-router.go` | `/v1`、`/v1beta`、`/mj`、`/suno` 等 AI 代理接口 |
| `router/video-router.go` | OpenAI-compatible video、Kling、Jimeng 等视频/任务接口 |
| `router/dashboard.go` | 兼容旧 dashboard billing/usage 接口 |
| `router/web-router.go` | 嵌入式前端静态资源与 SPA fallback |

**API 分类**

- 管理 API：`/api/...`，通常返回 `{ success, message, data }`。
- Relay API：`/v1/...`、`/v1beta/...`、`/mj/...` 等，尽量兼容 OpenAI/Claude/Gemini 等协议错误格式。
- Web：非 `/api`、非 `/v1` 的未命中路径回退到前端 SPA。

**新增 endpoint 建议**

1. 判断是否用户后台能力：放 `api-router.go`。
2. 判断是否 AI 代理能力：放 `relay-router.go` 或 `video-router.go`。
3. 挂对应鉴权中间件：`UserAuth`、`AdminAuth`、`RootAuth`、`TokenAuth`、`TokenOrUserAuth`。
4. 对写操作确认是否需要限流、审计、二次验证、关闭缓存。

---

### 5.3 控制器层 `controller/`

**职责**

- HTTP handler：读取参数、校验、调用 service/model、返回 JSON 或流式响应。
- 管理后台 API 的主要入口。
- Relay 顶层编排入口 `controller/relay.go`。

**代表模块**

| 文件/主题 | 功能 |
|---|---|
| `controller/user.go` | 注册、登录、用户自信息、用户 CRUD |
| `controller/token.go` | API Token 增删改查、批量获取 key、Token usage 查询 |
| `controller/channel.go` | 渠道 CRUD、测试、余额更新、模型抓取、多 key、标签等 |
| `controller/channel-test.go` | 渠道连通性测试 |
| `controller/model*.go` | 模型元数据、missing models、upstream sync、owner/vendor 等 |
| `controller/relay.go` | Relay 主流程、错误处理、重试、MJ/task 入口 |
| `controller/log.go` | 用户/管理员日志查询、统计 |
| `controller/billing.go`、`pricing.go`、`ratio_*` | 计费、价格、倍率配置 |
| `controller/subscription*.go` | 订阅计划、购买、支付回调 |
| `controller/topup*.go`、`redemption.go` | 充值、兑换码、支付渠道 |
| `controller/passkey.go`、`twofa.go`、`oauth.go` | 安全登录相关 |
| `controller/deployment.go` | 模型部署/io.net 管理 |
| `controller/performance.go`、`perf_metrics.go` | 系统性能与指标 |

**控制器开发原则**

- 控制器不要承载复杂业务规则；复杂逻辑放 `service/`。
- 统一响应格式；Relay 则按上游兼容协议返回错误。
- 管理写操作需要权限、审计、二次验证时，不要只依赖前端。

---

### 5.4 Service 层 `service/`

**职责**

Service 是跨 controller/model/relay 的业务编排层。它负责把“怎么做”从 controller 中抽离出来。

| 主题 | 关键文件 | 说明 |
|---|---|---|
| 渠道选择 | `channel_select.go`、`channel.go`、`channel_affinity.go` | 从缓存/DB 选可用渠道，支持 group、model、权重、优先级、亲和性、跨组重试 |
| 计费生命周期 | `billing.go`、`billing_session.go`、`pre_consume_quota.go`、`quota.go`、`tiered_settle.go` | 预扣费、结算、退款、订阅/钱包来源、动态表达式结算 |
| Token 估算 | `token_counter.go`、`token_estimator.go`、`tokenizer.go`、`text_quota.go`、`tool_billing.go` | 请求 token 估算、媒体/工具/响应 token 处理 |
| 异步任务 | `task.go`、`task_billing.go`、`task_polling.go`、`subscription_reset_task.go` | 视频/音乐/MJ 类任务提交、轮询、结算、超时退款 |
| HTTP | `http.go`、`http_client.go`、`download.go` | 上游 HTTP client、下载、超时、代理等 |
| 支付 | `epay.go`、`waffo_pancake.go` 等 | 支付平台辅助逻辑 |
| 安全 | `sensitive.go`、`notify-limit.go`、`violation_fee.go` | 敏感词、通知限制、违规扣费 |
| 日志信息 | `log_info_generate.go`、`usage_helpr.go` | usage/log other JSON 的生成和展示信息 |
| Codex | `codex_oauth.go`、`codex_credential_refresh*.go` | Codex/ChatGPT subscription 凭证刷新 |

**计费服务的核心概念**

- 预扣费：请求发往上游前，估算最大/预期消耗并冻结额度。
- 结算：上游返回实际 usage 后，按实际值补扣或返还。
- Refund：请求失败或上游失败时返还预扣。
- BillingSource：钱包额度或订阅额度。
- Tiered expr：模型开启 `tiered_expr` 时，表达式成为计费合同。

---

### 5.5 Model 层 `model/`

**职责**

- 定义 GORM 模型。
- 管理 DB 初始化、迁移、兼容差异。
- 实现常用查询、更新、统计、缓存同步。

**核心数据模型**

| 模型 | 文件 | 业务含义 |
|---|---|---|
| `User` | `user.go` | 用户、角色、分组、额度、绑定信息、设置 |
| `Token` | `token.go` | 用户 API Token，含 key、额度、模型限制、IP 限制、分组 |
| `Channel` | `channel.go` | 上游供应商渠道，含类型、key、base_url、模型、分组、多 key、映射、权重/优先级 |
| `Ability` | `ability.go` | 渠道可服务的 group/model 能力映射 |
| `Option` | `option.go` | 系统配置项，加载到 setting/option map |
| `Log` | `log.go` | 请求日志、用量、错误、other 扩展信息 |
| `QuotaData` / flow | `usedata*.go` | 仪表盘统计数据 |
| `Model` / `Vendor` | `model_meta.go`、`vendor_meta.go` | 模型/供应商元数据、价格/展示信息 |
| `Pricing` | `pricing*.go` | 模型价格配置与默认价格 |
| `Task` | `task.go` | 异步任务（视频/音乐/MJ 等）的提交和轮询状态 |
| `Midjourney` | `midjourney.go` | MJ 任务记录 |
| `TopUp` / `Redemption` | `topup.go`、`redemption.go` | 充值与兑换码 |
| `Subscription*` | `subscription.go` | 订阅计划、订单、用户订阅、预扣记录 |
| `PasskeyCredential` | `passkey.go` | WebAuthn/Passkey 凭据 |
| `TwoFA` / backup | `twofa.go` | 二次验证与备用码 |
| `CustomOAuthProvider` / binding | `custom_oauth_provider.go`、`user_oauth_binding.go` | 自定义 OAuth provider 与用户绑定 |
| `Setup` | `setup.go` | 首次安装初始化状态 |
| `PerfMetric` | `perf_metric.go` | 性能采样指标 |

**数据库兼容要求**

- 必须同时支持 SQLite、MySQL、PostgreSQL。
- 优先使用 GORM API；不可避免的 raw SQL 要处理方言差异。
- reserved words 如 `group`、`key` 使用 `model/main.go` 中的 `commonGroupCol`、`commonKeyCol`。
- bool 值 raw SQL 使用 `commonTrueVal` / `commonFalseVal`。
- SQLite 迁移避免不支持的 `ALTER COLUMN`。
- 不要直接使用 MySQL-only/PostgreSQL-only 特性，除非有 fallback。

---

### 5.6 中间件 `middleware/`

| 中间件 | 文件 | 作用 |
|---|---|---|
| Session/User/Admin/Root Auth | `auth.go` | 后台用户鉴权，要求 session/access token 与 `New-Api-User` header 匹配 |
| API Token Auth | `auth.go` | Relay 鉴权，兼容 Bearer、Claude `x-api-key`、Gemini query/header、MJ secret、Realtime subprotocol |
| Channel distribution | `distributor.go` | 解析请求模型，检查 token 模型限制，按 group/model/path 选择渠道，写入上下文 |
| Rate limit | `rate-limit.go`、`model-rate-limit.go` | 全局 API/Web、关键接口、搜索、模型请求限流 |
| CORS/Gzip/Cache | `cors.go`、`gzip.go`、`cache.go` | 跨域、压缩、静态资源缓存 |
| Request body | `body_cleanup.go`、`request_body_limit.go` | 请求体复用、限制、清理，支持重试时重读 body |
| Audit | `audit.go` | 管理/root 写操作审计 |
| Performance/Stats | `performance.go`、`stats.go` | 性能保护与请求统计 |
| i18n | `i18n.go` | 根据请求/用户加载语言 |
| Secure verification | `secure_verification.go` | 敏感操作二次验证 |
| Jimeng/Kling adapter | `jimeng_adapter.go`、`kling_adapter.go` | 特定视频 API 入参转换 |

**Relay 中最重要的链路**

`TokenAuth()` → `ModelRequestRateLimit()` → `Distribute()` → `controller.Relay()`。

`Distribute()` 负责选出初始渠道，后续失败重试时 `controller.Relay()` 会通过 `service.CacheGetRandomSatisfiedChannel()` 重新选择。

---

### 5.7 Relay 编排 `relay/`

**Relay 支持的格式**

- OpenAI Chat/Completions/Moderations。
- OpenAI Responses/Responses Compact。
- OpenAI Realtime WebSocket。
- OpenAI Images、Embeddings、Audio。
- Claude Messages。
- Gemini native 路径。
- Rerank。
- Midjourney proxy。
- Suno/video/任务类 API。

**关键文件**

| 文件 | 说明 |
|---|---|
| `controller/relay.go` | Relay 顶层流程、预扣费、重试、错误响应 |
| `relay/compatible_handler.go` | OpenAI-compatible 文本处理 |
| `relay/claude_handler.go` | Claude 请求处理 |
| `relay/gemini_handler.go` | Gemini 请求处理 |
| `relay/responses_handler.go` | OpenAI Responses 请求处理 |
| `relay/image_handler.go` | 图片请求处理 |
| `relay/audio_handler.go` | 音频请求处理 |
| `relay/embedding_handler.go` | embedding 请求处理 |
| `relay/rerank_handler.go` | rerank 请求处理 |
| `relay/websocket.go` | Realtime WebSocket relay |
| `relay/relay_task.go` | 异步任务提交/查询 |
| `relay/relay_adaptor.go` | channel type/API type 到 adapter 的映射 |
| `relay/common/relay_info.go` | `RelayInfo` 上下文，贯穿整个请求生命周期 |

**标准 Relay 请求生命周期**

1. 客户端调用 `/v1/...`、`/v1beta/...`、`/mj/...` 等接口。
2. `TokenAuth` 验证 API Token，并写入用户、token、group、quota 等上下文。
3. `Distribute` 读取模型名，检查模型限制，按分组和模型选择渠道。
4. `controller.Relay`：
   - `helper.GetAndValidateRequest` 解析并校验请求 DTO。
   - `relaycommon.GenRelayInfo` 生成 `RelayInfo`。
   - 敏感词检查。
   - 估算 token。
   - 计算价格/预扣费。
5. 调用对应 relay helper：Text、Claude、Gemini、Responses、Image、Audio、Embedding、Rerank、Realtime。
6. Adapter：
   - 初始化 channel meta。
   - 生成上游 URL。
   - 设置上游 header。
   - 转换请求体。
   - 发起上游请求。
   - 解析/转发响应。
7. 根据 usage 结算实际额度，记录日志和性能指标。
8. 若失败：按状态码/错误码/配置判断是否重试；必要时自动禁用渠道、记录错误日志、退款或违规扣费。

---

### 5.8 Provider Adapter `relay/channel/`

**核心接口**

`relay/channel/adapter.go` 定义：

- `Adaptor`：文本、Claude、Gemini、embedding、audio、image、responses、rerank 等同步/流式接口适配。
- `TaskAdaptor`：视频/音乐/异步任务提交、轮询、任务结果解析、任务计费调整。
- `OpenAIVideoConverter`：任务结果转换为 OpenAI video 格式。

**当前主要 provider 目录示例**

| Provider | 目录 |
|---|---|
| OpenAI/OpenAI-compatible | `relay/channel/openai/` |
| Claude/Anthropic | `relay/channel/claude/` |
| Gemini | `relay/channel/gemini/` |
| AWS Bedrock | `relay/channel/aws/` |
| Azure | 通过 OpenAI/adaptor + channel meta 支持 |
| Ali/DashScope | `relay/channel/ali/` |
| Baidu/Qianfan | `relay/channel/baidu/`、`baidu_v2/` |
| VolcEngine/Doubao | `relay/channel/volcengine/`、`task/doubao/` |
| Cohere/Jina Rerank | `relay/channel/cohere/`、`jina/` |
| Ollama/Xinference | `relay/channel/ollama/`、OpenAI-compatible |
| xAI/DeepSeek/Mistral/Moonshot/Perplexity | 对应目录 |
| Sora/Kling/Jimeng/Vidu/Suno/Hailuo | `relay/channel/task/*` |
| Advanced Custom | `relay/channel/advancedcustom/` |

**新增渠道 Checklist**

1. 在 `constant/channel.go` 增加 `ChannelType*`、默认 base URL、展示名。
2. 如需要，补充 `constant/api_type.go` 与 `common.ChannelType2APIType` 映射。
3. 新建 `relay/channel/<provider>/adaptor.go`，实现 `channel.Adaptor`；异步任务实现 `TaskAdaptor`。
4. 在 `relay/relay_adaptor.go` 的 `GetAdaptor()` / `GetTaskAdaptor()` 注册。
5. 确认是否支持 stream options；支持则加到 `relay/common/relay_info.go` 的 `streamSupportedChannels`。
6. 补充默认模型列表、模型价格、渠道测试模型、前端渠道类型配置。
7. DTO 中可选 scalar 字段使用指针 + `omitempty`，避免显式 `0/false` 被丢弃。
8. 添加真实契约测试：请求转换、usage 解析、流式 chunk、错误映射、计费结算。

---

### 5.9 DTO / Types / Constant

| 模块 | 作用 |
|---|---|
| `dto/` | 请求/响应结构，承担协议边界；如 OpenAI、Claude、Gemini、Audio、Image、Rerank、Task、Pricing |
| `types/` | 跨层类型：错误、relay format、价格数据、request meta、文件数据等 |
| `constant/` | 全局常量：channel type、api type、context key、task platform、finish reason、endpoint type 等 |

**重要约束**

- 业务代码 JSON marshal/unmarshal 必须使用 `common.Marshal` / `common.Unmarshal` 等包装。
- DTO 可引用 `encoding/json` 的类型（如 `json.RawMessage`），但实际 marshal/unmarshal 不应直接调标准库。
- Relay 请求 DTO 中 optional scalar 用指针，确保 absent 与显式零值可区分。

---

### 5.10 Setting 配置域 `setting/`

| 子目录/文件 | 功能 |
|---|---|
| `ratio_setting/` | 模型倍率、分组倍率、cache ratio、compact suffix、暴露价格等 |
| `model_setting/` | Claude/Gemini/Grok/Qwen/global 等模型相关配置 |
| `operation_setting/` | 自动禁用关键字、状态码重试规则、支付开关、quota、监控、check-in、token 设置 |
| `system_setting/` | Discord/OIDC/passkey/legal/theme 等系统设置 |
| `performance_setting/` | 性能相关配置 |
| `perf_metrics_setting/` | perf metrics 配置 |
| `billing_setting/` | tiered/dynamic billing 配置 |
| `console_setting/` | 控制台设置与验证 |
| `payment_*` | Stripe/Creem/Waffo/Waffo Pancake 等支付配置 |
| `sensitive.go` | 敏感词配置 |
| `auto_group.go`、`user_usable_group.go` | 用户可用分组、auto group |

**配置流向**

DB `options` 表 → `model.InitOptionMap()` → `setting/*` 解析 → service/controller/relay 使用。

---

### 5.11 Auth / OAuth / 安全

**主要能力**

- 用户登录/注册/重置密码。
- Session cookie。
- Access Token 用于后台 API。
- API Token 用于 Relay。
- OAuth provider：GitHub、Discord、OIDC、LinuxDO，以及 DB 驱动的自定义 OAuth。
- Telegram/WeChat 等非标准 OAuth 路径。
- Passkey/WebAuthn。
- 2FA 与 backup codes。
- Turnstile、关键接口限流、邮箱验证限流。
- 管理写操作审计。

**重要行为**

后台 `UserAuth/AdminAuth/RootAuth` 会要求请求带 `New-Api-User` header，且与 session/access token 中用户 ID 匹配。前端统一在 Axios 拦截器里从 localStorage 读取 `uid` 并附加该 header。

---

### 5.12 Billing / Pricing / Subscription

**计费概念**

| 概念 | 说明 |
|---|---|
| Quota | 系统内部额度单位 |
| User quota | 用户钱包余额 |
| Token quota | 单个 API Token 剩余额度，可无限 |
| Group ratio | 分组倍率 |
| Model ratio | 模型倍率 |
| PriceData | 一次请求的价格计算上下文 |
| BillingSession | 预扣、结算、退款统一生命周期 |
| Subscription | 按周期/额度/用量的订阅计划 |
| Tiered expr | 表达式定义模型真实价格 |

**动态计费表达式**

`pkg/billingexpr/expr.md` 是权威设计说明。核心原则：

- 一条表达式就是一个模型的计费合同。
- 价格系数用真实 `$ / 1M tokens`。
- `p/c/cr/cc/cc1h/img/ai/ao` 等变量由系统根据 usage 归一化。
- 表达式在预扣与结算时使用同一 snapshot，避免中途配置变化影响请求。

**开发注意**

- 改计费必须覆盖预扣、实际结算、退款、日志展示、订阅和钱包两条路径。
- 测试应覆盖 explicit usage、cache/image/audio、多 tier、异常退款、订阅额度不足等真实业务不变量。

---

### 5.13 日志、统计与性能

| 能力 | 模块 |
|---|---|
| 请求日志 | `model/log.go`、`controller/log.go`、`service/log_info_generate.go` |
| 错误日志 | `constant.ErrorLogEnabled`、`controller/relay.go` 的 channel error 记录 |
| 用量看板 | `model/usedata*.go`、`controller/usedata.go` |
| 排名 | `controller/rankings.go`、`service/rankings.go` |
| 性能指标 | `pkg/perf_metrics/`、`controller/perf_metrics.go` |
| 系统监控 | `common/system_monitor*.go` |
| pprof/pyroscope | `ENABLE_PPROF`、`common/pyro.go` |

**日志开发要求**

- 不记录完整密钥、敏感用户信息或完整敏感请求体。
- Relay 错误应附 request id，方便排查。
- 计费/usage 相关日志要能解释最终扣费原因。

---

### 5.14 异步任务与视频/媒体

**入口**

- `/mj/...` Midjourney proxy。
- `/suno/...` Suno。
- `/v1/video/generations`、`/v1/videos` OpenAI-compatible video。
- `/kling/v1/...` Kling。
- `/jimeng` Jimeng。

**核心模块**

- `controller.RelayTask` / `RelayTaskFetch`。
- `relay/relay_task.go`。
- `relay/channel/task/*`。
- `model/task.go`。
- `service/task_polling.go`、`task_billing.go`。

**任务生命周期**

1. 提交请求并解析平台/动作/模型。
2. 强制预扣费，因为任务可能在请求返回后继续运行。
3. 上游返回 task id 后落库。
4. 后台轮询任务状态。
5. 成功/失败/超时后更新状态，并按实际结果结算或退款。
6. 可转换为 OpenAI video 响应格式。

---

## 6. 前端模块拆解

### 6.1 前端入口与基础设施

**关键文件**

| 文件 | 作用 |
|---|---|
| `web/default/src/main.tsx` | React 入口，初始化 QueryClient、Router、Theme/Font/Direction Provider、系统品牌信息 |
| `web/default/src/routeTree.gen.ts` | TanStack Router 生成路由树 |
| `web/default/rsbuild.config.ts` | Rsbuild 配置、dev proxy、代码分割、别名 `@` |
| `web/default/src/lib/api.ts` | Axios 实例、请求去重、错误处理、`New-Api-User` header、通用 API |
| `web/default/src/stores/auth-store.ts` | Zustand 用户登录态，持久化 localStorage `user` |
| `web/default/src/i18n/config.ts` | i18next 初始化 |
| `web/default/src/styles/` | 全局样式、主题变量、预设主题 |

**前端请求约定**

- 同源请求，`baseURL = ''`。
- Axios `withCredentials: true`。
- 所有请求会自动携带 `New-Api-User` header（来自 localStorage `uid`）。
- GET 请求默认去重，可通过 `disableDuplicate` 关闭。
- 全局处理 401/500 和业务 `success=false`。

---

### 6.2 路由结构 `web/default/src/routes/`

| 路由区域 | 页面 |
|---|---|
| Public | 首页 `/`、关于、价格、排行榜、用户协议、隐私政策 |
| Setup | `/setup` 首次安装向导 |
| Auth | 登录、注册、忘记密码、重置密码、OTP、OAuth 回调 |
| Authenticated layout | `_authenticated/route.tsx` 下的后台页面 |
| Dashboard | `/dashboard` 概览、模型、用户、流量等 section |
| Channels | `/channels` 渠道管理 |
| Keys | `/keys` API Key 管理 |
| Models | `/models` 模型、供应商、部署、prefill group 等 |
| Playground | `/playground` 聊天测试台 |
| Profile | `/profile` 用户资料、安全、passkey、2FA、语言偏好 |
| Wallet | `/wallet` 钱包、充值、支付 |
| Subscriptions | `/subscriptions` 订阅计划与管理 |
| Usage Logs | `/usage-logs` 用户/管理员日志 |
| Users | `/users` 用户管理 |
| Redemption Codes | `/redemption-codes` 兑换码管理 |
| System Settings | `/system-settings/...` 系统/认证/计费/内容/模型/运维/安全/站点设置 |
| Errors | 401/403/404/500/503 |

---

### 6.3 Feature 模块 `web/default/src/features/`

默认前端按 feature 组织：`api.ts`、`types.ts`、`constants.ts`、`components/`、`hooks/`、`lib/`。

| Feature | 说明 | 后端接口大致对应 |
|---|---|---|
| `home` | 官网首页模块、动态内容、hero/stats/features | `/api/home_page_content`、status |
| `about` / `legal` | 关于、协议、隐私、公告类内容 | `/api/about`、`/api/user-agreement`、`/api/privacy-policy` |
| `auth` | 登录、注册、OAuth、OTP、Passkey、secure verification | `/api/user/*`、`/api/oauth/*`、`/api/verify` |
| `setup` | 首次安装向导 | `/api/setup` |
| `dashboard` | 总览、模型/用户/流量统计、公告、性能健康 | `/api/status`、`/api/data/*`、`/api/log/*`、`/api/perf-metrics/*` |
| `channels` | 渠道 CRUD、测试、余额、模型抓取、多 key、标签、参数/header override、上游更新 | `/api/channel/*` |
| `keys` | API Token 管理、批量删除、复制 key、分组/模型限制 | `/api/token/*` |
| `models` | 模型元数据、供应商、prefill group、部署/io.net | `/api/models/*`、`/api/vendors/*`、`/api/deployments/*` |
| `pricing` | 价格页、模型详情、性能/稳定性图表 | `/api/pricing`、`/api/perf-metrics` |
| `playground` | 聊天测试台、stream 请求、消息操作 | `/pg/chat/completions` |
| `profile` | 用户资料、语言、sidebar modules、Passkey、2FA、check-in | `/api/user/self`、`/api/user/passkey`、`/api/user/2fa/*`、`/api/user/checkin` |
| `wallet` | 充值、金额计算、支付、余额、兑换 | `/api/user/topup/*`、`/api/user/pay`、payment APIs |
| `subscriptions` | 订阅计划、购买、管理员计划管理 | `/api/subscription/*` |
| `usage-logs` | 使用日志、错误日志、统计查询 | `/api/log/*` |
| `users` | 用户管理、绑定清理、2FA 管理 | `/api/user/*` admin routes |
| `redemption-codes` | 兑换码 CRUD | `/api/redemption/*` |
| `system-settings` | 系统配置入口，分认证/计费/内容/模型/操作/安全/站点 | `/api/option/*` 及各专项接口 |
| `rankings` | 模型/供应商使用排行与趋势 | `/api/rankings` |
| `performance-metrics` | 性能指标展示辅助 | `/api/perf-metrics/*` |
| `errors` | 错误页 | 前端路由 |

---

### 6.4 通用前端模块

| 路径 | 说明 |
|---|---|
| `components/` | 通用 UI：Dialog、Confirm、DataTable 辅助、Theme switch、Language switcher、Turnstile、Provider badge 等 |
| `components/ui/` | 基础 UI 组件封装 |
| `components/data-table/` | 表格能力、README、列/分页/批量等基础组件 |
| `hooks/` | 通用 hook：admin 判断、status、notifications、sidebar、debounce、media query、table URL state |
| `context/` | theme、font、direction、layout、search、theme customization provider |
| `lib/` | API、错误处理、格式化、时间、角色、OAuth、Passkey、主题、图表 theme、常量等 |
| `stores/` | Zustand store：auth、notification、system config |
| `assets/` | logo、品牌 icon、自定义布局/主题 icon |
| `i18n/` | locale JSON、语言列表、静态 key、同步报告 |

---

### 6.5 前端开发规范

- 包管理和脚本使用 Bun。
- 改 TS/TSX 后至少执行 `bun run typecheck`；发布前执行 lint/format/build。
- 用户可见文案必须 i18n。
- 使用 TanStack Query 管理服务端状态，mutation 成功后 invalidate 相关 query。
- 使用统一 Axios `api` 实例，不要绕过全局认证/错误处理。
- 表单优先 React Hook Form + Zod。
- 样式优先 Tailwind 与 CSS variables，保持暗色模式兼容。
- 组件 props 不必要时不解构，减少复杂度。
- 测试聚焦真实用户行为，不为覆盖率写无意义测试。

---

## 7. 核心业务流程

### 7.1 用户登录与后台请求

1. 用户通过账号密码/OAuth/Passkey 登录。
2. 后端设置 session，前端保存用户信息与 `uid`。
3. 前端 Axios 请求 `/api/...` 自动带 cookie 与 `New-Api-User`。
4. `UserAuth/AdminAuth/RootAuth` 校验：
   - session 或 access token 有效；
   - 用户未禁用；
   - 角色足够；
   - `New-Api-User` 与 session 用户 ID 一致。
5. handler 返回业务数据。

### 7.2 API Token 调用 Relay

1. 用户在后台创建 API Token，可设置额度、有效期、IP、模型限制、分组。
2. 客户端用 `Authorization: Bearer sk-...` 调用 `/v1/chat/completions` 等接口。
3. `TokenAuth` 解析 key，验证 token 状态、用户状态、额度。
4. `Distribute`：
   - 从请求体解析 `model`；
   - 检查 token 模型限制；
   - 根据 token group / user group / auto group 选择渠道；
   - 写入 channel context。
5. `controller.Relay` 完成预扣费、上游调用、结算和日志。

### 7.3 渠道选择与重试

1. 每个 Channel 声明：类型、模型列表、分组、权重、优先级、base URL、Key、模型映射等。
2. Ability/缓存维护 group-model-channel 能力。
3. 请求进来后按 group + model + path 过滤可用渠道。
4. 支持 channel affinity：同一上下文优先使用历史成功渠道。
5. 上游失败后：
   - 判断错误是否可重试；
   - 自动禁用关键错误渠道；
   - 重新选择渠道；
   - 超过重试次数则返回错误并退款/记录。

### 7.4 计费与日志

1. 请求前估算 prompt/max tokens、图片/音频/工具等信息。
2. 根据模型价格、分组倍率、计费模式计算预扣额度。
3. 钱包或订阅 `BillingSession` 预扣。
4. 上游响应返回 usage。
5. 用实际 usage 结算：补扣或返还。
6. 记录 Log：用户、token、model、channel、耗时、stream、usage、quota、错误/other 信息。
7. 异步更新看板/排行/性能指标。

### 7.5 异步任务

1. 提交视频/音乐/MJ 类任务。
2. 解析模型/动作，强制预扣。
3. 上游返回 task id 后保存 `model.Task`。
4. 后台轮询任务，更新状态。
5. 成功后结算；失败/超时退款或按规则扣费。
6. 用户通过 fetch 接口查询任务结果或拉取视频内容。

---

## 8. 环境变量与配置入口

常见 `.env.example` 项：

| 变量 | 说明 |
|---|---|
| `PORT` | 服务端口，默认 3000 |
| `FRONTEND_BASE_URL` | 外置前端地址；master 节点会忽略 |
| `DEBUG` | 调试模式 |
| `ENABLE_PPROF` | 开启 pprof 端口与监控 |
| `PYROSCOPE_*` | Pyroscope profiling |
| `SQL_DSN` | 主数据库 DSN；空时默认 SQLite |
| `LOG_SQL_DSN` | 日志数据库 DSN；空时共用主库 |
| `SQLITE_PATH` | SQLite 路径 |
| `SQL_MAX_IDLE_CONNS` / `SQL_MAX_OPEN_CONNS` / `SQL_MAX_LIFETIME` | DB 连接池 |
| `REDIS_CONN_STRING` | Redis 连接 |
| `SYNC_FREQUENCY` | 缓存/配置同步频率 |
| `MEMORY_CACHE_ENABLED` | 启用内存缓存 |
| `CHANNEL_UPDATE_FREQUENCY` | 自动渠道更新频率 |
| `BATCH_UPDATE_ENABLED` / `BATCH_UPDATE_INTERVAL` | 批量更新 |
| `UPDATE_TASK` | 是否启用异步任务轮询 |
| `RELAY_TIMEOUT` / `STREAMING_TIMEOUT` | Relay 超时 |
| `TLS_INSECURE_SKIP_VERIFY` | 跳过 TLS 校验，不建议生产开启 |
| `SESSION_SECRET` / `CRYPTO_SECRET` | 会话/加密密钥 |
| `GENERATE_DEFAULT_TOKEN` | 是否生成默认 token |
| `GET_MEDIA_TOKEN` | 是否统计媒体 token |
| `ERROR_LOG_ENABLED` | 是否记录上游错误日志 |
| `NODE_TYPE` | master/slave 节点 |
| `TRUSTED_REDIRECT_DOMAINS` | 支付跳转可信域名 |

---

## 9. 非功能需求

### 9.1 安全

- 所有管理接口必须有后端权限校验。
- 敏感操作需要限流、二次验证或审计。
- 密钥只展示脱敏值；获取完整 key 需更高权限和安全校验。
- 外部 URL、文件下载、代理请求需要 SSRF 防护和大小限制。
- 支付回调必须校验签名/环境/幂等性。
- 不应在日志中泄漏 API key、用户邮箱明文、完整敏感 prompt。

### 9.2 兼容性

- DB：SQLite、MySQL、PostgreSQL 同时兼容。
- API：OpenAI/Claude/Gemini 等客户端应尽量无感接入。
- 前端：默认主题与 classic 主题可以由后端静态资源服务切换。
- 国际化：新增用户可见文案必须补 locale。

### 9.3 性能

- 流式响应不可被 gzip 中间件破坏。
- 请求体复用需避免大 body 内存膨胀；遵守 `MAX_REQUEST_BODY_MB`。
- 渠道/用户/token 缓存要考虑 Redis 与内存模式。
- 统计/日志/性能采样尽量异步，不阻塞 Relay 主路径。

### 9.4 可观测性

- 每个 Relay 请求有 request id。
- 上游错误、渠道 ID、状态码、重试链路需可追踪。
- 计费日志需能解释预扣、补扣、返还。
- 管理员需要能从后台看到渠道健康、性能、用量、排行。

---

## 10. 后续开发工作流

### 10.1 新增一个普通后台功能

1. 明确角色权限：普通用户 / admin / root。
2. Model：是否需要新表或新增字段；设计跨 DB 迁移。
3. Service：实现核心业务逻辑。
4. Controller：实现 handler，统一响应格式。
5. Router：挂载到 `/api/...` 并选择中间件。
6. Frontend：在 `web/default/src/features/<feature>/` 添加 api/types/components/hooks。
7. Route：在 `src/routes/_authenticated/...` 添加页面。
8. i18n：补齐 locale。
9. 测试：后端 table tests；前端 typecheck/lint/build。
10. 文档：必要时更新 PRD/README/docs。

### 10.2 新增一个 Provider/渠道

1. 常量和 base URL。
2. Adapter 实现。
3. 注册到 `relay_adaptor.go`。
4. request/response/stream/usage/error 转换。
5. 价格和模型元数据。
6. 渠道测试与前端渠道表单配置。
7. 多 key/模型映射/参数覆盖兼容。
8. stream options 判断。
9. 覆盖测试：显式零值、流式 usage、错误映射、重试、计费。

### 10.3 修改计费/价格

1. 先阅读 `pkg/billingexpr/expr.md`。
2. 明确影响范围：钱包、订阅、预扣、结算、日志、前端展示。
3. 为同一请求固定 snapshot，避免请求过程中配置变化。
4. 测试真实账务不变量：不重复扣费、不漏退款、不因 cache/image/audio 重复计价。
5. 回归渠道：OpenAI 格式、Claude 格式、流式、非流式、异步任务。

### 10.4 修改前端页面

1. 定位 feature。
2. API 调用放 feature `api.ts` 或通用 `lib/api.ts`。
3. 类型放 `types.ts`。
4. 常量文案可放 `constants.ts`，渲染时走 `t()`。
5. 表单用 RHF + Zod。
6. 服务端状态用 React Query。
7. 改动后执行：
   - `cd web/default && bun run typecheck`
   - `cd web/default && bun run lint`
   - `cd web/default && bun run build`

---

## 11. 验收标准

### 11.1 后端变更

- `go test ./...` 通过，或说明无法运行原因。
- 新 DB 逻辑已考虑 SQLite/MySQL/PostgreSQL。
- 新 JSON marshal/unmarshal 走 `common.*` wrapper。
- 新 relay DTO optional scalar 使用 pointer + `omitempty`。
- 关键路径有真实行为测试，不添加只为覆盖率的空测试。
- Relay 变更验证至少包含一种成功响应和一种上游错误响应。

### 11.2 前端变更

- `bun run typecheck` 通过。
- `bun run lint` 通过。
- `bun run build` 通过。
- 用户可见文案已 i18n。
- 表单/表格/弹窗符合现有 feature 结构。
- 不绕过统一 API client 和错误处理。

### 11.3 计费/支付变更

- 覆盖预扣、结算、退款、异常、幂等。
- 日志能解释最终扣费。
- 支付回调有签名/环境/重复回调保护。
- 订阅和钱包路径均验证。

### 11.4 渠道/Provider 变更

- 渠道可创建、测试、启用、被选中。
- 支持的 API 格式可真实转发。
- 流式/非流式 usage 正确。
- 错误码映射和重试规则符合预期。
- 不支持的能力给出明确错误，而不是静默失败。

---

## 12. 风险与重点关注

| 风险 | 说明 | 建议 |
|---|---|---|
| DB 方言差异 | raw SQL、bool、JSON、reserved words 容易不兼容 | 优先 GORM，必要 raw SQL 加三库分支 |
| 计费错误 | 预扣/结算/退款任一环节错误会造成账务问题 | 账务逻辑必须有确定性测试 |
| Provider 协议差异 | 各上游 usage、stream、错误格式不同 | Adapter 内隔离差异，不污染通用流程 |
| 显式零值丢失 | Go `omitempty` + 非指针 scalar 会丢 `0/false` | DTO 可选 scalar 用指针 |
| 缓存一致性 | Redis/内存/DB 混合时可能读旧数据 | 更新关键状态后同步/失效缓存 |
| 大请求体 | 图片/音频/多轮上下文可能造成内存压力 | 使用 body storage 限制和复用，避免多次全量拷贝 |
| 前端权限假象 | 只隐藏按钮不等于权限控制 | 后端必须强校验 |
| 异步任务退款 | 任务失败/超时后若未退款会损害用户 | 轮询状态机要有终态处理 |
| 多主题兼容 | default/classic 两套前端可能能力不一致 | 新功能优先 default，必要时补 classic 或说明不支持 |

---

## 13. 建议的后续迭代 Backlog

### P0：接手稳定性

- 梳理并补充本地开发启动文档：后端、默认前端、classic 前端、Docker。
- 建立最小回归脚本：后端关键单测 + default 前端 typecheck/build。
- 为 Relay 主链路画一份更细的时序图或 ADR。
- 明确 SQLite/MySQL/PostgreSQL 的 CI 覆盖策略。

### P1：Provider 与计费可维护性

- 为新增 provider 提供标准模板和测试样例。
- 对各 provider usage 解析建立统一 fixtures。
- 完善 tiered billing 前端编辑器与后端 expr 文档同步。
- 增加渠道错误分类与自动禁用原因可视化。

### P2：后台体验

- 渠道表单按 provider 动态展示必填项和能力说明。
- 模型/价格/性能页增加“配置来源”和“最后更新时间”。
- 日志页增强 request id、重试链路、计费解释展示。
- 用户 token 权限模型做可视化预览。

### P3：运维与可观测

- 增加健康检查和关键依赖状态汇总。
- 优化 perf metrics 的采样、存储和告警接口。
- 明确主从节点任务调度边界。
- 形成生产环境安全配置 checklist。

---

## 14. 新需求 PRD 模板

后续每个功能可以复制以下模板放到 `docs/prd/<feature-name>.md`。

```markdown
# <功能名> PRD

## 1. 背景
- 当前问题：
- 目标用户：
- 业务价值：

## 2. 目标 / 非目标
### 目标
1.
2.

### 非目标
1.

## 3. 用户故事
- 作为 <角色>，我希望 <能力>，以便 <收益>。

## 4. 功能范围
| 模块 | 需求 | 优先级 | 备注 |
|---|---|---|---|
| 后端 API |  | P0 |  |
| 前端页面 |  | P0 |  |
| 数据模型 |  | P0 |  |
| 计费/日志 |  | P1 |  |

## 5. 技术方案
### 后端
- Router：
- Controller：
- Service：
- Model：
- Middleware/Auth：

### 前端
- Route：
- Feature：
- API：
- State/Query：
- i18n：

## 6. 数据与接口
### 表/字段变更

### API
| Method | Path | Auth | Request | Response |
|---|---|---|---|---|

## 7. 边界条件
- 权限：
- 限流：
- 幂等：
- 异常：
- 兼容性：SQLite/MySQL/PostgreSQL

## 8. 验收标准
- [ ] 后端测试通过
- [ ] 前端 typecheck/lint/build 通过
- [ ] 权限校验通过
- [ ] i18n 完整
- [ ] 日志/审计/计费符合预期

## 9. 发布与回滚
- 配置项：
- 迁移：
- 回滚策略：
```

---

## 15. 第一次接手推荐阅读顺序

1. `README.md` / `README.zh_CN.md`：理解产品能力和部署方式。
2. `CLAUDE.md` / `AGENTS.md`：理解项目强约束。
3. `main.go`：理解启动流程。
4. `router/api-router.go`、`router/relay-router.go`：理解 API 边界。
5. `middleware/auth.go`、`middleware/distributor.go`：理解鉴权和选渠道。
6. `controller/relay.go`：理解请求主链路。
7. `relay/channel/adapter.go`、`relay/relay_adaptor.go`：理解 provider 接入方式。
8. `model/main.go`、`model/channel.go`、`model/token.go`、`model/user.go`：理解数据模型。
9. `service/billing.go`、`service/billing_session.go`、`service/tiered_settle.go`：理解计费。
10. `web/default/src/main.tsx`、`web/default/src/routes/`、`web/default/src/features/`：理解前端。
11. `pkg/billingexpr/expr.md`：如果涉及动态计费，必须阅读。

---

## 16. 快速定位表

| 想做什么 | 先看哪里 |
|---|---|
| 新增后台页面 | `web/default/src/routes/_authenticated` + `web/default/src/features` |
| 新增管理 API | `router/api-router.go` + `controller/` + `service/` + `model/` |
| 新增 Relay API 路径 | `router/relay-router.go` 或 `router/video-router.go` |
| 新增 provider | `constant/channel.go` + `relay/channel/` + `relay/relay_adaptor.go` |
| 调整渠道选择 | `middleware/distributor.go` + `service/channel_select.go` |
| 调整 API Token | `model/token.go` + `controller/token.go` + `middleware/auth.go` |
| 调整用户/权限 | `model/user.go` + `controller/user.go` + `middleware/auth.go` |
| 调整计费 | `service/billing*.go` + `relay/helper/price.go` + `pkg/billingexpr/` |
| 调整模型价格 | `model/pricing*.go` + `setting/ratio_setting/` + `web/default/src/features/pricing` |
| 调整系统设置 | `model/option.go` + `setting/*` + `controller/option.go` + `features/system-settings` |
| 查请求日志 | `model/log.go` + `controller/log.go` + `features/usage-logs` |
| 查统计看板 | `model/usedata*.go` + `features/dashboard` |
| 调整 OAuth | `oauth/` + `controller/oauth.go` + `features/auth` |
| 调整 Passkey/2FA | `model/passkey.go`、`model/twofa.go` + `controller/passkey.go`、`twofa.go` |
| 调整 Docker 构建 | `Dockerfile` + `web/*/package.json` + `main.go` embed |

---

## 17. 文档维护规则

- 需求变化后，如果涉及模块边界、核心流程或验收标准，应同步更新本文档。
- 专项功能 PRD 建议放 `docs/prd/`，命名为 `<feature-name>.md`。
- 文档只描述项目和需求，不应包含密钥、真实用户数据、支付私密配置。
- 不要删除或替换项目既有品牌、版权、许可证、归属信息。
