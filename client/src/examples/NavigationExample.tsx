/**
 * 国际化导航使用示例
 * 展示如何在组件中使用国际化路由
 */
import { useI18nNavigate, useI18nHref } from '@/hooks/useI18nNavigate';
import { Link } from 'react-router-dom';
import { Button } from 'antd';

export function NavigationExample() {
  const { navigate, switchLanguage, currentLang } = useI18nNavigate();
  const { getHref } = useI18nHref();

  return (
    <div>
      {/* 示例 1: 使用 navigate 函数 */}
      <Button onClick={() => navigate('/products')}>
        Go to Products
      </Button>

      {/* 示例 2: 使用 Link 组件 */}
      <Link to={getHref('/products')}>
        Products
      </Link>

      {/* 示例 3: 切换语言 */}
      <Button onClick={() => switchLanguage('en')}>
        Switch to English
      </Button>

      {/* 示例 4: 显示当前语言 */}
      <div>Current Language: {currentLang}</div>

      {/* 示例 5: 带参数的导航 */}
      <Button onClick={() => navigate('/products/123')}>
        View Product Detail
      </Button>

      {/* 示例 6: 带查询参数的导航 */}
      <Button onClick={() => navigate('/products?category=games')}>
        Filter Products
      </Button>
    </div>
  );
}

/**
 * 语言切换器组件示例
 */
export function LanguageSwitcherExample() {
  const { switchLanguage, currentLang } = useI18nNavigate();

  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Bahasa', flag: '🇮🇩' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'es-MX', name: 'Español', flag: '🇲🇽' },
  ];

  return (
    <div>
      {languages.map(lang => (
        <Button
          key={lang.code}
          type={currentLang === lang.code ? 'primary' : 'default'}
          onClick={() => switchLanguage(lang.code)}
        >
          {lang.flag} {lang.name}
        </Button>
      ))}
    </div>
  );
}



