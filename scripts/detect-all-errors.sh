#!/bin/bash
# TopiVra 全面错误检测脚本

echo "========================================="
echo "TopiVra 全面错误检测"
echo "========================================="
echo ""

# 创建错误报告目录
mkdir -p error-reports

# 1. TypeScript 类型错误检测
echo "📝 [1/5] 检测 TypeScript 类型错误..."
echo "后端 TypeScript 检查:" > error-reports/typescript-errors.txt
cd server
npx tsc --noEmit 2>&1 | tee -a ../error-reports/typescript-errors.txt
echo "" >> ../error-reports/typescript-errors.txt
echo "前端 TypeScript 检查:" >> ../error-reports/typescript-errors.txt
cd ../client
npx tsc --noEmit 2>&1 | tee -a ../error-reports/typescript-errors.txt
echo "✅ TypeScript 错误已保存到 error-reports/typescript-errors.txt"
echo ""

# 2. ESLint 错误检测
echo "📝 [2/5] 检测 ESLint 错误..."
echo "后端 ESLint 检查:" > ../error-reports/eslint-errors.txt
cd ../server
npx eslint . --ext .ts --format unix 2>&1 | tee -a ../error-reports/eslint-errors.txt
echo "" >> ../error-reports/eslint-errors.txt
echo "前端 ESLint 检查:" >> ../error-reports/eslint-errors.txt
cd ../client
npx eslint . --ext .ts,.tsx --format unix 2>&1 | tee -a ../error-reports/eslint-errors.txt
echo "✅ ESLint 错误已保存到 error-reports/eslint-errors.txt"
echo ""

# 3. 测试失败检测
echo "📝 [3/5] 检测测试失败..."
echo "后端测试:" > ../error-reports/test-failures.txt
cd ../server
npm test 2>&1 | tee -a ../error-reports/test-failures.txt
echo "" >> ../error-reports/test-failures.txt
echo "前端测试:" >> ../error-reports/test-failures.txt
cd ../client
npm test 2>&1 | tee -a ../error-reports/test-failures.txt
echo "✅ 测试失败已保存到 error-reports/test-failures.txt"
echo ""

# 4. 构建错误检测
echo "📝 [4/5] 检测构建错误..."
echo "后端构建:" > ../error-reports/build-errors.txt
cd ../server
npm run build 2>&1 | tee -a ../error-reports/build-errors.txt
echo "" >> ../error-reports/build-errors.txt
echo "前端构建:" >> ../error-reports/build-errors.txt
cd ../client
npm run build 2>&1 | tee -a ../error-reports/build-errors.txt
echo "✅ 构建错误已保存到 error-reports/build-errors.txt"
echo ""

# 5. 依赖问题检测
echo "📝 [5/5] 检测依赖问题..."
echo "后端依赖:" > ../error-reports/dependency-issues.txt
cd ../server
npm audit 2>&1 | tee -a ../error-reports/dependency-issues.txt
npm outdated 2>&1 | tee -a ../error-reports/dependency-issues.txt
echo "" >> ../error-reports/dependency-issues.txt
echo "前端依赖:" >> ../error-reports/dependency-issues.txt
cd ../client
npm audit 2>&1 | tee -a ../error-reports/dependency-issues.txt
npm outdated 2>&1 | tee -a ../error-reports/dependency-issues.txt
echo "✅ 依赖问题已保存到 error-reports/dependency-issues.txt"
echo ""

echo "========================================="
echo "错误检测完成！"
echo "请查看 error-reports/ 目录下的报告文件"
echo "========================================="
