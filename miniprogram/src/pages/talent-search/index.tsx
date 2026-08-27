import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Picker } from '@tarojs/components'
import { talentsApi, refApi, safeArray, getImageUrl } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import Loading from '../../components/Loading'
import Icon from '../../components/Icon'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import type { Cuisine, BusinessType, Talent } from '../../types'
import './index.scss'

interface SearchFilters {
  keyword: string
  city: string
  cuisineId: string
  businessTypeId: string
  minSalary: string
  starLevel: string
}

const EMPTY_FILTERS: SearchFilters = {
  keyword: '',
  city: '',
  cuisineId: '',
  businessTypeId: '',
  minSalary: '',
  starLevel: '',
}

// 城市列表（还原网页版 TalentSearch 硬编码）
const CITIES = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊']

const STAR_LABELS = ['', '一星', '二星', '三星', '四星', '五星']
const PAGE_SIZE = 20

const SALARY_OPTIONS = [
  { value: '', label: '不限' },
  { value: '8000', label: '8k以上' },
  { value: '15000', label: '15k以上' },
  { value: '20000', label: '20k以上' },
  { value: '30000', label: '30k以上' },
  { value: '50000', label: '50k以上' },
]

const STAR_OPTIONS = [
  { value: '', label: '不限' },
  ...[1, 2, 3, 4, 5].map(l => ({ value: String(l), label: `${STAR_LABELS[l]}及以上` })),
]

