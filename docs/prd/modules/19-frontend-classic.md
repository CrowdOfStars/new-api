# 19. Classic 前端模块 PRD

## 1. 背景

`web/classic` 是项目保留的经典前端主题，用于兼容历史用户和旧 UI 习惯。默认新功能优先在 `web/default` 开发，classic 只有在明确需要兼容时同步。

## 2. 模块边界

### 负责

- classic 主题的页面和交互。
- 与后端同源 API 通信。
- 历史 Semi Design UI 兼容。
- 构建产物输出到 `web/classic/dist` 供 Go embed。

### 不负责

- 不作为新 UI 主开发线。
- 不承担默认前端的 TanStack Router / Base UI 规范。
- 不优先接收所有新功能，除非需求明确。

## 3. 技术栈

| 项 | 说明 |
|---|---|
| 框架 | React 19 |
| 构建 | Rsbuild |
| UI | Semi Design |
| 路由 | React Router DOM |
| 请求 | Axios |
| i18n | i18next |
| 包管理 | Bun |

## 4. 用户故事

- 作为历史用户，我希望可以继续使用 classic 界面，以便迁移成本更低。
- 作为部署者，我希望 default/classic 都能被同一个后端服务，以便按主题切换。
- 作为开发者，我希望明确 classic 的维护边界，以便避免重复开发无必要功能。

## 5. 功能需求

### P0

- classic 必须能构建并被后端嵌入。
- 现有核心功能不应因后端 API 变更而破坏。
- 主题切换时静态资源和 SPA fallback 正常。

### P1

- 重大后端 API breaking change 必须评估 classic 影响。
- 安全/计费/登录等关键功能如影响用户使用，应同步修复 classic。
- 新功能若面向所有用户且 default/classic 都需支持，应明确同步计划。

## 6. 验收标准

- [ ] `cd web/classic && bun run build` 通过。
- [ ] 后端 embed 后 classic 首页和后台可访问。
- [ ] 登录、渠道/Key/日志等核心历史页面可用。
- [ ] 后端接口变更未造成 classic 明显报错。

## 7. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| default/classic 功能差异 | 用户困惑 | 文档说明支持范围 |
| API 改动未同步 | classic 页面坏掉 | 后端兼容或同步修复 |
| 依赖老旧 | 构建/安全风险 | 定期依赖审计 |
| 双前端维护成本 | 开发成本高 | 新功能默认只做 default，明确例外 |

## 8. 后续迭代

- 梳理 classic 支持矩阵。
- 对 classic 核心页面建立最小 smoke 测试。
- 明确 classic 长期维护策略和弃用标准。
