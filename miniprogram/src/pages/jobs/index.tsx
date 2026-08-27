import { useEffect, useRef, useState } from 'react'
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { Button, View, Text } from '@tarojs/components'
import { jobsApi, refApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import JobCard from '../../components/JobCard'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import Icon from '../../components/Icon'
import SearchBar from '../../components/SearchBar'
import FilterBar, { type FilterBarItem } from '../../components/FilterBar'
import BottomSheet from '../../components/BottomSheet'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import type { Job, JobCategory } from '../../types'
import './index.scss'

interface RefItem {
  id: string
  name: string
}

const FALLBACK_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '长沙', '南京', '苏州', '西安']
const PAGE_SIZE = 10

type SheetKind = 'city' | 'category' | 'cuisine' | 'business' | null

interface JobQuery {
  keyword: string
  city: string
  categoryId: string
  cuisineId: string
  businessTypeId: string
}

export default function Jobs() {
  const { user, initialized } = useRequireAuth()

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      Taro.reLaunch({ url: '/pages/admin/index' })
    }
  }, [user])

  if (!initialized || !user || user.role === 'ADMIN') {
    return (
      <View className='role-routing'>
        <Loading text={user?.role === 'ADMIN' ? '正在进入管理端…' : '正在确认登录状态…'} />
      </View>
    )
  }

  if (user.role === 'ENTERPRISE') {
    return (
      <Layout active='/pages/jobs/index'>
        <EnterpriseHome />
      </Layout>
    )
  }

  return (
    <Layout active='/pages/jobs/index'>
      <TalentHome />
    </Layout>
  )
}

