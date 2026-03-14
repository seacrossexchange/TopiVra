#!/usr/bin/env node

/**
 * 国际化验收测试脚本
 * 验证所有国际化功能是否正常工作
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始国际化验收测试...\n');

let passed = 0;
let failed = 0;

// 测试1: 检查翻译完整性
console.log('📋 测试1: 翻译完整性检查');
try {
  const localesDir = path.join(__dirname, '../client/src/i18n/locales');
  const baseFile = path.join(localesDir, 'zh-CN.json');
  const baseContent = JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
  
  function getKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }
  
  const baseKeys = getKeys(baseContent);
  const languages = ['en', 'id', 'pt-BR', 'es-MX'];
  
  let allComplete = true;
  languages.forEach(lang => {
    const langFile = path.join(localesDir, `${lang}.json`);
    const langContent = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
    const langKeys = getKeys(langContent);
    
    if (langKeys.length !== baseKeys.length) {
      console.log(`   ❌ ${lang}: ${langKeys.length}/${baseKeys.length} 键`);
      allComplete = false;
    } else {
      console.log(`   ✅ ${lang}: 100% 完整`);
    }
  });
  
  if (allComplete) {
    console.log('✅ 测试1通过: 所有语言文件100%完整\n');
    passed++;
  } else {
    console.log('❌ 测试1失败: 存在不完整的语言文件\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试1失败: ${error.message}\n`);
  failed++;
}

// 测试2: 检查后端国际化配置
console.log('📋 测试2: 后端国际化配置检查');
try {
  const i18nDir = path.join(__dirname, '../server/src/i18n');
  const languages = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];
  
  let allExists = true;
  languages.forEach(lang => {
    const errorFile = path.join(i18nDir, lang, 'errors.json');
    if (!fs.existsSync(errorFile)) {
      console.log(`   ❌ ${lang}/errors.json 不存在`);
      allExists = false;
    } else {
      console.log(`   ✅ ${lang}/errors.json 存在`);
    }
  });
  
  // 检查 app.module.ts 是否配置了 i18n
  const appModulePath = path.join(__dirname, '../server/src/app.module.ts');
  const appModuleContent = fs.readFileSync(appModulePath, 'utf-8');
  
  if (appModuleContent.includes('I18nModule') && appModuleContent.includes('nestjs-i18n')) {
    console.log('   ✅ app.module.ts 已配置 I18nModule');
  } else {
    console.log('   ❌ app.module.ts 未配置 I18nModule');
    allExists = false;
  }
  
  if (allExists) {
    console.log('✅ 测试2通过: 后端国际化配置完整\n');
    passed++;
  } else {
    console.log('❌ 测试2失败: 后端国际化配置不完整\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试2失败: ${error.message}\n`);
  failed++;
}

// 测试3: 检查日期时间格式化工具
console.log('📋 测试3: 日期时间格式化工具检查');
try {
  const dateFormatterPath = path.join(__dirname, '../client/src/utils/dateFormatter.ts');
  
  if (fs.existsSync(dateFormatterPath)) {
    const content = fs.readFileSync(dateFormatterPath, 'utf-8');
    
    if (content.includes('formatDate') && 
        content.includes('formatRelativeTime') && 
        content.includes('date-fns')) {
      console.log('   ✅ dateFormatter.ts 存在且包含必要函数');
      console.log('✅ 测试3通过: 日期时间格式化工具已创建\n');
      passed++;
    } else {
      console.log('   ❌ dateFormatter.ts 缺少必要函数');
      console.log('❌ 测试3失败\n');
      failed++;
    }
  } else {
    console.log('   ❌ dateFormatter.ts 不存在');
    console.log('❌ 测试3失败\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试3失败: ${error.message}\n`);
  failed++;
}

// 测试4: 检查货币格式化工具
console.log('📋 测试4: 货币格式化工具检查');
try {
  const currencyFormatterPath = path.join(__dirname, '../client/src/utils/currencyFormatter.ts');
  
  if (fs.existsSync(currencyFormatterPath)) {
    const content = fs.readFileSync(currencyFormatterPath, 'utf-8');
    
    if (content.includes('formatCurrency') && 
        content.includes('getCurrencySymbol') && 
        content.includes('Intl.NumberFormat')) {
      console.log('   ✅ currencyFormatter.ts 存在且包含必要函数');
      console.log('✅ 测试4通过: 货币格式化工具已创建\n');
      passed++;
    } else {
      console.log('   ❌ currencyFormatter.ts 缺少必要函数');
      console.log('❌ 测试4失败\n');
      failed++;
    }
  } else {
    console.log('   ❌ currencyFormatter.ts 不存在');
    console.log('❌ 测试4失败\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试4失败: ${error.message}\n`);
  failed++;
}

// 测试5: 检查 SEO 组件
console.log('📋 测试5: SEO 多语言配置检查');
try {
  const seoComponentPath = path.join(__dirname, '../client/src/components/SEO.tsx');
  
  if (fs.existsSync(seoComponentPath)) {
    const content = fs.readFileSync(seoComponentPath, 'utf-8');
    
    if (content.includes('hrefLang') && 
        content.includes('react-helmet-async') && 
        content.includes('document.documentElement.lang')) {
      console.log('   ✅ SEO.tsx 存在且包含 hreflang 配置');
      console.log('✅ 测试5通过: SEO 多语言配置已创建\n');
      passed++;
    } else {
      console.log('   ❌ SEO.tsx 缺少必要配置');
      console.log('❌ 测试5失败\n');
      failed++;
    }
  } else {
    console.log('   ❌ SEO.tsx 不存在');
    console.log('❌ 测试5失败\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试5失败: ${error.message}\n`);
  failed++;
}

// 测试6: 检查 useI18n Hook
console.log('📋 测试6: useI18n Hook 检查');
try {
  const useI18nPath = path.join(__dirname, '../client/src/hooks/useI18n.ts');
  
  if (fs.existsSync(useI18nPath)) {
    const content = fs.readFileSync(useI18nPath, 'utf-8');
    
    if (content.includes('formatDate') && 
        content.includes('formatCurrency') && 
        content.includes('useTranslation')) {
      console.log('   ✅ useI18n.ts 存在且包含必要函数');
      console.log('✅ 测试6通过: useI18n Hook 已创建\n');
      passed++;
    } else {
      console.log('   ❌ useI18n.ts 缺少必要函数');
      console.log('❌ 测试6失败\n');
      failed++;
    }
  } else {
    console.log('   ❌ useI18n.ts 不存在');
    console.log('❌ 测试6失败\n');
    failed++;
  }
} catch (error) {
  console.log(`❌ 测试6失败: ${error.message}\n`);
  failed++;
}

// 总结
console.log('='.repeat(50));
console.log('📊 测试总结');
console.log('='.repeat(50));
console.log(`✅ 通过: ${passed} 项`);
console.log(`❌ 失败: ${failed} 项`);
console.log(`📈 通过率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 所有测试通过！国际化功能已完全达标。\n');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查上述错误信息。\n');
  process.exit(1);
}





