# TopiVra 开发文档

**项目**: TopiVra - 数字虚拟账号发卡交易平台  
**版本**: v1.0.0  
**最后更新**: 2026-03-12

---

## 📋 目录

- [项目架构](#项目架构)
- [开发环境搭建](#开发环境搭建)
- [代码规范](#代码规范)
- [Git 工作流](#git-工作流)
- [测试指南](#测试指南)
- [调试指南](#调试指南)

---

## 🏗️ 项目架构

### 技术栈

#### 前端
```
React 19.2.0          - UI 框架
TypeScript 5.9.3      - 类型系统
Vite 7.3.1            - 构建工具
Ant Design 5.29.3     - UI 组件库
Zustand 4.5.7         - 状态管理
React Query 5.90.21   - 数据获取
React Router 6.30.3   - 路由管理
Axios 1.13.5          - HTTP 客户端
i18next 25.8.13       - 国际化
Socket.IO 4.8.3       - WebSocket
```

#### 后端
```
NestJS 11.1.16        - 后端框架
TypeScript 5.1.3      - 类型系统
Prisma 5.22.0         - ORM
MySQL 8.0             - 数据库
Redis 7               - 缓存
JWT                   - 认证
Passport              - 认证策略
Winston               - 日志
Bull                  - 队列
Socket.IO 4.8.3       - WebSocket
```

### 项目结构

```
TopiVra/
├── client/                 # 前端项目
│   ├── public/            # 静态资源
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── store/         # 状态管理
│   │   ├── services/      # API 服务
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── utils/         # 工具函数
│   │   ├── types/         # 类型定义
│   │   ├── i18n/          # 国际化
│   │   ├── router/        # 路由配置
│   │   └── styles/        # 样式文件
│   ├── test/              # 测试文件
│   └── vite.config.ts     # Vite 配置
│
├── server/                # 后端项目
│   ├── prisma/           # Prisma 配置
│   │   ├── migrations/   # 数据库迁移
│   │   ├── schema.prisma # 数据模型
│   │   └── seed.ts       # 种子数据
│   ├── src/
│   │   ├── common/       # 公共模块
│   │   │   ├── decorators/  # 装饰器
│   │   │   ├── filters/     # 异常过滤器
│   │   │   ├── guards/      # 守卫
│   │   │   ├── interceptors/# 拦截器
│   │   │   ├── pipes/       # 管道
│   │   │   └── middleware/  # 中间件
│   │   ├── modules/      # 业务模块
│   │   │   ├── auth/     # 认证模块
│   │   │   ├── users/    # 用户模块
│   │   │   ├── products/ # 商品模块
│   │   │   ├── orders/   # 订单模块
│   │   │   ├── payments/ # 支付模块
│   │   │   └── ...       # 其他模块
│   │   ├── prisma/       # Prisma 服务
│   │   ├── app.module.ts # 根模块
│   │   └── main.ts       # 入口文件
│   └── test/             # 测试文件
│
├── e2e/                  # E2E 测试
│   ├── tests/           # 测试用例
│   └── playwright.config.ts
│
├── config/              # 配置文件
│   ├── docker-compose.yml
│   ├── nginx/
│   └── k8s/
│
├── docs/                # 文档
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
│
└── scripts/             # 脚本
    └── deploy/
```

---

## 🚀 开发环境搭建

### 前置要求

```bash
Node.js >= 20.x
npm >= 10.x
Docker >= 24.x
Docker Compose >= 2.x
MySQL >= 8.0
Redis >= 7.x
```

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/topivra.git
cd topivra
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install

# 安装 E2E 测试依赖
cd ../e2e
npm install
```

### 3. 配置环境变量

```bash
# 后端环境变量
cd server
cp .env.example .env
# 编辑 .env 文件，填入实际值

# 前端环境变量
cd ../client
cp .env.example .env
# 编辑 .env 文件，填入实际值
```

### 4. 启动数据库

```bash
# 使用 Docker Compose 启动
cd ..
docker-compose -f config/docker-compose.yml up -d mysql redis
```

### 5. 运行数据库迁移

```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

### 6. 启动开发服务器

```bash
# 启动后端 (终端 1)
cd server
npm run start:dev

# 启动前端 (终端 2)
cd client
npm run dev
```

### 7. 访问应用

```
前端: http://localhost:5174
后端: http://localhost:3001
API 文档: http://localhost:3001/api/docs
```

---

## 📝 代码规范

### TypeScript 规范

#### 命名规范
```typescript
// 类名: PascalCase
class UserService {}

// 接口: PascalCase, 以 I 开头
interface IUser {}

// 类型: PascalCase
type UserRole = 'ADMIN' | 'USER';

// 变量/函数: camelCase
const userName = 'John';
function getUserName() {}

// 常量: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 枚举: PascalCase
enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

#### 类型注解
```typescript
// ✅ 推荐: 显式类型注解
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// ❌ 避免: 使用 any
function getUser(id: any): any {
  return userService.findById(id);
}

// ✅ 推荐: 使用泛型
function findMany<T>(items: T[]): T[] {
  return items;
}
```

### React 规范

#### 组件定义
```typescript
// ✅ 推荐: 函数组件 + TypeScript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div>
      <h3>{user.name}</h3>
      {onEdit && <button onClick={() => onEdit(user)}>编辑</button>}
    </div>
  );
};

// ❌ 避免: 类组件
class UserCard extends React.Component {}
```

#### Hooks 使用
```typescript
// ✅ 推荐: 自定义 Hook
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(id).then(setUser).finally(() => setLoading(false));
  }, [id]);

  return { user, loading };
}

// ✅ 推荐: Hook 依赖项
useEffect(() => {
  // 副作用
}, [dependency1, dependency2]);
```

### NestJS 规范

#### 模块结构
```typescript
// user.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

#### 控制器
```typescript
// user.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({ status: 200, type: [UserDto] })
  async findAll(@Query() query: FindUsersDto): Promise<UserDto[]> {
    return this.userService.findAll(query);
  }
}
```

#### 服务
```typescript
// user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }
}
```

### 代码格式化

#### ESLint 配置
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "react/prop-types": "off"
  }
}
```

#### Prettier 配置
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 🌿 Git 工作流

### 分支策略

```
main          - 生产环境分支
├── develop   - 开发环境分支
    ├── feature/xxx  - 功能分支
    ├── bugfix/xxx   - Bug 修复分支
    └── hotfix/xxx   - 紧急修复分支
