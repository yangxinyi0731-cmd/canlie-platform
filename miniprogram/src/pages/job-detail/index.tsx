import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'
import { getImageUrl, jobsApi, matchesApi, refApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Icon from '../../components/Icon'
import Loading from '../../components/Loading'
import MatchEvidence from '../../components/MatchEvidence'
import StatusBadge from '../../components/StatusBadge'
import StickyActionBar from '../../components/StickyActionBar'
import { formatJobSalary } from '../../components/JobCard'
import type { Job, Match } from '../../types'
import './index.scss'

const EDUCATION_MAP: Record<string, string> = {
  '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中',
  '5': '大专', '6': '本科', '7': '硕士', '8': '博士',
}

const EXPERIENCE_MAP: Record<string, string> = {
  '0': '经验不限', '1': '1年以下', '2': '1-3年', '3': '3-5年', '5': '5-10年', '10': '10年以上',
}

const APPLICATION_STATUS: Record<string, { text: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING: { text: '已投递·待查看', tone: 'warning' },
  VIEWED: { text: '企业已查看', tone: 'info' },
  CONTACTED: { text: '企业已联系', tone: 'info' },
  INTERVIEWED: { text: '已邀请面试', tone: 'info' },
  REJECTED: { text: '暂不合适', tone: 'danger' },
  ACCEPTED: { text: '已通过', tone: 'success' },
}

function DetailLoading() {
  return (
    <View className='jd-page'>
      <NavBar title='职位详情' />
      <View className='jd-loading-region'>
        <Loading text='正在加载职位详情…' />
      </View>
    </View>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className='jd-page'>
      <NavBar title='职位详情' />
      <View className='jd-error-page'>
        <View className='jd-error-icon'>
          <Icon name='briefcase' size={56} color='#FF6B00' />
        </View>
        <Text className='jd-error-text'>{message}</Text>
        <Button
          className='ui-button-reset jd-error-retry'
          hoverClass='jd-button-pressed'
          onClick={onRetry}
        >
          重新加载
        </Button>
      </View>
    </View>
  )
}

export default function JobDetail() {
  const router = useRouter()
  const id = router.params.id
  useRequireAuth()
  const { user: currentUser } = useAuthStore()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [cuisineMap, setCuisineMap] = useState<Record<string, string>>({})
  const [bizTypeMap, setBizTypeMap] = useState<Record<string, string>>({})
  const [match, setMatch] = useState<Match | null>(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(false)
  const jobRequestRef = useRef(0)

  const fetchJob = useCallback(async () => {
    if (!id) {
      setError('缺少职位编号')
      setLoading(false)
      return
    }
    const seq = ++jobRequestRef.current
    setLoading(true)
    setError(null)
    try {
      const response = await jobsApi.getById(id)
      if (seq !== jobRequestRef.current) return
      setJob(response.data as Job)
    } catch (requestError: any) {
      if (seq !== jobRequestRef.current) return
      setError(requestError?.message || '加载职位详情失败')
    } finally {
      if (seq === jobRequestRef.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchJob()
    let active = true
    refApi.getAll().then(response => {
      if (!active) return
      const data: any = response.data
      const cuisines: Record<string, string> = {}
      safeArray<any>(data?.cuisines).forEach(item => { cuisines[String(item.id)] = item.name })
      setCuisineMap(cuisines)
      const businessTypes: Record<string, string> = {}
      safeArray<any>(data?.businessTypes).forEach(item => { businessTypes[String(item.id)] = item.name })
      setBizTypeMap(businessTypes)
    }).catch(() => {})
    return () => {
      active = false
      jobRequestRef.current += 1
    }
  }, [fetchJob])

  useEffect(() => {
    if (currentUser?.role !== 'TALENT' || !id) return
    let active = true

    Promise.allSettled([jobsApi.isFavorited(id), jobsApi.checkApplied(id)]).then(([favoriteResult, appliedResult]) => {
      if (!active) return
      if (favoriteResult.status === 'fulfilled') {
        setFavorited(!!(favoriteResult.value.data as any)?.favorited)
      }
      if (appliedResult.status === 'fulfilled') {
        setApplied(!!(appliedResult.value.data as any)?.applied)
        setApplicationStatus((appliedResult.value.data as any)?.status || null)
      }
    })

    return () => { active = false }
  }, [currentUser?.role, id])

  useEffect(() => {
    if (currentUser?.role !== 'TALENT' || !id) return
    let active = true
    setMatchLoading(true)
    setMatchError(false)
    matchesApi.getMyMatches().then(response => {
      if (!active) return
      const records = safeArray<Match>(Array.isArray(response.data) ? response.data : (response.data as any)?.items)
      setMatch(records.find(item => item.jobId === id) || null)
    }).catch(() => {
      if (active) setMatchError(true)
    }).finally(() => {
      if (active) setMatchLoading(false)
    })
    return () => { active = false }
  }, [currentUser?.role, id])

  const handleContactEnterprise = () => {
    if (!job?.enterprise?.userId) return
    Taro.navigateTo({
      url: `/pages/chat-conversation/index?chatWith=${job.enterprise.userId}${id ? `&jobId=${id}` : ''}`,
    })
  }

  const handleToggleFavorite = async () => {
    if (!id || favoriteLoading) return
    setFavoriteLoading(true)
    try {
      if (favorited) {
        await jobsApi.unfavorite(id)
        setFavorited(false)
      } else {
        await jobsApi.favorite(id)
        setFavorited(true)
      }
    } catch (requestError: any) {
      Taro.showToast({ title: requestError?.message || '收藏操作失败', icon: 'none' })
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleApply = async () => {
    if (!id || applyLoading || applied) return
    setApplyLoading(true)
    try {
      await jobsApi.apply(id)
      setApplied(true)
      setApplicationStatus('PENDING')
      Taro.showToast({ title: '投递成功', icon: 'success' })
    } catch (requestError: any) {
      const message = requestError?.message || '投递失败'
      if (message.includes('已投递')) {
        setApplied(true)
        setApplicationStatus('PENDING')
      } else {
        Taro.showToast({ title: message, icon: 'none' })
      }
    } finally {
      setApplyLoading(false)
    }
  }

  if (loading) return <DetailLoading />
  if (error || !job) return <ErrorState message={error || '职位不存在'} onRetry={fetchJob} />

  const { enterprise } = job
  const logo = getImageUrl(enterprise?.companyLogo)
  const cuisineTags = resolveTags(job.cuisineIds, cuisineMap)
  const businessTags = resolveTags(job.businessTypeIds, bizTypeMap)
  const educationLabel = job.educationReq ? EDUCATION_MAP[String(job.educationReq)] || String(job.educationReq) : ''
  const experienceLabel = job.experienceReq == null
    ? '经验不限'
    : EXPERIENCE_MAP[String(job.experienceReq)] || `${job.experienceReq}年以上`
  const location = [job.province, job.city, job.district].filter(Boolean).join('·') || '工作城市未填写'
  const application = applicationStatus ? APPLICATION_STATUS[applicationStatus] : null

  return (
    <View className='jd-page'>
      <NavBar title='职位详情' />

      <View className='jd-summary'>
        <View className='jd-title-row'>
          <Text className='jd-title'>{job.title}</Text>
          <Text className='jd-salary'>{formatJobSalary(job.minSalary, job.maxSalary)}</Text>
        </View>
        <View className='jd-primary-meta'>
          <Text>{location}</Text>
          <Text className='jd-meta-dot'>·</Text>
          <Text>{experienceLabel}</Text>
          {educationLabel ? <Text className='jd-meta-dot'>·</Text> : null}
          {educationLabel ? <Text>{educationLabel}</Text> : null}
          {job.salaryMonth > 0 ? <Text className='jd-meta-dot'>·</Text> : null}
          {job.salaryMonth > 0 ? <Text>{job.salaryMonth}薪</Text> : null}
        </View>

        {cuisineTags.length > 0 || businessTags.length > 0 ? (
          <View className='jd-tags'>
            {cuisineTags.map(tag => <Text key={`c-${tag}`} className='jd-tag'>{tag}</Text>)}
            {businessTags.map(tag => <Text key={`b-${tag}`} className='jd-tag'>{tag}</Text>)}
          </View>
        ) : null}

        <Button
          className='ui-button-reset jd-company-row'
          hoverClass='jd-company-row-pressed'
          aria-label={`查看企业：${enterprise?.companyName || '企业信息未填写'}`}
          onClick={() => enterprise?.id && Taro.navigateTo({ url: `/pages/enterprise-detail/index?id=${enterprise.id}` })}
        >
          {logo ? (
            <Image src={logo} className='jd-logo-img' mode='aspectFill' />
          ) : (
            <View className='jd-logo'>
              <Text className='jd-logo-text'>{enterprise?.companyName?.charAt(0) || '企'}</Text>
            </View>
          )}
          <View className='jd-company-info'>
            <Text className='jd-company-name'>{enterprise?.companyName || '企业信息未填写'}</Text>
            <Text className='jd-company-meta'>{[enterprise?.city, enterprise?.companySize].filter(Boolean).join(' · ') || '企业详情'}</Text>
          </View>
          <Icon name='chevron-right' size={30} color='#86909C' />
        </Button>
      </View>

      {currentUser?.role === 'TALENT' ? (
        <View className='jd-evidence-section'>
          <MatchEvidence match={match} loading={matchLoading} error={matchError} />
        </View>
      ) : null}

      <View className='jd-section'>
        <Text className='jd-section-title'>职位描述</Text>
        <Text className='jd-section-content'>{job.description || '暂无职位描述'}</Text>
      </View>

      {job.requirements ? (
        <View className='jd-section'>
          <Text className='jd-section-title'>任职要求</Text>
          <Text className='jd-section-content'>{job.requirements}</Text>
        </View>
      ) : null}

      <View className='jd-section'>
        <Text className='jd-section-title'>职位信息</Text>
        <View className='jd-info-list'>
          <InfoRow label='招聘人数' value={`${job.headcount || 1}人`} />
          {job.department ? <InfoRow label='所属部门' value={job.department} /> : null}
          {job.address ? <InfoRow label='工作地址' value={job.address} /> : null}
          {enterprise?.companySize ? <InfoRow label='公司规模' value={enterprise.companySize} /> : null}
          <InfoRow label='发布时间' value={formatDate(job.createdAt)} />
        </View>
      </View>

      <StickyActionBar label='职位操作'>
        {currentUser?.role === 'TALENT' ? (
          <View className='jd-actions'>
            <Button
              className={`ui-button-reset jd-icon-action ${favorited ? 'jd-icon-action-active' : ''}`}
              hoverClass='jd-button-pressed'
              disabled={favoriteLoading}
              aria-label={favorited ? '取消收藏' : '收藏职位'}
              onClick={handleToggleFavorite}
            >
              <Icon name='heart' size={34} color={favorited ? '#E5484D' : '#4E5969'} fill={favorited ? '#E5484D' : 'none'} />
              <Text>{favoriteLoading ? '处理中' : favorited ? '已收藏' : '收藏'}</Text>
            </Button>

            {applied ? (
              <View className='jd-applied-state' role='status'>
                <StatusBadge text={application?.text || '已投递'} tone={application?.tone || 'neutral'} />
              </View>
            ) : (
              <Button
                className='ui-button-reset jd-apply-action'
                hoverClass='jd-primary-button-pressed'
                disabled={applyLoading}
                onClick={handleApply}
              >
                {applyLoading ? '投递中…' : '投递简历'}
              </Button>
            )}

            <Button
              className='ui-button-reset jd-chat-action'
              hoverClass='jd-button-pressed'
              disabled={!enterprise?.userId}
              onClick={handleContactEnterprise}
            >
              <Icon name='message-circle' size={32} color='#FF6B00' />
              <Text>沟通</Text>
            </Button>
          </View>
        ) : (
          <Button
            className='ui-button-reset jd-contact-action'
            hoverClass='jd-primary-button-pressed'
            disabled={!enterprise?.userId}
            onClick={handleContactEnterprise}
          >
            <Icon name='message-circle' size={32} color='#FFFFFF' />
            <Text>立即沟通</Text>
          </Button>
        )}
      </StickyActionBar>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className='jd-info-row'>
      <Text className='jd-info-label'>{label}</Text>
      <Text className='jd-info-value'>{value}</Text>
    </View>
  )
}

function resolveTags(value: string | undefined, labels: Record<string, string>) {
  if (!value) return []
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(id => labels[id] || id)
    .slice(0, 3)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '未填写'
  const date = new Date(dateStr)
  if (!Number.isFinite(date.getTime())) return '未填写'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
