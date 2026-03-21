/**
 * useSeo - Dynamic SEO Meta Tags Hook
 * 
 * A custom hook for managing document head meta tags dynamically.
 * Supports title, description, keywords, Open Graph, and canonical URLs.
 */

import { useEffect, useCallback } from 'react';

export interface SeoOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  noIndex?: boolean;
}

const DEFAULT_TITLE = 'TopiVra';
const TITLE_SEPARATOR = ' | ';

// Default meta values
const DEFAULTS: SeoOptions = {
  description: 'TopiVra - 全球数字账号安全交易平台，担保交易，即时交付，100%保障',
  keywords: ['TopiVra', '数字账号', 'TikTok账号', 'Instagram账号', 'Facebook账号', 'Telegram账号'],
  ogType: 'website',
};

/**
 * Update or create a meta tag
 */
function updateMeta(name: string, content: string, isProperty = false) {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  
  if (!element) {
    element = document.createElement('meta');
    if (isProperty) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Update or create a link element
 */
function updateLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`;
  let element = document.querySelector(selector) as HTMLLinkElement | null;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

/**
 * Remove a meta tag if exists
 */
function removeMeta(name: string, isProperty = false) {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  const element = document.querySelector(selector);
  element?.remove();
}

/**
 * Remove a link element if exists
 */
function removeLink(rel: string) {
  const selector = `link[rel="${rel}"]`;
  const element = document.querySelector(selector);
  element?.remove();
}

/**
 * Hook for managing SEO meta tags dynamically
 * 
 * @example
 * ```tsx
 * useSeo({
 *   title: '产品列表',
 *   description: '浏览我们的数字账号产品',
 *   keywords: ['TikTok', 'Instagram', '账号'],
 * });
 * ```
 */
export function useSeo(options: SeoOptions = {}) {
  const {
    title,
    description = DEFAULTS.description,
    keywords = DEFAULTS.keywords,
    canonicalUrl,
    ogImage,
    ogType = DEFAULTS.ogType,
    noIndex = false,
  } = options;

  const updateSeo = useCallback(() => {
    // Update title
    const normalizedTitle = title?.trim();
    const fullTitle = normalizedTitle
      ? normalizedTitle.endsWith(`${TITLE_SEPARATOR}${DEFAULT_TITLE}`)
        ? normalizedTitle
        : `${normalizedTitle}${TITLE_SEPARATOR}${DEFAULT_TITLE}`
      : DEFAULT_TITLE;
    document.title = fullTitle;
    
    // Update meta description
    if (description) {
      updateMeta('description', description);
      updateMeta('og:description', description, true);
    }
    
    // Update title for OG
    updateMeta('og:title', fullTitle, true);
    
    // Update keywords
    if (keywords && keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '));
    }
    
    // Update canonical URL
    if (canonicalUrl) {
      updateLink('canonical', canonicalUrl);
    } else {
      removeLink('canonical');
    }
    
    // Update OG image
    if (ogImage) {
      updateMeta('og:image', ogImage, true);
    } else {
      removeMeta('og:image', true);
    }
    
    // Update OG type
    updateMeta('og:type', ogType || 'website', true);
    
    // Handle noindex
    if (noIndex) {
      updateMeta('robots', 'noindex, nofollow');
    } else {
      removeMeta('robots');
    }
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, noIndex]);

  useEffect(() => {
    updateSeo();
  }, [updateSeo]);

  return { updateSeo };
}

/**
 * Generate structured data for products
 */
export function generateProductStructuredData(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  seller: string;
  availability?: 'in_stock' | 'out_of_stock';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: product.availability === 'out_of_stock' 
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
  };
}

/**
 * Hook to inject structured data
 */
export function useStructuredData(data: object | null, scriptId = 'app-structured-data') {
  useEffect(() => {
    const existing = document.getElementById(scriptId);
    existing?.remove();

    if (!data) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data, scriptId]);
}

export default useSeo;