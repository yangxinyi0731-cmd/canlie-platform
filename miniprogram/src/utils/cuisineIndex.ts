export interface CuisineOption {
  id: string
  name: string
  level?: number
  sortOrder?: number
}

export interface CuisineSection {
  initial: string
  items: CuisineOption[]
}

// 后端 seed 中明确标记的八大菜系。顺序沿用业务数据的 sortOrder，
// 不根据职位数量临时改变，避免每次打开筛选时入口跳动。
export const HOT_CUISINE_NAMES = ['湘菜', '川菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜'] as const

// 小程序端不引入整套拼音依赖，只维护菜系参考数据可能出现的首字映射。
// 新增未知菜系时会稳定落到「#」组，不会被遗漏。
const CUISINE_INITIAL_BY_FIRST_CHARACTER: Record<string, string> = {
  阿: 'A',
  安: 'A',
  蚌: 'B',
  毕: 'B',
  长: 'C',
  常: 'C',
  潮: 'C',
  川: 'C',
  刺: 'C',
  创: 'C',
  郴: 'C',
  滁: 'C',
  成: 'C',
  大: 'D',
  达: 'D',
  德: 'D',
  地: 'D',
  东: 'D',
  恩: 'E',
  法: 'F',
  菲: 'F',
  佛: 'F',
  福: 'F',
  阜: 'F',
  分: 'F',
  赣: 'G',
  广: 'G',
  贵: 'G',
  过: 'G',
  关: 'G',
  哈: 'H',
  海: 'H',
  杭: 'H',
  合: 'H',
  衡: 'H',
  红: 'H',
  湖: 'H',
  怀: 'H',
  淮: 'H',
  黄: 'H',
  徽: 'H',
  吉: 'J',
  济: 'J',
  嘉: 'J',
  江: 'J',
  金: 'J',
  景: 'J',
  荆: 'J',
  居: 'J',
  九: 'J',
  开: 'K',
  客: 'K',
  昆: 'K',
  乐: 'L',
  兰: 'L',
  拉: 'L',
  丽: 'L',
  临: 'L',
  龙: 'L',
  鲁: 'L',
  洛: 'L',
  娄: 'L',
  泸: 'L',
  浏: 'L',
  六: 'L',
  马: 'M',
  美: 'M',
  眉: 'M',
  闽: 'M',
  绵: 'M',
  缅: 'M',
  南: 'N',
  内: 'N',
  宁: 'N',
  牛: 'N',
  莆: 'P',
  普: 'P',
  萍: 'P',
  潜: 'Q',
  青: 'Q',
  曲: 'Q',
  衢: 'Q',
  泉: 'Q',
  齐: 'Q',
  黔: 'Q',
  日: 'R',
  融: 'R',
  三: 'S',
  商: 'S',
  烧: 'S',
  绍: 'S',
  邵: 'S',
  深: 'S',
  沈: 'S',
  十: 'S',
  寿: 'S',
  顺: 'S',
  苏: 'S',
  酸: 'S',
  上: 'S',
  陕: 'S',
  台: 'T',
  泰: 'T',
  铁: 'T',
  天: 'T',
  通: 'T',
  铜: 'T',
  腾: 'T',
  潍: 'W',
  威: 'W',
  温: 'W',
  武: 'W',
  无: 'W',
  芜: 'W',
  西: 'X',
  厦: 'X',
  湘: 'X',
  襄: 'X',
  信: 'X',
  新: 'X',
  徐: 'X',
  许: 'X',
  烟: 'Y',
  延: 'Y',
  盐: 'Y',
  扬: 'Y',
  宜: 'Y',
  益: 'Y',
  意: 'Y',
  印: 'Y',
  永: 'Y',
  豫: 'Y',
  云: 'Y',
  岳: 'Y',
  粤: 'Y',
  越: 'Y',
  野: 'Y',
  张: 'Z',
  漳: 'Z',
  湛: 'Z',
  浙: 'Z',
  郑: 'Z',
  镇: 'Z',
  中: 'Z',
  重: 'Z',
  舟: 'Z',
  珠: 'Z',
  株: 'Z',
  淄: 'Z',
  自: 'Z',
  遵: 'Z',
}

export function getCuisineInitial(name: string): string {
  const firstCharacter = name.trim().charAt(0)
  if (!firstCharacter) return '#'
  if (/^[A-Za-z]$/.test(firstCharacter)) return firstCharacter.toUpperCase()
  return CUISINE_INITIAL_BY_FIRST_CHARACTER[firstCharacter] || '#'
}

export function buildCuisineIndex(cuisines: CuisineOption[]): {
  hot: CuisineOption[]
  sections: CuisineSection[]
} {
  const uniqueById = new Map<string, CuisineOption>()
  cuisines.forEach(item => {
    if (item.id && item.name && !uniqueById.has(item.id)) uniqueById.set(item.id, item)
  })
  const unique = Array.from(uniqueById.values())

  const hot = HOT_CUISINE_NAMES
    .map(name => unique.find(item => item.name === name))
    .filter((item): item is CuisineOption => Boolean(item))
  const hotIds = new Set(hot.map(item => item.id))
  const grouped = new Map<string, CuisineOption[]>()

  unique.forEach(item => {
    if (hotIds.has(item.id)) return
    const initial = getCuisineInitial(item.name)
    const group = grouped.get(initial) || []
    group.push(item)
    grouped.set(initial, group)
  })

  const sections = Array.from(grouped.entries())
    .sort(([left], [right]) => {
      if (left === '#') return 1
      if (right === '#') return -1
      return left.localeCompare(right)
    })
    .map(([initial, items]) => ({
      initial,
      items: items.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
    }))

  return { hot, sections }
}
