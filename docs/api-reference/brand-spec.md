# New API · API Reference Brand Spec

> 采集日期：2026-07-13  
> 资产来源：当前仓库 `web/default/src/assets/logo.tsx`、`web/default/src/styles/theme.css` 与参考接口文档  
> 资产完整度：完整

## 核心资产

### Logo

- 主版本：`assets/logo.svg`
- 来源：从项目现有 React Logo 组件原样提取路径，不重画、不变形。
- 使用场景：浏览器图标、顶部品牌区。

### 数字产品界面

- 参考：`https://docs.newapi.pro/zh/docs/api`
- 继承：固定顶部导航、左侧分组目录、正文阅读区、右侧页内目录、命令式搜索。
- 改进：直接读取 OpenAPI 规范；增加代码语言切换、参数表、响应状态、深色主题和移动目录。

## 辅助资产

### 色板

- Background：`oklch(0.995 0 0)`
- Ink：`oklch(0.18 0.015 255)`
- Accent：`oklch(0.56 0.21 259)`，仅用于链接、焦点和当前上下文。
- Dark background：`oklch(0.16 0.012 255)`

### 字型

- Display：Aptos Display / Segoe UI Variable Display / Noto Sans SC
- Body：Aptos / Segoe UI Variable / Noto Sans SC
- Mono：JetBrains Mono / Cascadia Code / SFMono-Regular

### 签名细节

- 方法色只用于 HTTP method，不把整张卡染色。
- 分组页使用编辑式编号和硬边界网格，避免通用圆角卡片堆叠。
- 代码区使用高对比深色画布，正文始终保持纸张式阅读节奏。

### 禁区

- 不使用紫色大渐变、装饰性统计、Emoji 图标或无意义插画。
- 不在页面中硬编码接口清单，避免与仓库真实路由漂移。

### 气质关键词

- 精确
- 克制
- 开发者友好
- 高信息密度
