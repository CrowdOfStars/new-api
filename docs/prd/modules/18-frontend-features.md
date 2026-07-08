# 18. 默认前端 Feature 模块 PRD

## 1. 背景

`web/default/src/features` 按业务域组织默认前端页面和组件，是日常前端需求开发的主目录。每个 feature 通常包含 `api.ts`、`types.ts`、`constants.ts`、`components/`、`hooks/`、`lib/` 和入口 `index.tsx`。

## 2. 模块边界

### 负责

- 业务页面渲染与交互。
- 调用后端 API 并用 React Query 管理服务端状态。
- 表单校验、弹窗、抽屉、表格、筛选、分页。
- i18n 文案渲染。
- 与路由层配合提供页面入口。

### 不负责

- 不定义全局应用壳层。
- 不直接操作后端数据库。
- 不绕过权限；后端仍必须做权限校验。

## 3. Feature 清单

| Feature | 说明 | 常见接口 |
|---|---|---|
| `home` | 官网首页、动态内容 | `/api/status`、`/api/home_page_content` |
| `about` / `legal` | 关于、协议、隐私 | `/api/about`、`/api/user-agreement`、`/api/privacy-policy` |
| `auth` | 登录、注册、OAuth、OTP、Passkey、安全验证 | `/api/user/*`、`/api/oauth/*`、`/api/verify` |
| `setup` | 首次初始化 | `/api/setup` |
| `dashboard` | 概览、图表、公告、性能健康 | `/api/data/*`、`/api/log/*`、`/api/perf-metrics/*` |
| `channels` | 渠道管理 | `/api/channel/*` |
| `keys` | API Token 管理 | `/api/token/*` |
| `models` | 模型、供应商、部署、prefill group | `/api/models/*`、`/api/vendors/*`、`/api/deployments/*` |
| `pricing` | 价格页、模型详情 | `/api/pricing`、`/api/perf-metrics/*` |
| `playground` | 聊天测试台 | `/pg/chat/completions` |
| `profile` | 用户资料、安全、语言、Passkey、2FA | `/api/user/self`、`/api/user/2fa/*` |
| `wallet` | 钱包、充值、支付 | `/api/user/topup/*`、payment APIs |
| `subscriptions` | 订阅计划和购买 | `/api/subscription/*` |
| `usage-logs` | 用户/管理员日志 | `/api/log/*` |
| `users` | 用户管理 | `/api/user/*` admin routes |
| `redemption-codes` | 兑换码 | `/api/redemption/*` |
| `system-settings` | 系统设置 | `/api/option/*`、专项设置接口 |
| `rankings` | 排行榜 | `/api/rankings` |
| `performance-metrics` | 性能指标辅助 | `/api/perf-metrics/*` |

## 4. 用户故事

- 作为普通用户，我希望在后台管理自己的 Key、钱包、日志和资料。
- 作为管理员，我希望管理渠道、用户、模型、系统设置和订阅。
- 作为开发者，我希望每个业务页面结构一致，以便快速定位和新增功能。

## 5. 功能需求

### P0

- 每个 feature 的 API 调用应集中在 `api.ts`。
- 类型定义放在 `types.ts`，避免 `any`。
- 常量文案必须通过 i18n 渲染。
- 表格页面必须支持分页、加载、空状态、错误状态。
- 写操作必须有 loading、成功/失败反馈，并 invalidate 相关 query。
- 高风险操作必须二次确认，必要时接入 secure verification。

### P1

- 复杂表单使用 React Hook Form + Zod。
- 复杂业务逻辑放 `lib/` 或 `hooks/`，组件保持展示职责。
- 大页面可拆分 section registry 或子组件。
- 支持移动端/窄屏布局。

## 6. 开发模板

新增 feature 建议结构：

```text
src/features/<feature>/
  api.ts
  types.ts
  constants.ts
  index.tsx
  components/
  hooks/
  lib/
```

新增页面路由：

```text
src/routes/_authenticated/<feature>/index.tsx
```

## 7. 验收标准

- [ ] 页面可从路由访问，并能正确鉴权。
- [ ] API 请求使用统一 `api` 实例。
- [ ] loading/empty/error/success 状态完整。
- [ ] 用户可见文案已 i18n。
- [ ] `bun run typecheck` 通过。
- [ ] 表单校验和后端错误展示清晰。
- [ ] 管理员页面普通用户不可访问或后端拒绝。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| feature 内重复实现 API/表格 | 维护成本高 | 复用通用组件和 query patterns |
| 只做前端权限隐藏 | 越权风险 | 后端必须鉴权 |
| i18n 漏 key | 多语言异常 | sync 脚本检查 |
| 大组件难维护 | 开发效率下降 | 超 200 行考虑拆分 |

## 9. 后续迭代

- 建立 feature scaffold 模板。
- 为核心页面添加 E2E smoke。
- 统一表格筛选、分页、URL state 的使用规范。
