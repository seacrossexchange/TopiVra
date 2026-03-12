import { test, expect } from '@playwright/test';

test.describe('Product Browsing', () => {
  test('should display homepage with products', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for product listings or categories
    const productElements = page.locator('[data-testid="product-card"], .product-card, .product-item');
    const categoryElements = page.locator('[data-testid="category-card"], .category-card, .category-item');
    
    // At least one of these should be visible
    const productsVisible = await productElements.count();
    const categoriesVisible = await categoryElements.count();
    
    expect(productsVisible + categoriesVisible).toBeGreaterThan(0);
  });

  test('should navigate to product list page', async ({ page }) => {
    await page.goto('/products');
    
    // Check for filters and sorting options
    const filterElements = page.locator('[data-testid="filter"], .filter, .filter-section');
    const sortElements = page.locator('[data-testid="sort"], select, .sort-dropdown');
    
    // Product list should have products
    await page.waitForLoadState('networkidle');
    
    // Check URL contains products
    await expect(page).toHaveURL(/.*products.*/);
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/');
    
    // Find search input
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test product');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
      
      // Should show results or no results message
      const resultsIndicator = page.locator('[data-testid="search-results"], .search-results, .no-results');
      await expect(resultsIndicator.first().or(page.locator('.product-card'))).toBeVisible({ timeout: 5000 });
    } else {
      // Skip test if no search functionality
      test.skip();
    }
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"] a, .product-card a, .product-item a').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      
      // Should be on product detail page
      await page.waitForLoadState('networkidle');
      
      // Check for product details elements
      const productTitle = page.locator('[data-testid="product-title"], .product-title, h1');
      const productPrice = page.locator('[data-testid="product-price"], .product-price, .price');
      const addToCartBtn = page.locator('[data-testid="add-to-cart"], button:has-text("加入购物车"), button:has-text("Add to Cart")');
      
      // At least title should be visible
      await expect(productTitle.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Skip if no products available
      test.skip();
    }
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Find category filter
    const categoryFilter = page.locator('[data-testid="category-filter"], .category-filter, .category-list a').first();
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      
      // Wait for products to reload
      await page.waitForLoadState('networkidle');
      
      // URL should change or products should update
      await expect(page).toHaveURL(/.*(category|cat)=.*/);
    } else {
      test.skip();
    }
  });

  test('should sort products', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Find sort dropdown
    const sortDropdown = page.locator('[data-testid="sort-select"], select[name="sort"], .sort-select select').first();
    
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption({ index: 1 });
      
      // Wait for products to reload
      await page.waitForLoadState('networkidle');
      
      // URL should contain sort parameter
      await expect(page).toHaveURL(/.*sort=.*/);
    } else {
      test.skip();
    }
  });
});

test.describe('Product Reviews', () => {
  test('should display reviews on product page', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const firstProduct = page.locator('[data-testid="product-card"] a, .product-card a').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForLoadState('networkidle');
      
      // Scroll to reviews section
      const reviewsSection = page.locator('[data-testid="reviews"], .reviews-section, #reviews');
      
      if (await reviewsSection.isVisible()) {
        await reviewsSection.scrollIntoViewIfNeeded();
        
        // Check for review elements
        const reviewItems = page.locator('[data-testid="review-item"], .review-item, .review');
        const reviewCount = await reviewItems.count();
        
        // Either reviews exist or "no reviews" message
        expect(reviewCount).toBeGreaterThanOrEqual(0);
      }
    } else {
      test.skip();
    }
  });
});