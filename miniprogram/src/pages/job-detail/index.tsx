import { useCallback, useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { jobsApi, refApi, getImageUrl } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Icon from '../../components/Icon'
import './index.scss'

// 学历映射（还原网页版 JobDetail 218-224 行）
const EDUCATION_MAP: Record<string, string> = {
  '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中',
  '5': '大专', '6': '本科', '7': '硕士', '8': '博士',
}

// 经验映射（还原网页版）
const EXPERIENCE_MAP: Record<string, string> = {
  '0': '经验不限', '1': '1年以下', '2': '1-3年', '3': '3-5年', '5': '5-10年', '10': '10年以上',
}

// ---------- 加载骨架（还原网页版 DetailSkeleton）----------
function DetailSkeleton() {
  return (
    <View className='jd-page'>
      <NavBar title='职位详情' />
      <View className='jd-company'>
        <View className='skeleton sk-logo' />
        <View className='sk-col'>
          <View className='skeleton sk-line w60' />
          <View className='skeleton sk-line w45 mt8' />
        </View>
        <View className='skeleton sk-salary-lg mt16' />
        <View className='skeleton sk-line w80 mt8' />
        <View className='sk-tags mt16'>
          <View className='skeleton sk-tag' />
          <View className='skeleton sk-tag' />
          <View className='skeleton sk-tag' />
        </View>
      </View>
      <View className='jd-section'>
        <View className='skeleton sk-line w30' />
        <View className='skeleton sk-line w100 mt12' />
        <View className='skeleton sk-line w83 mt12' />
      </View>
      <View className='jd-section'>
        <View className='skeleton sk-line w30' />
        <View className='skeleton sk-line w100 mt12' />
        <View className='skeleton sk-line w66 mt12' />
      </View>
    </View>
  )
}

// ---------- 错误态（还原网页版 ErrorState）----------
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className='jd-error-page'>
      <View className='jd-error-icon'>
        <Icon name='briefcase' size={64} color='#FF6B00' />
      </View>
      <Text className='jd-error-text'>{message}</Text>
      <View className='btn-primary jd-error-retry' onClick={onRetry}>
        <Text className='jd-error-retry-text'>重新加载</Text>
      </View>
    </View>
  )
}

