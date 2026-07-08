# 21. 部署 / CI / 文档模块 PRD

## 1. 背景

部署、CI 和文档模块确保项目能被开发、测试、构建、发布和私有化部署。它覆盖 Docker、GitHub Actions、README、docs、PR 模板、环境变量说明和协作规范。

## 2. 模块边界

### 负责

- Docker 镜像构建和 runtime 运行。
- 前端 default/classic 构建并嵌入后端。
- GitHub Actions：PR 检查、Docker build、release、electron build 等。
- README、多语言 README、安装文档、渠道文档、翻译词汇表。
- PR/Issue 模板、安全政策、第三方许可证。
- 开发者协作规范和项目 PRD 文档。

### 不负责

- 不实现业务功能。
- 不保存生产密钥。
- 不替代官方外部文档站，但应与其保持一致。

## 3. 关键文件

| 文件/目录 | 说明 |
|---|---|
| `Dockerfile`、`Dockerfile.dev` | 生产/开发镜像构建 |
| `docker-compose.yml` 若存在 | 本地/生产编排入口 |
| `.env.example` | 环境变量示例 |
| `.github/workflows/` | CI/CD workflow |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板 |
| `.github/ISSUE_TEMPLATE/` | Issue 模板 |
| `README*.md` | 多语言项目介绍 |
| `docs/` | 安装、渠道、专项文档、PRD |
| `web/default/AGENTS.md`、`AGENTS.md`、`CLAUDE.md` | 开发规范 |
| `LICENSE`、`NOTICE`、`THIRD-PARTY-LICENSES.md` | 许可证和第三方声明 |

## 4. 用户故事

- 作为新开发者，我希望通过文档快速启动项目，以便进入开发。
- 作为部署者，我希望 Docker 镜像可直接运行，以便私有化部署。
- 作为维护者，我希望 PR 检查能覆盖关键构建和测试，以便减少回归。
- 作为贡献者，我希望模板清晰，以便提交符合规范的 PR/Issue。

## 5. 功能需求

### P0

- Docker build 必须完成 default/classic 前端构建和 Go 编译。
- `.env.example` 应覆盖核心运行配置且不包含真实密钥。
- README 和 docs 应说明快速启动、部署、环境变量、API 文档入口。
- PR 必须使用 `.github/PULL_REQUEST_TEMPLATE.md`。
- 受保护的项目品牌、归属、许可证信息不得删除或替换。

### P1

- CI 应覆盖 Go test、前端 typecheck/build、Docker build。
- 文档应包含新开发者阅读路径和模块 PRD。
- 发布流程应自动注入版本号。
- 多语言文档应保持主信息一致。

## 6. 本地开发命令建议

| 场景 | 命令 |
|---|---|
| 后端测试 | `go test ./...` |
| 默认前端开发 | `cd web/default && bun run dev` |
| 默认前端检查 | `cd web/default && bun run typecheck && bun run lint && bun run build` |
| classic 构建 | `cd web/classic && bun run build` |
| Docker 构建 | `docker build .` |

## 7. 验收标准

- [ ] 新文档路径在索引中可找到。
- [ ] Dockerfile 构建产物包含前端 dist 和 Go 二进制。
- [ ] `.env.example` 与实际读取 env 大体一致。
- [ ] PR 模板结构未被破坏。
- [ ] README 中项目标识、组织归属、许可证信息未被删除或替换。
- [ ] CI 失败能明确指出测试/构建阶段。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 文档与代码不同步 | 新人误操作 | 功能变更同步 docs |
| Docker 缺前端产物 | 页面不可访问 | 构建链路先 build 前端再 Go embed |
| CI 覆盖不足 | 回归进入主分支 | 增加关键路径检查 |
| 误删品牌/许可证 | 违反项目政策 | 修改文档前检查保护信息 |

## 9. 后续迭代

- 增加本地开发一键启动文档。
- 增加三数据库测试说明。
- 建立 docs/prd/features 需求文档目录和模板。
- 自动生成环境变量参考表。
