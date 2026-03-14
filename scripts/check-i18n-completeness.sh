#!/bin/bash
# 国际化翻译完整性检查脚本

echo "========================================="
echo "国际化翻译完整性检查"
echo "========================================="
echo ""

# 基准语言（中文）
BASE_LANG="zh-CN"
BASE_FILE="client/src/i18n/locales/$BASE_LANG.json"

# 检查基准文件是否存在
if [ ! -f "$BASE_FILE" ]; then
  echo "❌ 基准语言文件不存在: $BASE_FILE"
  exit 1
fi

# 获取基准语言的所有键
BASE_KEYS=$(jq -r 'paths(scalars) | join(".")' $BASE_FILE | sort)
BASE_COUNT=$(echo "$BASE_KEYS" | wc -l)

echo "基准语言 ($BASE_LANG) 共有 $BASE_COUNT 个翻译键"
echo ""

# 检查其他语言
for lang in en id pt-BR es-MX; do
  LANG_FILE="client/src/i18n/locales/$lang.json"

  if [ ! -f "$LANG_FILE" ]; then
    echo "❌ $lang: 文件不存在"
    continue
  fi

  LANG_KEYS=$(jq -r 'paths(scalars) | join(".")' $LANG_FILE | sort)
  LANG_COUNT=$(echo "$LANG_KEYS" | wc -l)

  # 找出缺失的键
  MISSING=$(comm -23 <(echo "$BASE_KEYS") <(echo "$LANG_KEYS"))
  MISSING_COUNT=$(echo "$MISSING" | grep -v '^$' | wc -l)

  if [ $MISSING_COUNT -eq 0 ]; then
    echo "✅ $lang: 100% 完整 ($LANG_COUNT/$BASE_COUNT)"
  else
    COMPLETENESS=$(awk "BEGIN {printf \"%.1f\", ($LANG_COUNT / $BASE_COUNT) * 100}")
    echo "⚠️  $lang: $COMPLETENESS% 完整 ($LANG_COUNT/$BASE_COUNT)"
    echo "   缺失 $MISSING_COUNT 个键:"
    echo "$MISSING" | head -5 | sed 's/^/     - /'
    if [ $MISSING_COUNT -gt 5 ]; then
      echo "     ... 还有 $((MISSING_COUNT - 5)) 个"
    fi
  fi
  echo ""
done

echo "========================================="
echo "检查完成"
echo "========================================="
