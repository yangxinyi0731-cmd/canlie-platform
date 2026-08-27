import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const MIN_SEED_PASSWORD_BYTES = 16;

function resolveSeedPassword(environmentName: string): string {
  const configuredPassword = process.env[environmentName];

  if (configuredPassword) {
    if (Buffer.byteLength(configuredPassword, 'utf8') < MIN_SEED_PASSWORD_BYTES) {
      throw new Error(
        `${environmentName} must be at least ${MIN_SEED_PASSWORD_BYTES} bytes long.`,
      );
    }
    return configuredPassword;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${environmentName} is required when seeding production data.`);
  }

  console.warn(
    `⚠️ ${environmentName} is not set; using an unlogged random credential for this seed run.`,
  );
  return randomBytes(24).toString('base64url');
}

async function main() {
  // Resolve every required credential before the first database write so a
  // production seed cannot fail halfway through because one variable is absent.
  const [adminPassword, enterprisePassword, talentPassword] = await Promise.all([
    bcrypt.hash(resolveSeedPassword('SEED_ADMIN_PASSWORD'), 12),
    bcrypt.hash(resolveSeedPassword('SEED_ENTERPRISE_PASSWORD'), 12),
    bcrypt.hash(resolveSeedPassword('SEED_TALENT_PASSWORD'), 12),
  ]);

  console.log('🌱 Seeding database...');

  // Create admin user
  await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: { password: adminPassword },
    create: {
      phone: '13800000000',
      password: adminPassword,
      name: '平台管理员',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created: 13800000000');

  // ========== 一级菜系 (Level 1) ==========
  const level1Cuisines = [
    // 八大菜系
    { name: '湘菜', level: 1, sortOrder: 1 },
    { name: '川菜', level: 1, sortOrder: 2 },
    { name: '粤菜', level: 1, sortOrder: 3 },
    { name: '鲁菜', level: 1, sortOrder: 4 },
    { name: '苏菜', level: 1, sortOrder: 5 },
    { name: '浙菜', level: 1, sortOrder: 6 },
    { name: '闽菜', level: 1, sortOrder: 7 },
    { name: '徽菜', level: 1, sortOrder: 8 },
    // 以省为单位的菜系
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

  for (const c of level1Cuisines) {
    await prisma.cuisine.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }

  // ========== 二级菜系 (Level 2) ==========
  // 父菜系名称映射
  const cuisineMap: Record<string, { name: string; subCuisines: string[] }> = {
    '湘菜': { name: '湘菜', subCuisines: ['长沙菜', '衡东菜', '常德菜', '湘西菜', '岳阳菜', '浏阳菜', '湘潭菜', '株洲菜', '邵阳菜', '益阳菜', '郴州菜', '永州菜', '怀化菜', '娄底菜', '张家界菜'] },
    '川菜': { name: '川菜', subCuisines: ['成都菜', '重庆菜', '自贡盐帮菜', '乐山菜', '泸州菜', '宜宾菜', '绵阳菜', '达州菜', '南充菜', '内江菜', '眉山菜'] },
    '粤菜': { name: '粤菜', subCuisines: ['广州菜', '潮州菜', '客家菜', '顺德菜', '东莞菜', '湛江菜', '佛山菜', '深圳菜', '中山菜', '珠海菜'] },
    '鲁菜': { name: '鲁菜', subCuisines: ['济南菜', '青岛菜', '烟台菜', '潍坊菜', '淄博菜', '临沂菜', '泰安菜', '威海菜', '济宁菜'] },
    '苏菜': { name: '苏菜', subCuisines: ['南京菜', '扬州菜', '苏州菜', '无锡菜', '常州菜', '徐州菜', '淮安菜', '镇江菜', '南通菜', '盐城菜'] },
    '浙菜': { name: '浙菜', subCuisines: ['杭州菜', '宁波菜', '温州菜', '绍兴菜', '嘉兴菜', '湖州菜', '金华菜', '台州菜', '衢州菜', '舟山海鲜'] },
    '闽菜': { name: '闽菜', subCuisines: ['福州菜', '厦门菜', '泉州菜', '漳州菜', '莆田菜', '宁德菜', '龙岩菜', '三明菜'] },
    '徽菜': { name: '徽菜', subCuisines: ['合肥菜', '黄山菜', '芜湖菜', '安庆菜', '蚌埠菜', '阜阳菜', '淮南菜', '滁州菜'] },
    '云南菜': { name: '云南菜', subCuisines: ['昆明菜', '大理菜', '丽江菜', '西双版纳菜', '红河菜', '曲靖菜', '普洱菜', '腾冲菜', '过桥米线', '野生菌菜'] },
    '赣菜': { name: '赣菜', subCuisines: ['南昌菜', '九江菜', '景德镇菜', '赣州菜', '宜春菜', '萍乡菜', '上饶菜', '吉安菜'] },
    '贵州菜': { name: '贵州菜', subCuisines: ['贵阳菜', '遵义菜', '黔东南菜', '毕节菜', '六盘水菜', '安顺菜', '铜仁菜', '酸汤鱼'] },
    '东北菜': { name: '东北菜', subCuisines: ['哈尔滨菜', '长春菜', '沈阳菜', '大连海鲜', '吉林菜', '大庆菜', '齐齐哈尔烤肉', '延边朝鲜菜'] },
    '西北菜': { name: '西北菜', subCuisines: ['西安菜', '兰州牛肉面', '新疆菜', '宁夏菜', '青海菜', '陕西面食', '陕北菜', '关中菜'] },
    '湖北菜': { name: '湖北菜', subCuisines: ['武汉菜', '襄阳菜', '宜昌菜', '荆州菜', '黄冈菜', '十堰菜', '恩施土家菜', '潜江龙虾'] },
    '豫菜': { name: '豫菜', subCuisines: ['郑州菜', '洛阳菜', '开封菜', '南阳菜', '信阳菜', '安阳菜', '许昌菜', '商丘菜'] },
    '日料': { name: '日料', subCuisines: ['寿司', '刺身', '铁板烧', '天妇罗', '拉面', '烧鸟', '怀石料理', '居酒屋', '日式火锅'] },
    '西餐': { name: '西餐', subCuisines: ['法餐', '意大利菜', '西班牙菜', '美式西餐', '德式西餐', '牛排', '海鲜西餐', '地中海菜'] },
    '东南亚菜': { name: '东南亚菜', subCuisines: ['泰国菜', '越南菜', '新加坡菜', '马来西亚菜', '印尼菜', '菲律宾菜', '缅甸菜'] },
    '融合菜': { name: '融合菜', subCuisines: ['新派融合菜', '中西融合', '日法融合', '东南亚融合', '创意料理', '分子料理'] },
  };

  for (const [parentName, data] of Object.entries(cuisineMap)) {
    const parent = await prisma.cuisine.findFirst({ where: { name: parentName } });
    if (!parent) continue;

    for (let i = 0; i < data.subCuisines.length; i++) {
      const subName = data.subCuisines[i];
      await prisma.cuisine.upsert({
        where: { name: subName },
        update: { level: 2, parentId: parent.id, sortOrder: i + 1 },
        create: { name: subName, level: 2, parentId: parent.id, sortOrder: i + 1 },
      });
    }
    console.log(`✅ ${parentName} 二级菜系: ${data.subCuisines.length}个`);
  }

  // ========== 业态 ==========
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

  // ========== 岗位分类 ==========
  const jobCategories: { name: string; sortOrder: number; subCategories: string[] }[] = [
    {
      name: '厨师岗位', sortOrder: 1,
      subCategories: ['厨师长', '研发总监', '研发总厨', '行政总厨'],
    },
    {
      name: '运营岗位', sortOrder: 2,
      subCategories: ['店长', '运营经理', '运营总监', '副总经理', '总经理'],
    },
    {
      name: '人事岗位', sortOrder: 3,
      subCategories: ['HR经理', 'HR总监'],
    },
    {
      name: '财务岗位', sortOrder: 4,
      subCategories: ['财务经理', '财务总监'],
    },
    {
      name: '采购岗位', sortOrder: 5,
      subCategories: ['采购经理', '采购总监'],
    },
    {
      name: '加盟岗位', sortOrder: 6,
      subCategories: ['加盟经理', '加盟总监'],
    },
    {
      name: '市场开发岗位', sortOrder: 7,
      subCategories: ['开发经理', '开发总监'],
    },
  ];

  for (const cat of jobCategories) {
    const category = await prisma.jobCategory.upsert({
      where: { name: cat.name },
      update: { sortOrder: cat.sortOrder },
      create: { name: cat.name, sortOrder: cat.sortOrder },
    });

    for (let i = 0; i < cat.subCategories.length; i++) {
      const subName = cat.subCategories[i];
      await prisma.jobSubCategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name: subName } },
        update: { sortOrder: i + 1 },
        create: { categoryId: category.id, name: subName, sortOrder: i + 1 },
      });
    }
    console.log(`✅ ${cat.name}: ${cat.subCategories.length}个子分类`);
  }

  // ========== 中国城市数据（省会+地级市） ==========
  const chinaCities: { province: string; cities: string[] }[] = [
    { province: '北京市', cities: ['北京'] },
    { province: '上海市', cities: ['上海'] },
    { province: '天津市', cities: ['天津'] },
    { province: '重庆市', cities: ['重庆'] },
    { province: '河北省', cities: ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'] },
    { province: '山西省', cities: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'] },
    { province: '内蒙古', cities: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布'] },
    { province: '辽宁省', cities: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'] },
    { province: '吉林省', cities: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边'] },
    { province: '黑龙江省', cities: ['哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化'] },
    { province: '江苏省', cities: ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'] },
    { province: '浙江省', cities: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'] },
    { province: '安徽省', cities: ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'] },
    { province: '福建省', cities: ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'] },
    { province: '江西省', cities: ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'] },
    { province: '山东省', cities: ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'] },
    { province: '河南省', cities: ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店'] },
    { province: '湖北省', cities: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施'] },
    { province: '湖南省', cities: ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'] },
    { province: '广东省', cities: ['广州', '韶关', '深圳', '珠海', '汕头', '佛山', '江门', '湛江', '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮'] },
    { province: '广西', cities: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'] },
    { province: '海南省', cities: ['海口', '三亚', '三沙', '儋州'] },
    { province: '四川省', cities: ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳'] },
    { province: '贵州省', cities: ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南'] },
    { province: '云南省', cities: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆'] },
    { province: '西藏', cities: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲'] },
    { province: '陕西省', cities: ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛'] },
    { province: '甘肃省', cities: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南'] },
    { province: '青海省', cities: ['西宁', '海东'] },
    { province: '宁夏', cities: ['银川', '石嘴山', '吴忠', '固原', '中卫'] },
    { province: '新疆', cities: ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密'] },
  ];

  for (const province of chinaCities) {
    // 省会作为PROVINCE级别
    const capital = province.cities[0];
    await prisma.chinaCity.upsert({
      where: { name_province: { name: capital, province: province.province } },
      update: { level: 'PROVINCE', sortOrder: 1 },
      create: { name: capital, province: province.province, level: 'PROVINCE', sortOrder: 1 },
    });
    // 其他地级市
    for (let i = 1; i < province.cities.length; i++) {
      await prisma.chinaCity.upsert({
        where: { name_province: { name: province.cities[i], province: province.province } },
        update: { level: 'CITY', sortOrder: i + 1 },
        create: { name: province.cities[i], province: province.province, level: 'CITY', sortOrder: i + 1 },
      });
    }
    console.log(`✅ ${province.province}: ${province.cities.length}个城市`);
  }

  // ========== 演示企业用户 ==========
  const enterpriseUser = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: { password: enterprisePassword },
    create: {
      phone: '13800000001',
      password: enterprisePassword,
      name: '张经理',
      role: 'ENTERPRISE',
    },
  });

  await prisma.enterprise.upsert({
    where: { userId: enterpriseUser.id },
    update: {},
    create: {
      userId: enterpriseUser.id,
      companyName: '湘味轩餐饮集团',
      companySize: '200-500人',
      description: '专注湘菜20年，全国连锁品牌，拥有50+门店，覆盖湖南、广东、北京等多个省市',
      address: '长沙市岳麓区麓谷大道88号',
      city: '长沙',
      province: '湖南省',
      contactName: '张经理',
      contactPhone: '13800000001',
      status: 'APPROVED',
      licenseVerified: true,
    },
  });
  console.log('✅ Enterprise 1: 湘味轩餐饮集团');

  const enterprise2User = await prisma.user.upsert({
    where: { phone: '13800000002' },
    update: { password: enterprisePassword },
    create: {
      phone: '13800000002',
      password: enterprisePassword,
      name: '李总监',
      role: 'ENTERPRISE',
    },
  });

  await prisma.enterprise.upsert({
    where: { userId: enterprise2User.id },
    update: {},
    create: {
      userId: enterprise2User.id,
      companyName: '悦榕庄酒店',
      companySize: '500-2000人',
      description: '五星级度假酒店，高端餐饮服务，拥有中餐厅、西餐厅、日料餐厅等多个餐饮板块',
      address: '杭州市西湖区龙井路1号',
      city: '杭州',
      province: '浙江省',
      contactName: '李总监',
      contactPhone: '13800000002',
      status: 'APPROVED',
      licenseVerified: true,
    },
  });
  console.log('✅ Enterprise 2: 悦榕庄酒店');

  // 第三个企业 - 筹备阶段
  const enterprise3User = await prisma.user.upsert({
    where: { phone: '13800000003' },
    update: { password: enterprisePassword },
    create: {
      phone: '13800000003',
      password: enterprisePassword,
      name: '王总',
      role: 'ENTERPRISE',
    },
  });

  await prisma.enterprise.upsert({
    where: { userId: enterprise3User.id },
    update: {},
    create: {
      userId: enterprise3User.id,
      companyName: '星瀚餐饮管理有限公司（筹备中）',
      companySize: '50-200人',
      description: '初创餐饮品牌，主打新派融合菜，首店筹备中',
      address: '深圳市南山区科技园路88号',
      city: '深圳',
      province: '广东省',
      contactName: '王总',
      contactPhone: '13800000003',
      status: 'PENDING',
      isPreparation: true,
      notes: '筹备阶段品牌，计划2025年Q1开业',
    },
  });
  console.log('✅ Enterprise 3: 星瀚餐饮-筹备阶段');

  // ========== 获取引用数据ID ==========
  const hunanCuisine = await prisma.cuisine.findFirst({ where: { name: '湘菜' } });
  const sichuanCuisine = await prisma.cuisine.findFirst({ where: { name: '川菜' } });
  const yueCuisine = await prisma.cuisine.findFirst({ where: { name: '粤菜' } });
  const socialDining = await prisma.businessType.findFirst({ where: { name: '社会餐饮' } });
  const hotelDining = await prisma.businessType.findFirst({ where: { name: '酒店餐饮' } });
  const highEnd = await prisma.businessType.findFirst({ where: { name: '高端餐饮' } });
  const chain = await prisma.businessType.findFirst({ where: { name: '连锁餐饮' } });

  // 岗位分类ID
  const chefCategory = await prisma.jobCategory.findFirst({ where: { name: '厨师岗位' } });
  const opsCategory = await prisma.jobCategory.findFirst({ where: { name: '运营岗位' } });

  // ========== 创建职位 ==========
  const jobs = [
    {
      enterpriseId: (await prisma.enterprise.findFirst({ where: { companyName: '湘味轩餐饮集团' } }))!.id,
      title: '行政总厨',
      department: '厨房部',
      jobCategoryId: chefCategory?.id,
      minSalary: 25000,
      maxSalary: 40000,
      salaryMonth: 14,
      city: '长沙',
      province: '湖南省',
      district: '岳麓区',
      address: '麓谷大道88号湘味轩总部',
      businessTypeIds: socialDining?.id || '',
      cuisineIds: hunanCuisine?.id || '',
      description: '1. 负责整个集团的菜品研发、厨房管理、成本控制等工作\n2. 管理50+门店的厨房团队，制定标准化出品流程\n3. 定期推出新菜品，保持品牌创新力',
      requirements: '1. 10年以上湘菜经验\n2. 有连锁餐饮管理经验\n3. 熟悉成本控制和标准化管理\n4. 良好的团队管理能力',
      ageMin: 35,
      ageMax: 50,
      educationReq: '大专',
      experienceReq: 10,
      headcount: 1,
      openPartner: true,
    },
    {
      enterpriseId: (await prisma.enterprise.findFirst({ where: { companyName: '湘味轩餐饮集团' } }))!.id,
      title: '厨师长',
      department: '厨房部',
      jobCategoryId: chefCategory?.id,
      minSalary: 15000,
      maxSalary: 25000,
      salaryMonth: 13,
      city: '长沙',
      province: '湖南省',
      district: '芙蓉区',
      address: '五一广场店',
      businessTypeIds: [socialDining?.id, chain?.id].filter(Boolean).join(','),
      cuisineIds: hunanCuisine?.id || '',
      description: '负责门店厨房日常运营，菜品出品质量控制，团队管理',
      requirements: '1. 5年以上湘菜经验\n2. 有厨师长任职经历\n3. 熟悉湘菜各分支菜系',
      ageMin: 28,
      ageMax: 45,
      educationReq: '中专',
      experienceReq: 5,
      headcount: 3,
    },
    {
      enterpriseId: (await prisma.enterprise.findFirst({ where: { companyName: '悦榕庄酒店' } }))!.id,
      title: '餐饮总监',
      department: '餐饮部',
      jobCategoryId: opsCategory?.id,
      minSalary: 30000,
      maxSalary: 50000,
      salaryMonth: 15,
      city: '杭州',
      province: '浙江省',
      district: '西湖区',
      address: '龙井路1号悦榕庄',
      businessTypeIds: [hotelDining?.id, highEnd?.id].filter(Boolean).join(','),
      cuisineIds: '',
      description: '负责酒店餐饮部门整体运营管理，包括中餐厅、西餐厅、日料餐厅、大堂吧等多个餐饮点',
      requirements: '1. 8年以上高端餐饮或酒店餐饮管理经验\n2. 有五星级酒店工作经验优先\n3. 熟悉多种菜系管理\n4. 优秀的跨部门协调能力',
      ageMin: 35,
      ageMax: 50,
      educationReq: '本科',
      experienceReq: 8,
      headcount: 1,
      openPartner: true,
    },
    {
      enterpriseId: (await prisma.enterprise.findFirst({ where: { companyName: '悦榕庄酒店' } }))!.id,
      title: '中餐主厨',
      department: '中餐厅',
      jobCategoryId: chefCategory?.id,
      minSalary: 18000,
      maxSalary: 28000,
      salaryMonth: 13,
      city: '杭州',
      province: '浙江省',
      district: '西湖区',
      address: '悦榕庄中餐厅',
      businessTypeIds: hotelDining?.id || '',
      cuisineIds: [sichuanCuisine?.id, yueCuisine?.id].filter(Boolean).join(','),
      description: '负责中餐厅菜品研发和出品，主打川菜和粤菜',
      requirements: '1. 6年以上高端餐饮经验\n2. 精通川菜或粤菜\n3. 有菜品创新能力',
      ageMin: 30,
      ageMax: 45,
      educationReq: '中专',
      experienceReq: 6,
      headcount: 2,
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }
  console.log(`✅ ${jobs.length}个职位创建完成`);

  // ========== 演示人才用户 ==========
  const talentsData = [
    {
      phone: '13900000001',
      name: '王大厨',
      realName: '王建国',
      gender: 'MALE',
      birthYear: 1980,
      birthMonth: 3,
      idNumber: '430103198003150011',
      city: '长沙',
      province: '湖南省',
      email: 'wangjianguo@example.com',
      title: '行政总厨',
      jobCategoryId: chefCategory?.id,
      currentCompany: '某连锁湘菜品牌',
      minSalary: 25000,
      maxSalary: 40000,
      workYears: 15,
      education: '大专',
      maritalStatus: 'MARRIED',
      hasChildren: true,
      hometown: '湖南衡阳',
      hometownProvince: '湖南省',
      cuisineIds: hunanCuisine?.id || '',
      businessTypeIds: [socialDining?.id, chain?.id].filter(Boolean).join(','),
      starLevel: 5,
      starLevelStr: '五星',
      brandEndorsement: '曾任某知名湘菜品牌总厨，该品牌在全国有100+门店',
      selfIntro: '15年湘菜经验，擅长菜品研发和团队管理，精通长沙菜、衡东菜、常德菜等多个湘菜分支。曾带领团队获得全国烹饪大赛金奖。',
      workExperiences: [
        { companyName: '湘味楼餐饮集团', position: '行政总厨', startYear: 2018, startMonth: 3, endYear: 2024, endMonth: 6, isCurrent: false, description: '负责集团菜品研发和厨房管理，管理30+门店厨房团队', bgRefName: '刘老板', bgRefTitle: '集团董事长', bgRefPhone: '13800000005' },
        { companyName: '长沙老湘菜馆', position: '厨师长', startYear: 2012, startMonth: 5, endYear: 2018, endMonth: 2, isCurrent: false, description: '负责门店厨房运营管理，带领20人团队', bgRefName: '陈总', bgRefTitle: '餐厅老板', bgRefPhone: '13800000006' },
        { companyName: '衡阳大酒店', position: '主厨', startYear: 2006, startMonth: 8, endYear: 2012, endMonth: 4, isCurrent: false, description: '负责中餐部菜品出品', bgRefName: '赵经理', bgRefTitle: '餐饮总监', bgRefPhone: '13800000007' },
      ],
    },
    {
      phone: '13900000002',
      name: '刘厨师长',
      realName: '刘明',
      gender: 'MALE',
      birthYear: 1985,
      birthMonth: 8,
      idNumber: '430602198508120012',
      city: '长沙',
      province: '湖南省',
      email: 'liuming@example.com',
      title: '厨师长',
      jobCategoryId: chefCategory?.id,
      currentCompany: '某湘菜连锁',
      minSalary: 15000,
      maxSalary: 25000,
      workYears: 10,
      education: '中专',
      maritalStatus: 'MARRIED',
      hasChildren: false,
      hometown: '湖南岳阳',
      hometownProvince: '湖南省',
      cuisineIds: hunanCuisine?.id || '',
      businessTypeIds: socialDining?.id || '',
      starLevel: 4,
      starLevelStr: '四星',
      selfIntro: '10年湘菜经验，擅长衡东菜、岳阳菜。曾在多家知名湘菜馆担任厨师长。',
      workExperiences: [
        { companyName: '岳阳楼餐饮', position: '厨师长', startYear: 2019, startMonth: 6, endYear: undefined, endMonth: undefined, isCurrent: true, description: '负责门店厨房全面管理', bgRefName: '黄总', bgRefTitle: '总经理', bgRefPhone: '13900000001' },
        { companyName: '湘江春酒楼', position: '副厨师长', startYear: 2015, startMonth: 3, endYear: 2019, endMonth: 5, isCurrent: false, description: '协助厨师长管理厨房团队', bgRefName: '周师傅', bgRefTitle: '行政总厨', bgRefPhone: '13900000002' },
      ],
    },
    {
      phone: '13900000003',
      name: '陈总监',
      realName: '陈伟',
      gender: 'MALE',
      birthYear: 1978,
      birthMonth: 11,
      idNumber: '330102197811150013',
      city: '杭州',
      province: '浙江省',
      email: 'chenwei@example.com',
      title: '餐饮总监',
      jobCategoryId: opsCategory?.id,
      currentCompany: '某五星级酒店',
      minSalary: 30000,
      maxSalary: 50000,
      workYears: 12,
      education: '本科',
      maritalStatus: 'MARRIED',
      hasChildren: true,
      hometown: '浙江杭州',
      hometownProvince: '浙江省',
      cuisineIds: '',
      businessTypeIds: [hotelDining?.id, highEnd?.id].filter(Boolean).join(','),
      starLevel: 5,
      starLevelStr: '五星',
      brandEndorsement: '曾任多家五星级酒店餐饮总监，拥有丰富的酒店餐饮管理经验',
      selfIntro: '12年高端餐饮管理经验，精通酒店餐饮运营。成功筹备并运营多个星级酒店餐饮项目。',
      workExperiences: [
        { companyName: '杭州国际大酒店', position: '餐饮总监', startYear: 2018, startMonth: 1, endYear: undefined, endMonth: undefined, isCurrent: true, description: '全面负责酒店餐饮部门运营', bgRefName: '林总', bgRefTitle: '酒店总经理', bgRefPhone: '13900000003' },
        { companyName: '上海外滩酒店', position: '餐饮副总监', startYear: 2014, startMonth: 6, endYear: 2017, endMonth: 12, isCurrent: false, description: '协助餐饮总监管理酒店餐饮', bgRefName: '吴总监', bgRefTitle: '餐饮部总监', bgRefPhone: '13900000004' },
      ],
    },
    {
      phone: '13900000004',
      name: '赵主厨',
      realName: '赵强',
      gender: 'MALE',
      birthYear: 1982,
      birthMonth: 6,
      idNumber: '510107198206150014',
      city: '杭州',
      province: '浙江省',
      email: 'zhaoqiang@example.com',
      title: '中餐主厨',
      jobCategoryId: chefCategory?.id,
      currentCompany: '某高端餐厅',
      minSalary: 18000,
      maxSalary: 28000,
      workYears: 8,
      education: '中专',
      maritalStatus: 'SINGLE',
      hasChildren: false,
      hometown: '四川成都',
      hometownProvince: '四川省',
      cuisineIds: sichuanCuisine?.id || '',
      businessTypeIds: hotelDining?.id || '',
      starLevel: 4,
      starLevelStr: '四星',
      selfIntro: '8年川菜经验，擅长创新融合。精通传统川菜和新派川菜，有丰富的酒店中餐经验。',
      workExperiences: [
        { companyName: '成都锦江饭店', position: '川菜主厨', startYear: 2018, startMonth: 9, endYear: undefined, endMonth: undefined, isCurrent: true, description: '负责川菜部菜品研发和出品', bgRefName: '钱经理', bgRefTitle: '餐饮经理', bgRefPhone: '13900000005' },
        { companyName: '重庆火锅城', position: '厨师', startYear: 2015, startMonth: 3, endYear: 2018, endMonth: 8, isCurrent: false, description: '负责火锅底料研发和菜品制作', bgRefName: '孙老板', bgRefTitle: '店长', bgRefPhone: '13900000006' },
      ],
    },
  ];

  for (const t of talentsData) {
    const { workExperiences, phone: _phone, name: _name, ...talentFields } = t;
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
      update: talentFields,
      create: { userId: user.id, ...talentFields },
    });

    // 创建工作经历
    const talent = await prisma.talent.findUnique({ where: { userId: user.id } });
    if (talent) {
      // 先清除旧的工作经历
      await prisma.workExperience.deleteMany({ where: { talentId: talent.id } });
      for (const exp of workExperiences) {
        await prisma.workExperience.create({
          data: {
            talentId: talent.id,
            companyName: exp.companyName,
            position: exp.position,
            startYear: exp.startYear,
            startMonth: exp.startMonth,
            endYear: exp.endYear || null,
            endMonth: exp.endMonth || null,
            isCurrent: exp.isCurrent,
            description: exp.description,
            bgRefName: exp.bgRefName,
            bgRefTitle: exp.bgRefTitle,
            bgRefPhone: exp.bgRefPhone,
          },
        });
      }
    }
    console.log(`✅ ${t.name} (${t.realName}): ${workExperiences.length}条工作经历`);
  }

  // ========== 付费方案 ==========
  const plans = [
    { name: '月度VIP', type: 'MONTHLY', price: 299, jobQuota: 10, durationDays: 30, sortOrder: 1 },
    { name: '季度VIP', type: 'QUARTERLY', price: 699, jobQuota: 30, durationDays: 90, sortOrder: 2 },
    { name: '年度VIP', type: 'YEARLY', price: 1999, jobQuota: -1, durationDays: 365, sortOrder: 3 },
    { name: '单岗位发布', type: 'PER_JOB', price: 99, jobQuota: 1, durationDays: 30, sortOrder: 4 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.type }, // 用type作为唯一标识会失败，改用 create 循环
      update: plan,
      create: { id: plan.type, ...plan },
    });
  }
  console.log('✅ 付费方案创建完成');

  // ========== 人才星级评定标准 ==========
  const starCriteria = [
    {
      starLevel: 0,
      starName: '普通',
      minWorkYears: 0,
      description: '基础人才，信息有待完善',
      requirements: JSON.stringify([
        '完成基本简历信息填写',
        '无硬性工作经验要求',
        '平台将帮助您完善资料以获得更高星级',
      ]),
    },
    {
      starLevel: 3,
      starName: '三星人才',
      minWorkYears: 3,
      description: '具备3年以上餐饮行业工作经验，有一定专业能力',
      requirements: JSON.stringify([
        '3年以上餐饮行业工作经验',
        '有知名餐饮品牌或酒店任职经历',
        '至少1份工作背景调查通过',
        '完成实名认证',
        '简历完整度 ≥ 70%',
      ]),
    },
    {
      starLevel: 4,
      starName: '四星人才',
      minWorkYears: 5,
      description: '具备5年以上经验，有管理岗位任职经历',
      requirements: JSON.stringify([
        '5年以上餐饮行业工作经验',
        '担任过管理岗位（厨师长、经理等）',
        '头部餐饮品牌或星级酒店任职经历',
        '至少2份工作经历有完整的背景调查',
        '有品牌背书或获奖经历',
        '简历完整度 ≥ 85%',
      ]),
    },
    {
      starLevel: 5,
      starName: '五星人才',
      minWorkYears: 8,
      description: '行业资深人才，具备丰富管理经验和行业影响力',
      requirements: JSON.stringify([
        '8年以上餐饮行业工作经验',
        '担任过高级管理岗位（行政总厨、餐饮总监等）',
        '有行业知名品牌核心管理经历',
        '有成功项目经验（筹备开业、菜品体系搭建等）',
        '多项行业认证或权威奖项',
        '至少3份工作经历有完整的背景调查且核实通过',
        '简历完整度 ≥ 95%',
      ]),
    },
    {
      starLevel: 6,
      starName: '金牌人才',
      minWorkYears: 10,
      description: '行业标杆级人才，具备卓越的行业成就和影响力',
      requirements: JSON.stringify([
        '10年以上餐饮行业工作经验',
        '担任过集团级高管职位（集团总厨、副总裁等）',
        '米其林/黑珍珠等顶级品牌核心人物',
        '行业公认的技术权威或管理专家',
        '有行业影响力（协会任职、媒体曝光、行业评委等）',
        '所有工作经历背景调查全部通过',
        '通过平台专家评审委员会评审',
        '简历完整度 100%',
      ]),
    },
  ];

  for (const criteria of starCriteria) {
    await prisma.starCriteria.upsert({
      where: { starLevel: criteria.starLevel },
      update: criteria,
      create: criteria,
    });
  }
  console.log('✅ 人才星级评定标准创建完成');

  // ========== 供应平台分类 ==========
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
  console.log('✅ 供应平台分类创建完成');

  console.log('🎉 Seed completed!');
  console.log('');
  console.log('📋 Seed credentials were not printed; distribute configured credentials securely.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
