#!/bin/bash

# =============================================================================
# 快速启用主机名检查（禁止 IP 访问）
# 用途：SSH 一键执行，启用安全限制
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  启用主机名检查（禁止 IP 访问）${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${RED}⚠️  警告: 启用后将无法通过 IP 地址访问${NC}"
echo -e "${RED}   请确保已通过域名配置好访问方式${NC}"
echo ""

read -p "确定要启用吗？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}已取消操作${NC}"
    exit 0
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 未找到 .env 文件${NC}"
    exit 1
fi

# 备份配置文件
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"

# 修改配置
if grep -q "^ENABLE_HOST_CHECK=" "$ENV_FILE"; then
    sed -i 's/^ENABLE_HOST_CHECK=.*/ENABLE_HOST_CHECK=true/' "$ENV_FILE"
else
    echo "" >> "$ENV_FILE"
    echo "ENABLE_HOST_CHECK=true" >> "$ENV_FILE"
fi

echo -e "${GREEN}✓ 配置已修改${NC}"

# 重启服务
echo -e "${YELLOW}正在重启服务...${NC}"

if systemctl is-active --quiet stzbhelper 2>/dev/null; then
    sudo systemctl restart stzbhelper
    echo -e "${GREEN}✓ 服务已重启${NC}"
elif pgrep -f "stzbhelper" > /dev/null; then
    pkill -f "stzbhelper" || true
    sleep 2
    nohup "${SCRIPT_DIR}/stzbhelper" > "${SCRIPT_DIR}/stzbhelper.log" 2>&1 &
    echo -e "${GREEN}✓ 服务已重启${NC}"
else
    echo -e "${RED}✗ 服务未运行，请手动启动${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  已启用！现在只能通过域名访问${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "备份文件: ${BACKUP_FILE}"
echo -e "如需恢复: cp ${BACKUP_FILE} ${ENV_FILE} && systemctl restart stzbhelper"
echo ""
