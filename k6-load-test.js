import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');

// 测试配置
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 2分钟内逐步增加到100个用户
    { duration: '5m', target: 100 },  // 保持100个用户5分钟
    { duration: '2m', target: 200 },  // 增加到200个用户
    { duration: '5m', target: 200 },  // 保持200个用户5分钟
    { duration: '2m', target: 0 },    // 逐步减少到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95%的请求应在500ms内完成
    http_req_failed: ['rate<0.05'],    // 错误率应低于5%
    errors: ['rate<0.1'],              // 自定义错误率应低于10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 测试数据
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: __ENV.TEST_PASSWORD || 'Test123456!',
  username: `testuser${Date.now()}`,
};

export function setup() {
  // 注册测试用户
  const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
    email: testUser.email,
    password: testUser.password,
    username: testUser.username,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Setup: User registered', registerRes.status);
  return { testUser };
}

export default function loadTest(data) {
  // 1. 登录测试
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: data.testUser.email,
    password: data.testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('accessToken') !== undefined,
  });

  errorRate.add(!loginSuccess);

  if (!loginSuccess) {
    console.error('Login failed');
    return;
  }

  const token = loginRes.json('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  sleep(1);

  // 2. 获取商品列表
  const productsRes = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`, {
    headers,
  });

  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // 3. 获取商品详情
  const products = productsRes.json('data');
  if (products && products.length > 0) {
    const productId = products[0].id;
    const productRes = http.get(`${BASE_URL}/api/v1/products/${productId}`, {
      headers,
    });

    check(productRes, {
      'product detail status is 200': (r) => r.status === 200,
      'product detail response time < 300ms': (r) => r.timings.duration < 300,
    });
  }

  sleep(1);

  // 4. 添加到购物车
  if (products && products.length > 0) {
    const cartRes = http.post(`${BASE_URL}/api/v1/cart`, JSON.stringify({
      productId: products[0].id,
      quantity: 1,
    }), {
      headers,
    });

    check(cartRes, {
      'add to cart status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
  }

  sleep(1);

  // 5. 获取购物车
  const cartRes = http.get(`${BASE_URL}/api/v1/cart`, {
    headers,
  });

  check(cartRes, {
    'get cart status is 200': (r) => r.status === 200,
    'get cart response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 6. 获取用户信息
  const userRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers,
  });

  check(userRes, {
    'get user status is 200': (r) => r.status === 200,
    'get user response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(2);
}

export function teardown(data) {
  console.log('Teardown: Test completed');
}

