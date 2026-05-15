# StzbHelper 部署文档

本文档用于部署 StzbHelper 后端服务、Web 管理端、移动端静态资源和微信小程序。项目后端使用 Go + Gin，数据库使用 MySQL，前端主要使用 Vite 构建后嵌入到 Go 二进制中。

## 目录结构

```text
.
|-- main.go                  # 后端入口
|-- http.go                  # HTTP 服务启动
|-- config/                  # 配置读取
|-- database/                # 数据库初始化与迁移
|-- model/                   # 数据模型
|-- http/                    # API 路由与处理
|-- heroui-web/              # Web 管理端，主要前端
|-- web/                     # Go embed 使用的静态资源目录
|-- web-mobile/              # 移动端 H5
|-- teamweb/                 # 队伍查询前端
|-- miniprogram/             # 微信小程序
|-- .env.example             # 环境变量示例
|-- build.sh                 # Linux 构建脚本
|-- build.bat                # Windows 构建脚本
`-- deploy.sh                # Linux 部署脚本
```

## 环境要求

服务器建议使用 Ubuntu 22.04 / Debian 12 / CentOS 7+。

必须安装：

- Go 1.21+
- Node.js 20+
- MySQL 5.7+ 或 MySQL 8.x
- libpcap 开发库
- Git、gcc、make 等基础构建工具

Ubuntu / Debian:

```bash
sudo apt update
sudo apt install -y git curl wget build-essential libpcap-dev mysql-server
```

CentOS / Rocky / AlmaLinux:

```bash
sudo yum install -y git curl wget gcc make libpcap-devel mysql-server
```

Windows 本地运行需要安装 Npcap，并确保 Go 编译环境可用。

## 数据库准备

登录 MySQL：

```bash
mysql -uroot -p
```

创建系统数据库和用户：

```sql
CREATE DATABASE stzbhelper CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stzbhelper'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON stzbhelper.* TO 'stzbhelper'@'%';
GRANT CREATE, ALTER, DROP, INDEX, SELECT, INSERT, UPDATE, DELETE ON *.* TO 'stzbhelper'@'%';
FLUSH PRIVILEGES;
```

说明：程序支持多游戏数据库，会按需要自动创建或迁移相关表。生产环境可以根据实际安全策略收紧授权范围。

## 配置环境变量

复制配置文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=stzbhelper
DB_PASSWORD=your_password
DB_NAME=stzbhelper

SERVER_PORT=9527
SESSION_SECRET=replace-with-a-long-random-secret
ENABLE_HOST_CHECK=false
DEVICE_PRIORITY=eth0,eth1,ens33,wlan0,wg0,any
```

推荐生成 Session 密钥：

```bash
openssl rand -base64 32
```

