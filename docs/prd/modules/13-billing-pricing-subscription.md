# 13. 计费 / 价格 / 订阅模块 PRD

## 1. 背景

计费模块负责用户额度、API Token 额度、模型价格、分组倍率、订阅额度、充值支付和动态表达式计费。它是系统商业化和成本控制的核心模块。

## 2. 模块边界

### 负责

- 请求前预扣费。
- 请求后按 actual usage 结算、补扣或返还。
- 上游失败退款、任务失败/超时退款。
- 钱包额度和订阅额度两种来源。
- 模型倍率、分组倍率、动态表达式计费。
- 充值、支付回调、兑换码、订阅计划。
- 计费日志和前端价格展示。

### 不负责

- 不决定 provider 协议转换。
- 不处理用户登录流程，但支付/计费接口需要权限保护。
- 不直接渲染前端页面。

## 3. 关键文件

| 模块 | 文件 |
|---|---|
| 计费 service | `service/billing.go`、`billing_session.go`、`pre_consume_quota.go`、`quota.go` |
| 动态计费 | `service/tiered_settle.go`、`pkg/billingexpr/`、`setting/billing_setting/` |
| 价格计算 | `relay/helper/price.go`、`model/pricing*.go`、`setting/ratio_setting/` |
| 订阅 | `controller/subscription*.go`、`model/subscription.go`、`service/subscription_reset_task.go` |
| 充值支付 | `controller/topup*.go`、`model/topup.go`、`service/epay.go`、payment settings |
| 兑换码 | `controller/redemption.go`、`model/redemption.go` |
| 日志展示 | `service/log_info_generate.go`、`web/default/src/features/usage-logs` |
| 价格前端 | `web/default/src/features/pricing`、`features/system-settings` |

## 4. 核心概念

| 概念 | 说明 |
|---|---|
| Quota | 系统内部额度单位 |
| User quota | 用户钱包余额 |
| Token quota | 单个 API Token 额度限制 |
| Group ratio | 分组倍率 |
| Model ratio | 模型倍率 |
| PriceData | 一次请求价格上下文 |
| BillingSession | 预扣、结算、退款统一会话 |
| BillingSource | wallet 或 subscription |
| Tiered expr | 表达式定义真实模型价格 |

## 5. 功能需求

### P0

- 所有付费请求必须在上游调用前完成额度检查和预扣。
- 上游成功后必须按实际 usage 结算。
- 上游失败、请求失败、任务失败/超时必须执行退款或明确的违规扣费逻辑。
- 动态计费变更必须遵循 `pkg/billingexpr/expr.md`。
- 支付回调必须校验签名/环境并保证幂等。
- 计费日志必须能解释最终扣费。

### P1

- 订阅和钱包路径都应支持用量通知。
- 前端价格页展示动态计费 breakdown。
- 管理员可配置模型价格、倍率、订阅计划和支付渠道。

## 6. 动态计费要求

- 表达式是模型计费合同。
- 表达式系数使用真实 `$ / 1M tokens`。
- `p/c/cr/cc/cc1h/img/ai/ao` 根据 usage 归一化。
- 预扣时冻结 `BillingSnapshot`，结算时使用同一 snapshot。
- 阶梯判断使用 `len` 而非 `p`，避免缓存命中导致误判。

## 7. 验收标准

- [ ] 钱包余额不足时请求被拒绝且不调用上游。
- [ ] Token 额度不足时请求被拒绝或标记耗尽。
- [ ] 成功请求按 actual usage 结算。
- [ ] 失败请求返还预扣额度。
- [ ] 订阅额度路径和钱包路径都覆盖。
- [ ] 动态计费覆盖 cache/image/audio/tool/tier 场景。
- [ ] 支付回调重复发送不会重复入账。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 预扣与结算不一致 | 多扣/少扣 | BillingSession 统一生命周期 |
| usage 解析错误 | 账务错误 | Provider usage fixture 测试 |
| 支付回调不幂等 | 重复充值 | 订单状态机 + 唯一交易号 |
| 动态表达式写错 | 模型定价错误 | 保存时编译和 smoke test |
| 订阅/钱包混用 | 余额错乱 | BillingSource 明确记录 |

## 9. 后续迭代

- 建立账务流水表或增强日志以便对账。
- 为表达式编辑器增加更多 provider 预设。
- 增加计费模拟器：给定请求/usage 预览扣费。
