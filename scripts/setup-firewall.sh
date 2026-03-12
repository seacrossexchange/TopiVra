#!/bin/bash

# ==================== 防火墙配置脚本 ====================
# 用途：配置 UFW 防火墙规则
# 使用：sudo ./setup-firewall.sh

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "TopiVra 防火墙配置"
echo "=========================================="

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 请使用 root 权限运行此脚本${NC}"
    echo "使用: sudo $0"
    exit 1
fi

# 检查 UFW 是否安装
if ! command -v ufw &> /dev/null; then
    echo "UFW 未安装，正在安装..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y ufw
    elif [ -f /etc/redhat-release ]; then
        yum install -y ufw
    else
        echo -e "${RED}❌ 不支持的操作系统${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ UFW 已安装${NC}"

# 显示当前规则
echo ""
echo -e "${BLUE}当前防火墙规则:${NC}"
ufw status numbered

# 确认配置
echo ""
echo -e "${YELLOW}⚠️  警告: 此操作将重置防火墙规则！${NC}"
echo "将配置以下规则:"
echo "  - 允许 SSH (22/tcp)"
echo "  - 允许 HTTP (80/tcp)"
echo "  - 允许 HTTPS (443/tcp)"
echo "  - 拒绝 MySQL (3306/tcp) - 仅内网访问"
echo "  - 拒绝 Redis (6379/tcp) - 仅内网访问"
echo ""
read -p "确认要配置防火墙吗? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "操作已取消"
  exit 0
fi

# 重置 UFW
echo ""
echo "重置 UFW 配置..."
ufw --force reset

# 设置默认策略
echo "设置默认策略..."
ufw default deny incoming
ufw default allow outgoing

# 允许 SSH（重要！防止锁定）
echo ""
echo -e "${GREEN}配置 SSH 访问...${NC}"
ufw allow 22/tcp comment 'SSH'

# 允许 HTTP 和 HTTPS
echo -e "${GREEN}配置 Web 访问...${NC}"
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# 拒绝数据库端口（仅 Docker 内网访问）
echo -e "${YELLOW}配置数据库访问限制...${NC}"
ufw deny 3306/tcp comment 'MySQL - Internal Only'
ufw deny 6379/tcp comment 'Redis - Internal Only'

# 允许 Docker 网络（可选）
echo -e "${GREEN}配置 Docker 网络...${NC}"
ufw allow from 172.16.0.0/12 comment 'Docker Network'

# 启用 UFW
echo ""
echo "启用防火墙..."
ufw --force enable

# 显示配置结果
echo ""
echo "=========================================="
echo "✅ 防火墙配置完成！"
echo "=========================================="
echo ""
echo -e "${BLUE}当前防火墙规则:${NC}"
ufw status verbose

echo ""
echo -e "${GREEN}✅ 配置摘要:${NC}"
echo "  ✅ SSH (22) - 允许"
echo "  ✅ HTTP (80) - 允许"
echo "  ✅ HTTPS (443) - 允许"
echo "  ❌ MySQL (3306) - 拒绝外部访问"
echo "  ❌ Redis (6379) - 拒绝外部访问"
echo "  ✅ Docker 网络 - 允许"
echo ""
echo "查看规则: sudo ufw status numbered"
echo "删除规则: sudo ufw delete <number>"
echo "禁用防火墙: sudo ufw disable"
echo ""

# 测试端口
echo -e "${BLUE}端口测试:${NC}"
echo "SSH (22): $(netstat -an 2>/dev/null | grep :22 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${YELLOW}未监听${NC}")"
echo "HTTP (80): $(netstat -an 2>/dev/null | grep :80 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${YELLOW}未监听${NC}")"
echo "HTTPS (443): $(netstat -an 2>/dev/null | grep :443 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${YELLOW}未监听${NC}")"
echo "MySQL (3306): $(netstat -an 2>/dev/null | grep :3306 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${YELLOW}未监听${NC}")"
echo "Redis (6379): $(netstat -an 2>/dev/null | grep :6379 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${YELLOW}未监听${NC}")"
echo ""


















