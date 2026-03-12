#!/usr/bin/env node
/**
 * 支付安全测试脚本
 * 测试支付回调的安全性
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// 测试用例
const tests = [
  {
    name: '测试1: 伪造微信支付回调（无签名）',
    method: 'POST',
    url: `${BASE_URL}/payments/wechat/callback`,
    data: {
      out_trade_no: 'PAY123456789',
      trade_state: 'SUCCESS',
      transaction_id: 'WX_FAKE_12345',
    },
    expectedStatus: [400, 403],
    description: '预期：被拒绝，返回 400 或 403',
  },
  {
    name: '测试2: 伪造微信回调（错误签名）',
    method: 'POST',
    url: `${BASE_URL}/payments/wechat/callback`,
    data: {
      out_trade_no: 'PAY123456789',
      trade_state: 'SUCCESS',
      transaction_id: 'WX_FAKE_12345',
      sign: 'FAKE_SIGNATURE_12345',
    },
    expectedStatus: [400, 403],
    description: '预期：签名验证失败，被拒绝',
  },
  {
    name: '测试3: 伪造支付宝回调（无签名）',
    method: 'POST',
    url: `${BASE_URL}/payments/alipay/callback`,
    data: {
      out_trade_no: 'PAY123456789',
      trade_status: 'TRADE_SUCCESS',
      trade_no: 'ALI_FAKE_12345',
    },
    expectedStatus: [400, 403],
    description: '预期：被拒绝，返回 400 或 403',
  },
  {
    name: '测试4: 过期时间戳回调（>5分钟）',
    method: 'POST',
    url: `${BASE_URL}/payments/wechat/callback`,
    data: {
      out_trade_no: 'PAY123456789',
      trade_state: 'SUCCESS',
      transaction_id: 'WX_FAKE_12345',
      timestamp: Math.floor(Date.now() / 1000) - 600, // 10分钟前
    },
    expectedStatus: [400, 403],
    description: '预期：时间戳过期，被拒绝',
  },
  {
    name: '测试5: 重放合法回调（幂等性测试）',
    method: 'POST',
    url: `${BASE_URL}/payments/wechat/callback`,
    data: {
      out_trade_no: 'PAY_REPLAY_TEST_' + Date.now(),
      trade_state: 'SUCCESS',
      transaction_id: 'WX_REPLAY_' + Date.now(),
    },
    expectedStatus: [400, 403, 200], // 第一次可能成功，第二次应该被拒绝
    description: '预期：重复回调被幂等性检查拦截',
    isReplayTest: true,
  },
  {
    name: '测试6: 金额篡改攻击',
    method: 'POST',
    url: `${BASE_URL}/payments/alipay/callback`,
    data: {
      out_trade_no: 'PAY123456789',
      trade_status: 'TRADE_SUCCESS',
      trade_no: 'ALI_FAKE_12345',
      total_amount: '999999.99', // 篡改金额
    },
    expectedStatus: [400, 403],
    description: '预期：金额不匹配，被拒绝',
  },
];

// 运行测试
async function runTests() {
  console.log('🧪 开始支付安全测试...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n📝 ${test.name}`);
      console.log(`   ${test.description}`);
      
      // 重放测试需要发送两次
      if (test.isReplayTest) {
        console.log(`   发送第一次请求...`);
        const firstResponse = await axios({
          method: test.method,
          url: test.url,
          data: test.data,
          validateStatus: () => true,
        });
        console.log(`   第一次响应: ${firstResponse.status}`);
        
        // 等待 1 秒后重放
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`   发送第二次请求（重放）...`);
        
        const response = await axios({
          method: test.method,
          url: test.url,
          data: test.data,
          validateStatus: () => true,
        });
        
        // 第二次应该被拒绝
        const isExpected = [400, 403, 409].includes(response.status);
        
        if (isExpected) {
          console.log(`   ✅ 通过 - 重放被拦截，状态码: ${response.status}`);
          passed++;
        } else {
          console.log(`   ❌ 失败 - 重放未被拦截，状态码: ${response.status}`);
          failed++;
        }
        continue;
      }
      
      const response = await axios({
        method: test.method,
        url: test.url,
        data: test.data,
        validateStatus: () => true, // 不抛出错误
      });

      const isExpected = test.expectedStatus.includes(response.status);
      
      if (isExpected) {
        console.log(`   ✅ 通过 - 状态码: ${response.status}`);
        passed++;
      } else {
        console.log(`   ❌ 失败 - 状态码: ${response.status}，预期: ${test.expectedStatus.join(' 或 ')}`);
        console.log(`   响应: ${JSON.stringify(response.data)}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 错误 - ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log(`   通过率: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// 执行测试
runTests().catch(console.error);

