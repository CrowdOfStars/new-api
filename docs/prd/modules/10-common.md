# 10. Common 基础设施模块 PRD

## 1. 背景

`common/` 提供全项目共享的基础设施能力，例如 JSON、环境变量、Redis、加密、quota、缓存、请求体、限流、系统监控等。它应保持稳定、低业务耦合。

## 2. 模块边界

### 负责

- JSON wrapper。
- 环境变量和基础配置读取。
- Redis 初始化与通用缓存能力。
- 加密、哈希、密码、TOTP、verification。
- quota 格式化/转换基础工具。
- 请求体存储、大小限制、解压辅助。
- URL/SSRF 校验。
- 全局限流工具。
- 系统监控、pprof、pyroscope。
- 通用 HTTP/Gin 辅助。

### 不负责

- 不实现具体业务规则。
- 不依赖 controller/service 业务模块。
- 不直接定义 provider 协议。

## 3. 关键文件

| 文件 | 说明 |
|---|---|
| `common/json.go` | 项目统一 JSON marshal/unmarshal wrapper |
| `common/env.go`、`init.go` | env 读取、启动参数 |
| `common/redis.go` | Redis client 初始化 |
| `common/crypto.go`、`hash.go`、`totp.go` | 加密/哈希/2FA 基础能力 |
| `common/quota.go`、`topup-ratio.go` | quota 工具 |
| `common/body_storage.go`、`request_body_limit.go` | 请求体复用与限制 |
| `common/disk_cache*.go` | 磁盘缓存 |
| `common/rate-limit.go`、`common/limiter/` | 限流基础 |
| `common/url_validator.go`、`ssrf_protection.go` | URL 校验和 SSRF 防护 |
| `common/system_monitor*.go`、`pprof.go`、`pyro.go` | 监控与 profiling |

## 4. 用户故事

- 作为后端开发者，我希望 JSON 操作统一，以便项目可替换/优化 JSON 实现并统一行为。
- 作为安全维护者，我希望 URL、请求体和密钥处理有统一工具，以便降低安全风险。
- 作为运维，我希望 env 和监控能力集中，以便部署行为可预测。

## 5. 功能需求

### P0

- 所有业务代码 JSON marshal/unmarshal 必须使用 `common.Marshal`、`common.Unmarshal`、`common.DecodeJson` 等 wrapper。
- env 解析应有默认值和错误回退日志。
- Redis 初始化失败时应返回明确错误或按配置降级。
- 请求体大小限制必须防止 zip bomb/超大 body。
- URL 校验必须覆盖支付跳转、文件下载、上游 URL 等外部输入场景。

### P1

- 通用工具保持无业务副作用。
- 缓存工具应支持 namespace，避免 key 冲突。
- 监控工具应低开销，可通过配置开关。

## 6. 验收标准

- [ ] 新业务代码不直接调用 `encoding/json` marshal/unmarshal。
- [ ] 新 env 有默认值、文档和非法值处理。
- [ ] 请求体限制在 JSON、multipart、gzip 等场景生效。
- [ ] SSRF/URL 校验覆盖内网地址、非法 scheme、可信域名。
- [ ] common 工具不反向依赖 controller/service。

## 7. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| common 变成业务垃圾桶 | 依赖混乱 | 只放稳定基础能力 |
| JSON wrapper 绕过 | 行为不一致 | Code review 检查 import/call |
| env 解析不严 | 启动异常或隐性降级 | 非法值记录日志并设安全默认值 |
| URL 校验遗漏 | SSRF/开放重定向 | 统一入口校验 |

## 8. 后续迭代

- 增加 common 包职责边界文档。
- 为 URL validator、request body、JSON wrapper 增加回归测试。
- 统一 cache key 命名规范。
