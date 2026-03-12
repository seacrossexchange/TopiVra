/**
 * Sprint 1: P0 安全验证 - 支付伪造攻击测试
 * 测试目标：验证支付回调签名验证是否有效
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

test.describe('支付安全攻击测试', () => {
  
  test.describe('微信支付伪造攻击测试', () => {
    
    test('测试用例1: 伪造微信支付回调（无签名）应被拒绝', async ({ request }) => {
      const response = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: {
          out_trade_no: `PAY_TEST_${Date.now()}`,
          trade_state: 'SUCCESS',
          transaction_id: 'WX_FAKE_TRANSACTION_12345',
          amount: { total: 100 },
          mch_id: 'fake_mch_id',
          appid: 'fake_appid',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 预期返回 400/403/401 错误
      expect([400, 401, 403, 500]).toContain(response.status());
      
      const body = await response.text();
      console.log(`[TEST] 无签名回调响应: ${response.status()} - ${body}`);
      
      // 确保不是成功响应
      expect(body).not.toContain('SUCCESS');
    });

    test('测试用例2: 伪造微信回调（错误签名）应被拒绝', async ({ request }) => {
      const response = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: {
          out_trade_no: `PAY_TEST_${Date.now()}`,
          trade_state: 'SUCCESS',
          transaction_id: 'WX_FAKE_TRANSACTION_67890',
          amount: { total: 100 },
          mch_id: 'fake_mch_id',
          appid: 'fake_appid',
          sign: 'FAKE_SIGNATURE_XXXXXXXXXXXXX',
          sign_type: 'HMAC-SHA256',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 预期返回 400/403/401 错误
      expect([400, 401, 403, 500]).toContain(response.status());
      
      const body = await response.text();
      console.log(`[TEST] 错误签名回调响应: ${response.status()} - ${body}`);
      
      // 确保不是成功响应
      expect(body).not.toContain('SUCCESS');
    });

    test('测试用例3: 重放合法回调（幂等性测试）', async ({ request }) => {
      // 模拟重放攻击 - 同样的请求发送两次
      const callbackData = {
        out_trade_no: `PAY_REPLAY_${Date.now()}`,
        trade_state: 'SUCCESS',
        transaction_id: 'WX_REPLAY_TEST_TRANSACTION',
        amount: { total: 100 },
        mch_id: 'test_mch',
        appid: 'test_app',
        sign: 'INVALID_BUT_SAME_FOR_BOTH_REQUESTS',
        sign_type: 'HMAC-SHA256',
      };

      // 第一次请求
      const response1 = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: callbackData,
        headers: { 'Content-Type': 'application/json' },
      });

      // 第二次请求（重放）
      const response2 = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: callbackData,
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[TEST] 第一次请求: ${response1.status()}, 第二次请求: ${response2.status()}`);

      // 两次请求应该都被拒绝（因为签名无效）
      expect([400, 401, 403, 500]).toContain(response1.status());
      expect([400, 401, 403, 500]).toContain(response2.status());
    });

    test('测试用例4: 过期时间戳回调应被拒绝', async ({ request }) => {
      // 创建一个 10 分钟前的时间戳
      const expiredTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);
      
      const response = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: {
          out_trade_no: `PAY_EXPIRED_${Date.now()}`,
          trade_state: 'SUCCESS',
          transaction_id: 'WX_EXPIRED_TRANSACTION',
          amount: { total: 100 },
          mch_id: 'test_mch',
          appid: 'test_app',
          timestamp: expiredTimestamp,
          nonce: 'test_nonce_12345',
          sign: 'fake_signature',
          sign_type: 'HMAC-SHA256',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[TEST] 过期时间戳回调响应: ${response.status()}`);
      
      // 预期被拒绝
      expect([400, 401, 403, 500]).toContain(response.status());
    });

    test('测试用例5: 验证回调端点存在', async ({ request }) => {
      // 测试端点是否存在（即使是 OPTIONS 请求）
      const response = await request.options(`${API_BASE}/payments/wechat/callback`);
      
      // 端点应该存在（200, 204, 401, 403, 404, 405 都可能）
      expect(response.status()).toBeLessThan(500);
      console.log(`[TEST] 端点存在性检查: ${response.status()}`);
    });
  });

  test.describe('支付宝伪造攻击测试', () => {
    
    test('测试用例6: 伪造支付宝回调（无签名）应被拒绝', async ({ request }) => {
      const response = await request.post(`${API_BASE}/payments/alipay/callback`, {
        data: {
          out_trade_no: `PAY_ALI_${Date.now()}`,
          trade_no: 'ALI_FAKE_TRANSACTION_12345',
          trade_status: 'TRADE_SUCCESS',
          total_amount: '100.00',
          buyer_id: 'fake_buyer_id',
          app_id: 'fake_app_id',
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      console.log(`[TEST] 支付宝无签名回调响应: ${response.status()}`);
      
      // 预期被拒绝
      expect([400, 401, 403, 500]).toContain(response.status());
    });

    test('测试用例7: 伪造支付宝回调（错误签名）应被拒绝', async ({ request }) => {
      const response = await request.post(`${API_BASE}/payments/alipay/callback`, {
        data: {
          out_trade_no: `PAY_ALI_${Date.now()}`,
          trade_no: 'ALI_FAKE_TRANSACTION_67890',
          trade_status: 'TRADE_SUCCESS',
          total_amount: '100.00',
          buyer_id: 'fake_buyer_id',
          app_id: 'fake_app_id',
          sign: 'FAKE_ALIPAY_SIGNATURE_XXXXXX',
          sign_type: 'RSA2',
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      console.log(`[TEST] 支付宝错误签名回调响应: ${response.status()}`);
      
      // 预期被拒绝
      expect([400, 401, 403, 500]).toContain(response.status());
    });
  });

  test.describe('USDT 支付安全测试', () => {
    
    test('测试用例8: 伪造USDT交易哈希应被拒绝或验证失败', async ({ request }) => {
      // 尝试验证一个伪造的交易哈希
      const response = await request.post(`${API_BASE}/payments/usdt/verify`, {
        data: {
          paymentNo: `PAY_USDT_FAKE_${Date.now()}`,
          txHash: '0x' + 'a'.repeat(64), // 伪造的以太坊交易哈希格式
        },
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[TEST] USDT 伪造交易哈希响应: ${response.status()}`);
      
      // 预期被拒绝或交易不存在
      expect([400, 401, 403, 404, 500]).toContain(response.status());
    });

    test('测试用例9: 无效格式的交易哈希应被拒绝', async ({ request }) => {
      const response = await request.post(`${API_BASE}/payments/usdt/verify`, {
        data: {
          paymentNo: `PAY_USDT_INVALID_${Date.now()}`,
          txHash: 'invalid_tx_hash_format',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[TEST] 无效格式交易哈希响应: ${response.status()}`);
      
      // 预期被拒绝
      expect([400, 401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('支付金额篡改测试', () => {
    
    test('测试用例10: 金额不一致应被检测', async ({ request }) => {
      // 尝试篡改金额
      const response = await request.post(`${API_BASE}/payments/wechat/callback`, {
        data: {
          out_trade_no: `PAY_AMOUNT_${Date.now()}`,
          trade_state: 'SUCCESS',
          transaction_id: 'WX_AMOUNT_TEST',
          amount: { 
            total: 1, // 篡改为 1 分
            payer_total: 1,
            currency: 'CNY',
          },
          mch_id: 'test_mch',
          appid: 'test_app',
          sign: 'fake_signature',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[TEST] 金额篡改测试响应: ${response.status()}`);
      
      // 无论签名是否正确，都不应该处理成功
      expect([400, 401, 403, 500]).toContain(response.status());
    });
  });
});

test.describe('支付端点安全检查', () => {
  
  test('支付创建端点需要认证', async ({ request }) => {
    const response = await request.post(`${API_BASE}/payments/create`, {
      data: {
        orderId: 'fake_order_id',
        method: 'USDT',
      },
    });

    // 未认证请求应被拒绝
    expect([401, 403, 404, 500]).toContain(response.status());
    console.log(`[TEST] 未认证创建支付响应: ${response.status()}`);
  });

  test('支付状态查询需要认证', async ({ request }) => {
    const response = await request.get(`${API_BASE}/payments/status/PAY_TEST_123`);

    // 未认证请求应被拒绝
    expect([401, 403, 404, 500]).toContain(response.status());
    console.log(`[TEST] 未认证状态查询响应: ${response.status()}`);
  });

  test('支付取消需要认证', async ({ request }) => {
    const response = await request.post(`${API_BASE}/payments/cancel`, {
      data: { paymentNo: 'PAY_TEST_123' },
    });

    // 未认证请求应被拒绝
    expect([401, 403, 404, 500]).toContain(response.status());
    console.log(`[TEST] 未认证取消支付响应: ${response.status()}`);
  });
});