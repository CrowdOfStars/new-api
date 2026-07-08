# 11. Setting 配置域模块 PRD

## 1. 背景

Setting 模块负责把数据库 options、环境变量和默认值解析为运行时配置，覆盖模型、倍率、计费、支付、系统、认证、性能、运营策略等配置域。

## 2. 模块边界

### 负责

- 从 options 中解析配置。
- 提供类型安全的 getter/setter 或运行时变量。
- 管理模型倍率、分组倍率、cache ratio、暴露价格。
- 管理系统、认证、支付、性能、运营策略配置。
- 对配置内容做验证和兼容旧配置。

### 不负责

- 不直接处理 HTTP 请求。
- 不写复杂业务流程。
- 不直接执行扣费或 provider 调用。

## 3. 关键目录

| 目录/文件 | 说明 |
|---|---|
| `setting/ratio_setting/` | 模型倍率、分组倍率、cache ratio、compact suffix、expose ratio |
| `setting/model_setting/` | Claude/Gemini/Grok/Qwen/global 模型设置 |
| `setting/operation_setting/` | 自动禁用、状态码重试、quota、token、monitor、payment、check-in |
| `setting/system_setting/` | Discord、OIDC、Passkey、legal、theme 等系统设置 |
| `setting/billing_setting/` | tiered billing 配置 |
| `setting/performance_setting/` | 性能配置 |
| `setting/perf_metrics_setting/` | perf metrics 配置 |
| `setting/console_setting/` | 控制台配置和验证 |
| `setting/payment_*` | Stripe、Creem、Waffo、Waffo Pancake |
| `setting/sensitive.go` | 敏感词配置 |

## 4. 用户故事

- 作为管理员，我希望在后台修改系统配置后快速生效，以便运营无需重启服务。
- 作为开发者，我希望配置解析集中，以便避免同一 option 在多个地方重复解析。
- 作为财务/运营，我希望模型倍率和计费配置稳定可解释，以便控制成本和售价。

## 5. 功能需求

### P0

- 配置项必须有默认值、类型、校验规则和兼容策略。
- 配置更新后应刷新运行时状态或等待同步任务热更新。
- 计费、支付、安全类配置必须校验格式和范围。
- 修改旧配置 key 时必须保留迁移或兼容读取。

### P1

- 配置项应在前端 system-settings 有清晰分组。
- 高风险配置应要求 root 权限或二次验证。
- 配置变更应可审计。

## 6. 配置设计模板

新增配置项时需要定义：

| 项 | 说明 |
|---|---|
| Key | options 表 key |
| 类型 | string/bool/int/json map/list |
| 默认值 | 空配置时行为 |
| 校验 | 范围、格式、枚举 |
| 权限 | admin/root |
| 生效时机 | 即时/同步周期/重启 |
| 前端位置 | system-settings 对应 section |
| 风险 | 安全/计费/支付影响 |

## 7. 验收标准

- [ ] 新配置有默认值和非法值处理。
- [ ] 前端保存后后端能正确解析。
- [ ] 配置变更后相关业务路径生效。
- [ ] 高风险配置有权限和审计。
- [ ] 文档或 PRD 更新配置说明。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 配置无校验 | 运行时 panic 或账务错误 | 保存时验证 + 读取时兜底 |
| 热更新不同步 | 管理员以为已生效 | 明确生效时机并展示 |
| 旧配置不兼容 | 升级后功能失效 | 兼容读取或迁移 |
| 高危配置权限不足 | 安全风险 | root + 二次验证 |

## 9. 后续迭代

- 生成系统配置字典。
- 增加配置变更审计详情。
- 为复杂 JSON 配置增加 schema 校验和前端编辑器。
