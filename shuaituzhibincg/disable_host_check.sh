#!/bin/bash

# =============================================================================
# 禁用主机名检查（允许 IP 访问）
# 用途：当启用 ENABLE_HOST_CHECK 后无法通过 IP 访问时，使用此脚本恢复
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  禁用主机名检查（允许 IP 访问）${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 未找到 .env 文件 (${ENV_FILE})${NC}"
    exit 1
fi

echo -e "${YELLOW}当前配置:${NC}"
grep "ENABLE_HOST_CHECK" "$ENV_FILE" || echo "ENABLE_HOST_CHECK 未配置（默认为 false）"
echo ""

# 备份配置文件
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}备份配置文件到: ${BACKUP_FILE}${NC}"
cp "$ENV_FILE" "$BACKUP_FILE"

# 修改配置
if grep -q "^ENABLE_HOST_CHECK=" "$ENV_FILE"; then
    # 如果已存在，替换为 false
    sed -i 's/^ENABLE_HOST_CHECK=.*/ENABLE_HOST_CHECK=false/' "$ENV_FILE"
    echo -e "${GREEN}✓ 已更新 ENABLE_HOST_CHECK=false${NC}"
else
    # 如果不存在，添加配置
    echo "" >> "$ENV_FILE"
    echo "# 安全配置" >> "$ENV_FILE"
    echo "ENABLE_HOST_CHECK=false" >> "$ENV_FILE"
    echo -e "${GREEN}✓ 已添加 ENABLE_HOST_CHECK=false${NC}"
fi

echo ""
echo -e "${YELLOW}新配置:${NC}"
grep "ENABLE_HOST_CHECK" "$ENV_FILE"
echo ""

# 提示重启服务
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}配置已修改，需要重启服务才能生效${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${GREEN}请选择操作:${NC}"
echo "1) 立即重启服务"
echo "2) 稍后手动重启"
echo ""
read -p "请输入选项 (1/2): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}正在重启服务...${NC}"
        
        # 尝试多种方式重启
        if systemctl is-active --quiet stzbhelper 2>/dev/null; then
            sudo systemctl restart stzbhelper
            echo -e "${GREEN}✓ 服务已通过 systemd 重启${NC}"
        elif [ -f "${SCRIPT_DIR}/stzbhelper" ]; then
            # 查找并杀死现有进程
            if pgrep -f "stzbhelper" > /dev/null; then
                echo "停止现有进程..."
                pkill -f "stzbhelper" || true
                sleep 2
            fi
            
            # 启动新进程
            nohup "${SCRIPT_DIR}/stzbhelper" > "${SCRIPT_DIR}/stzbhelper.log" 2>&1 &
            echo -e "${GREEN}✓ 服务已启动（后台运行）${NC}"
            echo "日志文件: ${SCRIPT_DIR}/stzbhelper.log"
        else
            echo -e "${RED}✗ 无法自动重启服务，请手动重启${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  完成！现在可以通过 IP 访问了${NC}"
        echo -e "${GREEN}========================================${NC}"
        ;;
    2)
        echo ""
        echo -e "${YELLOW}请稍后手动重启服务:${NC}"
        echo "  systemctl restart stzbhelper"
        echo ""
        echo -e "${GREEN}配置已保存，重启后生效${NC}"
        ;;
    *)
        echo ""
        echo -e "${RED}无效选项${NC}"
        echo "请手动重启服务: systemctl restart stzbhelper"
        ;;
esac

echo ""
echo -e "${GREEN}提示:${NC}"
echo "- 备份文件: ${BACKUP_FILE}"
echo "- 如需恢复原配置: cp ${BACKUP_FILE} ${ENV_FILE} && systemctl restart stzbhelper"
echo ""
