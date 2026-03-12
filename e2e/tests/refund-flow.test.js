#!/usr/bin/env node
/**
 * 退款流程 E2E 测试
 * 测试完整的退款申请和审核流程
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';
let adminToken = '';
let testOrderId = '';
let testRefundId = '';

// API 客户端
const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true,
});

// 设置认证 token
function setAuthToken(token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// 测试步骤
async function runRefundTests() {
  console.log('🧪 开始退款流程 E2E 测试...\n');

  try {
    // 1. 买家登录
    console.log('📝 步骤 1: 买家登录');
    const loginRes = await api.post('/auth/login', {
      email: 'buyer@test.com',
      password: 'Test123456',
    });
    
    if (loginRes.status === 200 || loginRes.status === 201) {
      authToken = loginRes.data.accessToken || loginRes.data.data?.accessToken;
      setAuthToken(authToken);
      console.log('   ✅ 买家登录成功');
    } else {
      console.log('   ⚠️  买家账号不存在，跳过测试');
      return;
    }

    // 2. 获取买家的订单列表
    console.log('\n📝 步骤 2: 获取买家订单');
    const ordersRes = await api.get('/orders/my?page=1&limit=10');
    
    if (ordersRes.status === 200 && ordersRes.data.items?.length > 0) {
      // 找一个已支付的订单
      const paidOrder = ordersRes.data.items.find(
        o => o.orderStatus === 'PAID' || o.orderStatus === 'DELIVERED'
      );
      
      if (paidOrder) {
        testOrderId = paidOrder.id;
        console.log(`   ✅ 找到可退款订单: ${paidOrder.orderNo}`);
      } else {
        console.log('   ⚠️  没有可退款的订单，跳过测试');
        return;
      }
    } else {
      console.log('   ⚠️  买家没有订单，跳过测试');
      return;
    }

    // 3. 申请退款
    console.log('\n📝 步骤 3: 申请退款');
    const refundRes = await api.post('/orders/refunds', {
      orderId: testOrderId,
      refundAmount: 10.00,
      refundType: 'REFUND_ONLY',
      reason: '商品与描述不符',
      description: '测试退款申请',
      evidence: [],
    });

    if (refundRes.status === 200 || refundRes.status === 201) {
      testRefundId = refundRes.data.id || refundRes.data.data?.id;
      console.log('   ✅ 退款申请成功');
    } else {
      console.log(`   ❌ 退款申请失败: ${refundRes.status}`);
      console.log(`   响应: ${JSON.stringify(refundRes.data)}`);
      return;
    }

    // 4. 查询退款详情
    console.log('\n📝 步骤 4: 查询退款详情');
    const refundDetailRes = await api.get(`/orders/refunds/${testRefundId}`);
    
    if (refundDetailRes.status === 200) {
      console.log('   ✅ 退款详情查询成功');
      console.log(`   状态: ${refundDetailRes.data.status}`);
    } else {
      console.log(`   ❌ 查询失败: ${refundDetailRes.status}`);
    }

    // 5. Admin 登录
    console.log('\n📝 步骤 5: Admin 登录');
    const adminLoginRes = await api.post('/auth/login', {
      email: 'admin@test.com',
      password: 'Admin123456',
    });
    
    if (adminLoginRes.status === 200 || adminLoginRes.status === 201) {
      adminToken = adminLoginRes.data.accessToken || adminLoginRes.data.data?.accessToken;
      setAuthToken(adminToken);
      console.log('   ✅ Admin 登录成功');
    } else {
      console.log('   ⚠️  Admin 账号不存在，跳过审核测试');
      return;
    }

    // 6. Admin 审核退款（同意）
    console.log('\n📝 步骤 6: Admin 审核退款');
    const processRes = await api.put(`/admin/refunds/${testRefundId}/process`, {
      action: 'APPROVE',
      adminResponse: '测试通过，同意退款',
    });

    if (processRes.status === 200) {
      console.log('   ✅ 退款审核成功');
    } else {
      console.log(`   ❌ 审核失败: ${processRes.status}`);
      console.log(`   响应: ${JSON.stringify(processRes.data)}`);
    }

    // 7. 验证订单状态
    console.log('\n📝 步骤 7: 验证订单状态');
    const orderDetailRes = await api.get(`/orders/${testOrderId}`);
    
    if (orderDetailRes.status === 200) {
      const orderStatus = orderDetailRes.data.orderStatus;
      if (orderStatus === 'REFUNDED') {
        console.log('   ✅ 订单状态已更新为 REFUNDED');
      } else {
        console.log(`   ⚠️  订单状态: ${orderStatus}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 退款流程测试完成！\n');

  } catch (error) {
    console.log(`\n❌ 测试出错: ${error.message}`);
    console.log(error.stack);
    process.exit(1);
  }
}

// 执行测试
runRefundTests().catch(console.error);