// ========== 人才端首页：同城职位流 ==========
function TalentHome() {
  const { user } = useAuthStore()
  const talent = (user?.profile || {}) as { realName?: string }

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [cuisines, setCuisines] = useState<RefItem[]>([])
  const [businessTypes, setBusinessTypes] = useState<RefItem[]>([])
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([])
  const [popularCities, setPopularCities] = useState<string[]>(FALLBACK_CITIES)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [selectedBusinessType, setSelectedBusinessType] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sheetKind, setSheetKind] = useState<SheetKind>(null)
  const reqSeqRef = useRef(0)
  const appendSeqRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cuisineMap: Record<string, string> = {}
  cuisines.forEach(c => { cuisineMap[c.id] = c.name })
  const bizTypeMap: Record<string, string> = {}
  businessTypes.forEach(b => { bizTypeMap[b.id] = b.name })

  const currentQuery = (): JobQuery => ({
    keyword,
    city: selectedCity,
    categoryId: selectedCategory,
    cuisineId: selectedCuisine,
    businessTypeId: selectedBusinessType,
  })

  const loadJobs = async (p: number, append: boolean, query: JobQuery) => {
    if (append && appendSeqRef.current !== 0) return
    const seq = ++reqSeqRef.current
    if (append) {
      appendSeqRef.current = seq
      setLoadingMore(true)
      setLoadMoreError('')
    } else {
      appendSeqRef.current = 0
      setLoading(true)
      setLoadingMore(false)
      setError('')
      setLoadMoreError('')
      setJobs([])
      setTotal(0)
      setPage(1)
    }

    try {
      const params: Record<string, unknown> = { page: p, pageSize: PAGE_SIZE }
      if (query.cuisineId) params.cuisineId = query.cuisineId
      if (query.businessTypeId) params.businessTypeId = query.businessTypeId
      if (query.categoryId) params.jobCategoryId = query.categoryId
      if (query.city) params.city = query.city
      if (query.keyword.trim()) params.keyword = query.keyword.trim()

      const response = await jobsApi.list(params)

      if (seq !== reqSeqRef.current) return
      const data: any = response.data
      const incoming = safeArray<Job>(data?.jobs)
      setJobs(previous => {
        if (!append) return incoming
        const byId = new Map(previous.map(item => [item.id, item]))
        incoming.forEach(item => byId.set(item.id, item))
        return Array.from(byId.values())
      })
      setTotal(Number(data?.total || 0))
      setPage(Number(data?.page || p))
    } catch (requestError: any) {
      if (seq !== reqSeqRef.current) return
      const message = requestError?.message || '职位加载失败，请稍后重试'
      if (append) setLoadMoreError(message)
      else setError(message)
    } finally {
      if (appendSeqRef.current === seq) appendSeqRef.current = 0
      if (seq === reqSeqRef.current) {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    }
  }

  useEffect(() => {
    const loadReferences = async () => {
      const [refResult, cityResult] = await Promise.allSettled([refApi.getAll(), jobsApi.getHotCities()])
      if (refResult.status === 'fulfilled') {
        const data: any = refResult.value.data
        setCuisines(safeArray<RefItem>(data?.cuisines))
        setBusinessTypes(safeArray<RefItem>(data?.businessTypes))
        setJobCategories(safeArray<JobCategory>(data?.jobCategories))
      }
      if (cityResult.status === 'fulfilled') {
        const names = safeArray<any>((cityResult.value.data as any)?.cities)
          .map(item => String(item?.name || '').trim())
          .filter(Boolean)
        if (names.length > 0) setPopularCities(Array.from(new Set(names)))
      }
    }

    void loadReferences()
    void loadJobs(1, false, { keyword: '', city: '', categoryId: '', cuisineId: '', businessTypeId: '' })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      reqSeqRef.current += 1
    }
  }, [])

  usePullDownRefresh(() => {
    Promise.resolve(loadJobs(1, false, currentQuery())).finally(() => Taro.stopPullDownRefresh())
  })

  const hasMore = jobs.length < total
  useReachBottom(() => {
    if (hasMore && !loading && !loadingMore) {
      void loadJobs(page + 1, true, currentQuery())
    }
  })

  const cancelDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  const onKeywordInput = (value: string) => {
    setKeyword(value)
    cancelDebounce()
    const query = { ...currentQuery(), keyword: value }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void loadJobs(1, false, query)
    }, 300)
  }

  const clearKeyword = () => {
    cancelDebounce()
    setKeyword('')
    void loadJobs(1, false, { ...currentQuery(), keyword: '' })
  }

  const chooseSheetOption = (value: string) => {
    const query = currentQuery()
    if (sheetKind === 'city') {
      setSelectedCity(value)
      query.city = value
    }
    if (sheetKind === 'category') {
      setSelectedCategory(value)
      query.categoryId = value
    }
    if (sheetKind === 'cuisine') {
      setSelectedCuisine(value)
      query.cuisineId = value
    }
    if (sheetKind === 'business') {
      setSelectedBusinessType(value)
      query.businessTypeId = value
    }
    cancelDebounce()
    setSheetKind(null)
    void loadJobs(1, false, query)
  }

  const clearFilters = () => {
    cancelDebounce()
    setKeyword('')
    setSelectedCity('')
    setSelectedCategory('')
    setSelectedCuisine('')
    setSelectedBusinessType('')
    setSheetKind(null)
    void loadJobs(1, false, { keyword: '', city: '', categoryId: '', cuisineId: '', businessTypeId: '' })
  }

  const categoryName = jobCategories.find(item => item.id === selectedCategory)?.name || '职位类别'
  const cuisineName = cuisines.find(item => item.id === selectedCuisine)?.name || '菜系'
  const businessName = businessTypes.find(item => item.id === selectedBusinessType)?.name || '业态'
  const filters: FilterBarItem[] = [
    { key: 'category', label: categoryName, active: !!selectedCategory },
    { key: 'cuisine', label: cuisineName, active: !!selectedCuisine },
    { key: 'business', label: businessName, active: !!selectedBusinessType },
  ]
  const hasActiveFilters = !!(keyword || selectedCity || selectedCategory || selectedCuisine || selectedBusinessType)

  const sheetTitle = sheetKind === 'city'
    ? '选择城市'
    : sheetKind === 'category'
      ? '选择职位类别'
      : sheetKind === 'cuisine'
        ? '选择菜系'
        : '选择业态'
  const sheetOptions: { id: string; name: string }[] = sheetKind === 'city'
    ? [{ id: '', name: '全国职位' }, ...popularCities.map(name => ({ id: name, name }))]
    : sheetKind === 'category'
      ? [{ id: '', name: '全部职位类别' }, ...jobCategories]
      : sheetKind === 'cuisine'
        ? [{ id: '', name: '全部菜系' }, ...cuisines]
        : [{ id: '', name: '全部业态' }, ...businessTypes]
  const selectedSheetValue = sheetKind === 'city'
    ? selectedCity
    : sheetKind === 'category'
      ? selectedCategory
      : sheetKind === 'cuisine'
        ? selectedCuisine
        : selectedBusinessType


  return (
    <View className='home-page'>
      <View className='home-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}>
        <View className='home-header-main'>
          <View className='home-title-row'>
            <Text className='home-title'>餐猎</Text>
            <Text className='home-subtitle'>{talent?.realName ? `${talent.realName}，发现同城机会` : '发现同城餐饮酒店机会'}</Text>
            <Button
              className='ui-button-reset home-city-entry'
              hoverClass='home-city-entry-pressed'
              aria-label={`当前城市${selectedCity || '全国'}，点击选择城市`}
              onClick={() => setSheetKind('city')}
            >
              <Icon name='map-pin' size={24} color='#FF6B00' />
              <Text className='home-city-text'>{selectedCity || '全国'}</Text>
              <Icon name='chevron-down' size={22} color='#FF6B00' />
            </Button>
          </View>
          <SearchBar
            value={keyword}
            placeholder='搜索职位、公司或地点'
            loading={loading && !!keyword}
            onInput={onKeywordInput}
            onClear={clearKeyword}
            onConfirm={() => {
              cancelDebounce()
              void loadJobs(1, false, currentQuery())
            }}
          />
        </View>
        <View className='home-filter-row'>
          <View className='home-filter-main'>
            <FilterBar items={filters} onSelect={key => setSheetKind(key as SheetKind)} />
          </View>
          {hasActiveFilters ? (
            <Button
              className='ui-button-reset home-filter-clear'
              hoverClass='home-filter-clear-pressed'
              aria-label='清空搜索和筛选'
              onClick={clearFilters}
            >
              清除
            </Button>
          ) : null}
        </View>
      </View>

      <View className='job-list-wrap'>
        <View className='job-list-meta'>
          <Text className='job-list-count'>{loading ? '正在查找职位' : `共 ${total} 个在招职位`}</Text>
          <Text className='job-list-hint'>{selectedCity ? selectedCity : '全国'}</Text>
        </View>

        {loading && jobs.length === 0 ? (
          <View className='job-list-state'><Loading text='正在加载职位…' /></View>
        ) : error && jobs.length === 0 ? (
          <Empty text={error} icon='alert'>
            <Button
              className='ui-button-reset state-action'
              hoverClass='state-action-pressed'
              onClick={() => loadJobs(1, false, currentQuery())}
            >
              重新加载
            </Button>
          </Empty>
        ) : jobs.length === 0 ? (
          <Empty text={hasActiveFilters ? '没有找到符合条件的职位' : '当前暂无在招职位'}>
            {hasActiveFilters ? (
              <Button className='ui-button-reset state-action' hoverClass='state-action-pressed' onClick={clearFilters}>
                清空搜索和筛选
              </Button>
            ) : null}
          </Empty>
        ) : (
          <View>
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                cuisineMap={cuisineMap}
                bizTypeMap={bizTypeMap}
                onClick={() => Taro.navigateTo({ url: `/pages/job-detail/index?id=${job.id}` })}
              />
            ))}

            <View className='load-more-region'>
              {loadingMore ? <Text className='load-more-text'>正在加载更多职位…</Text> : null}
              {!loadingMore && loadMoreError ? (
                <Button
                  className='ui-button-reset load-more-button load-more-button-error'
                  hoverClass='load-more-button-pressed'
                  onClick={() => loadJobs(page + 1, true, currentQuery())}
                >
                  加载失败，点击重试
                </Button>
              ) : null}
              {!loadingMore && !loadMoreError && hasMore ? (
                <Button
                  className='ui-button-reset load-more-button'
                  hoverClass='load-more-button-pressed'
                  onClick={() => loadJobs(page + 1, true, currentQuery())}
                >
                  加载更多职位
                </Button>
              ) : null}
              {!loadingMore && !loadMoreError && !hasMore ? (
                <Text className='load-more-text'>没有更多职位了</Text>
              ) : null}
            </View>

            <View className='secondary-services'>
              <Text className='secondary-services-title'>更多平台服务</Text>
              <View className='secondary-services-links'>
                <Button
                  className='ui-button-reset secondary-service-link'
                  hoverClass='secondary-service-link-pressed'
                  onClick={() => Taro.navigateTo({ url: '/pages/supply/index' })}
                >
                  供应平台
                </Button>
                <View className='secondary-service-divider' />
                <Button
                  className='ui-button-reset secondary-service-link'
                  hoverClass='secondary-service-link-pressed'
                  onClick={() => Taro.navigateTo({ url: '/pages/share/index' })}
                >
                  创业分享
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>

      <BottomSheet open={sheetKind !== null} title={sheetTitle} onClose={() => setSheetKind(null)}>
        <View className='sheet-options'>
          {sheetOptions.map(option => {
            const active = option.id === selectedSheetValue
            return (
              <Button
                key={`${sheetKind}-${option.id || 'all'}`}
                className={`ui-button-reset sheet-option ${active ? 'sheet-option-active' : ''}`}
                hoverClass='sheet-option-pressed'
                aria-label={`${option.name}${active ? '，已选择' : ''}`}
                onClick={() => chooseSheetOption(option.id)}
              >
                <Text className='sheet-option-label'>{option.name}</Text>
                {active ? <Icon name='check' size={30} color='#FF6B00' /> : null}
              </Button>
            )
          })}
        </View>
      </BottomSheet>
    </View>
  )
}