```

### 分支命名规范

```bash
# 功能分支
feature/user-authentication
feature/product-search

# Bug 修复分支
bugfix/login-error
bugfix/cart-calculation

# 紧急修复分支
hotfix/security-patch
hotfix/payment-issue
```

### 提交信息规范

```bash
# 格式
<type>(<scope>): <subject>

# 类型
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式化
refactor: 代码重构
test:     测试相关
chore:    构建/工具相关

# 示例
feat(auth): 添加 2FA 双因素认证
fix(cart): 修复购物车数量计算错误
docs(api): 更新 API 文档
refactor(user): 重构用户服务
test(order): 添加订单创建测试
```

### 工作流程

```bash
# 1. 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 开发功能
# ... 编写代码 ...
git add .
git commit -m "feat(module): 添加新功能"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建 Pull Request
# 在 GitHub 上创建 PR，请求合并到 develop

# 5. 代码审查
# 团队成员审查代码

# 6. 合并到 develop
# PR 通过后合并

# 7. 删除功能分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

---

## 🧪 测试指南

### 单元测试

#### 前端测试 (Vitest)
```typescript
// user.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('应该渲染用户名称', () => {
    const user = { id: '1', name: 'John' };
    render(<UserCard user={user} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

#### 后端测试 (Jest)
```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('应该返回用户', async () => {
    const user = await service.findById('1');
    expect(user).toBeDefined();
    expect(user.id).toBe('1');
  });
});
```

### E2E 测试 (Playwright)
```typescript
// login.spec.ts
import { test, expect } from '@playwright/test';

test('用户登录', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await page.click('text=登录');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:5174/');
});
```

### 运行测试

```bash
# 前端单元测试
cd client
npm run test

# 后端单元测试
cd server
npm run test

# E2E 测试
cd e2e
npx playwright test

# 测试覆盖率
npm run test:cov
```

---

## 🐛 调试指南

### 前端调试

#### Chrome DevTools
```typescript
// 使用 console.log
console.log('用户数据:', user);

// 使用 debugger
function handleClick() {
  debugger; // 断点
  // ...
}

// React DevTools
// 安装 React DevTools 扩展
```

#### VS Code 调试配置
```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome",
  "url": "http://localhost:5174",
  "webRoot": "${workspaceFolder}/client/src"
}
```

### 后端调试

#### VS Code 调试配置
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "cwd": "${workspaceFolder}/server",
  "console": "integratedTerminal"
}
```

#### 日志调试
```typescript
// 使用 Winston 日志
this.logger.log('用户登录', { userId: user.id });
this.logger.error('登录失败', error);
this.logger.debug('调试信息', data);
```

---

## 📚 常用命令

### 开发命令
```bash
# 前端
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 代码检查
npm run test         # 运行测试

# 后端
npm run start:dev    # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 代码检查
npm run test         # 运行测试

# 数据库
npx prisma migrate dev      # 运行迁移
npx prisma db seed          # 运行种子数据
npx prisma studio           # 打开数据库管理界面
npx prisma generate         # 生成 Prisma Client
```

### Docker 命令
```bash
# 启动所有服务
docker-compose -f config/docker-compose.yml up -d

# 停止所有服务
docker-compose -f config/docker-compose.yml down

# 查看日志
docker-compose -f config/docker-compose.yml logs -f

# 重启服务
docker-compose -f config/docker-compose.yml restart
```

---

## 🔗 相关资源

- **API 文档**: [API.md](./API.md)
- **部署文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Swagger UI**: http://localhost:3001/api/docs
- **React 文档**: https://react.dev
- **NestJS 文档**: https://nestjs.com
- **Prisma 文档**: https://prisma.io

---

**最后更新**: 2026-03-12  
**维护者**: TopiVra 开发团队

