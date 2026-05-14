import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      phone: '13800000000',
      password: adminPassword,
      name: '平台管理员',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created: 13800000000 / admin123');

  // Seed cuisines (一级菜系)
  const cuisines = [
    // Level 1 - Major cuisines
    { name: '湘菜', level: 1, sortOrder: 1 },
    { name: '川菜', level: 1, sortOrder: 2 },
    { name: '粤菜', level: 1, sortOrder: 3 },
    { name: '鲁菜', level: 1, sortOrder: 4 },
    { name: '苏菜', level: 1, sortOrder: 5 },
    { name: '浙菜', level: 1, sortOrder: 6 },
    { name: '闽菜', level: 1, sortOrder: 7 },
    { name: '徽菜', level: 1, sortOrder: 8 },
    { name: '云南菜', level: 1, sortOrder: 9 },
    { name: '赣菜', level: 1, sortOrder: 10 },
    { name: '贵州菜', level: 1, sortOrder: 11 },
    { name: '东北菜', level: 1, sortOrder: 12 },
    { name: '西北菜', level: 1, sortOrder: 13 },
    { name: '湖北菜', level: 1, sortOrder: 14 },
    { name: '豫菜', level: 1, sortOrder: 15 },
    { name: '日料', level: 1, sortOrder: 16 },
    { name: '西餐', level: 1, sortOrder: 17 },
    { name: '东南亚菜', level: 1, sortOrder: 18 },
    { name: '融合菜', level: 1, sortOrder: 19 },
  ];

  for (const c of cuisines) {
    await prisma.cuisine.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }

  // Level 2 - Hunan cuisine sub-categories
  const hunanSubCuisines = [
    { name: '长沙菜', level: 2, sortOrder: 1 },
    { name: '衡东菜', level: 2, sortOrder: 2 },
    { name: '常德菜', level: 2, sortOrder: 3 },
    { name: '湘西菜', level: 2, sortOrder: 4 },
    { name: '岳阳菜', level: 2, sortOrder: 5 },
    { name: '浏阳菜', level: 2, sortOrder: 6 },
  ];

  for (const c of hunanSubCuisines) {
    await prisma.cuisine.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }

  // Seed business types
  const businessTypes = [
    { name: '社会餐饮', sortOrder: 1 },
    { name: '高端餐饮', sortOrder: 2 },
    { name: '酒店餐饮', sortOrder: 3 },
    { name: '团膳/食堂', sortOrder: 4 },
    { name: '茶饮', sortOrder: 5 },
    { name: '烘焙', sortOrder: 6 },
    { name: '咖啡', sortOrder: 7 },
    { name: '小吃快餐', sortOrder: 8 },
    { name: '火锅', sortOrder: 9 },
    { name: '食品工厂', sortOrder: 10 },
    { name: '酒吧', sortOrder: 11 },
    { name: '中央厨房', sortOrder: 12 },
    { name: '连锁餐饮', sortOrder: 13 },
    { name: '星级酒店', sortOrder: 14 },
  ];

  for (const bt of businessTypes) {
    await prisma.businessType.upsert({
      where: { name: bt.name },
      update: bt,
      create: bt,
    });
  }

  // 创建演示企业用户和职位
  const enterprisePassword = await bcrypt.hash('enterprise123', 10);
  const enterpriseUser = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      phone: '13800000001',
      password: enterprisePassword,
      name: '张经理',
      role: 'ENTERPRISE',
    },
  });

  const enterprise = await prisma.enterprise.upsert({
    where: { userId: enterpriseUser.id },
    update: {},
    create: {
      userId: enterpriseUser.id,
      companyName: '湘味轩餐饮集团',
      companySize: '200-500',
      description: '专注湘菜20年，全国连锁品牌，拥有50+门店',
      address: '长沙市岳麓区麓谷大道88号',
      city: '长沙',
      contactName: '张经理',
      contactPhone: '13800000001',
      status: 'APPROVED',
      licenseVerified: true,
    },
  });
  console.log('✅ Enterprise created: 13800000001 / enterprise123');

  // 创建第二个企业
  const enterprise2User = await prisma.user.upsert({
    where: { phone: '13800000002' },
    update: {},
    create: {
      phone: '13800000002',
      password: enterprisePassword,
      name: '李总监',
      role: 'ENTERPRISE',
    },
  });

  const enterprise2 = await prisma.enterprise.upsert({
    where: { userId: enterprise2User.id },
    update: {},
    create: {
      userId: enterprise2User.id,
      companyName: '悦榕庄酒店',
      companySize: '500-2000',
      description: '五星级度假酒店，高端餐饮服务',
      address: '杭州市西湖区龙井路1号',
      city: '杭州',
      contactName: '李总监',
      contactPhone: '13800000002',
      status: 'APPROVED',
      licenseVerified: true,
    },
  });
  console.log('✅ Enterprise2 created: 13800000002 / enterprise123');

  // 获取菜系和业态ID
  const hunanCuisine = await prisma.cuisine.findFirst({ where: { name: '湘菜' } });
  const sichuanCuisine = await prisma.cuisine.findFirst({ where: { name: '川菜' } });
  const socialDining = await prisma.businessType.findFirst({ where: { name: '社会餐饮' } });
  const hotelDining = await prisma.businessType.findFirst({ where: { name: '酒店餐饮' } });

  // 创建职位
  const jobs = [
    {
      enterpriseId: enterprise.id,
      title: '行政总厨',
      department: '厨房部',
      minSalary: 25000,
      maxSalary: 40000,
      salaryMonth: 14,
      city: '长沙',
      district: '岳麓区',
      address: '麓谷大道88号湘味轩总部',
      businessTypeIds: socialDining?.id || '',
      cuisineIds: hunanCuisine?.id || '',
      description: '负责整个集团的菜品研发、厨房管理、成本控制等工作',
      requirements: '10年以上湘菜经验，有连锁餐饮管理经验，熟悉成本控制',
      ageMin: 35,
      ageMax: 50,
      educationReq: 'BACHELOR',
      experienceReq: 10,
      headcount: 1,
      openPartner: true,
    },
    {
      enterpriseId: enterprise.id,
      title: '厨师长',
      department: '厨房部',
      minSalary: 15000,
      maxSalary: 25000,
      salaryMonth: 13,
      city: '长沙',
      district: '芙蓉区',
      address: '五一广场店',
      businessTypeIds: socialDining?.id || '',
      cuisineIds: hunanCuisine?.id || '',
      description: '负责门店厨房日常运营，菜品出品质量控制',
      requirements: '5年以上湘菜经验，有厨师长任职经历',
      ageMin: 28,
      ageMax: 45,
      educationReq: 'ASSOCIATE',
      experienceReq: 5,
      headcount: 3,
    },
    {
      enterpriseId: enterprise2.id,
      title: '餐饮总监',
      department: '餐饮部',
      minSalary: 30000,
      maxSalary: 50000,
      salaryMonth: 15,
      city: '杭州',
      district: '西湖区',
      address: '龙井路1号悦榕庄',
      businessTypeIds: hotelDining?.id || '',
      cuisineIds: '',
      description: '负责酒店餐饮部门整体运营管理',
      requirements: '8年以上高端餐饮或酒店餐饮管理经验',
      ageMin: 35,
      ageMax: 50,
      educationReq: 'BACHELOR',
      experienceReq: 8,
      headcount: 1,
      openPartner: true,
    },
    {
      enterpriseId: enterprise2.id,
      title: '中餐主厨',
      department: '中餐厅',
      minSalary: 18000,
      maxSalary: 28000,
      salaryMonth: 13,
      city: '杭州',
      district: '西湖区',
      address: '悦榕庄中餐厅',
      businessTypeIds: hotelDining?.id || '',
      cuisineIds: sichuanCuisine?.id || '',
      description: '负责中餐厅菜品研发和出品',
      requirements: '6年以上高端餐饮经验，精通川菜或粤菜',
      ageMin: 30,
      ageMax: 45,
      educationReq: 'ASSOCIATE',
      experienceReq: 6,
      headcount: 2,
    },
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { id: '' }, // always create new
      update: {},
      create: job,
    });
  }
  console.log('✅ Jobs created: 4 positions');

  // 创建演示人才用户
  const talentPassword = await bcrypt.hash('talent123', 10);
  const talents = [
    {
      phone: '13900000001',
      name: '王大厨',
      realName: '王建国',
      gender: 'MALE',
      birthYear: 1980,
      city: '长沙',
      title: '行政总厨',
      currentCompany: '某连锁湘菜品牌',
      minSalary: 25000,
      maxSalary: 40000,
      workYears: 15,
      education: 'BACHELOR',
      maritalStatus: 'MARRIED',
      hasChildren: true,
      hometown: '湖南衡阳',
      cuisineIds: hunanCuisine?.id || '',
      businessTypeIds: socialDining?.id || '',
      starLevel: 5,
      starLevelStr: '五星',
      brandEndorsement: '曾任某知名湘菜品牌总厨',
      selfIntro: '15年湘菜经验，擅长菜品研发和团队管理',
    },
    {
      phone: '13900000002',
      name: '刘厨师长',
      realName: '刘明',
      gender: 'MALE',
      birthYear: 1985,
      city: '长沙',
      title: '厨师长',
      currentCompany: '某湘菜连锁',
      minSalary: 15000,
      maxSalary: 25000,
      workYears: 10,
      education: 'ASSOCIATE',
      maritalStatus: 'MARRIED',
      hasChildren: false,
      hometown: '湖南岳阳',
      cuisineIds: hunanCuisine?.id || '',
      businessTypeIds: socialDining?.id || '',
      starLevel: 4,
      starLevelStr: '四星',
      selfIntro: '10年湘菜经验，擅长衡东菜系',
    },
    {
      phone: '13900000003',
      name: '陈总监',
      realName: '陈伟',
      gender: 'MALE',
      birthYear: 1978,
      city: '杭州',
      title: '餐饮总监',
      currentCompany: '某五星级酒店',
      minSalary: 30000,
      maxSalary: 50000,
      workYears: 12,
      education: 'BACHELOR',
      maritalStatus: 'MARRIED',
      hasChildren: true,
      hometown: '浙江杭州',
      cuisineIds: '',
      businessTypeIds: hotelDining?.id || '',
      starLevel: 5,
      starLevelStr: '五星',
      brandEndorsement: '曾任多家五星级酒店餐饮总监',
      selfIntro: '12年高端餐饮管理经验，精通酒店餐饮运营',
    },
    {
      phone: '13900000004',
      name: '赵主厨',
      realName: '赵强',
      gender: 'MALE',
      birthYear: 1982,
      city: '杭州',
      title: '中餐主厨',
      currentCompany: '某高端餐厅',
      minSalary: 18000,
      maxSalary: 28000,
      workYears: 8,
      education: 'ASSOCIATE',
      maritalStatus: 'SINGLE',
      hasChildren: false,
      hometown: '四川成都',
      cuisineIds: sichuanCuisine?.id || '',
      businessTypeIds: hotelDining?.id || '',
      starLevel: 4,
      starLevelStr: '四星',
      selfIntro: '8年川菜经验，擅长创新融合',
    },
  ];

  for (const t of talents) {
    const user = await prisma.user.upsert({
      where: { phone: t.phone },
      update: { password: talentPassword, name: t.name },
      create: {
        phone: t.phone,
        password: talentPassword,
        name: t.name,
        role: 'TALENT',
      },
    });

    await prisma.talent.upsert({
      where: { userId: user.id },
      update: {
        realName: t.realName,
        gender: t.gender,
        birthYear: t.birthYear,
        city: t.city,
        title: t.title,
        currentCompany: t.currentCompany,
        minSalary: t.minSalary,
        maxSalary: t.maxSalary,
        workYears: t.workYears,
        education: t.education,
        maritalStatus: t.maritalStatus,
        hasChildren: t.hasChildren,
        hometown: t.hometown,
        cuisineIds: t.cuisineIds,
        businessTypeIds: t.businessTypeIds,
        starLevel: t.starLevel,
        starLevelStr: t.starLevelStr,
        brandEndorsement: t.brandEndorsement,
        selfIntro: t.selfIntro,
      },
      create: {
        userId: user.id,
        realName: t.realName,
        gender: t.gender,
        birthYear: t.birthYear,
        city: t.city,
        title: t.title,
        currentCompany: t.currentCompany,
        minSalary: t.minSalary,
        maxSalary: t.maxSalary,
        workYears: t.workYears,
        education: t.education,
        maritalStatus: t.maritalStatus,
        hasChildren: t.hasChildren,
        hometown: t.hometown,
        cuisineIds: t.cuisineIds,
        businessTypeIds: t.businessTypeIds,
        starLevel: t.starLevel,
        starLevelStr: t.starLevelStr,
        brandEndorsement: t.brandEndorsement,
        selfIntro: t.selfIntro,
      },
    });
  }
  console.log('✅ Talents created: 4 candidates (phone: 13900000001-04, password: talent123)');

  console.log('✅ Cuisines and business types seeded');
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
