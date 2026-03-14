#!/bin/bash
# TopiVra 最终验收检查脚本

echo "========================================="
echo "TopiVra 最终验收检查"
echo "========================================="
echo ""

PASS=0
FAIL=0

# 1. TypeScript
echo "1️⃣ 检查 TypeScript..."
cd server && npx tsc --noEmit > /dev/null 2>&1
SERVER_TS=$?
cd ../client && npx tsc --noEmit > /dev/null 2>&1
CLIENT_TS=$?

if [ $SERVER_TS -eq 0 ] && [ $CLIENT_TS -eq 0 ]; then
  echo "✅ TypeScript 检查通过"
  ((PASS++))
else
  echo "❌ TypeScript 检查失败"
  ((FAIL++))
fi
echo ""

# 2. ESLint
echo "2️⃣ 检查 ESLint..."
cd ../server && npx eslint . --ext .ts --max-warnings 0 > /dev/null 2>&1
SERVER_LINT=$?
cd ../client && npx eslint . --ext .ts,.tsx --max-warnings 0 > /dev/null 2>&1
CLIENT_LINT=$?

if [ $SERVER_LINT -eq 0 ] && [ $CLIENT_LINT -eq 0 ]; then
  echo "✅ ESLint 检查通过"
  ((PASS++))
else
  echo "❌ ESLint 检查失败"
  ((FAIL++))
fi
echo ""

# 3. 测试
echo "3️⃣ 检查测试..."
cd ../server && npm test > /dev/null 2>&1
SERVER_TEST=$?
cd ../client && npm test > /dev/null 2>&1
CLIENT_TEST=$?

if [ $SERVER_TEST -eq 0 ] && [ $CLIENT_TEST -eq 0 ]; then
  echo "✅ 测试检查通过"
  ((PASS++))
else
  echo "❌ 测试检查失败"
  ((FAIL++))
fi
echo ""

# 4. 安全
echo "4️⃣ 检查安全..."
cd ../server && npm audit --audit-level=high > /dev/null 2>&1
SERVER_AUDIT=$?
cd ../client && npm audit --audit-level=high > /dev/null 2>&1
CLIENT_AUDIT=$?

if [ $SERVER_AUDIT -eq 0 ] && [ $CLIENT_AUDIT -eq 0 ]; then
  echo "✅ 安全检查通过"
  ((PASS++))
else
  echo "❌ 安全检查失败"
  ((FAIL++))
fi
echo ""

# 5. 构建
echo "5️⃣ 检查构建..."
cd ../server && npm run build > /dev/null 2>&1
SERVER_BUILD=$?
cd ../client && npm run build > /dev/null 2>&1
CLIENT_BUILD=$?

if [ $SERVER_BUILD -eq 0 ] && [ $CLIENT_BUILD -eq 0 ]; then
  echo "✅ 构建检查通过"
  ((PASS++))
else
  echo "❌ 构建检查失败"
  ((FAIL++))
fi
echo ""

# 6. 测试覆盖率
echo "6️⃣ 检查测试覆盖率..."
cd ../server
npm test -- --coverage --silent > coverage.txt 2>&1
COVERAGE=$(grep "All files" coverage.txt | awk '{print $10}' | sed 's/%//')
rm coverage.txt

if [ ! -z "$COVERAGE" ]; then
  if [ $(echo "$COVERAGE >= 70" | bc -l 2>/dev/null || echo "0") -eq 1 ]; then
    echo "✅ 后端测试覆盖率: $COVERAGE% (≥70%)"
    ((PASS++))
  else
    echo "❌ 后端测试覆盖率: $COVERAGE% (<70%)"
    ((FAIL++))
  fi
else
  echo "❌ 无法获取覆盖率数据"
  ((FAIL++))
fi
echo ""

echo "========================================="
echo "验收结果: $PASS 通过, $FAIL 失败"
echo "========================================="

if [ $FAIL -eq 0 ]; then
  echo "🎉 恭喜！项目已达到100%交付标准"
  exit 0
else
  echo "⚠️  还有 $FAIL 项未达标，请继续优化"
  exit 1
fi
