# 05. Model 与数据库模块 PRD

## 1. 背景

Model 层定义系统数据结构、数据库迁移和数据访问方法。项目要求同时支持 SQLite、MySQL 和 PostgreSQL，因此数据库设计与查询必须保持跨方言兼容。

## 2. 模块边界

### 负责

- GORM 模型定义。
- 数据库初始化、连接池、迁移。
- 主库与日志库选择。
- CRUD、分页、搜索、统计查询。
- 用户、token、channel 等缓存读取/同步。
- 处理数据库方言差异。

### 不负责

- 不实现 HTTP handler。
- 不承载跨模块业务流程。
- 不直接决定前端展示结构。
- 不处理 provider 协议转换。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `model/main.go` | DB 选择、迁移、方言变量、连接池 |
| `model/user.go`、`user_cache.go` | 用户模型和缓存 |
| `model/token.go`、`token_cache.go` | API Token 模型和缓存 |
| `model/channel.go`、`channel_cache.go`、`ability.go` | 渠道、能力、缓存 |
| `model/log.go` | 请求日志和错误日志 |
| `model/option.go` | 系统配置 options |
| `model/pricing*.go`、`model/model_meta.go`、`vendor_meta.go` | 模型价格、模型元数据、供应商 |
| `model/subscription.go` | 订阅计划、订单、用户订阅 |
| `model/task.go`、`midjourney.go` | 异步任务与 MJ 任务 |
| `model/topup.go`、`redemption.go` | 充值和兑换码 |
| `model/passkey.go`、`twofa.go`、`custom_oauth_provider.go` | 安全登录相关数据 |

## 4. 核心数据对象

| 对象 | 说明 |
|---|---|
| `User` | 用户账户、角色、分组、额度、绑定、设置 |
| `Token` | API Token、额度、过期、模型限制、IP 限制、分组 |
| `Channel` | 上游渠道、类型、key、base_url、模型、分组、多 key、映射、权重 |
| `Ability` | group/model/channel 可服务关系 |
| `Option` | 系统设置项 |
| `Log` | 请求日志、usage、扣费、错误与扩展信息 |
| `Task` | 异步任务状态与结果 |
| `Subscription*` | 订阅计划、订单、用户订阅、预扣记录 |
| `Model` / `Vendor` | 模型/供应商元数据 |

## 5. 功能需求

### P0

- 所有迁移必须兼容 SQLite、MySQL、PostgreSQL。
- 新字段应设计默认值、空值行为和旧数据迁移策略。
- 对 `group`、`key` 等保留字使用 `commonGroupCol`、`commonKeyCol`。
- 查询接口必须支持分页和硬上限，避免全表扫描导致后台卡死。
- 写入敏感字段时考虑加密或脱敏显示。

### P1

- 高频读取对象应接入缓存并定义失效策略。
- 搜索接口应转义 LIKE 通配符并限制模糊搜索规模。
- 统计查询应优先使用可索引字段，必要时异步预聚合。

## 6. 数据库兼容规则

| 场景 | 要求 |
|---|---|
| JSON marshal/unmarshal | 业务代码走 `common.Marshal` / `common.Unmarshal` |
| Boolean raw SQL | 使用 `commonTrueVal` / `commonFalseVal` |
| reserved column | 使用 `commonGroupCol` / `commonKeyCol` |
| 主键 | 让 GORM 处理，不手写 `AUTO_INCREMENT` / `SERIAL` |
| SQLite 迁移 | 避免 unsupported `ALTER COLUMN` |
| JSON column | 无跨 DB 保证时用 TEXT fallback |

## 7. 验收标准

- [ ] SQLite/MySQL/PostgreSQL 至少设计层面兼容；关键迁移有测试或说明。
- [ ] 新模型 `AutoMigrate` 不会导致重复 ALTER。
- [ ] 查询使用分页/limit，搜索有硬上限。
- [ ] 缓存对象更新后能失效或同步。
- [ ] 敏感字段不在普通查询中直接暴露。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 方言差异 | 部署到某数据库失败 | 优先 GORM，raw SQL 分支处理 |
| bool default 反复迁移 | 每次启动 ALTER | 避免 GORM bool default tag，业务层设默认 |
| 大表 count/search | 后台慢查询 | limit、索引、预聚合 |
| 缓存陈旧 | 鉴权/渠道/额度错误 | 写后失效、同步、短 TTL |

## 9. 后续迭代

- 整理 ER 图和核心表关系。
- 为迁移建立三数据库 CI。
- 对日志/统计大表设计归档策略。
