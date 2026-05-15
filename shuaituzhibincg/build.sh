#!/bin/bash

# ============================================
# 率土之滨助手 - Linux构建脚本
# ============================================
# 使用方法: chmod +x build.sh && ./build.sh [选项]
# 选项:
#   all      - 构建前后端（默认）
#   backend  - 仅构建后端
#   frontend - 仅构建前端
#   install  - 构建并安装到系统
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

BUILD_TYPE=${1:-all}
INSTALL_DIR="/opt/stzbhelper"

echo ""
echo "======================================"
echo " 率土之滨助手 - 构建脚本"
echo "======================================"
echo ""

# 构建前端
build_frontend() {
    info "构建前端..."
    
    # 检查Node.js环境
    if ! command -v npm &> /dev/null; then
        error "未安装npm，请先安装Node.js"
    fi
    
    # 设置npm国内镜像
    npm config set registry https://registry.npmmirror.com
    
    # 构建web前端
    if [ -d "heroui-web" ]; then
        info "构建web前端..."
        cd heroui-web
        
        if [ ! -d "node_modules" ]; then
            info "安装npm依赖..."
            npm install
        fi
        
        npm run build
        cd ..
        
        # 复制到 web/dist 以便打包进 Go 二进制文件
        rm -rf web/dist
        mkdir -p web/dist
        cp -r heroui-web/dist/* web/dist/
        
        success "web前端构建完成!"
    else
        error "heroui-web目录不存在"
    fi
    
    # 构建teamweb前端
    if [ -d "teamweb" ]; then
        info "构建teamweb前端..."
        cd teamweb
        
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        
        npm run build
        cd ..
        
        # 复制teamweb构建结果
        info "复制teamweb文件..."
        
        mkdir -p web/dist/data
        cp -r teamweb/dist/* web/dist/data/
        cp teamweb/dist/index.html web/dist/data.html
        
        if [ -d "teamweb/dist/assets" ]; then
            mkdir -p web/dist/assets
            cp -r teamweb/dist/assets/* web/dist/assets/
        fi
        
        success "teamweb前端构建完成!"
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
        
        success "移动端构建完成!"
    fi
}

# 构建后端
build_backend() {
    info "构建后端..."
    
    # 检查Go环境
    if ! command -v go &> /dev/null; then
        error "未安装Go环境，请先安装Go"
    fi
    
    # 检查前端是否已构建
    if [ ! -d "web/dist" ]; then
        error "web/dist目录不存在，请先构建前端: ./build.sh frontend"
    fi
    
    # 检查libpcap
    if [ ! -f /usr/include/pcap.h ] && [ ! -f /usr/local/include/pcap.h ]; then
        warn "未安装libpcap-dev"
        echo "  Ubuntu/Debian: apt install libpcap-dev"
        echo "  CentOS/RHEL: yum install libpcap-devel"
        read -p "是否继续构建? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 下载依赖
    info "下载Go依赖..."
    export GOPROXY=https://goproxy.cn,direct
    go mod tidy
    
    # 编译
    info "编译Linux amd64版本..."
    CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o stzbhelper-linux-amd64 .
    
    chmod +x stzbhelper-linux-amd64
    
    success "后端构建完成!"
    ls -lh stzbhelper-linux-amd64
}

# 安装到系统
install_system() {
    info "安装到系统..."
    
    if [ "$EUID" -ne 0 ]; then
        error "请使用root权限运行: sudo ./build.sh install"
    fi
    
    # 先构建
    build_frontend
    build_backend
    
    # 创建目录
    mkdir -p $INSTALL_DIR
    
    # 复制文件
    cp stzbhelper-linux-amd64 $INSTALL_DIR/
    cp -r web/dist $INSTALL_DIR/
    
    # 创建.env文件
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
SERVER_PORT=9627
JWT_SECRET=$(openssl rand -hex 32)
EOF
        warn "请编辑 $INSTALL_DIR/.env 配置数据库"
    fi
    
    # 创建服务
    cat > /etc/systemd/system/stzbhelper.service << EOF
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
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable stzbhelper
    
    success "安装完成!"
    echo ""
    echo "配置文件: $INSTALL_DIR/.env"
    echo "启动服务: systemctl start stzbhelper"
    echo "访问地址: http://localhost:9627/"
}

# 构建微信小程序
build_weapp() {
    info "构建微信小程序..."
    
    if [ -d "miniprogram" ]; then
        cd miniprogram
        
        if [ ! -d "node_modules" ]; then
            info "安装小程序依赖..."
            npm install
        fi
        
        # 对于原生小程序可能不需要 build:weapp，如果需要构建npm，可以在微信开发者工具中执行
        success "微信小程序准备完成!"
        echo ""
        echo "微信小程序项目目录: miniprogram"
        echo "请在微信开发者工具中导入此目录，并执行【工具】->【构建 npm】"
    else
        error "miniprogram目录不存在"
    fi
}

# 显示帮助
show_help() {
    echo "使用方法: ./build.sh [选项]"
    echo ""
    echo "选项:"
    echo "  all      - 构建前后端（默认）"
    echo "  backend  - 仅构建后端"
    echo "  frontend - 仅构建前端"
    echo "  weapp    - 构建微信小程序"
    echo "  install  - 构建并安装到系统（需要root权限）"
    echo ""
}

# 主逻辑
case $BUILD_TYPE in
    all)
        build_frontend
        build_backend
        ;;
    backend)
        build_backend
        ;;
    frontend)
        build_frontend
        ;;
    weapp)
        build_weapp
        ;;
    install)
        install_system
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        error "未知选项: $BUILD_TYPE"
        show_help
        ;;
esac

echo ""
echo "======================================"
echo " 构建完成!"
echo "======================================"
echo ""
echo "输出文件:"
echo "  stzbhelper-linux-amd64  - 后端程序"
echo "  web/dist/               - 前端静态文件"
echo ""
echo "快速部署:"
echo "  sudo ./build.sh install"
echo ""
