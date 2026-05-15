#!/bin/bash

# ============================================
# 率土之滨助手 - Linux一键部署脚本
# ============================================
# 使用方法: chmod +x deploy.sh && ./deploy.sh
# 支持系统: Ubuntu/Debian, CentOS/RHEL
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 安装目录
INSTALL_DIR="/opt/stzbhelper"
SERVICE_NAME="stzbhelper"
SERVER_PORT="${SERVER_PORT:-9627}"

echo ""
echo "============================================"
echo "   率土之滨助手 - Linux一键部署脚本"
echo "============================================"
echo ""

# 检测系统类型
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
    else
        OS="unknown"
    fi
    info "检测到系统: $OS"
}

# 检查root权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "请使用root权限运行此脚本: sudo ./deploy.sh"
    fi
}

# 安装依赖
install_dependencies() {
    info "安装系统依赖..."
    
    case $OS in
        ubuntu|debian)
            apt update -y
            apt install -y curl wget git build-essential libpcap-dev
            ;;
        centos|rhel|rocky|almalinux)
            yum install -y curl wget git gcc make libpcap-devel
            ;;
        *)
            warn "未知系统，请手动安装: curl, wget, git, gcc, libpcap-dev"
            ;;
    esac
    
    success "系统依赖安装完成"
}

# 安装Node.js
install_nodejs() {
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node -v)
        info "Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    info "安装 Node.js 20.x..."
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
            ;;
        centos|rhel|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
            ;;
        *)
            error "请手动安装 Node.js 20.x"
            ;;
    esac
    
    success "Node.js 安装完成: $(node -v)"
}

# 安装Go
install_go() {
    if command -v go &> /dev/null; then
        GO_VERSION=$(go version)
        info "Go 已安装: $GO_VERSION"
        return
    fi
    
    info "安装 Go 1.21..."
    
    GO_VERSION="1.21.6"
    GO_ARCH=$(uname -m)
    
    case $GO_ARCH in
        x86_64) GO_ARCH="amd64" ;;
        aarch64) GO_ARCH="arm64" ;;
    esac
    
    # 使用国内镜像加速下载
    wget -q "https://golang.google.cn/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" -O /tmp/go.tar.gz || \
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" -O /tmp/go.tar.gz
    
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    
    # 添加到PATH
    if ! grep -q "/usr/local/go/bin" /etc/profile; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
        export PATH=$PATH:/usr/local/go/bin
    fi
    
    # 立即生效
    export PATH=$PATH:/usr/local/go/bin
    
    success "Go 安装完成: $(go version)"
}

