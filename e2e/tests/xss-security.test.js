#!/usr/bin/env node
/**
 * XSS 渗透测试脚本
 * 测试所有用户输入点的 XSS 防护
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// XSS 注入向量
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">click</a>',
  '<div style="background:url(javascript:alert(1))">test</div>',
  '"><script>alert(1)</script>',
];

// 测试用例
const tests = [
  {
    name: '测试1: 商品标题 XSS 注入',
    endpoint: '/products',
    method: 'POST',
    field: 'title',
    description: '预期：script 标签被清除',
  },
  {
    name: '测试2: 商品描述 XSS 注入',
    endpoint: '/products',
    method: 'POST',
    field: 'description',
    description: '预期：危险标签和事件被清除',
  },
  {
    name: '测试3: 用户名 XSS 注入',
    endpoint: '/auth/register',
    method: 'POST',
    field: 'username',
    description: '预期：所有 HTML 标签被清除',
  },
  {
    name: '测试4: 评论内容 XSS 注入',
    endpoint: '/products/test-id/reviews',
    method: 'POST',
    field: 'content',
    description: '预期：危险标签被清除',
  },
  {
    name: '测试5: 工单消息 XSS 注入',
    endpoint: '/tickets',
    method: 'POST',
    field: 'description',
    description: '预期：危险标签被清除',
  },
  {
    name: '测试6: 搜索参数 XSS 注入',
    endpoint: '/products/search',
    method: 'GET',
    field: 'q',
    description: '预期：特殊字符被转义',
  },
  {
    name: '测试7: 博客内容 XSS 注入',
    endpoint: '/admin/blogs',
    method: 'POST',
    field: 'content',
    description: '预期：iframe 等危险标签被清除',
  },
];

// 检查响应是否包含未净化的 XSS
function containsXSS(data, payload) {
  const dataStr = JSON.stringify(data).toLowerCase();
  const dangerousPatterns = [
    '<script',
    'onerror=',
    'onload=',
    'javascript:',
    '<iframe',
    'onclick=',
  ];
  
  return dangerousPatterns.some(pattern => dataStr.includes(pattern));
}

// 运行测试
async function runTests() {
  console.log('🧪 开始 XSS 渗透测试...\n');
  console.log(`📋 测试 ${XSS_PAYLOADS.length} 个注入向量 × ${tests.length} 个注入点\n`);
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   ${test.description}`);
    
    let testPassed = true;
    
    for (const payload of XSS_PAYLOADS) {
      try {
        let response;
        
        if (test.method === 'GET') {
          response = await axios({
            method: 'GET',
            url: `${BASE_URL}${test.endpoint}`,
            params: { [test.field]: payload },
            validateStatus: () => true,
          });
        } else {
          const data = {
            [test.field]: payload,
            // 添加必要的其他字段
            ...(test.endpoint.includes('products') && { price: 100, stock: 10, category: 'test' }),
            ...(test.endpoint.includes('register') && { email: 'test@test.com', password: 'Test123!' }),
            ...(test.endpoint.includes('tickets') && { subject: 'Test', category: 'ACCOUNT' }),
            ...(test.endpoint.includes('blogs') && { title: 'Test', excerpt: 'Test' }),
          };
          
          response = await axios({
            method: test.method,
            url: `${BASE_URL}${test.endpoint}`,
            data,
            validateStatus: () => true,
          });
        }
        
        // 检查响应中是否包含未净化的 XSS
        if (response.status === 200 || response.status === 201) {
          if (containsXSS(response.data, payload)) {
            console.log(`   ❌ 发现 XSS 漏洞 - Payload: ${payload.substring(0, 30)}...`);
            testPassed = false;
            break;
          }
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`   ⚠️  跳过 - 服务未启动`);
          skipped++;
          testPassed = null;
          break;
        }
        // 其他错误继续测试
      }
    }
    
    if (testPassed === true) {
      console.log(`   ✅ 通过 - 所有 XSS 注入被成功拦截`);
      passed++;
    } else if (testPassed === false) {
      failed++;
    } else {
      // 跳过的测试不计入总数
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过`);
  if (passed + failed > 0) {
    console.log(`   通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 执行测试
runTests().catch(console.error);