// ========== 企业端首页：管理界面（还原网页版 EnterpriseHome）==========
function EnterpriseHome() {
  const { user } = useAuthStore()
  const enterprise = (user?.profile || {}) as {
    companyName?: string
    status?: string
    _count?: { jobs: number }
  }

  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isVerified = enterprise?.status === 'APPROVED'
  const isPending = enterprise?.status === 'PENDING'

  const [expandedJobId, setExpandedJobId] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await jobsApi.getMyJobs()
      const data: any = res.data
      setJobs(safeArray(data?.jobs || data))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // 关闭职位（还原网页版 EnterpriseDashboard handleCloseJob）
  const handleCloseJob = async (jobId: string) => {
    try {
      await jobsApi.close(jobId)
      setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'CLOSED' } : j)))
      Taro.showToast({ title: '已关闭', icon: 'success' })
    } catch {
      Taro.showToast({ title: '关闭职位失败', icon: 'none' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  usePullDownRefresh(() => {
    Promise.resolve(loadData()).finally(() => Taro.stopPullDownRefresh())
  })

  if (loading) {
    return <Loading />
  }

  const activeJobs = jobs.filter(j => j.status === 'ACTIVE')
  const totalApplications = jobs.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0)

  return (
    <View className='home-page'>
      {/* 顶部（还原网页版：白色头 + 餐猎企业版 + 发布职位按钮） */}
      <View className='ent-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}>
        <View className='ent-title-row'>
          <View className='ent-title-left'>
            <Text className='ent-title'>餐猎企业版</Text>
            <Text className='ent-company'>{enterprise?.companyName || '企业中心'}</Text>
          </View>
          <Text
            className={`post-btn ${isVerified ? '' : 'post-btn-disabled'}`}
            onClick={() => isVerified && Taro.navigateTo({ url: '/pages/post-job/index' })}
          >
            + 发布职位
          </Text>
        </View>

        {/* 认证状态提示 */}
        {!isVerified && (
          <View className={`verify-alert ${isPending ? 'verify-alert-pending' : 'verify-alert-rejected'}`}>
            <Text className='verify-alert-text'>
              {isPending ? '⏳ 企业信息审核中，审核通过后可发布职位' : '⚠️ 企业认证未通过，请修改信息后重新提交'}
            </Text>
            <Text
              className={`verify-alert-link ${isPending ? 'link-pending' : 'link-rejected'}`}
              onClick={() => Taro.navigateTo({ url: '/pages/edit-enterprise-profile/index' })}
            >
              {isPending ? '查看企业信息' : '修改企业信息'}
            </Text>
          </View>
        )}
      </View>

      <View className='ent-body'>
        {/* 数据概览（还原网页版 grid-cols-3） */}
        <View className='grid-3 stat-grid'>
          <View className='g3 stat-card'>
            <Text className='stat-num'>{activeJobs.length}</Text>
            <Text className='stat-label'>在招职位</Text>
          </View>
          <View className='g3 stat-card'>
            <Text className='stat-num'>{totalApplications}</Text>
            <Text className='stat-label'>收到简历</Text>
          </View>
          <View className='g3 stat-card'>
            <Text className='stat-num stat-num-primary'>0</Text>
            <Text className='stat-label'>待处理</Text>
          </View>
        </View>

        {/* 快捷入口（还原网页版 grid-cols-4 彩色图标） */}
        <View className='quick-card'>
          <View className='grid-4 quick-grid'>
            <View className='g4 quick-item' onClick={() => Taro.reLaunch({ url: '/pages/talent-search/index' })}>
              <View className='quick-icon quick-icon-blue'>
                <Icon name='search' size={40} color='#3B82F6' />
              </View>
              <Text className='quick-label'>搜人才</Text>
            </View>
            <View className='g4 quick-item' onClick={() => Taro.navigateTo({ url: '/pages/applications/index' })}>
              <View className='quick-icon quick-icon-green'>
                <Icon name='file-text' size={40} color='#22C55E' />
              </View>
              <Text className='quick-label'>收到的简历</Text>
            </View>
            <View className='g4 quick-item' onClick={() => Taro.navigateTo({ url: '/pages/enterprise-jobs/index' })}>
              <View className='quick-icon quick-icon-orange'>
                <Icon name='briefcase' size={40} color='#FF6B00' />
              </View>
              <Text className='quick-label'>职位管理</Text>
            </View>
            <View className='g4 quick-item' onClick={() => Taro.navigateTo({ url: '/pages/edit-enterprise-profile/index' })}>
              <View className='quick-icon quick-icon-purple'>
                <Icon name='settings' size={40} color='#A855F7' />
              </View>
              <Text className='quick-label'>企业信息</Text>
            </View>
          </View>
        </View>

        {/* 平台服务入口（还原网页版浅色底双卡） */}
        <View className='grid-2 platform-entries-sm'>
          <View
            className='g2 platform-sm platform-sm-orange'
            hoverClass='hover-bg'
            onClick={() => Taro.navigateTo({ url: '/pages/supply/index' })}
          >
            <View className='platform-icon-sm platform-icon-orange'>🏪</View>
            <View className='platform-text'>
              <Text className='platform-name-sm'>供应平台</Text>
              <Text className='platform-desc-sm'>供应链 · 采购 · 转让</Text>
            </View>
          </View>
          <View
            className='g2 platform-sm platform-sm-purple'
            hoverClass='hover-bg'
            onClick={() => Taro.navigateTo({ url: '/pages/share/index' })}
          >
            <View className='platform-icon-sm platform-icon-purple'>🎬</View>
            <View className='platform-text'>
              <Text className='platform-name-sm'>创业分享</Text>
              <Text className='platform-desc-sm'>创业经验 · 学习成长</Text>
            </View>
          </View>
        </View>

        {/* 我的职位（还原网页版白卡 + divide-y 行列表） */}
        <View className='my-jobs-card'>
          <View className='my-jobs-header'>
            <Text className='my-jobs-title'>我的职位</Text>
            <Text className='my-jobs-more' onClick={() => Taro.navigateTo({ url: '/pages/enterprise-jobs/index' })}>
              查看全部 &gt;
            </Text>
          </View>
          {jobs.length === 0 ? (
            <View className='my-jobs-empty'>
              <Text className='my-jobs-empty-text'>暂无职位</Text>
              <Text
                className={`my-jobs-empty-link ${isVerified ? '' : 'my-jobs-empty-link-disabled'}`}
                onClick={() => isVerified && Taro.navigateTo({ url: '/pages/post-job/index' })}
              >
                立即发布 →
              </Text>
            </View>
          ) : (
            <View>
              {jobs.slice(0, 5).map((job: any) => (
                <View key={job.id} className='my-job-item'>
                  <View
                    className='my-job-row'
                    hoverClass='hover-bg'
                    onClick={() => setExpandedJobId(prev => (prev === job.id ? '' : job.id))}
                  >
                    <View className='my-job-info'>
                      <Text className='my-job-title'>{job.title}</Text>
                      <Text className='my-job-meta'>{job.city} · {job._count?.applications ?? 0}份简历</Text>
                    </View>
                    <Text className={`status-pill ${job.status === 'ACTIVE' ? 'status-pill-green' : 'status-pill-gray'}`}>
                      {job.status === 'ACTIVE' ? '招聘中' : '已关闭'}
                    </Text>
                  </View>
                  {expandedJobId === job.id ? (
                    <View className='my-job-actions'>
                      {job.status === 'ACTIVE' ? (
                        <>
                          <Text
                            className='my-job-act my-job-act-outline'
                            onClick={() => Taro.navigateTo({ url: `/pages/post-job/index?id=${job.id}` })}
                          >
                            编辑职位
                          </Text>
                          <Text className='my-job-act my-job-act-gray' onClick={() => handleCloseJob(job.id)}>关闭职位</Text>
                        </>
                      ) : null}
                      <Text
                        className={`my-job-act my-job-act-primary ${job.status === 'ACTIVE' ? '' : 'my-job-act-full'}`}
                        onClick={() => Taro.navigateTo({ url: `/pages/match-results/index?jobId=${job.id}` })}
                      >
                        查看匹配
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
