# New API 静态接口参考

这是一个无框架、无 CDN、无运行时依赖的静态接口文档站点。页面直接读取 `specs/api.json` 与 `specs/relay.json`，展示仓库当前的管理接口和 AI 模型接口。

## 本地预览

在仓库根目录运行：

```bash
python -m http.server 4173 -d docs/api-reference
```

然后访问 `http://localhost:4173/`。不要直接双击 `index.html`，因为浏览器通常会阻止 `file://` 页面读取 JSON。

## 部署

将 `docs/api-reference/` 整个目录上传到任意静态文件服务器即可，例如 Nginx、Caddy、GitHub Pages、Cloudflare Pages 或对象存储静态站点。无需 Node.js，也无需执行构建命令。

Nginx 示例：

```nginx
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/new-api-docs;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(json|css|js|svg)$ {
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

## 更新接口内容

当仓库的 OpenAPI 文件更新后，将以下文件重新复制到 `specs/`：

- `docs/openapi/api.json` → `docs/api-reference/specs/api.json`
- `docs/openapi/relay.json` → `docs/api-reference/specs/relay.json`

页面会自动重新统计接口数量、分组和数据模型，并渲染最新参数与响应。

## 文件结构

```text
api-reference/
├── assets/logo.svg
├── specs/api.json
├── specs/relay.json
├── app.js
├── styles.css
├── index.html
└── README.md
```
