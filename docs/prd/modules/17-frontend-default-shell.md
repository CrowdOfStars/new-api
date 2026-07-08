# 17. 默认前端壳层模块 PRD

## 1. 背景

`web/default` 是项目默认管理后台和官网前端。壳层模块负责 React 应用入口、路由、全局请求、状态管理、主题、字体、方向、i18n、布局和构建配置。

## 2. 模块边界

### 负责

- React 应用启动。
- TanStack Router 路由树和鉴权布局。
- TanStack Query 全局配置。
- Axios 统一实例、请求去重、错误处理、`New-Api-User` header。
- Zustand 全局状态：auth、notification、system config。
- Theme/Font/Direction/Layout/Search providers。
- i18next 初始化和 locale 管理。
- 全局样式、主题变量和暗色模式。
- Rsbuild 构建、dev proxy、代码分割。

### 不负责

- 不承载具体业务页面逻辑；业务页面在 `features/`。
- 不实现后端 API。
- 不处理 classic 前端。

## 3. 关键文件

| 文件/目录 | 说明 |
|---|---|
| `web/default/src/main.tsx` | React 入口、QueryClient、RouterProvider、全局 providers |
| `web/default/src/routes/` | TanStack Router 文件路由 |
| `web/default/src/routeTree.gen.ts` | 自动生成路由树 |
| `web/default/src/lib/api.ts` | Axios 实例和通用 API |
| `web/default/src/stores/` | Zustand stores |
| `web/default/src/context/` | Theme、Font、Direction、Layout、Search providers |
| `web/default/src/i18n/` | i18next config、locale JSON、语言列表 |
| `web/default/src/styles/` | 全局 CSS 和主题 |
| `web/default/rsbuild.config.ts` | 构建配置 |
| `web/default/AGENTS.md` | 前端开发规范 |

## 4. 用户故事

- 作为前端开发者，我希望有统一请求和错误处理，以便业务 feature 不重复处理认证和 toast。
- 作为用户，我希望登录态、主题、语言偏好稳定保存，以便后台体验一致。
- 作为运维，我希望前端可独立开发并可嵌入 Go 二进制，以便部署灵活。

## 5. 功能需求

### P0

- 应用启动时初始化 i18n、主题、字体、方向、系统品牌信息。
- 所有 API 请求默认同源、携带 cookie 和 `New-Api-User`。
- 401 时清除 auth store 并引导登录。
- 路由鉴权在 `_authenticated` layout 中完成。
- 构建产物输出到 `web/default/dist` 供 Go embed。

### P1

- 支持路由级代码分割。
- 支持主题预设和暗色模式。
- 支持全局 command/search、navigation progress、notification。
- 支持 status cache-first 更新 title/favicon。

## 6. 开发规则

- 使用 Bun：`bun run dev`、`bun run typecheck`、`bun run lint`、`bun run build`。
- 用户可见文案必须 i18n。
- 服务端状态使用 TanStack Query。
- 全局状态使用 Zustand selector。
- 不绕过 `lib/api.ts` 的统一 Axios 实例，除非是 SSE/特殊流式请求并复用 common headers。

## 7. 验收标准

- [ ] 登录态刷新页面后可恢复。
- [ ] 401 会清理登录态并跳转登录。
- [ ] 主题/语言切换在页面间保持。
- [ ] `bun run typecheck` 通过。
- [ ] `bun run build` 产物可由后端静态服务访问。
- [ ] 新路由出现在生成 route tree 中。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 绕过统一 API client | 鉴权 header 缺失 | feature API 统一 import `api` |
| i18n key 缺失 | 多语言显示异常 | `bun run i18n:sync` |
| 全局 store 过度订阅 | 无效渲染 | 使用 selector |
| 构建配置改动 | Docker embed 失败 | 本地 build + Docker 构建验证 |

## 9. 后续迭代

- 抽象路由权限元数据。
- 建立前端全局错误页和 query error policy 文档。
- 增加前端 E2E smoke：登录、渠道页、Key 页、Playground。
