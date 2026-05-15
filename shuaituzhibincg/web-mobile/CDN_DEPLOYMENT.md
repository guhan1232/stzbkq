# 小程序CDN部署配置说明

## 问题背景

当小程序前端部署在CDN上，而API部署在另一台服务器时，会遇到跨域请求问题，导致登录等API调用失败。

## 解决方案

本方案通过支持动态配置API地址，解决了CDN部署时的跨域问题。

## 配置方式

### 方式一：通过环境变量配置（推荐）

1. 在 `web-mobile` 目录下创建 `.env` 文件：

```bash
# API服务器地址
VITE_API_BASE_URL=https://your-api-server.com/v1
```

2. 重新构建前端：

```bash
cd web-mobile
npm run build
```

### 方式二：通过HTML全局变量配置（无需重新构建）

1. 编辑 `web-mobile/index.html`

2. 取消注释并修改API地址：

```html
<script>window.__API_BASE_URL__ = 'https://your-api-server.com/v1';</script>
```

3. 将修改后的文件部署到CDN

**优点**：无需重新构建，可以直接在部署时修改

## 配置优先级

API地址的获取优先级如下：

1. `window.__API_BASE_URL__` (运行时配置，最高优先级)
2. `VITE_API_BASE_URL` (构建时环境变量)
3. `/v1` (默认相对路径，同域部署)

## 后端CORS配置

后端已配置支持跨域请求：

```go
r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"*"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}))
```

## 部署示例

### 场景1：前后端同域部署（默认）

无需任何配置，使用默认的相对路径 `/v1` 即可。

```
前端: https://example.com/m/
API:  https://example.com/v1/
```

### 场景2：前端CDN + API独立服务器

1. **构建时配置**：

```bash
# web-mobile/.env
VITE_API_BASE_URL=https://api.example.com/v1
```

2. **或运行时配置**（修改 index.html）：

```html
<script>window.__API_BASE_URL__ = 'https://api.example.com/v1';</script>
```

```
前端: https://cdn.example.com/m/
API:  https://api.example.com/v1/
```

## 常见问题

### 1. 登录失败，提示"网络连接失败"

**原因**：API地址配置错误或后端CORS未正确配置

**解决**：
- 检查API地址是否正确
- 检查后端服务是否正常运行
- 检查浏览器控制台是否有CORS错误

### 2. 提示"CORS错误"

**原因**：后端未正确配置CORS

**解决**：确保后端已按上述CORS配置重新编译部署

### 3. 请求超时

**原因**：网络问题或API服务器响应慢

**解决**：
- 检查网络连接
- 检查API服务器性能
- 可在 `request.js` 中调整 `timeout` 参数

## 测试验证

1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签
3. 尝试登录
4. 检查API请求地址是否正确指向配置的服务器
5. 检查响应是否正常

## 相关文件

- `web-mobile/src/api/request.js` - API请求配置
- `web-mobile/index.html` - HTML入口文件
- `web-mobile/.env.example` - 环境变量示例
- `http.go` - 后端CORS配置
