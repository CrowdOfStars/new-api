# 12. Auth / OAuth / 安全模块 PRD

## 1. 背景

认证与安全模块保护后台管理、用户资产、API Token、支付和渠道密钥。它横跨 middleware、controller、model、oauth、前端 auth/profile/system-settings 等模块。

## 2. 模块边界

### 负责

- 用户注册、登录、登出、密码重置。
- Session、Access Token、API Token 鉴权。
- OAuth/OIDC、GitHub、Discord、LinuxDO、自定义 OAuth、Telegram/WeChat 绑定。
- WebAuthn/Passkey 登录和管理。
- 2FA、backup codes。
- Turnstile、人机验证、邮箱验证、关键接口限流。
- 安全二次验证。
- 管理写操作审计。
- 敏感字段脱敏和密钥读取保护。

### 不负责

- 不定义具体 AI 请求转发逻辑。
- 不执行计费结算，但要保护相关接口。
- 不负责支付平台签名逻辑细节，但要保护支付配置入口。

## 3. 关键文件

| 模块 | 文件 |
|---|---|
| 鉴权中间件 | `middleware/auth.go` |
| 用户控制器 | `controller/user.go` |
| OAuth 控制器 | `controller/oauth.go`、`custom_oauth.go`、`telegram.go`、`wechat.go` |
| Passkey | `controller/passkey.go`、`model/passkey.go`、`setting/system_setting/passkey.go` |
| 2FA | `controller/twofa.go`、`model/twofa.go`、`common/totp.go` |
| OAuth provider | `oauth/` |
| 安全验证 | `controller/secure_verification.go`、`middleware/secure_verification.go` |
| 前端 | `web/default/src/features/auth`、`features/profile`、`lib/passkey.ts`、`lib/secure-verification.ts` |

## 4. 用户故事

- 作为普通用户，我希望可以安全登录、绑定 OAuth、启用 2FA/Passkey，以便保护账户。
- 作为管理员，我希望高风险操作必须二次验证，以便降低密钥泄漏和误操作风险。
- 作为 API 用户，我希望 API Token 鉴权兼容主流 SDK 的 header 形式。

## 5. 功能需求

### P0

- 后台 session/access token 必须与 `New-Api-User` header 匹配。
- API Token 必须验证状态、过期、额度、用户状态。
- OAuth state 必须防 CSRF，redirect 必须可信。
- 密码、2FA、passkey 等敏感操作必须限流。
- 获取完整渠道 key/token key 等敏感数据必须有高权限和安全验证。

### P1

- 自定义 OAuth provider 应支持 discovery、绑定、解绑和管理员清理绑定。
- 用户可管理自己的 passkey、2FA、语言偏好和 OAuth 绑定。
- 安全事件应记录审计日志。

## 6. 安全要求

| 场景 | 要求 |
|---|---|
| 登录/注册 | Turnstile + CriticalRateLimit 可配置 |
| 密码重置 | 邮箱验证限流，token 不可预测 |
| OAuth | state 校验，provider 白名单，自定义 provider 校验 discovery |
| API Token | 支持 Bearer、Claude/Gemini 兼容 header，但统一落到 TokenAuth |
| Passkey | challenge 短期有效，credential 安全存储 |
| 2FA | backup code 单次使用，管理员禁用可审计 |
| 管理操作 | Admin/RootAuth + 自动审计 |

## 7. 验收标准

- [ ] 未登录/权限不足/用户禁用均被拒绝。
- [ ] OAuth 登录、绑定、解绑流程 state 校验通过。
- [ ] Passkey 注册/登录/删除流程可用。
- [ ] 2FA 启用、登录验证、备用码、禁用流程可用。
- [ ] 敏感 key 读取需要 root 或安全验证。
- [ ] 前端 401 后清除登录态并跳转登录。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| `New-Api-User` 缺失 | 后台请求被拒绝 | 前端统一 Axios header |
| OAuth redirect 不受限 | 开放重定向 | `TRUSTED_REDIRECT_DOMAINS` 校验 |
| Token key 泄漏 | 上游资产泄漏 | 默认脱敏，完整 key 二次验证 |
| 2FA 恢复流程薄弱 | 账户接管 | backup code 一次性 + 管理审计 |

## 9. 后续迭代

- 增加安全事件日志页。
- 支持更多 OAuth provider 模板。
- 为高风险接口建立二次验证统一策略矩阵。
