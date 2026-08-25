import { useEffect, useRef, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { jobsApi, refApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import JobCard from '../../components/JobCard'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import Icon from '../../components/Icon'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import type { Job } from '../../types'
import './index.scss'

interface RefItem {
  id: string
  name: string
}

// 全国热门城市（还原网页版 Home.tsx 硬编码全量城市）
const HOT_CITIES = [
  '全部', '北京', '上海', '广州', '深圳',
  '杭州', '宁波', '温州', '绍兴', '嘉兴', '金华', '台州',
  '南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州',
  '成都', '绵阳', '宜宾', '泸州',
  '重庆', '万州',
  '武汉', '宜昌', '襄阳', '荆州',
  '长沙', '株洲', '湘潭', '衡阳', '岳阳', '常德',
  '郑州', '洛阳', '开封', '新乡',
  '西安', '咸阳', '宝鸡',
  '济南', '青岛', '烟台', '潍坊', '临沂', '淄博',
  '福州', '厦门', '泉州', '漳州',
  '合肥', '芜湖', '蚌埠',
  '南昌', '九江', '赣州',
  '昆明', '大理', '丽江', '曲靖',
  '贵阳', '遵义',
  '南宁', '桂林', '柳州', '北海',
  '海口', '三亚',
  '石家庄', '唐山', '保定', '廊坊',
  '太原', '大同',
  '沈阳', '大连', '鞍山',
  '长春', '吉林', '延边',
  '哈尔滨', '大庆', '齐齐哈尔',
  '兰州', '天水',
  '乌鲁木齐', '伊犁',
  '呼和浩特', '包头', '鄂尔多斯',
  '银川',
  '西宁',
  '拉萨',
  '天津',
  '佛山', '东莞', '珠海', '中山', '惠州', '汕头', '湛江',
]

const PAGE_SIZE = 20

export default function Jobs() {
  const { user } = useRequireAuth()
  // 管理员不进首页，直接跳管理后台（还原网页版 Home 的 ADMIN 分流）
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      Taro.reLaunch({ url: '/pages/admin/index' })
    }
  }, [user])

  if (user?.role === 'ENTERPRISE') {
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

// ========== 人才端首页：职位搜索（还原网页版 TalentHome）==========
function TalentHome() {
  const { user } = useAuthStore()
  const talent = (user?.profile || {}) as { realName?: string }

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [cuisines, setCuisines] = useState<RefItem[]>([])
  const [businessTypes, setBusinessTypes] = useState<RefItem[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  // 请求序号：丢弃迟到的旧响应
  const reqSeqRef = useRef(0)
  // 关键词防抖
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cuisineMap: Record<string, string> = {}
  cuisines.forEach(c => { cuisineMap[c.id] = c.name })
  const bizTypeMap: Record<string, string> = {}
  businessTypes.forEach(b => { bizTypeMap[b.id] = b.name })

  const loadData = async (p = 1) => {
    const seq = ++reqSeqRef.current
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page: p, pageSize: PAGE_SIZE }
      if (selectedCuisine) params.cuisineId = selectedCuisine
      if (selectedCity) params.city = selectedCity
      if (keyword) params.keyword = keyword

      const [jobsRes, refRes] = await Promise.allSettled([
        jobsApi.list(params),
        refApi.getAll(),
      ])

      if (seq !== reqSeqRef.current) return
      if (jobsRes.status === 'fulfilled') {
        const data: any = jobsRes.value.data
        setJobs(safeArray(data?.jobs))
        setTotal(data?.total || 0)
        setPage(data?.page || p)
      }
      if (refRes.status === 'fulfilled') {
        const ref = refRes.value.data
        setCuisines(safeArray(ref?.cuisines))
        setBusinessTypes(safeArray(ref?.businessTypes))
      }
    } catch {
      // 静默处理
    } finally {
      if (seq === reqSeqRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
  }, [])

  // 筛选条件变化时重新加载（重置到第一页，还原网页版）
  useEffect(() => {
    loadData(1)
  }, [selectedCuisine, selectedCity])

  // 关键词防抖提交（网页版每击键触发，小程序端加 500ms 防抖避免请求风暴）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadData(1), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [keyword])

  usePullDownRefresh(() => {
    Promise.resolve(loadData(page)).finally(() => Taro.stopPullDownRefresh())
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const onKeywordInput = (e: any) => setKeyword(e.detail.value)

  return (
    <View className='home-page'>
      {/* 顶部搜索区（还原网页版：白底 sticky + 橙色标题 + 灰底搜索框） */}
      <View className='home-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}>
        <View className='px-32'>
          <View className='home-title-row'>
            <Text className='home-title'>餐猎</Text>
            <Text className='home-subtitle'>餐饮酒店高端人才平台</Text>
            {talent?.realName ? <Text className='home-greeting'>👋 {talent.realName}</Text> : null}
          </View>
          <View className='home-search'>
            <View className='home-search-icon'>
              <Icon name='search' size={32} color='#9CA3AF' />
            </View>
            <Input
              className='home-search-input'
              value={keyword}
              placeholder='搜索职位、公司、地点...'
              placeholderClass='home-search-placeholder'
              confirmType='search'
              onInput={onKeywordInput}
            />
          </View>
        </View>

        {/* 全国热门城市快捷选择 */}
        <View className='city-chips-wrap'>
          <ScrollView className='city-chips' scrollY enhanced showScrollbar={false}>
            <View className='city-chips-inner'>
              {HOT_CITIES.map(city => {
                const isSelected = (city === '全部' && !selectedCity) || (city !== '全部' && selectedCity === city)
                return (
                  <Text
                    key={city}
                    className={`city-chip ${isSelected ? 'city-chip-active' : ''}`}
                    onClick={() => setSelectedCity(city === '全部' ? '' : city)}
                  >
                    {city}
                  </Text>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* 菜系筛选（横向滚动） */}
        <View className='cuisine-bar'>
          <ScrollView className='cuisine-scroll' scrollX enhanced showScrollbar={false}>
            <View className='cuisine-scroll-inner'>
              <Text
                className={`cuisine-chip ${!selectedCuisine ? 'chip-active' : ''}`}
                onClick={() => setSelectedCuisine('')}
              >
                全部菜系
              </Text>
              {cuisines.map(c => (
                <Text
                  key={c.id}
                  className={`cuisine-chip ${selectedCuisine === c.id ? 'chip-active' : ''}`}
                  onClick={() => setSelectedCuisine(selectedCuisine === c.id ? '' : c.id)}
                >
                  {c.name}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 平台服务入口：供应平台 + 创业分享（还原网页版双卡宫格） */}
      <View className='platform-entries'>
        <View className='grid-2'>
          <View
            className='g2 platform-card'
            hoverClass='hover-bg'
            onClick={() => Taro.navigateTo({ url: '/pages/supply/index' })}
          >
            <View className='platform-icon platform-icon-orange'>🏪</View>
            <View className='platform-text'>
              <Text className='platform-name'>供应平台</Text>
              <Text className='platform-desc'>食材 · 设备 · 培训 · 转让</Text>
            </View>
          </View>
          <View
            className='g2 platform-card'
            hoverClass='hover-bg'
            onClick={() => Taro.navigateTo({ url: '/pages/share/index' })}
          >
            <View className='platform-icon platform-icon-purple'>🎬</View>
            <View className='platform-text'>
              <Text className='platform-name'>创业分享</Text>
              <Text className='platform-desc'>创业经验 · 学习成长</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 职位列表 */}
      <View className='job-list-wrap'>
        {loading ? (
          <Loading />
        ) : jobs.length === 0 ? (
          <Empty text='暂无匹配的职位' />
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

            {/* 分页（还原网页版上一页/下一页按钮） */}
            {totalPages > 1 && (
              <View className='pagination'>
                <Text
                  className={`page-btn ${page <= 1 ? 'page-btn-disabled' : ''}`}
                  onClick={() => page > 1 && loadData(page - 1)}
                >
                  上一页
                </Text>
                <Text className='page-info'>{page} / {totalPages}</Text>
                <Text
                  className={`page-btn ${page >= totalPages ? 'page-btn-disabled' : ''}`}
                  onClick={() => page < totalPages && loadData(page + 1)}
                >
                  下一页
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
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
