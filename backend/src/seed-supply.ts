import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const supplyCategories = [
    { code: 'FOOD', name: '食材公司', sortOrder: 1 },
    { code: 'TABLEWARE', name: '餐具公司', sortOrder: 2 },
    { code: 'KITCHENWARE', name: '厨具公司', sortOrder: 3 },
    { code: 'FURNITURE', name: '家具公司', sortOrder: 4 },
    { code: 'BRAND_PLANNING', name: '品牌策划公司', sortOrder: 5 },
    { code: 'DESIGN', name: '设计公司', sortOrder: 6 },
    { code: 'TRAINING', name: '培训公司', sortOrder: 7 },
    { code: 'RENT_TRANSFER', name: '出租转让', sortOrder: 8 },
    { code: 'SECOND_HAND', name: '二手市场', sortOrder: 9 },
    { code: 'INVESTMENT', name: '投资公司', sortOrder: 10 },
  ];
  for (const cat of supplyCategories) {
    await prisma.supplyCategory.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ 供应平台分类创建完成: ${supplyCategories.length} 个`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
