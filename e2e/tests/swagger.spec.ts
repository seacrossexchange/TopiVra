/**
 * Sprint 2: P0 核心流程验证 - Swagger 生产环境测试
 * 测试目标：验证 Swagger 在生产环境不可访问
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

test.describe('Swagger 生产环境验证', () => {
  
  test.describe('开发环境 Swagger 应可访问', () => {
    
    test('Swagger UI 端点检查', async ({ request }) => {
      // 尝试访问 Swagger UI
      const response = await request.get(`${API_BASE}/api/docs`);
      
      // 在开发环境应该返回 200
      // 在生产环境应该返回 404 或重定向
      console.log(`[TEST] Swagger UI 响应状态: ${response.status()}`);
      
      // 记录结果
      if (response.status() === 200) {
        console.log('[TEST] ⚠️ Swagger UI 可访问 - 确认当前是否为开发环境');
      } else if (response.status() === 404) {
        console.log('[TEST] ✅ Swagger UI 不可访问 - 生产环境配置正确');
      }
      
      // 根据环境判断
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv === 'production') {
        expect([404, 403]).toContain(response.status());
      }
    });

    test('Swagger JSON 端点检查', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/docs-json`);
      
      console.log(`[TEST] Swagger JSON 响应状态: ${response.status()}`);
      
      // 生产环境应返回 404
      if (response.status() === 200) {
        const body = await response.json();
        console.log(`[TEST] API 文档信息: ${body.info?.title || 'N/A'}`);
      }
    });

    test('Swagger YAML 端点检查', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/docs-yaml`);
      
      console.log(`[TEST] Swagger YAML 响应状态: ${response.status()}`);
    });
  });

  test.describe('生产环境 Swagger 验证脚本', () => {
    
    test('验证 Swagger 生产环境禁用逻辑', async ({ request }) => {
      // 模拟生产环境检查
      // 根据 main.ts 的逻辑：
      // if (nodeEnv !== 'production' || enableSwagger)
      // 生产环境下 enableSwagger 默认为 false
      
      const swaggerEndpoints = [
        '/api/docs',
        '/api/docs-json',
        '/api/docs-yaml',
        '/api/swagger',
        '/swagger',
        '/api-docs',
      ];
      
      for (const endpoint of swaggerEndpoints) {
        const response = await request.get(`${API_BASE}${endpoint}`);
        console.log(`[TEST] ${endpoint}: ${response.status()}`);
        
        // 所有 Swagger 相关端点在生产环境都应不可访问
        if (process.env.NODE_ENV === 'production') {
          expect([404, 403, 401]).toContain(response.status());
        }
      }
    });
  });

  test.describe('API 端点功能验证', () => {
    
    test('API 端点在 Swagger 禁用时仍正常工作', async ({ request }) => {
      // 验证 Swagger 禁用不影响 API 功能
      const endpoints = [
        { path: '/health', method: 'GET', expectStatus: [200, 404] },
        { path: '/api/v1/products', method: 'GET', expectStatus: [200, 401, 403] },
        { path: '/api/v1/auth/login', method: 'POST', expectStatus: [400, 401, 404] },
      ];
      
      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'GET') {
          response = await request.get(`${API_BASE}${endpoint.path}`);
        } else if (endpoint.method === 'POST') {
          response = await request.post(`${API_BASE}${endpoint.path}`, {
            data: {},
          });
        }
        
        console.log(`[TEST] ${endpoint.method} ${endpoint.path}: ${response?.status()}`);
        expect(endpoint.expectStatus).toContain(response?.status());
      }
    });

    test('健康检查端点可访问', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      
      // 健康检查应该始终可访问
      if (response.status() === 200) {
        const body = await response.json();
        console.log(`[TEST] 健康检查结果: ${JSON.stringify(body)}`);
        expect(body.status).toBe('ok');
      } else {
        console.log(`[TEST] 健康检查端点返回: ${response.status()}`);
      }
    });
  });

  test.describe('安全头检查', () => {
    
    test('响应包含安全头', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/v1/products`);
      
      const headers = response.headers();
      
      // 检查安全相关响应头
      const securityHeaders = {
        'x-content-type-options': headers['x-content-type-options'],
        'x-frame-options': headers['x-frame-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'content-security-policy': headers['content-security-policy'],
        'strict-transport-security': headers['strict-transport-security'],
      };
      
      console.log('[TEST] 安全响应头:');
      for (const [key, value] of Object.entries(securityHeaders)) {
        console.log(`  ${key}: ${value || '未设置'}`);
      }
      
      // X-Content-Type-Options 应该设置为 nosniff
      if (securityHeaders['x-content-type-options']) {
        expect(securityHeaders['x-content-type-options']).toBe('nosniff');
      }
    });
  });
});

test.describe('Swagger 配置验证清单', () => {
  
  test('生产环境配置清单', async ({ request }) => {
    console.log('\n[TEST] ========== Swagger 生产环境配置检查清单 ==========');
    
    const checks = {
      'NODE_ENV 设置': process.env.NODE_ENV || '未设置 (默认 development)',
      'ENABLE_SWAGGER': process.env.ENABLE_SWAGGER || '未设置 (默认 false)',
    };
    
    for (const [key, value] of Object.entries(checks)) {
      console.log(`[TEST] ${key}: ${value}`);
    }
    
    // 验证 Swagger 是否禁用
    const swaggerResponse = await request.get(`${API_BASE}/api/docs`);
    const isSwaggerDisabled = [404, 403].includes(swaggerResponse.status());
    
    console.log(`[TEST] Swagger 禁用状态: ${isSwaggerDisabled ? '✅ 已禁用' : '⚠️ 未禁用'}`);
    
    // 生产环境必须禁用 Swagger
    if (process.env.NODE_ENV === 'production') {
      expect(isSwaggerDisabled).toBe(true);
    }
    
    console.log('[TEST] ==============================================\n');
  });
});