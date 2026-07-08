# 03. 控制器层模块 PRD

## 1. 背景

控制器层是 HTTP handler 所在层，负责把请求参数、业务服务和响应格式连接起来。项目采用 Router -> Controller -> Service -> Model 的分层结构，控制器应保持薄而直接。

## 2. 模块边界

### 负责

- 接收 Gin context。
- 解析 path/query/body/form 参数。
- 做必要的输入校验和权限上下文读取。
- 调用 service/model 完成业务操作。
- 返回统一 JSON、文件、流式响应或协议兼容错误。
- Relay 顶层入口负责请求生命周期编排。

### 不负责

- 不承载复杂业务规则。
- 不写跨模块复用逻辑。
- 不直接拼复杂 SQL。
- 不直接处理 provider 细节；provider 细节放 relay/channel。

## 3. 关键文件族

| 文件/主题 | 说明 |
|---|---|
| `controller/relay.go` | Relay 主入口、预扣、重试、错误响应、MJ/task 入口 |
| `controller/user.go` | 用户注册、登录、自信息、用户管理 |
| `controller/token.go` | API Token 管理 |
| `controller/channel*.go` | 渠道管理、测试、上游模型更新、affinity cache |
| `controller/model*.go` | 模型元数据、模型同步、missing models、vendor meta |
| `controller/log.go`、`usedata.go`、`rankings.go` | 日志、统计、排行 |
| `controller/billing.go`、`pricing.go`、`ratio_*` | 计费、价格、倍率配置 |
| `controller/subscription*.go`、`topup*.go`、`redemption.go` | 订阅、充值、支付、兑换 |
| `controller/oauth.go`、`passkey.go`、`twofa.go` | 登录安全能力 |
| `controller/deployment.go` | 模型部署 / io.net |
| `controller/option.go`、`performance.go` | 系统设置与运维接口 |

## 4. 用户故事

- 作为前端开发者，我希望 controller 返回稳定统一的数据结构，以便前端 API 类型可维护。
- 作为后端开发者，我希望 controller 只做请求/响应编排，以便业务逻辑可测试。
- 作为 API 客户端，我希望 Relay controller 按目标协议返回错误，以便客户端 SDK 能识别。

## 5. 功能需求

### P0

- 管理 API 返回统一业务结构。
- Relay API 按 OpenAI/Claude/Gemini/MJ 等协议返回兼容响应。
- 参数错误、权限错误、业务错误应有明确状态码/业务 message。
- 管理写操作应触发审计或走已有审计中间件。
- 敏感数据返回前必须脱敏。

### P1

- 复杂校验下沉到 service 或专门 validation。
- 重复 controller 逻辑提取到稳定业务概念，而非机械 helper。
- 大查询接口支持分页、搜索限流和硬上限。

## 6. 接口设计要求

新增 controller 时至少明确：

| 项 | 要求 |
|---|---|
| Auth | User/Admin/Root/Token/Public |
| Request | path/query/body schema |
| Response | 成功结构、失败结构 |
| Side effects | DB 写入、缓存失效、任务启动、支付请求 |
| Audit | 是否需要审计 |
| Rate limit | 是否属于关键/搜索/全局限流 |
| i18n | 用户可见 message 是否需要多语言 |

## 7. 验收标准

- [ ] handler 覆盖成功、参数错误、权限错误、业务错误。
- [ ] 不在 controller 中堆叠复杂业务分支。
- [ ] 敏感字段如 key/token/password 不直接返回。
- [ ] 写接口在失败时不会产生部分不可恢复副作用。
- [ ] Relay controller 失败时能退款或正确结算。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| Controller 过重 | 难测试、难复用 | 业务逻辑下沉 service |
| 响应格式不一致 | 前端错误处理复杂 | 新 API 遵守统一响应 |
| 错误状态码不准确 | 客户端误判 | Relay 与管理 API 分别设计错误格式 |
| 敏感信息泄漏 | 安全事故 | 返回前统一 clean/mask |

## 9. 后续迭代

- 为核心 controller 建立接口级契约测试。
- 生成 OpenAPI 或内部接口清单。
- 将历史重复逻辑逐步收敛到 service。