# 构建前端
build_frontend() {
    info "构建前端..."
    
    # 设置npm国内镜像
    npm config set registry https://registry.npmmirror.com
    
    cd heroui-web
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        info "安装npm依赖..."
        npm install
    fi
    
    # 构建
    info "执行 vite build..."
    npm run build
    
    cd ..
    
    # 复制到 web/dist
    rm -rf web/dist
    mkdir -p web/dist
    cp -r heroui-web/dist/* web/dist/
    
    if [ -d "web/dist" ]; then
        success "前端构建完成"
    else
        error "前端构建失败"
    fi
    
    # 构建teamweb前端（队伍查询）
    if [ -d "teamweb" ]; then
        info "构建teamweb前端..."
        cd teamweb
        
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        
        npm run build
        cd ..
        success "teamweb前端构建完成"
    fi
    
    # 构建移动端
    if [ -d "web-mobile" ]; then
        info "构建移动端..."
        cd web-mobile
        
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        
        npm run build
        cd ..
        
        # 复制到 web/dist/m
        info "复制移动端文件..."
        mkdir -p web/dist/m
        cp -r web-mobile/dist/* web/dist/m/
        
        success "移动端构建完成"
    fi
}

# 构建后端
build_backend() {
    info "构建后端..."
    
    # 确保Go可用
    export PATH=$PATH:/usr/local/go/bin
    export GOPROXY=https://goproxy.cn,direct
    
    # 下载依赖
    go mod tidy
    
    # 编译
    CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o stzbhelper-linux-amd64 .
    
    if [ -f "stzbhelper-linux-amd64" ]; then
        chmod +x stzbhelper-linux-amd64
        success "后端构建完成"
    else
        error "后端构建失败"
    fi
}

# 创建安装目录
create_install_dir() {
    info "创建安装目录: $INSTALL_DIR"
    
    mkdir -p $INSTALL_DIR
    
    # 复制文件
    cp stzbhelper-linux-amd64 $INSTALL_DIR/
    cp -r web/dist $INSTALL_DIR/
    
    # 复制teamweb文件（队伍查询）如果存在的话
    if [ -d "teamweb/dist" ]; then
        info "复制teamweb文件..."
        mkdir -p web/dist/data
        cp -r teamweb/dist/* web/dist/data/
        cp teamweb/dist/index.html web/dist/data.html
        
        if [ -d "teamweb/dist/assets" ]; then
            mkdir -p web/dist/assets
            cp -n -r teamweb/dist/assets/* web/dist/assets/ || true
        fi
        
        # 复制到安装目录
        mkdir -p $INSTALL_DIR/dist/data
        cp -r teamweb/dist/* $INSTALL_DIR/dist/data/
        cp teamweb/dist/index.html $INSTALL_DIR/dist/data.html
        
        if [ -d "teamweb/dist/assets" ]; then
            mkdir -p $INSTALL_DIR/dist/assets
            cp -n -r teamweb/dist/assets/* $INSTALL_DIR/dist/assets/ || true
        fi
    fi
    
    # 创建.env文件（如果不存在）
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        cat > $INSTALL_DIR/.env << EOF
# 数据库配置
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stzbhelper

# 服务配置
SERVER_PORT=$SERVER_PORT
JWT_SECRET=$(openssl rand -hex 32)
EOF
        warn "请编辑 $INSTALL_DIR/.env 配置数据库信息"
    fi
    
    success "文件安装完成"
}

# 创建systemd服务
create_service() {
    info "创建systemd服务..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=StzbHelper - 率土之滨助手服务
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/stzbhelper-linux-amd64
Restart=on-failure
RestartSec=5s

# 环境变量
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    success "服务创建完成"
}

# 启动服务
start_service() {
    info "启动服务..."
    
    systemctl start $SERVICE_NAME
    sleep 2
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        success "服务启动成功"
    else
        error "服务启动失败，请检查日志: journalctl -u $SERVICE_NAME"
    fi
}

# 显示完成信息
show_info() {
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "============================================"
    echo "   部署完成!"
    echo "============================================"
    echo ""
    echo -e "${GREEN}安装目录:${NC} $INSTALL_DIR"
    echo -e "${GREEN}服务名称:${NC} $SERVICE_NAME"
    echo ""
    echo -e "${YELLOW}配置文件:${NC} $INSTALL_DIR/.env"
    echo -e "${YELLOW}请先编辑配置文件设置数据库信息:${NC}"
    echo "  vim $INSTALL_DIR/.env"
    echo "  systemctl restart $SERVICE_NAME"
    echo ""
    echo -e "${GREEN}访问地址:${NC}"
    echo "  http://$LOCAL_IP:$SERVER_PORT/"
    echo "  http://$LOCAL_IP:$SERVER_PORT/m/"
    echo "  http://$LOCAL_IP:$SERVER_PORT/data.html"
    echo ""
    echo -e "${GREEN}常用命令:${NC}"
    echo "  启动服务: systemctl start $SERVICE_NAME"
    echo "  停止服务: systemctl stop $SERVICE_NAME"
    echo "  重启服务: systemctl restart $SERVICE_NAME"
    echo "  查看状态: systemctl status $SERVICE_NAME"
    echo "  查看日志: journalctl -u $SERVICE_NAME -f"
    echo ""
}

# 主函数
main() {
    detect_os
    check_root
    
    # 安装环境
    install_dependencies
    install_nodejs
    install_go
    
    # 构建
    build_frontend
    build_backend
    
    # 安装
    create_install_dir
    create_service
    
    # 提示配置
    warn "请先配置数据库信息后再启动服务"
    warn "配置文件: $INSTALL_DIR/.env"
    echo ""
    
    read -p "是否现在启动服务? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_service
        show_info
    else
        info "稍后手动启动: systemctl start $SERVICE_NAME"
        show_info
    fi
}

# 执行
main
