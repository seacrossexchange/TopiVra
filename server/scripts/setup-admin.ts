import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 开始设置管理员账号...\n');

  // 查找第一个用户
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    include: {
      roles: true,
    },
  });

  if (!firstUser) {
    console.log('❌ 没有找到任何用户，请先注册一个账号');
    return;
  }

  console.log(`📧 找到用户: ${firstUser.email} (${firstUser.username})`);
  console.log(`🆔 用户ID: ${firstUser.id}`);
  console.log(`📅 注册时间: ${firstUser.createdAt}`);
  console.log(`👤 当前角色: ${firstUser.roles.map(r => r.role).join(', ')}\n`);

  // 检查是否已经是管理员
  const hasAdminRole = firstUser.roles.some(r => r.role === 'ADMIN');

  if (hasAdminRole) {
    console.log('✅ 该用户已经是管理员了！');
    return;
  }

  // 添加管理员角色
  await prisma.userRole.create({
    data: {
      userId: firstUser.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ 成功添加管理员角色！');
  console.log('\n管理员账号信息：');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 邮箱: ${firstUser.email}`);
  console.log(`👤 用户名: ${firstUser.username}`);
  console.log(`🔑 角色: ADMIN, ${firstUser.roles.map(r => r.role).join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 提示: 使用此账号登录即可访问管理员后台 (/admin)');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




