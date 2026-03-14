import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { generateAlternateUrls, getDefaultLanguageUrl, removeLanguagePrefix } from '@/utils/i18nRouter';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
}

export function SEO({ title, description, keywords, image, url, type = 'website' }: SEOProps) {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const currentLang = i18n.language;
  const baseUrl = window.location.origin;
  
  // 使用提供的 URL 或当前完整 URL
  const currentUrl = url || `${baseUrl}${location.pathname}${location.search}${location.hash}`;
  
  // 获取不带语言前缀的路径（用于生成 alternate URLs）
  const cleanPath = removeLanguagePrefix(location.pathname);

  // 更新 HTML lang 属性
  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  // 默认值
  const seoTitle = title || t('home.seoDesc');
  const seoDescription = description || t('home.seoDesc');
  const seoImage = image || `${baseUrl}/logo-hd.svg`;

  // 生成所有语言的 alternate URLs
  const alternateUrls = generateAlternateUrls(location.pathname, baseUrl);
  const defaultUrl = getDefaultLanguageUrl(location.pathname, baseUrl);

  // 生成 canonical URL（当前语言版本）
  const canonicalUrl = currentUrl;

  // Open Graph locale 映射
  const ogLocaleMap: Record<string, string> = {
    'zh-CN': 'zh_CN',
    'en': 'en_US',
    'id': 'id_ID',
    'pt-BR': 'pt_BR',
    'es-MX': 'es_MX',
  };

  return (
    <Helmet>
      {/* 基本 Meta 标签 */}
      <html lang={currentLang} />
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:locale" content={ogLocaleMap[currentLang] || 'en_US'} />
      
      {/* Open Graph 备用语言 */}
      {alternateUrls
        .filter(alt => alt.lang !== currentLang)
        .map(alt => (
          <meta 
            key={alt.lang} 
            property="og:locale:alternate" 
            content={ogLocaleMap[alt.lang] || 'en_US'} 
          />
        ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />

      {/* 多语言 hreflang 标签 */}
      {alternateUrls.map(alt => (
        <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.url} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={defaultUrl} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* 结构化数据 */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'article' ? 'Article' : type === 'product' ? 'Product' : 'WebSite',
          name: seoTitle,
          description: seoDescription,
          url: currentUrl,
          image: seoImage,
          inLanguage: currentLang,
        })}
      </script>
    </Helmet>
  );
}