export default function JobDetail() {
  const router = useRouter()
  const { id } = router.params
  const { user } = useRequireAuth()
  const { user: currentUser } = useAuthStore()

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cuisineMap, setCuisineMap] = useState<Record<string, string>>({})
  const [bizTypeMap, setBizTypeMap] = useState<Record<string, string>>({})

  const fetchJob = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await jobsApi.getById(id)
      setJob(res.data)
    } catch (err: any) {
      setError(err?.message || '加载职位详情失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchRefData = useCallback(async () => {
    try {
      const res = await refApi.getAll()
      const data: any = res.data
      const cmap: Record<string, string> = {}
      safeEach(data?.cuisines, (c: any) => { cmap[String(c.id)] = c.name })
      setCuisineMap(cmap)
      const bmap: Record<string, string> = {}
      safeEach(data?.businessTypes, (b: any) => { bmap[String(b.id)] = b.name })
      setBizTypeMap(bmap)
    } catch {
      // 非关键：tag 解析不出名字就显示原文
    }
  }, [])

  useEffect(() => {
    fetchJob()
    fetchRefData()
  }, [fetchJob, fetchRefData])

  // 人才端查询收藏/投递状态
  useEffect(() => {
    if (currentUser?.role === 'TALENT' && id) {
      jobsApi.isFavorited(id).then(res => setFavorited(!!(res.data as any)?.favorited)).catch(() => {})
      jobsApi.checkApplied(id).then(res => {
        setApplied(!!(res.data as any)?.applied)
        setApplicationStatus((res.data as any)?.status || null)
      }).catch(() => {})
    }
  }, [currentUser, id])

  // 跳转与企业的聊天
  const handleContactEnterprise = () => {
    if (!job?.enterprise?.userId) return
    Taro.navigateTo({
      url: `/pages/chat-conversation/index?chatWith=${job.enterprise.userId}${id ? `&jobId=${id}` : ''}`,
    })
  }

  // 收藏/取消收藏
  const handleToggleFavorite = async () => {
    if (!id || actionLoading) return
    setActionLoading(true)
    try {
      if (favorited) {
        await jobsApi.unfavorite(id)
        setFavorited(false)
      } else {
        await jobsApi.favorite(id)
        setFavorited(true)
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
    } finally {
      setActionLoading(false)
    }
  }

  // 投递简历
  const handleApply = async () => {
    if (!id || actionLoading || applied) return
    setActionLoading(true)
    try {
      await jobsApi.apply(id)
      setApplied(true)
      setApplicationStatus('PENDING')
      Taro.showToast({ title: '投递成功', icon: 'success' })
    } catch (err: any) {
      const msg = err?.message || '投递失败'
      if (msg.includes('已投递')) {
        setApplied(true)
        setApplicationStatus('PENDING')
      } else {
        Taro.showToast({ title: msg, icon: 'none' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (error || !job) {
    return <ErrorState message={error || '职位不存在'} onRetry={fetchJob} />
  }

  const { enterprise } = job
  const logo = getImageUrl(enterprise?.companyLogo)

  const cuisineTags: string[] = job.cuisineIds
    ? job.cuisineIds.split(',').map((c: string) => c.trim()).filter(Boolean).map((cid: string) => cuisineMap[cid] || cid)
    : []
  const bizTypeTags: string[] = job.businessTypeIds
    ? job.businessTypeIds.split(',').map((b: string) => b.trim()).filter(Boolean).map((bid: string) => bizTypeMap[bid] || bid)
    : []

  const educationLabel = job.educationReq ? (EDUCATION_MAP[String(job.educationReq)] || `学历${job.educationReq}`) : null
  const experienceLabel = job.experienceReq != null
    ? (EXPERIENCE_MAP[String(job.experienceReq)] || `${job.experienceReq}年`)
    : '经验不限'

  const salaryText = `${job.minSalary / 1000}k-${job.maxSalary / 1000}k`

  const statusText: Record<string, string> = {
    PENDING: '已投递·待查看',
    VIEWED: '已查看',
    INTERVIEWED: '邀请面试',
    REJECTED: '不合适',
    ACCEPTED: '已通过',
  }

  return (
    <View className='jd-page'>
      {/* 顶部返回栏（还原网页版 sticky 白底 + 圆形返回钮） */}
      <NavBar title='职位详情' />

      {/* 企业头卡（还原网页版：48 渐变 logo + 公司名/城市 + 大号橙薪资 + 标题 + tag 行） */}
      <View className='jd-company'>
        <View
          className='jd-company-row'
          hoverClass='hover-opacity'
          onClick={() => enterprise?.id && Taro.navigateTo({ url: `/pages/enterprise-detail/index?id=${enterprise.id}` })}
        >
          {logo ? (
            <Image src={logo} className='jd-logo-img' mode='aspectFill' />
          ) : (
            <View className='jd-logo'>
              <Text className='jd-logo-text'>{enterprise?.companyName ? enterprise.companyName.charAt(0) : '企'}</Text>
            </View>
          )}
          <View className='jd-company-info'>
            <Text className='jd-company-name'>{enterprise?.companyName || '未知企业'}</Text>
            <View className='jd-company-city'>
              <Icon name='map-pin' size={24} color='#6B7280' />
              <Text className='jd-city-text'>{job.city || enterprise?.city || '城市未填'}</Text>
            </View>
          </View>
          <Icon name='chevron-right' size={32} color='#9CA3AF' />
        </View>

        {/* 薪资 */}
        <View className='jd-salary-row'>
          <Text className='jd-salary'>{salaryText}</Text>
          {job.salaryMonth > 0 && <Text className='jd-salary-month'>·{job.salaryMonth}薪</Text>}
        </View>

        {/* 职位标题 */}
        <Text className='jd-title'>{job.title}</Text>

        {/* 标签行 */}
        <View className='jd-tags'>
          {cuisineTags.map((tag, i) => (
            <Text key={`c${i}`} className='tag tag-orange'>{tag}</Text>
          ))}
          {bizTypeTags.map((tag, i) => (
            <Text key={`b${i}`} className='tag tag-blue'>{tag}</Text>
          ))}
          {educationLabel ? <Text className='tag tag-gray'>{educationLabel}</Text> : null}
          <Text className='tag tag-gray'>{experienceLabel}</Text>
        </View>
      </View>

      {/* 职位描述 */}
      <View className='jd-section'>
        <Text className='jd-section-title'>职位描述</Text>
        <Text className='jd-section-content'>{job.description || '暂无描述'}</Text>
      </View>

      {/* 任职要求 */}
      {job.requirements ? (
        <View className='jd-section'>
          <Text className='jd-section-title'>任职要求</Text>
          <Text className='jd-section-content'>{job.requirements}</Text>
        </View>
      ) : null}

      {/* 更多信息（还原网页版两列键值对） */}
      <View className='jd-section'>
        <Text className='jd-section-title'>更多信息</Text>
        <View className='jd-info-grid'>
          <View className='jd-info-item'>
            <Text className='jd-info-label'>招聘人数</Text>
            <Text className='jd-info-value'>{job.headcount}人</Text>
          </View>
          {job.department ? (
            <View className='jd-info-item'>
              <Text className='jd-info-label'>所属部门</Text>
              <Text className='jd-info-value'>{job.department}</Text>
            </View>
          ) : null}
          {job.address ? (
            <View className='jd-info-item jd-info-full'>
              <Text className='jd-info-label'>工作地址</Text>
              <View className='jd-addr'>
                <Icon name='map-pin' size={28} color='#9CA3AF' />
                <Text className='jd-info-value'>{job.address}</Text>
              </View>
            </View>
          ) : null}
          <View className='jd-info-item'>
            <Text className='jd-info-label'>发布时间</Text>
            <Text className='jd-info-value'>{formatDate(job.createdAt)}</Text>
          </View>
          {enterprise?.companySize ? (
            <View className='jd-info-item'>
              <Text className='jd-info-label'>公司规模</Text>
              <Text className='jd-info-value'>{enterprise.companySize}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 底部固定操作栏（还原网页版三段式：收藏/投递/沟通） */}
      <View className='jd-bottom-bar safe-bottom'>
        {currentUser?.role === 'TALENT' ? (
          <View className='jd-actions'>
            <View
              className={`jd-fav-btn ${favorited ? 'jd-fav-active' : ''}`}
              onClick={handleToggleFavorite}
            >
              <Icon name='heart' size={40} color={favorited ? '#EF4444' : '#9CA3AF'} fill={favorited ? '#EF4444' : 'none'} />
            </View>
            {applied ? (
              <View className='jd-applied-btn'>
                <Icon name='check' size={32} color='#6B7280' />
                <Text className='jd-applied-text'>{applicationStatus ? statusText[applicationStatus] || '已投递' : '已投递'}</Text>
              </View>
            ) : (
              <View className='jd-apply-btn' onClick={handleApply}>
                <Text className='jd-apply-text'>{actionLoading ? '投递中...' : '投递简历'}</Text>
              </View>
            )}
            <View className='jd-chat-btn' onClick={handleContactEnterprise}>
              <Icon name='send' size={40} color='#FF6B00' />
            </View>
          </View>
        ) : (
          <View className='jd-contact-btn' onClick={handleContactEnterprise}>
            <Icon name='send' size={32} color='#ffffff' />
            <Text className='jd-contact-text'>立即沟通</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function safeEach(arr: any[] | null | undefined, fn: (item: any) => void) {
  if (Array.isArray(arr)) arr.forEach(fn)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
