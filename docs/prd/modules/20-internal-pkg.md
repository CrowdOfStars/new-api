# 20. 内部 pkg 模块 PRD

## 1. 背景

`pkg/` 放置可被多个业务模块复用的内部包，当前主要包括动态计费表达式、混合缓存、io.net 客户端和性能指标。它们比 `common/` 更偏专项能力，但仍应保持清晰边界。

## 2. 模块边界

### 负责

- `billingexpr`：动态计费表达式编译、运行、结算、token 归一化。
- `cachex`：内部 hybrid cache、codec、namespace。
- `ionet`：io.net 部署、容器、硬件、价格等 API client。
- `perf_metrics`：Relay 性能采样、flush、聚合类型。

### 不负责

- 不直接处理 HTTP 路由。
- 不直接渲染前端。
- 不包含临时业务 helper；只有稳定专项能力才放入 `pkg/`。

## 3. 包说明

| 包 | 说明 | 主要消费者 |
|---|---|---|
| `pkg/billingexpr` | 表达式计费系统 | service、relay/helper、setting |
| `pkg/cachex` | 通用缓存组件 | 需要 hybrid cache 的业务模块 |
| `pkg/ionet` | io.net API client | deployment controller/service |
| `pkg/perf_metrics` | 性能指标采集和 flush | relay、controller/perf_metrics |

## 4. 用户故事

- 作为计费开发者，我希望动态计费表达式可独立测试，以便保证账务正确。
- 作为部署功能开发者，我希望 io.net API 调用封装稳定，以便 controller 不关心 HTTP 细节。
- 作为运维开发者，我希望性能指标采集低侵入，以便在 Relay 路径中安全使用。

## 5. 功能需求

### P0

- `billingexpr` 修改前必须阅读并遵循 `pkg/billingexpr/expr.md`。
- `billingexpr` 必须保证表达式编译缓存、变量识别、quota conversion 和 settlement 稳定。
- `ionet` client 必须处理认证、错误、JSON 解析和请求超时。
- `perf_metrics` 不能显著增加 Relay 主链路延迟。

### P1

- `pkg` 包应有独立单元测试。
- 包 API 应稳定，避免泄漏业务层实现细节。
- 错误类型应方便上层转换为业务错误。

## 6. 验收标准

- [ ] `billingexpr` 表达式示例和边界测试通过。
- [ ] cachex 编码/命名空间行为稳定。
- [ ] ionet client 对成功、认证失败、上游错误有测试或 mock。
- [ ] perf metrics flush 失败不影响请求主链路。
- [ ] `pkg` 不反向依赖 controller/router。

## 7. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| billingexpr 改动破坏旧表达式 | 账务事故 | 版本化、snapshot、回归测试 |
| pkg 变成杂物目录 | 架构失控 | 只放稳定专项能力 |
| ionet 上游 API 变更 | 部署功能失败 | client 层封装和错误降级 |
| perf 采集阻塞 | Relay 延迟 | 异步 flush 和限量采样 |

## 8. 后续迭代

- 为 `pkg` 每个包补充 README。
- 增加 billingexpr playground / dry-run API。
- 为 ionet client 增加录制式 fixture 测试。
