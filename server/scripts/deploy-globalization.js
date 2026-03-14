#!/usr/bin/env node

/**
 * 全球化平台一键部署脚本
 * 自动执行所有必要的部署步骤
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };
  console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
}

function exec(command, description) {
  log(description, 'info');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`${description} - 完成`, 'success');
    return true;
  } catch (error) {
    log(`${description} - 失败`, 'error');
    return false;
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deploy() {
  console.log('\n🌍 TopiVra 全球化平台部署工具\n');

  // 步骤 1: 确认
  const confirm = await question('⚠️  此操作将修改数据库结构。是否已备份数据库？(y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    log('部署已取消', 'warning');
    rl.close();
    return;
  }

  // 步骤 2: 检查环境
  log('\n📋 步骤 1/6: 检查环境', 'info');
  
  if (!fs.existsSync('prisma/schema.prisma')) {
    log('错误: 请在 server 目录下运行此脚本', 'error');
    rl.close();
    return;
  }

  // 步骤 3: 安装依赖
  log('\n📋 步骤 2/6: 安装依赖', 'info');
  exec('npm install', '安装服务端依赖');

  // 步骤 4: 生成 Prisma Client
  log('\n📋 步骤 3/6: 生成 Prisma Client', 'info');
  exec('npx prisma generate', '生成 Prisma Client');

  // 步骤 5: 运行数据库迁移
  log('\n📋 步骤 4/6: 运行数据库迁移', 'info');
  const migrateSuccess = exec('npx prisma migrate dev --name add_i18n_tables', '执行数据库迁移');
  
  if (!migrateSuccess) {
    log('迁移失败，尝试手动执行 SQL...', 'warning');
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_i18n_tables.sql');
    if (fs.existsSync(sqlPath)) {
      log('请手动执行以下命令:', 'info');
      console.log(`mysql -u root -p topivra < ${sqlPath}`);
    }
  }

  // 步骤 6: 验证迁移
  log('\n📋 步骤 5/6: 验证迁移', 'info');
  exec('node scripts/verify-i18n-migration.js', '验证数据库迁移');

  // 步骤 7: 运行测试
  log('\n📋 步骤 6/6: 运行测试', 'info');
  exec('node scripts/test-globalization.js', '测试全球化功能');

  // 完成
  log('\n🎉 部署完成！', 'success');
  console.log('\n下一步:');
  console.log('1. 启动服务: npm run start:dev');
  console.log('2. 访问翻译管理: http://localhost:3000/admin/translations');
  console.log('3. 查看文档: docs/globalization-implementation-guide.md\n');

  rl.close();
}

deploy().catch(error => {
  log(`部署失败: ${error.message}`, 'error');
  rl.close();
  process.exit(1);
});



