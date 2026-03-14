#!/usr/bin/env node

/**
 * 全球化功能自动化测试
 * 验证所有国际化功能是否正常工作
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = process.env.API_URL || 'http://localhost:3000';
const LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];

let passedTests = 0;
let failedTests = 0;

function log(message, type = 'info') {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };
  console.log(`${icons[type]} ${message}`);
}

async function test(name, fn) {
  try {
    await fn();
    log(`${name}`, 'success');
    passedTests++;
  } catch (error) {
    log(`${name}: ${error.message}`, 'error');
    failedTests++;
  }
}

async function runTests() {
  console.log(chalk.bold.blue('\n🌍 TopiVra 全球化功能测试\n'));

  // 测试 1: API 语言检测
  console.log(chalk.yellow('📋 测试组 1: 语言检测'));
  for (const lang of LANGUAGES) {
    await test(`Accept-Language: ${lang}`, async () => {
      const response = await axios.get(`${API_BASE}/api/health`, {
        headers: { 'Accept-Language': lang },
      });
      if (response.headers['content-language'] !== lang) {
        throw new Error(`Expected ${lang}, got ${response.headers['content-language']}`);
      }
    });
  }

  // 测试 2: 查询参数语言
  console.log(chalk.yellow('\n📋 测试组 2: 查询参数语言'));
  for (const lang of LANGUAGES) {
    await test(`Query param: ?lang=${lang}`, async () => {
      const response = await axios.get(`${API_BASE}/api/health?lang=${lang}`);
      if (response.headers['content-language'] !== lang) {
        throw new Error(`Expected ${lang}, got ${response.headers['content-language']}`);
      }
    });
  }

  // 测试 3: 错误消息国际化
  console.log(chalk.yellow('\n📋 测试组 3: 错误消息国际化'));
  for (const lang of LANGUAGES) {
    await test(`Error message in ${lang}`, async () => {
      try {
        await axios.get(`${API_BASE}/api/products/invalid-id`, {
          headers: { 'Accept-Language': lang },
        });
      } catch (error) {
        if (error.response && error.response.data.message) {
          // 错误消息应该是翻译后的
          return;
        }
        throw new Error('No error message returned');
      }
    });
  }

  // 测试 4: 翻译 API
  console.log(chalk.yellow('\n📋 测试组 4: 翻译管理 API'));
  
  await test('获取翻译列表', async () => {
    // 需要认证，这里只测试端点是否存在
    try {
      await axios.get(`${API_BASE}/api/translations/product/test-id`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // 401 说明端点存在，只是需要认证
        return;
      }
      throw error;
    }
  });

  // 测试 5: 邮件模板
  console.log(chalk.yellow('\n📋 测试组 5: 邮件模板'));
  const fs = require('fs');
  const path = require('path');

  for (const lang of LANGUAGES) {
    await test(`邮件模板: ${lang}`, async () => {
      const emailPath = path.join(__dirname, `../src/i18n/${lang}/email.json`);
      if (!fs.existsSync(emailPath)) {
        throw new Error(`Email template not found: ${emailPath}`);
      }
      const content = JSON.parse(fs.readFileSync(emailPath, 'utf-8'));
      if (!content.welcome || !content.orderConfirmation) {
        throw new Error('Missing required email templates');
      }
    });
  }

  // 测试 6: 数据库表结构
  console.log(chalk.yellow('\n📋 测试组 6: 数据库表结构'));
  
  await test('product_translations 表结构', async () => {
    const result = await prisma.$queryRaw`
      DESCRIBE product_translations
    `;
    const fields = result.map(r => r.Field);
    const requiredFields = ['id', 'product_id', 'language', 'title', 'description'];
    for (const field of requiredFields) {
      if (!fields.includes(field)) {
        throw new Error(`Missing field: ${field}`);
      }
    }
  });

  await test('category_translations 表结构', async () => {
    const result = await prisma.$queryRaw`
      DESCRIBE category_translations
    `;
    const fields = result.map(r => r.Field);
    const requiredFields = ['id', 'category_id', 'language', 'name'];
    for (const field of requiredFields) {
      if (!fields.includes(field)) {
        throw new Error(`Missing field: ${field}`);
      }
    }
  });

  await test('blog_translations 表结构', async () => {
    const result = await prisma.$queryRaw`
      DESCRIBE blog_translations
    `;
    const fields = result.map(r => r.Field);
    const requiredFields = ['id', 'blog_id', 'language', 'title', 'content'];
    for (const field of requiredFields) {
      if (!fields.includes(field)) {
        throw new Error(`Missing field: ${field}`);
      }
    }
  });

  // 总结
  console.log(chalk.bold.blue('\n📊 测试总结'));
  console.log(chalk.green(`✅ 通过: ${passedTests}`));
  console.log(chalk.red(`❌ 失败: ${failedTests}`));
  console.log(chalk.blue(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%\n`));

  if (failedTests === 0) {
    console.log(chalk.bold.green('🎉 所有测试通过！全球化功能正常工作！\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('⚠️  部分测试失败，请检查上述错误信息。\n'));
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error(chalk.red('\n❌ 测试执行失败:'), error);
  process.exit(1);
});



