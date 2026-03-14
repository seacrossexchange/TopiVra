#!/bin/bash
# TopiVra 错误修复验收脚本

echo "========================================="
echo "TopiVra 错误修复验收"
echo "========================================="
echo ""

PASS=0
FAIL=0
TOTAL=6

# 1. TypeScript
echo "[1/$TOTAL] TypeScript 类型检查..."
cd server && npx tsc --noEmit > /dev/null 2>&1
SERVER_TS=$?
cd ../client && npx tsc --noEmit > /dev/null 2>&1
CLIENT_TS=$?
if [ $SERVER_TS -eq 0 ] && [ $CLIENT_TS -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# 2. ESLint
echo "[2/$TOTAL] ESLint 规范检查..."
cd ../server && npx eslint . --ext .ts --max-warnings 0 > /dev/null 2>&1
SERVER_LINT=$?
cd ../client && npx eslint . --ext .ts,.tsx --max-warnings 0 > /dev/null 2>&1
CLIENT_LINT=$?
if [ $SERVER_LINT -eq 0 ] && [ $CLIENT_LINT -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# 3. 测试
echo "[3/$TOTAL] 测试检查..."
cd ../server && npm test > /dev/null 2>&1
SERVER_TEST=$?
cd ../client && npm test > /dev/null 2>&1
CLIENT_TEST=$?
if [ $SERVER_TEST -eq 0 ] && [ $CLIENT_TEST -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# 4. 构建
echo "[4/$TOTAL] 构建检查..."
cd ../server && npm run build > /dev/null 2>&1
SERVER_BUILD=$?
cd ../client && npm run build > /dev/null 2>&1
CLIENT_BUILD=$?
if [ $SERVER_BUILD -eq 0 ] && [ $CLIENT_BUILD -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# 5. 安全
echo "[5/$TOTAL] 安全检查..."
cd ../server && npm audit --audit-level=high > /dev/null 2>&1
SERVER_AUDIT=$?
cd ../client && npm audit --audit-level=high > /dev/null 2>&1
CLIENT_AUDIT=$?
if [ $SERVER_AUDIT -eq 0 ] && [ $CLIENT_AUDIT -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

# 6. 启动测试
echo "[6/$TOTAL] 启动测试..."
cd ../server
timeout 10 npm run start:dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "✅ PASS"
  ((PASS++))
  kill $SERVER_PID 2>/dev/null
else
  echo "❌ FAIL"
  ((FAIL++))
fi

echo ""
echo "========================================="
echo "验收结果: $PASS/$TOTAL 通过"
echo "========================================="

if [ $FAIL -eq 0 ]; then
  echo "🎉 所有错误已修复！项目达到零错误状态"
  exit 0
else
  echo "⚠️  还有 $FAIL 项未通过，请继续修复"
  exit 1
fi