配置说明：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` | MySQL 地址 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | MySQL 用户 |
| `DB_PASSWORD` | 空 | MySQL 密码 |
| `DB_NAME` | `stzbhelper` | 系统数据库名 |
| `SERVER_PORT` | `9527` | HTTP 服务端口 |
| `SESSION_SECRET` | 内置默认值 | Session 签名密钥，生产必须修改 |
| `ENABLE_HOST_CHECK` | `false` | 是否禁止直接通过 IP 访问 |
| `DEVICE_PRIORITY` | 常见网卡列表 | 抓包网卡优先级 |

## 构建部署

### 一键构建

Linux:

```bash
chmod +x build.sh
./build.sh all
```

Windows:

```bat
build.bat all
```

构建完成后会生成：

- `stzbhelper-linux-amd64`：Linux 后端二进制
- `web/dist/`：嵌入 Go 程序的前端静态资源

### 手动构建前端

主 Web 管理端：

```bash
cd heroui-web
npm install
npm run build
cd ..
rm -rf web/dist
mkdir -p web/dist
cp -r heroui-web/dist/* web/dist/
```

移动端 H5：

```bash
cd web-mobile
npm install
npm run build
cd ..
mkdir -p web/dist/m
cp -r web-mobile/dist/* web/dist/m/
```

队伍查询页面：

```bash
cd teamweb
npm install
npm run build
cd ..
mkdir -p web/dist/data
cp -r teamweb/dist/* web/dist/data/
cp teamweb/dist/index.html web/dist/data.html
```

### 手动构建后端

Linux：

```bash
go mod download
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o stzbhelper-linux-amd64 .
chmod +x stzbhelper-linux-amd64
```

本机快速验证：

```bash
go build ./...
```

## 运行服务

直接运行：

```bash
./stzbhelper-linux-amd64
```

启动后访问：

- Web 管理端：`http://服务器IP:9527/`
- 移动端：`http://服务器IP:9527/m/`
- 队伍查询：`http://服务器IP:9527/data.html`

如果修改了 `SERVER_PORT`，请使用对应端口。

## systemd 部署

创建安装目录：

```bash
sudo mkdir -p /opt/stzbhelper
sudo cp stzbhelper-linux-amd64 /opt/stzbhelper/
sudo cp .env /opt/stzbhelper/
```

创建服务文件：

```bash
sudo tee /etc/systemd/system/stzbhelper.service >/dev/null <<'EOF'
[Unit]
Description=StzbHelper Service
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/stzbhelper
ExecStart=/opt/stzbhelper/stzbhelper-linux-amd64
Restart=on-failure
RestartSec=5s
EnvironmentFile=/opt/stzbhelper/.env

[Install]
WantedBy=multi-user.target
EOF
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable stzbhelper
sudo systemctl start stzbhelper
sudo systemctl status stzbhelper
```

查看日志：

```bash
journalctl -u stzbhelper -f
```

重启服务：

```bash
sudo systemctl restart stzbhelper
```

## Nginx 反向代理

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:9527;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /v1/ws/ {
        proxy_pass http://127.0.0.1:9527;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

启用 HTTPS 建议使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

如果开启 `ENABLE_HOST_CHECK=true`，必须通过配置的域名访问，不能直接用服务器 IP 访问。

## 抓包权限

程序需要抓取游戏 TCP 8001 端口数据。Linux 下推荐使用 root 运行 systemd 服务。若不使用 root，需要给二进制增加抓包权限：

```bash
sudo setcap cap_net_raw,cap_net_admin=eip /opt/stzbhelper/stzbhelper-linux-amd64
```

检查权限：

```bash
getcap /opt/stzbhelper/stzbhelper-linux-amd64
```

如果抓不到数据，优先检查：

- 游戏客户端是否正在产生网络数据
- 服务器或本机网卡是否能看到游戏流量
- `DEVICE_PRIORITY` 是否包含正确网卡
- Linux 是否安装 `libpcap-dev` 或 `libpcap-devel`
- 是否有 root 或 `setcap` 权限

## 微信小程序部署

1. 使用微信开发者工具导入 `miniprogram/` 目录。
2. 修改小程序 API 地址，使其指向后端服务域名。
3. 在微信开发者工具中执行“工具 -> 构建 npm”。
4. 预览确认登录、任务、战报等功能正常。
5. 上传并在微信公众平台提交审核。

注意：微信小程序正式环境接口域名必须配置 HTTPS，并在小程序后台加入合法域名。

## 更新流程

拉取新代码后重新构建：

```bash
git pull
./build.sh all
sudo systemctl stop stzbhelper
sudo cp stzbhelper-linux-amd64 /opt/stzbhelper/
sudo systemctl start stzbhelper
```

确认服务：

```bash
sudo systemctl status stzbhelper
journalctl -u stzbhelper -n 100 --no-pager
```

数据库表会在服务启动并连接数据库时通过 GORM 自动迁移。

## 常见问题

### 1. 前端构建提示 `vite: command not found`

说明当前目录没有安装前端依赖。进入对应前端目录执行：

```bash
npm install
npm run build
```

### 2. Go 编译提示 pcap 相关错误

Linux 安装 libpcap 开发库：

```bash
sudo apt install -y libpcap-dev
```

或：

```bash
sudo yum install -y libpcap-devel
```

Windows 需要安装 Npcap。

### 3. 启动后无法访问页面

检查端口和防火墙：

```bash
sudo systemctl status stzbhelper
ss -lntp | grep 9527
sudo ufw allow 9527/tcp
```

如果使用云服务器，还需要在云厂商安全组放行端口。

### 4. 数据库连接失败

检查 `.env` 中的数据库配置：

```bash
mysql -h127.0.0.1 -ustzbhelper -p stzbhelper
```

确认 MySQL 用户、密码、授权和服务状态。

### 5. 修改配置后没有生效

配置文件由程序启动时读取，修改 `.env` 后需要重启：

```bash
sudo systemctl restart stzbhelper
```

## 验证命令

后端编译：

```bash
go build ./...
```

重点包测试：

```bash
go test ./http/... ./model ./database
```

前端构建：

```bash
cd heroui-web
npm install
npm run build
```

## 生产建议

- 修改 `SESSION_SECRET` 为随机长字符串。
- 使用 HTTPS 和 Nginx 反向代理。
- MySQL 不要使用 root 账号运行生产服务。
- 定期备份 MySQL。
- systemd 服务保持 `Restart=on-failure`。
- 如果开启 IP 白名单或 Host Check，先确认管理入口可正常访问。
