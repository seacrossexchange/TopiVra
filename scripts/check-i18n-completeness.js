const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/i18n/locales');
const baseLanguage = 'zh-CN';
const languages = ['en', 'id', 'pt-BR', 'es-MX'];

// 递归获取所有键路径
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

// 读取基准语言
const baseFile = path.join(localesDir, `${baseLanguage}.json`);
const baseContent = JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
const baseKeys = getKeys(baseContent).sort();

console.log(`\n基准语言 (${baseLanguage}) 共有 ${baseKeys.length} 个翻译键\n`);

// 检查其他语言
languages.forEach(lang => {
  const langFile = path.join(localesDir, `${lang}.json`);
  
  if (!fs.existsSync(langFile)) {
    console.log(`❌ ${lang}: 文件不存在\n`);
    return;
  }

  const langContent = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
  const langKeys = getKeys(langContent).sort();

  // 找出缺失的键
  const missing = baseKeys.filter(key => !langKeys.includes(key));
  const extra = langKeys.filter(key => !baseKeys.includes(key));

  const completeness = ((langKeys.length / baseKeys.length) * 100).toFixed(2);

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${lang}: 100% 完整 (${langKeys.length}/${baseKeys.length})`);
  } else {
    console.log(`⚠️  ${lang}: ${completeness}% 完整 (${langKeys.length}/${baseKeys.length})`);
    
    if (missing.length > 0) {
      console.log(`   缺失 ${missing.length} 个键:`);
      missing.slice(0, 10).forEach(key => console.log(`     - ${key}`));
      if (missing.length > 10) {
        console.log(`     ... 还有 ${missing.length - 10} 个`);
      }
    }
    
    if (extra.length > 0) {
      console.log(`   多余 ${extra.length} 个键:`);
      extra.slice(0, 5).forEach(key => console.log(`     - ${key}`));
      if (extra.length > 5) {
        console.log(`     ... 还有 ${extra.length - 5} 个`);
      }
    }
  }
  console.log('');
});



