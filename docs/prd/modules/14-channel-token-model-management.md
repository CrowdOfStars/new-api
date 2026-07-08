# 14. 渠道 / Token / 模型管理模块 PRD

## 1. 背景

渠道、API Token 和模型元数据共同构成 new-api 的 AI 资产管理核心。管理员通过渠道管理接入上游供应商，用户通过 API Token 调用模型，系统通过模型元数据和价格配置展示、计费和路由。

## 2. 模块边界

### 负责

- 渠道 CRUD、测试、余额查询、模型抓取、启用/禁用、标签、多 key 管理。
- API Token 创建、更新、删除、批量操作、额度、过期、IP 和模型限制。
- 模型元数据、供应商元数据、missing models、上游模型同步。
- Ability：渠道在某分组下支持某模型的能力映射。
- 分组、模型映射、渠道优先级/权重、自动禁用。
- 前端渠道、Key、模型、供应商管理页面。

### 不负责

- 不直接处理上游协议转换；协议转换在 provider adapter。
- 不直接进行计费结算，但为计费提供模型、分组、价格上下文。
- 不处理用户登录，但 Token 管理需要用户权限。

## 3. 关键文件

| 模块 | 文件 |
|---|---|
| 渠道模型 | `model/channel.go`、`channel_cache.go`、`channel_satisfy.go`、`ability.go` |
| 渠道控制器 | `controller/channel.go`、`channel-test.go`、`channel_upstream_update.go` |
| 渠道服务 | `service/channel.go`、`channel_select.go`、`channel_affinity.go` |
| Token 模型 | `model/token.go`、`token_cache.go` |
| Token 控制器 | `controller/token.go` |
| 模型元数据 | `model/model_meta.go`、`model/model_extra.go`、`model/vendor_meta.go` |
| 模型控制器 | `controller/model.go`、`model_meta.go`、`vendor_meta.go`、`missing_models.go`、`model_sync.go` |
| 前端渠道 | `web/default/src/features/channels` |
| 前端 Key | `web/default/src/features/keys` |
| 前端模型 | `web/default/src/features/models` |

## 4. 用户故事

- 作为管理员，我希望可以添加多个上游渠道并配置分组/模型，以便统一管理不同供应商资源。
- 作为管理员，我希望可以批量测试、禁用或同步渠道模型，以便快速维护渠道健康。
- 作为用户，我希望能创建受限 API Token，以便控制调用额度、模型范围和有效期。
- 作为运营人员，我希望模型元数据和供应商信息可维护，以便前端价格页和管理后台展示准确。

## 5. 功能需求

### P0

- 渠道必须支持创建、更新、删除、启用/禁用、复制、批量操作。
- 渠道必须支持模型列表、分组、模型映射、base URL、key、权重、优先级。
- 多 key 渠道必须支持随机/轮询、禁用单 key、记录禁用原因。
- API Token 必须支持额度、无限额度、过期时间、模型限制、IP 限制、分组。
- 模型元数据必须支持 CRUD、搜索、同步上游模型和 missing models 管理。
- 前端必须避免展示完整密钥，获取完整 key 需要安全动作。

### P1

- 渠道健康状态支持批量测试和自动测试。
- 支持渠道标签和按标签批量编辑。
- 支持上游模型变更检测与一键应用。
- 模型/供应商元数据与价格页联动。

## 6. 数据设计

| 对象 | 关键字段 |
|---|---|
| Channel | type、key、base_url、models、group、weight、priority、model_mapping、status、auto_ban、channel_info、settings |
| ChannelInfo | is_multi_key、multi_key_size、status list、disabled reason、polling index、mode |
| Token | user_id、key、status、remain_quota、unlimited_quota、expired_time、model_limits、allow_ips、group |
| Ability | group、model、channel_id |
| Model/Vendor | 模型展示名、供应商、价格、上下文、能力、图标/说明等元数据 |

## 7. 业务规则

- Token 模型限制开启时，请求模型必须在允许列表内。
- Channel group 支持逗号分隔，查询时需跨 DB 兼容。
- Channel status 非 enabled 不应被选中。
- 自动禁用只应在明确上游错误或配置触发时执行。
- 多 key 模式下无 enabled key 应返回明确错误，不应 fallback 到禁用 key。

## 8. 验收标准

- [ ] 管理员可创建渠道并在 Relay 请求中被选中。
- [ ] 渠道测试成功/失败状态、响应时间、错误信息准确。
- [ ] Token 限制模型后，不允许模型请求被拒绝。
- [ ] Token 额度耗尽/过期/禁用后无法调用 Relay。
- [ ] 多 key 禁用后不会继续使用该 key。
- [ ] 模型元数据更新后前端价格/模型页展示一致。

## 9. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 渠道模型能力不同步 | 请求找不到渠道 | 更新渠道后同步 Ability/cache |
| 密钥泄漏 | 上游账户风险 | 默认脱敏，高权限获取完整 key |
| 多 key 状态不一致 | 继续使用坏 key | 保存 ChannelInfo 并同步缓存 |
| 模型映射错误 | 上游调用失败或计费错误 | 表单校验 + 渠道测试 |

## 10. 后续迭代

- 渠道能力矩阵可视化。
- Token 权限预览器：展示该 token 可访问模型/分组。
- 模型元数据与上游模型列表差异报告。
