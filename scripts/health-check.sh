#!/bin/bash

# ==================== TokBazaar 健康检查脚本 ====================
# 用途：检查所有服务的健康状态
# 使用：./health-check.sh

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "🏥 TokBazaar 健康检查"
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker 未运行${NC}"
  exit 1
fi

# 1. 容器状态检查
echo -e "\n${BLUE}1. 容器状态:${NC}"
docker-compose ps

# 2. MySQL 健康检查
echo -e "\n${BLUE}2. MySQL 连接:${NC}"
if docker exec tokbazaar-mysql mysqladmin ping -h localhost -uroot -proot > /dev/null 2>&1; then
  echo -e "${GREEN}✅ MySQL 正常${NC}"
  
  # 显示数据库统计
  docker exec tokbazaar-mysql mysql -uroot -proot tokbazaar -e "
    SELECT 'Users' as Table_Name, COUNT(*) as Count FROM users
    UNION ALL
    SELECT 'Products', COUNT(*) FROM products
    UNION ALL
    SELECT 'Orders', COUNT(*) FROM orders;
  " 2>/dev/null
else
  echo -e "${RED}❌ MySQL 异常${NC}"
fi

# 3. Redis 健康检查
echo -e "\n${BLUE}3. Redis 连接:${NC}"
if docker exec tokbazaar-redis redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Redis 正常${NC}"
  
  # 显示 Redis 信息
  echo "Redis 版本: $(docker exec tokbazaar-redis redis-cli INFO server | grep redis_version | cut -d: -f2)"
  echo "已用内存: $(docker exec tokbazaar-redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2)"
  echo "连接数: $(docker exec tokbazaar-redis redis-cli INFO clients | grep connected_clients | cut -d: -f2)"
else
  echo -e "${RED}❌ Redis 异常${NC}"
fi

# 4. 后端 API 健康检查
echo -e "\n${BLUE}4. 后端 API:${NC}"
API_RESPONSE=$(curl -s http://localhost:3001/health/live)
if echo "$API_RESPONSE" | grep -q "ok"; then
  echo -e "${GREEN}✅ API 正常${NC}"
  echo "$API_RESPONSE" | head -1
else
  echo -e "${RED}❌ API 异常${NC}"
fi

# 5. 前端服务检查
echo -e "\n${BLUE}5. 前端服务:${NC}"
if docker ps | grep -q tokbazaar-client-dev; then
  echo -e "${GREEN}✅ 开发前端运行中 (端口 5174)${NC}"
fi

if docker ps | grep -q tokbazaar-client; then
  echo -e "${GREEN}✅ 生产前端运行中 (端口 3000)${NC}"
fi

# 6. 磁盘空间检查
echo -e "\n${BLUE}6. 磁盘空间:${NC}"
df -h | grep -E "Filesystem|/var/lib/docker|/$" | head -3

# 7. 内存使用检查
echo -e "\n${BLUE}7. 内存使用:${NC}"
free -h

# 8. Docker 资源使用
echo -e "\n${BLUE}8. Docker 容器资源:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -7

# 9. 网络连接检查
echo -e "\n${BLUE}9. 网络端口:${NC}"
echo "MySQL (3306): $(netstat -an 2>/dev/null | grep :3306 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${RED}未监听${NC}")"
echo "Redis (6379): $(netstat -an 2>/dev/null | grep :6379 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${RED}未监听${NC}")"
echo "API (3001): $(netstat -an 2>/dev/null | grep :3001 | grep LISTEN > /dev/null && echo -e "${GREEN}监听中${NC}" || echo -e "${RED}未监听${NC}")"

# 10. 日志错误检查
echo -e "\n${BLUE}10. 最近错误日志:${NC}"
ERROR_COUNT=$(docker logs topivra-server --since 1h 2>&1 | grep -i error | wc -l)
if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "${YELLOW}⚠️  最近1小时有 $ERROR_COUNT 个错误${NC}"
  docker logs topivra-server --since 1h 2>&1 | grep -i error | tail -3
else
  echo -e "${GREEN}✅ 无错误日志${NC}"
fi

echo ""
echo "=========================================="
echo "检查完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="













