#!/usr/bin/env node

/**
 * 检查国际化翻译完整性
 * 包括前端翻译文件和数据库内容翻译
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];
const I18N_DIR = path.join(__dirname, '../src/i18n');

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

/**
 * 检查前端翻译文件
 */
function checkFrontendTranslations() {
  console.log('\n📋 检查前端翻译文件...\n');
  
  const results = {};
  let allComplete = true;

  for (const lang of LANGUAGES) {
    const filePath = path.join(I18N_DIR, lang, 'common.json');
    
    if (!fs.existsSync(filePath)) {
      log(`${lang}/common.json - 文件不存在`, 'error');
      results[lang] = { exists: false, keys: 0 };
      allComplete = false;
      continue;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const keyCount = countKeys(content);
    results[lang] = { exists: true, keys: keyCount };
    log(`${lang}/common.json - ${keyCount} 个键`, 'success');
  }

  // 检查键数量是否一致
  const keyCounts = Object.values(results).map(r => r.keys);
  const maxKeys = Math.max(...keyCounts);
  const minKeys = Math.min(...keyCounts);

  if (maxKeys !== minKeys) {
    log(`\n⚠️  警告: 翻译键数量不一致 (${minKeys} - ${maxKeys})`, 'warning');
    allComplete = false;
  }

  return allComplete;
}

/**
 * 检查邮件模板
 */
function checkEmailTemplates() {
  console.log('\n📧 检查邮件模板...\n');
  
  const templates = [
    'welcome',
    'emailVerification',
    'passwordReset',
    'orderConfirmation',
    'orderDelivered',
    'sellerNewOrder',
    'withdrawalApproved',
    'withdrawalRejected',
    'refundApproved',
    'ticketReply',
  ];

  let allComplete = true;

  for (const lang of LANGUAGES) {
    const filePath = path.join(I18N_DIR, lang, 'email.json');
    
    if (!fs.existsSync(filePath)) {
      log(`${lang}/email.json - 文件不存在`, 'error');
      allComplete = false;
      continue;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const missingTemplates = templates.filter(t => !content[t]);

    if (missingTemplates.length > 0) {
      log(`${lang}/email.json - 缺少模板: ${missingTemplates.join(', ')}`, 'error');
      allComplete = false;
    } else {
      log(`${lang}/email.json - 所有模板完整`, 'success');
    }
  }

  return allComplete;
}

/**
 * 检查数据库内容翻译
 */
async function checkDatabaseTranslations() {
  console.log('\n💾 检查数据库内容翻译...\n');

  try {
    // 检查商品翻译
    const products = await prisma.product.findMany({
      include: { translations: true },
    });

    let productComplete = 0;
    let productIncomplete = 0;

    products.forEach(product => {
      const existingLangs = product.translations.map(t => t.language);
      const missingLangs = LANGUAGES.filter(lang => !existingLangs.includes(lang));
      
      if (missingLangs.length === 0) {
        productComplete++;
      } else {
        productIncomplete++;
      }
    });

    const productCompleteness = products.length > 0 
      ? (productComplete / products.length) * 100 
      : 100;

    log(`商品翻译: ${productComplete}/${products.length} 完整 (${productCompleteness.toFixed(1)}%)`, 
      productCompleteness === 100 ? 'success' : 'warning');

    // 检查分类翻译
    const categories = await prisma.category.findMany({
      include: { translations: true },
    });

    let categoryComplete = 0;
    let categoryIncomplete = 0;

    categories.forEach(category => {
      const existingLangs = category.translations.map(t => t.language);
      const missingLangs = LANGUAGES.filter(lang => !existingLangs.includes(lang));
      
      if (missingLangs.length === 0) {
        categoryComplete++;
      } else {
        categoryIncomplete++;
      }
    });

    const categoryCompleteness = categories.length > 0 
      ? (categoryComplete / categories.length) * 100 
      : 100;

    log(`分类翻译: ${categoryComplete}/${categories.length} 完整 (${categoryCompleteness.toFixed(1)}%)`, 
      categoryCompleteness === 100 ? 'success' : 'warning');

    // 检查博客翻译
    const blogs = await prisma.blog.findMany({
      include: { translations: true },
    });

    let blogComplete = 0;
    let blogIncomplete = 0;

    blogs.forEach(blog => {
      const existingLangs = blog.translations.map(t => t.language);
      const missingLangs = LANGUAGES.filter(lang => !existingLangs.includes(lang));
      
      if (missingLangs.length === 0) {
        blogComplete++;
      } else {
        blogIncomplete++;
      }
    });

    const blogCompleteness = blogs.length > 0 
      ? (blogComplete / blogs.length) * 100 
      : 100;

    log(`博客翻译: ${blogComplete}/${blogs.length} 完整 (${blogCompleteness.toFixed(1)}%)`, 
      blogCompleteness === 100 ? 'success' : 'warning');

    // 总体完整性
    const totalItems = products.length + categories.length + blogs.length;
    const totalComplete = productComplete + categoryComplete + blogComplete;
    const overallCompleteness = totalItems > 0 ? (totalComplete / totalItems) * 100 : 100;

    console.log('\n📊 总体完整性:');
    console.log(`   总项目: ${totalItems}`);
    console.log(`   完整项目: ${totalComplete}`);
    console.log(`   完整度: ${overallCompleteness.toFixed(1)}%`);

    if (overallCompleteness < 100) {
      console.log('\n💡 建议:');
      console.log('   使用翻译管理界面批量添加缺失的翻译');
      console.log('   访问: http://localhost:3000/admin/translations');
    }

    return overallCompleteness === 100;

  } catch (error) {
    log(`数据库检查失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 递归计算 JSON 对象的键数量
 */
function countKeys(obj, prefix = '') {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      count += countKeys(obj[key], `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  return count;
}

async function main() {
  console.log('开始检查...\n');

  const frontendOk = checkFrontendTranslations();
  const emailOk = checkEmailTemplates();
  const databaseOk = await checkDatabaseTranslations();

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 检查结果汇总:\n');
  
  log(`前端翻译文件: ${frontendOk ? '完整' : '不完整'}`, frontendOk ? 'success' : 'error');
  log(`邮件模板: ${emailOk ? '完整' : '不完整'}`, emailOk ? 'success' : 'error');
  log(`数据库内容翻译: ${databaseOk ? '完整' : '不完整'}`, databaseOk ? 'success' : 'warning');

  if (frontendOk && emailOk && databaseOk) {
    log('\n🎉 所有翻译检查通过！项目已达到全球化标准！', 'success');
  } else {
    log('\n⚠️  部分翻译不完整，请查看上述详情。', 'warning');
  }

  console.log('\n');
  rl.close();
  await prisma.$disconnect();
}

main().catch(error => {
  log(`检查失败: ${error.message}`, 'error');
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});



