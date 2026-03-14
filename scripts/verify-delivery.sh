#!/bin/bash
# ============================================================
# TopiVra 最终交付验证脚本 (Linux/Mac)
# 用途: 验证所有修复和优化是否正确应用
# 执行: bash scripts/verify-delivery.sh
# ============================================================

set -e

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function test_result() {
    local test_name="$1"
    local passed="$2"
    local message="$3"
    local is_warning="${4:-false}"
    
    if [ "$is_warning" = "true" ]; then
        echo -e "⚠️  ${YELLOW}${test_name}${NC}"
        [ -n "$message" ] && echo -e "   ${message}"
        ((WARN_COUNT++))
    elif [ "$passed" = "true" ]; then
        echo -e "✅ ${GREEN}${test_name}${NC}"
        [ -n "$message" ] && echo -e "   ${message}"
        ((PASS_COUNT++))
    else
        echo -e "❌ ${RED}${test_name}${NC}"
        [ -n "$message" ] && echo -e "   ${message}"
        ((FAIL_COUNT++))
    fi
}

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}        TopiVra 最终交付验证${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ==================== 1. 端口配置验证 ====================
echo -e "${CYAN}[1/8] 验证端口配置统一性...${NC}"
echo ""

# 检查 Nginx 配置
for config in config/nginx/nginx.conf config/nginx/dev.nginx.conf config/nginx/prod.nginx.conf; do
    if [ -f "$config" ]; then
        if grep -q "server server:8000" "$config"; then
            test_result "Nginx 配置 $config" "true" "upstream 指向 server:8000"
        elif grep -q "server server:3001" "$config"; then
            test_result "Nginx 配置 $config" "false" "仍然指向 server:3001，应为 server:8000"
        else
            test_result "Nginx 配置 $config" "false" "未找到 upstream backend 配置"
        fi
    else
        test_result "Nginx 配置 $config" "false" "文件不存在"
    fi
done

echo ""

# ==================== 2. 环境变量文件验证 ====================
echo -e "${CYAN}[2/8] 验证环境变量配置...${NC}"
echo ""

for file in server/.env.example client/.env.example .env.example; do
    if [ -f "$file" ]; then
        test_result "环境变量文件 $file" "true" "文件存在"
    else
        test_result "环境变量文件 $file" "false" "文件不存在"
    fi
done

echo ""

# ==================== 3. 安全配置验证 ====================
echo -e "${CYAN}[3/8] 验证安全配置...${NC}"
echo ""

if [ -f "server/src/main.ts" ]; then
    if grep -q "jwtSecret.length < 32" "server/src/main.ts"; then
        test_result "JWT 密钥长度检查" "true" "main.ts 包含密钥长度验证"
    else
        test_result "JWT 密钥长度检查" "false" "缺少密钥长度验证"
    fi
    
    if grep -q "nodeEnv !== 'production'" "server/src/main.ts"; then
        test_result "Swagger 生产环境禁用" "true" "生产环境强制禁用 Swagger"
    else
        test_result "Swagger 生产环境禁用" "false" "Swagger 可能在生产环境暴露"
    fi
else
    test_result "main.ts" "false" "文件不存在"
fi

echo ""

# ==================== 4. 文档一致性验证 ====================
echo -e "${CYAN}[4/8] 验证文档一致性...${NC}"
echo ""

for doc in DEPLOYMENT.md docs/deployment-guide.md README.md; do
    if [ -f "$doc" ]; then
        if grep -q "localhost:3001\|localhost:5174" "$doc"; then
            test_result "文档 $doc" "false" "仍包含旧端口号 (3001/5174)"
        else
            test_result "文档 $doc" "true" "端口号已更新"
        fi
    else
        test_result "文档 $doc" "false" "文件不存在"
    fi
done

echo ""

# ==================== 5. Docker 配置验证 ====================
echo -e "${CYAN}[5/8] 验证 Docker 配置...${NC}"
echo ""

for file in config/docker-compose.yml config/docker-compose.prod.yml; do
    if [ -f "$file" ]; then
        if grep -q "healthcheck:" "$file"; then
            test_result "Docker 配置 $file" "true" "健康检查配置存在"
        else
            test_result "Docker 配置 $file" "false" "缺少健康检查配置"
        fi
    else
        test_result "Docker 配置 $file" "false" "文件不存在"
    fi
done

echo ""

# ==================== 6. 数据库优化验证 ====================
echo -e "${CYAN}[6/8] 验证数据库优化...${NC}"
echo ""

if [ -f "server/prisma/migrations/add_performance_indexes.sql" ]; then
    test_result "数据库索引优化脚本" "true" "性能索引 SQL 已创建"
else
    test_result "数据库索引优化脚本" "false" "文件不存在"
fi

if [ -f "server/prisma/schema.prisma" ]; then
    test_result "Prisma Schema" "true" "数据库模型定义存在"
else
    test_result "Prisma Schema" "false" "文件不存在"
fi

echo ""

# ==================== 7. 交付文档验证 ====================
echo -e "${CYAN}[7/8] 验证交付文档...${NC}"
echo ""

for doc in FINAL-DELIVERY-REPORT.md FIX-EXECUTION-SUMMARY.md DELIVERY-CHECKLIST.md QUICK-REFERENCE.md OPTIMIZATION-COMPLETE.md; do
    if [ -f "$doc" ]; then
        test_result "交付文档 $doc" "true" "文档已创建"
    else
        test_result "交付文档 $doc" "false" "文档缺失"
    fi
done

echo ""

# ==================== 8. 项目结构验证 ====================
echo -e "${CYAN}[8/8] 验证项目结构...${NC}"
echo ""

for dir in client server config docs scripts e2e; do
    if [ -d "$dir" ]; then
        test_result "目录 $dir" "true" "存在"
    else
        test_result "目录 $dir" "false" "不存在"
    fi
done

echo ""

# ==================== 总结 ====================
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}                    验证结果${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "${GREEN}✅ 通过: $PASS_COUNT${NC}"
echo -e "${RED}❌ 失败: $FAIL_COUNT${NC}"
echo -e "${YELLOW}⚠️  警告: $WARN_COUNT${NC}"
echo ""

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT / $TOTAL_TESTS) * 100}")
    echo "通过率: $PASS_RATE%"
else
    PASS_RATE=0
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 所有关键检查已通过！项目可以交付。${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  发现 $FAIL_COUNT 个问题，请修复后再交付。${NC}"
    exit 1
fi

