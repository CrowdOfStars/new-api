# New API API Reference · Product Facts

> 核验日期：2026-07-13

- 本项目提供统一的 AI API 网关，并在 `router/relay-router.go` 注册 OpenAI、Claude、Gemini、音频、图像、重排序与实时接口。
- 项目在 `router/api-router.go`、`router/channel-router.go` 等文件注册管理接口。
- 仓库自带两份 OpenAPI 3.x 规格：`docs/openapi/relay.json` 与 `docs/openapi/api.json`。
- 当前规格合计 195 个操作：AI 模型接口 38 个，管理接口 157 个。
- 设计参考页面为 `https://docs.newapi.pro/zh/docs/api`，其信息架构将接口分为「AI 模型接口」与「管理接口」。
- 页面使用仓库 `web/default/src/assets/logo.tsx` 中的 New API 标识路径，并保留 QuantumNous 版权说明。
