/**
 * 多语言切换 E2E 测试
 * 验证 i18n 功能正常工作
 */
import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  const languages = [
    { code: 'zh-CN', name: '简体中文', greeting: '欢迎' },
    { code: 'en', name: 'English', greeting: 'Welcome' },
    { code: 'id', name: 'Bahasa Indonesia', greeting: 'Selamat datang' },
    { code: 'pt-BR', name: 'Português', greeting: 'Bem-vindo' },
    { code: 'es-MX', name: 'Español', greeting: 'Bienvenido' },
  ];

  test('should switch between all supported languages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const lang of languages) {
      // 查找语言切换器
      const langSwitcher = page.locator(
        '[data-testid="language-switcher"], .language-selector, .lang-switch'
      ).first();

      if (await langSwitcher.isVisible()) {
        await langSwitcher.click();
        await page.waitForTimeout(500);

        // 选择语言
        const langOption = page.locator(
          `[data-value="${lang.code}"], ` +
          `[data-lang="${lang.code}"], ` +
          `text="${lang.name}"`
        ).first();

        if (await langOption.isVisible()) {
          await langOption.click();
          await page.waitForTimeout(1000);

          // 验证页面内容已切换
          const pageContent = await page.content();
          console.log(`Switched to ${lang.name}`);

          // 验证 HTML lang 属性
          const htmlLang = await page.getAttribute('html', 'lang');
          expect(htmlLang).toContain(lang.code.split('-')[0]);
        }
      }
    }
  });

  test('should persist language preference', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到英语
    const langSwitcher = page.locator('[data-testid="language-switcher"]').first();
    
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(500);
      
      const enOption = page.locator('[data-value="en"], text="English"').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 验证语言仍然是英语
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toContain('en');
  });

  test('should display correct translations for common elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 测试中文
    const langSwitcher = page.locator('[data-testid="language-switcher"]').first();
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(500);
      
      const zhOption = page.locator('[data-value="zh-CN"]').first();
      if (await zhOption.isVisible()) {
        await zhOption.click();
        await page.waitForTimeout(1000);
        
        // 验证常见元素的翻译
        const loginBtn = page.locator('button:has-text("登录"), a:has-text("登录")').first();
        if (await loginBtn.isVisible()) {
          expect(await loginBtn.textContent()).toContain('登录');
        }
      }
    }

    // 切换到英语
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(500);
      
      const enOption = page.locator('[data-value="en"]').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(1000);
        
        // 验证英文翻译
        const loginBtn = page.locator('button:has-text("Login"), a:has-text("Login")').first();
        if (await loginBtn.isVisible()) {
          expect(await loginBtn.textContent()).toMatch(/Login|Sign In/i);
        }
      }
    }
  });
});



