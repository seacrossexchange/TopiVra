#!/bin/bash
# TopiVra 项目质量自动检测脚本

echo "========================================="
echo "TopiVra 项目质量检测"
echo "========================================="
echo ""

PASS=0
FAIL=0

# 1. 检查 TypeScript 类型
echo "📝 [1/6] 检查 TypeScript 类型错误..."
cd server && npx tsc --noEmit > /dev/null 2>&1
SERVER_TS=$?
cd ../client && npx tsc --noEmit > /dev/null 2>&1
CLIENT_TS=$?

if [ $SERVER_TS -eq 0 ] && [ $CLIENT_TS -eq 0 ]; then
  echo "✅ 无 TypeScript 类型错误"
  ((PASS++))
else
  echo "❌ 存在 TypeScript 类型错误"
  ((FAIL++))
fi
echo ""

# 2. 检查 ESLint
echo "📝 [2/6] 检查 ESLint 错误..."
cd ../server && npx eslint . --ext .ts --max-warnings 0 > /dev/null 2>&1
SERVER_LINT=$?
cd ../client && npx eslint . --ext .ts,.tsx --max-warnings 0 > /dev/null 2>&1
CLIENT_LINT=$?

if [ $SERVER_LINT -eq 0 ] && [ $CLIENT_LINT -eq 0 ]; then
  echo "✅ 无 ESLint 错误"
  ((PASS++))
else
  echo "❌ 存在 ESLint 错误"
  ((FAIL++))
fi
echo ""

# 3. 检查测试
echo "📝 [3/6] 运行测试..."
cd ../server && npm test > /dev/null 2>&1
SERVER_TEST=$?
cd ../client && npm test > /dev/null 2>&1
CLIENT_TEST=$?

if [ $SERVER_TEST -eq 0 ] && [ $CLIENT_TEST -eq 0 ]; then
  echo "✅ 所有测试通过"
  ((PASS++))
else
  echo "❌ 测试失败"
  ((FAIL++))
fi
echo ""

# 4. 检查安全漏洞
echo "📝 [4/6] 检查依赖安全漏洞..."
cd ../server && npm audit --audit-level=high > /dev/null 2>&1
SERVER_AUDIT=$?
cd ../client && npm audit --audit-level=high > /dev/null 2>&1
CLIENT_AUDIT=$?

if [ $SERVER_AUDIT -eq 0 ] && [ $CLIENT_AUDIT -eq 0 ]; then
  echo "✅ 无高危安全漏洞"
  ((PASS++))
else
  echo "❌ 存在高危安全漏洞"
  ((FAIL++))
fi
echo ""

# 5. 检查构建
echo "📝 [5/6] 检查构建..."
cd ../server && npm run build > /dev/null 2>&1
SERVER_BUILD=$?
cd ../client && npm run build > /dev/null 2>&1
CLIENT_BUILD=$?

if [ $SERVER_BUILD -eq 0 ] && [ $CLIENT_BUILD -eq 0 ]; then
  echo "✅ 构建成功"
  ((PASS++))
else
  echo "❌ 构建失败"
  ((FAIL++))
fi
echo ""

# 6. 检查测试覆盖率
echo "📝 [6/6] 检查测试覆盖率..."
cd ../server
npm test -- --coverage --silent > coverage.txt 2>&1
COVERAGE=$(grep "All files" coverage.txt | awk '{print $10}' | sed 's/%//')
rm coverage.txt

if [ ! -z "$COVERAGE" ]; then
  echo "后端测试覆盖率: $COVERAGE%"
  if [ $(echo "$COVERAGE >= 70" | bc -l 2>/dev/null || echo "0") -eq 1 ]; then
    echo "✅ 后端测试覆盖率达标 (≥70%)"
    ((PASS++))
  else
    echo "❌ 后端测试覆盖率不达标 (<70%)"
    ((FAIL++))
  fi
else
  echo "⚠️  无法获取覆盖率数据"
  ((FAIL++))
fi
echo ""

echo "========================================="
echo "检测结果: $PASS 通过, $FAIL 失败"
echo "========================================="

if [ $FAIL -eq 0 ]; then
  echo "🎉 所有检查通过！"
  exit 0
else
  echo "⚠️  还有 $FAIL 项未达标"
  exit 1
fi
