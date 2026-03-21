/**
 * 验证国际化数据库迁移
 * 检查多语言表是否正确创建
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 开始验证国际化数据库迁移...\n');

  try {
    // 1. 检查 product_translations 表
    console.log('1️⃣ 检查 product_translations 表...');
    const productTranslations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM product_translations
    `;
    console.log(`   ✅ 表存在，记录数: ${productTranslations[0].count}`);

    // 2. 检查 category_translations 表
    console.log('2️⃣ 检查 category_translations 表...');
    const categoryTranslations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM category_translations
    `;
    console.log(`   ✅ 表存在，记录数: ${categoryTranslations[0].count}`);

    // 3. 检查 blog_translations 表
    console.log('3️⃣ 检查 blog_translations 表...');
    const blogTranslations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM blog_translations
    `;
    console.log(`   ✅ 表存在，记录数: ${blogTranslations[0].count}`);

    // 4. 检查索引
    console.log('\n4️⃣ 检查索引...');
    const indexes = await prisma.$queryRaw`
      SELECT TABLE_NAME, INDEX_NAME 
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME LIKE '%translations%'
      GROUP BY TABLE_NAME, INDEX_NAME
    `;
    console.log(`   ✅ 找到 ${indexes.length} 个索引`);

    // 5. 测试插入和查询
    console.log('\n5️⃣ 测试数据操作...');
    
    // 查找第一个商品
    const firstProduct = await prisma.product.findFirst();
    
    if (firstProduct) {
      // 测试创建翻译
      const testTranslation = await prisma.productTranslation.upsert({
        where: {
          productId_language: {
            productId: firstProduct.id,
            language: 'en',
          },
        },
        create: {
          productId: firstProduct.id,
          language: 'en',
          title: 'Test Product',
          description: 'Test Description',
        },
        update: {
          title: 'Test Product',
          description: 'Test Description',
        },
      });
      console.log(`   ✅ 成功创建/更新测试翻译: ${testTranslation.id}`);

      // 测试查询
      const productWithTranslations = await prisma.product.findUnique({
        where: { id: firstProduct.id },
        include: {
          translations: true,
        },
      });
      console.log(`   ✅ 成功查询商品及翻译，翻译数: ${productWithTranslations.translations.length}`);
    } else {
      console.log('   ⚠️  没有商品数据，跳过测试');
    }

    // 6. 统计翻译完整性
    console.log('\n6️⃣ 统计翻译完整性...');
    const products = await prisma.product.findMany({
      include: {
        translations: true,
      },
    });

    const supportedLanguages = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];
    let totalTranslations = 0;
    let expectedTranslations = products.length * supportedLanguages.length;

    products.forEach(product => {
      totalTranslations += product.translations.length;
    });

    const completeness = (totalTranslations / expectedTranslations) * 100;
    console.log(`   📊 商品总数: ${products.length}`);
    console.log(`   📊 现有翻译: ${totalTranslations}`);
    console.log(`   📊 期望翻译: ${expectedTranslations}`);
    console.log(`   📊 完整度: ${completeness.toFixed(2)}%`);

    console.log('\n✅ 验证完成！数据库迁移成功！\n');

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('\n可能的原因:');
    console.error('1. 数据库迁移未执行');
    console.error('2. Prisma Client 未重新生成');
    console.error('3. 数据库连接失败\n');
    console.error('解决方法:');
    console.error('1. 运行: npx prisma generate');
    console.error('2. 运行: npx prisma migrate dev');
    console.error('3. 检查 DATABASE_URL 配置\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();








