# 01. 启动与运行时模块 PRD

## 1. 背景

启动与运行时模块负责把配置、数据库、缓存、前端静态资源、后台任务和 HTTP 服务组装成一个可运行的 new-api 实例。它是所有业务模块的根入口。

## 2. 模块边界

### 负责

- 读取 `.env`、命令行参数和环境变量。
- 初始化日志、HTTP client、tokenizer、ratio settings。
- 初始化主数据库、日志数据库、Redis、内存缓存。
- 初始化系统设置、价格数据、i18n、自定义 OAuth provider。
- 启动后台任务：渠道缓存同步、配置同步、数据看板、渠道测试、任务轮询、订阅重置、Codex 凭证刷新、性能监控。
- 创建 Gin server，挂载全局中间件和路由。
- 嵌入并服务 default/classic 前端构建产物。

### 不负责

- 不实现具体业务 API。
- 不直接处理用户请求的业务逻辑。
- 不定义数据库模型和 provider 协议转换。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `main.go` | 程序入口、资源初始化、server 启动、前端 embed |
| `common/init.go` | 命令行参数、env、session secret、数据库连接相关 env、限流 env |
| `model/main.go` | DB 选择、迁移、连接池、日志 DB |
| `router/main.go` | API/Dashboard/Relay/Video/Web 路由统一挂载 |
| `Dockerfile` | 构建 default/classic 前端并嵌入 Go 二进制 |

## 4. 用户故事

- 作为部署者，我希望服务只需一个二进制或 Docker 容器即可启动，以便快速私有化部署。
- 作为运维，我希望启动时能自动迁移数据库并启动必要后台任务，以便降低维护成本。
- 作为开发者，我希望初始化顺序清晰，以便新增全局资源时不破坏现有链路。

## 5. 功能需求

### P0

- 服务启动时必须完成 DB、Redis、Options、i18n、OAuth 等基础资源初始化。
- master 节点执行迁移和主任务；slave 节点避免执行不应重复的迁移/任务。
- 启动失败必须明确记录错误并停止，避免半可用状态。
- Gin server 必须挂载 recovery、request id、i18n、logger、session。

### P1

- 后台任务应具备可配置开关或频率。
- 性能监控、pprof、pyroscope 可通过 env 控制。
- 外置前端 `FRONTEND_BASE_URL` 与内置前端模式可切换。

## 6. 非功能需求

- 启动流程应幂等，重复启动不会重复破坏数据。
- DB 连接池参数可配置。
- 任务启动应避免 panic 导致主进程退出；关键任务失败需记录清晰日志。
- 不应在启动日志泄漏密钥。

## 7. 接口与数据

本模块对外主要暴露运行时能力，不直接暴露业务 API。关键 env：

| 变量 | 用途 |
|---|---|
| `PORT` | HTTP 监听端口 |
| `SQL_DSN` / `LOG_SQL_DSN` | 主库/日志库 DSN |
| `REDIS_CONN_STRING` | Redis 连接 |
| `SESSION_SECRET` / `CRYPTO_SECRET` | 会话和加密密钥 |
| `NODE_TYPE` | master/slave 节点类型 |
| `SYNC_FREQUENCY` | 缓存/配置同步频率 |
| `UPDATE_TASK` | 是否启用任务轮询 |
| `ENABLE_PPROF` / `PYROSCOPE_*` | 性能诊断 |

## 8. 验收标准

- [ ] 无 `.env` 时可按默认配置启动 SQLite 模式。
- [ ] 设置 MySQL/PostgreSQL DSN 时可完成迁移并启动。
- [ ] Redis 不可用时行为符合配置预期，并有明确日志。
- [ ] master/slave 节点任务行为符合预期。
- [ ] default/classic 前端 dist 可正常 embed 和访问。

## 9. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 初始化顺序错误 | options/pricing/cache 读取失败 | 新增资源时写清依赖顺序 |
| 多节点重复任务 | 重复扣费/重复轮询/重复迁移 | 使用 `common.IsMasterNode` 控制 |
| env 默认值不安全 | session 被伪造或密钥泄漏 | 启动时阻止默认 `SESSION_SECRET=random_string` |
| 前端 embed 缺失 | Web 页面 404 | Docker/CI 必须先构建前端 dist |

## 10. 后续迭代

- 增加统一健康检查 endpoint，汇总 DB/Redis/任务状态。
- 对后台任务做可观测性列表：最近运行时间、失败次数、耗时。
- 将启动依赖关系整理为 ADR，避免新增全局初始化时破坏顺序。
