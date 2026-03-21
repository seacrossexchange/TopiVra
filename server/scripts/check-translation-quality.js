#!/usr/bin/env node

/**
 * 翻译质量检查工具
 * 检测翻译中的常见问题
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];
const I18N_DIR = path.join(__dirname, '../src/i18n');

let issues = [];

function checkTranslationQuality() {
  console.log('🔍 开始检查翻译质量...\n');

  for (const lang of LANGUAGES) {
    console.log(`\n📋 检查 ${lang}...`);
    
    // 检查 common.json
    const commonPath = path.join(I18N_DIR, lang, 'common.json');
    if (fs.existsSync(commonPath)) {
      const content = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
      checkFile(content, lang, 'common.json');
    }

    // 检查 errors.json
    const errorsPath = path.join(I18N_DIR, lang, 'errors.json');
    if (fs.existsSync(errorsPath)) {
      const content = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));
      checkFile(content, lang, 'errors.json');
    }

    // 检查 email.json
    const emailPath = path.join(I18N_DIR, lang, 'email.json');
    if (fs.existsSync(emailPath)) {
      const content = JSON.parse(fs.readFileSync(emailPath, 'utf-8'));
      checkFile(content, lang, 'email.json');
    }
  }

  // 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 检查结果:\n');

  if (issues.length === 0) {
    console.log('✅ 未发现翻译质量问题！\n');
  } else {
    console.log(`⚠️  发现 ${issues.length} 个潜在问题:\n`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.lang}] ${issue.file} - ${issue.key}`);
      console.log(`   问题: ${issue.issue}`);
      console.log(`   值: "${issue.value}"\n`);
    });
  }
}

function checkFile(obj, lang, file, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && !Array.isArray(value)) {
      checkFile(value, lang, file, fullKey);
    } else if (typeof value === 'string') {
      checkTranslation(value, lang, file, fullKey);
    }
  }
}

function checkTranslation(value, lang, file, key) {
  // 1. 检查是否为空
  if (!value || value.trim() === '') {
    issues.push({
      lang,
      file,
      key,
      issue: '翻译为空',
      value,
    });
    return;
  }

  // 2. 检查是否包含未替换的占位符
  if (value.includes('TODO') || value.includes('FIXME')) {
    issues.push({
      lang,
      file,
      key,
      issue: '包含 TODO/FIXME 标记',
      value,
    });
  }

  // 3. 检查是否仍为英文（非英语语言）
  if (lang !== 'en' && /^[A-Za-z\s]+$/.test(value) && value.split(' ').length > 2) {
    issues.push({
      lang,
      file,
      key,
      issue: '可能未翻译（仍为英文）',
      value,
    });
  }

  // 4. 检查插值变量是否匹配
  const variables = value.match(/\{\{[^}]+\}\}/g) || [];
  if (variables.length > 0) {
    // 检查变量格式是否正确
    variables.forEach(v => {
      if (!v.match(/^\{\{[a-zA-Z0-9_]+\}\}$/)) {
        issues.push({
          lang,
          file,
          key,
          issue: '插值变量格式不正确',
          value: v,
        });
      }
    });
  }

  // 5. 检查是否包含 HTML 标签（可能需要转义）
  if (value.includes('<') && value.includes('>')) {
    const htmlTags = value.match(/<[^>]+>/g);
    if (htmlTags && htmlTags.some(tag => !tag.match(/^<(br|strong|em|b|i|u|a)(\s|>)/))) {
      issues.push({
        lang,
        file,
        key,
        issue: '包含可能不安全的 HTML 标签',
        value,
      });
    }
  }

  // 6. 检查长度异常（过长或过短）
  if (value.length > 500) {
    issues.push({
      lang,
      file,
      key,
      issue: '翻译过长（>500字符）',
      value: value.substring(0, 50) + '...',
    });
  }

  // 7. 检查特殊字符
  if (value.includes('�')) {
    issues.push({
      lang,
      file,
      key,
      issue: '包含乱码字符',
      value,
    });
  }
}

checkTranslationQuality();