export default function TalentSearch() {
  useRequireAuth('ENTERPRISE')

  const [talents, setTalents] = useState<Talent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])

  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    refApi.getAll().then(res => {
      const data: any = res.data
      setCuisines(safeArray(data?.cuisines))
      setBusinessTypes(safeArray(data?.businessTypes))
    }).catch(() => {})
  }, [])

  const search = useCallback(async (pageNum: number = 1) => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, any> = { page: pageNum, pageSize: PAGE_SIZE }
      if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
      if (filters.city && filters.city !== '全国') params.city = filters.city
      if (filters.cuisineId) params.cuisineId = filters.cuisineId
      if (filters.businessTypeId) params.businessTypeId = filters.businessTypeId
      if (filters.minSalary) params.minSalary = parseInt(filters.minSalary)
      if (filters.starLevel) params.starLevel = parseInt(filters.starLevel)

      const res = await talentsApi.search(params)
      const data: any = res.data
      setTalents(safeArray(data?.talents))
      setTotal(data?.total || 0)
      setPage(pageNum)
    } catch {
      setError('搜索失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    search(1)
  }, [])

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const hasActiveFilters = !!(filters.city && filters.city !== '全国') || filters.cuisineId || filters.businessTypeId || filters.minSalary || filters.starLevel

  const cuisineMap: Record<string, string> = {}
  cuisines.forEach(c => { cuisineMap[c.id] = c.name })
  const bizTypeMap: Record<string, string> = {}
  businessTypes.forEach(b => { bizTypeMap[b.id] = b.name })

  const renderStars = (level: number) => {
    const full = Math.floor(level)
    return '★'.repeat(full) + '☆'.repeat(5 - full)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const minSalaryLabel = SALARY_OPTIONS.find(o => o.value === filters.minSalary)?.label || '不限'
  const starLabel = STAR_OPTIONS.find(o => o.value === filters.starLevel)?.label || '不限'

  return (
    <Layout active='/pages/talent-search/index'>
      <View className='ts-page'>
        <View style={{ height: `${STATUS_BAR_HEIGHT + 8}px` }} />
        <View className='ts-body'>
        {/* 搜索行（还原网页版：白底输入框 + 橙搜索钮 + 筛选切换） */}
        <View className='ts-search-row'>
          <View className='ts-search-box'>
            <View className='ts-search-icon'>
              <Icon name='search' size={32} color='#9CA3AF' />
            </View>
            <Input
              className='ts-search-input'
              value={filters.keyword}
              placeholder='搜索职位、技能或品牌经历'
              placeholderClass='ts-placeholder'
              confirmType='search'
              onInput={(e) => setFilters(f => ({ ...f, keyword: e.detail.value }))}
              onConfirm={() => search(1)}
            />
          </View>
          <Text className='ts-search-btn' onClick={() => search(1)}>搜索</Text>
          <View
            className={`ts-filter-btn ${showFilters || hasActiveFilters ? 'ts-filter-btn-active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icon name='filter' size={36} color={showFilters || hasActiveFilters ? '#C2410C' : '#5F6B7A'} />
          </View>
        </View>

        {/* 筛选面板（还原网页版白卡 chips + 下拉） */}
        {showFilters && (
          <View className='ts-filter-panel'>
            <View className='ts-filter-group'>
              <Text className='ts-filter-label'>城市</Text>
              <View className='ts-chips'>
                <Text
                  className={`ts-chip ${!filters.city || filters.city === '全国' ? 'ts-chip-active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, city: '' }))}
                >
                  不限
                </Text>
                {CITIES.map(c => (
                  <Text
                    key={c}
                    className={`ts-chip ${filters.city === c ? 'ts-chip-active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, city: f.city === c ? '' : c }))}
                  >
                    {c}
                  </Text>
                ))}
              </View>
            </View>

            <View className='ts-filter-group'>
              <Text className='ts-filter-label'>菜系</Text>
              <View className='ts-chips'>
                <Text
                  className={`ts-chip ${!filters.cuisineId ? 'ts-chip-active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, cuisineId: '' }))}
                >
                  不限
                </Text>
                {cuisines.filter(c => c.level === 1).map(c => (
                  <Text
                    key={c.id}
                    className={`ts-chip ${filters.cuisineId === c.id ? 'ts-chip-active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, cuisineId: f.cuisineId === c.id ? '' : c.id }))}
                  >
                    {c.name}
                  </Text>
                ))}
              </View>
            </View>

            <View className='ts-filter-group'>
              <Text className='ts-filter-label'>业态</Text>
              <View className='ts-chips'>
                <Text
                  className={`ts-chip ${!filters.businessTypeId ? 'ts-chip-active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, businessTypeId: '' }))}
                >
                  不限
                </Text>
                {businessTypes.map(bt => (
                  <Text
                    key={bt.id}
                    className={`ts-chip ${filters.businessTypeId === bt.id ? 'ts-chip-active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, businessTypeId: f.businessTypeId === bt.id ? '' : bt.id }))}
                  >
                    {bt.name}
                  </Text>
                ))}
              </View>
            </View>

            {/* 薪资/星级（原生 Picker 替代网页版 select） */}
            <View className='ts-select-row'>
              <View className='ts-select-item'>
                <Text className='ts-filter-label'>最低薪资</Text>
                <Picker
                  mode='selector'
                  range={SALARY_OPTIONS.map(o => o.label)}
                  onChange={(e) => setFilters(f => ({ ...f, minSalary: SALARY_OPTIONS[Number(e.detail.value)]?.value || '' }))}
                >
                  <View className='ts-select'>
                    <Text className='ts-select-text'>{minSalaryLabel}</Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
              <View className='ts-select-item'>
                <Text className='ts-filter-label'>星级</Text>
                <Picker
                  mode='selector'
                  range={STAR_OPTIONS.map(o => o.label)}
                  onChange={(e) => setFilters(f => ({ ...f, starLevel: STAR_OPTIONS[Number(e.detail.value)]?.value || '' }))}
                >
                  <View className='ts-select'>
                    <Text className='ts-select-text'>{starLabel}</Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
            </View>

            <View className='ts-filter-actions'>
              <Text className='ts-reset-btn' onClick={clearFilters}>重置</Text>
              <Text
                className='ts-apply-btn'
                onClick={() => {
                  setShowFilters(false)
                  search(1)
                }}
              >
                应用筛选
              </Text>
            </View>
          </View>
        )}

        {/* 已选条件 chips */}
        {hasActiveFilters && !showFilters && (
          <View className='ts-active-chips'>
            {filters.city && filters.city !== '全国' && (
              <View className='ts-active-chip'>
                <Text>{filters.city}</Text>
                <Text className='ts-active-x' onClick={() => setFilters(f => ({ ...f, city: '' }))}>×</Text>
              </View>
            )}
            {filters.cuisineId && cuisineMap[filters.cuisineId] && (
              <View className='ts-active-chip'>
                <Text>{cuisineMap[filters.cuisineId]}</Text>
                <Text className='ts-active-x' onClick={() => setFilters(f => ({ ...f, cuisineId: '' }))}>×</Text>
              </View>
            )}
            {filters.businessTypeId && bizTypeMap[filters.businessTypeId] && (
              <View className='ts-active-chip'>
                <Text>{bizTypeMap[filters.businessTypeId]}</Text>
                <Text className='ts-active-x' onClick={() => setFilters(f => ({ ...f, businessTypeId: '' }))}>×</Text>
              </View>
            )}
            {filters.minSalary && (
              <View className='ts-active-chip'>
                <Text>{parseInt(filters.minSalary) / 1000}k以上</Text>
                <Text className='ts-active-x' onClick={() => setFilters(f => ({ ...f, minSalary: '' }))}>×</Text>
              </View>
            )}
            {filters.starLevel && (
              <View className='ts-active-chip'>
                <Text>{STAR_LABELS[parseInt(filters.starLevel)]}及以上</Text>
                <Text className='ts-active-x' onClick={() => setFilters(f => ({ ...f, starLevel: '' }))}>×</Text>
              </View>
            )}
          </View>
        )}

        {/* 结果统计 */}
        {!loading && (
          <Text className='ts-result-info'>
            共找到 <Text className='ts-result-num'>{total}</Text> 位人才
          </Text>
        )}

        {error ? <View className='ts-error'><Text className='ts-error-text'>{error}</Text></View> : null}

        {/* 人才卡片列表 */}
        {loading ? (
          <Loading />
        ) : talents.length === 0 ? (
          <View className='ts-empty-card'>
            <View className='ts-empty-icon'>
              <Icon name='search' size={56} color='#9CA3AF' strokeWidth={1.5} />
            </View>
            <Text className='ts-empty-text'>未找到匹配的人才</Text>
            <Text className='ts-empty-sub'>尝试调整筛选条件</Text>
          </View>
        ) : (
          <View>
            {talents.map(talent => (
              <View
                key={talent.id}
                className='talent-card'
                hoverClass='hover-bg'
                onClick={() => Taro.navigateTo({ url: `/pages/talent-detail/index?id=${talent.id}` })}
              >
                <View className='talent-avatar-wrap'>
                  {talent.avatar ? (
                    <View className='talent-avatar-img' style={{ backgroundImage: `url(${getImageUrl(talent.avatar)})` }} />
                  ) : (
                    <View className='talent-avatar'>
                      <Text className='talent-avatar-text'>{talent.realName?.[0] || '?'}</Text>
                    </View>
                  )}
                </View>

                <View className='talent-main'>
                  <View className='talent-name-row'>
                    <Text className='talent-name'>{talent.realName || '匿名人才'}</Text>
                    <Text className='talent-stars'>{renderStars(talent.starLevel)}</Text>
                    <Text className='talent-star-label'>{talent.starLevelStr || STAR_LABELS[talent.starLevel] || ''}</Text>
                  </View>
                  <Text className='talent-title'>
                    {talent.title || '未填写职位'}
                  </Text>
                  <View className='talent-meta'>
                    <Text className='talent-salary'>
                      {talent.minSalary && talent.maxSalary
                        ? `${(talent.minSalary / 1000).toFixed(0)}k-${(talent.maxSalary / 1000).toFixed(0)}k`
                        : '薪资面议'}
                    </Text>
                    {talent.workYears != null && <Text className='talent-meta-item'>{talent.workYears}年经验</Text>}
                    {talent.city && <Text className='talent-meta-item'>{talent.city}</Text>}
                  </View>
                  {/* 小标签：学历蓝 / 品牌背书紫 / 业态绿 */}
                  <View className='talent-tags'>
                    {talent.education ? <Text className='mini-tag mini-tag-blue'>{talent.education}</Text> : null}
                    {talent.brandEndorsement ? <Text className='mini-tag mini-tag-purple'>品牌背书</Text> : null}
                    {(talent.businessTypeIds || '').split(',').slice(0, 2).map(btId => {
                      const name = bizTypeMap[btId]
                      return name ? <Text key={btId} className='mini-tag mini-tag-green'>{name}</Text> : null
                    })}
                  </View>
                </View>
              </View>
            ))}

            {/* 分页 */}
            {totalPages > 1 && (
              <View className='ts-pagination'>
                <Text className={`ts-page-btn ${page <= 1 ? 'ts-page-btn-disabled' : ''}`} onClick={() => page > 1 && search(page - 1)}>
                  上一页
                </Text>
                <Text className='ts-page-info'>{page} / {totalPages}</Text>
                <Text className={`ts-page-btn ${page >= totalPages ? 'ts-page-btn-disabled' : ''}`} onClick={() => page < totalPages && search(page + 1)}>
                  下一页
                </Text>
              </View>
            )}
          </View>
        )}
        </View>
      </View>
    </Layout>
  )
}
