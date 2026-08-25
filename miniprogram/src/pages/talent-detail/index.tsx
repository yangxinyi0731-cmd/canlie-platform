import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { talentsApi, refApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import StarRating from '../../components/StarRating'
import Icon from '../../components/Icon'
import type { Talent, WorkExperience } from '../../types'
import './index.scss'

function formatSalary(min?: number, max?: number): string {
  if (min != null && max != null) return `${min / 1000}k-${max / 1000}k`
  if (min != null) return `${min / 1000}k以上`
  if (max != null) return `${max / 1000}k以下`
  return '面议'
}

function formatDateRange(exp: WorkExperience) {
  const start = `${exp.startYear}年${exp.startMonth}月`
  const end = exp.isCurrent ? '至今' : (exp.endYear ? `${exp.endYear}年${exp.endMonth}月` : '')
  return `${start} - ${end}`
}

export default function TalentDetail() {
  useRequireAuth()
  const router = useRouter()
  const { id } = router.params
  const { user } = useAuthStore()

  const [talent, setTalent] = useState<Talent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cuisines, setCuisines] = useState<any[]>([])
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [jobCategories, setJobCategories] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      talentsApi.getById(id!),
      refApi.getAll(),
    ]).then(([talentRes, refRes]) => {
      setTalent(talentRes.data as any)
      const ref: any = refRes.data
      setCuisines(safeArray(ref?.cuisines))
      setBusinessTypes(safeArray(ref?.businessTypes))
      setJobCategories(safeArray(ref?.jobCategories))
    }).catch((err: any) => {
      setError(err?.message || '获取人才信息失败')
    }).finally(() => setLoading(false))
  }, [id])

  const getCuisineNames = (ids?: string) => {
    if (!ids) return []
    return ids.split(',').map(cid => cuisines.find((c: any) => c.id === cid)?.name).filter(Boolean) as string[]
  }

  const getBusinessTypeNames = (ids?: string) => {
    if (!ids) return []
    return ids.split(',').map(bid => businessTypes.find((b: any) => b.id === bid)?.name).filter(Boolean) as string[]
  }

  const getJobCategoryName = (catId?: string) => {
    if (!catId) return null
    for (const cat of jobCategories) {
      const sub = safeArray<any>(cat.subCategories).find(s => s.id === catId)
      if (sub) return `${cat.name} · ${sub.name}`
    }
    return null
  }

  if (loading) {
    return (
      <View className='td-page'>
        <NavBar title='人才详情' />
        <Loading />
      </View>
    )
  }

  if (error || !talent) {
    return (
      <View className='td-page'>
        <NavBar title='人才详情' />
        <View className='td-error'>
          <Text className='td-error-text'>{error || '人才不存在'}</Text>
          <View className='btn-primary td-error-btn' onClick={() => Taro.navigateBack()}>
            <Text className='td-error-btn-text'>返回</Text>
          </View>
        </View>
      </View>
    )
  }

  const displayName = talent.realName || '匿名人才'
  const cuisineNames = getCuisineNames(talent.cuisineIds)
  const businessTypeNames = getBusinessTypeNames(talent.businessTypeIds)
  const jobCategoryLabel = getJobCategoryName(talent.jobCategoryId)
  const workExperiences = talent.workExperiences || []

  return (
    <View className='td-page'>
      <NavBar title='人才详情' />

      <View className='td-body'>
        {/* 个人卡（还原网页版：64 渐变头像 + 星级 + 期望薪资） */}
        <View className='td-card'>
          <View className='td-head'>
            <View className='td-avatar'>
              <Text className='td-avatar-text'>{displayName.charAt(0)}</Text>
            </View>
            <View className='td-head-info'>
              <View className='td-name-row'>
                <Text className='td-name'>{displayName}</Text>
                {talent.starLevel > 0 ? (
                  <View className='td-star-row'>
                    <StarRating value={talent.starLevel} size={24} />
                    <Text className='td-star-label'>({talent.starLevelStr})</Text>
                  </View>
                ) : null}
              </View>
              {jobCategoryLabel ? <Text className='td-cat'>{jobCategoryLabel}</Text> : null}
              <Text className='td-title'>{talent.title || '未填写职位'}</Text>
              {talent.currentCompany ? <Text className='td-company'>{talent.currentCompany}</Text> : null}
            </View>
          </View>

          {/* 薪资/所在地 */}
          <View className='td-salary-row'>
            <View className='td-salary-block'>
              <Text className='td-label'>期望薪资</Text>
              <Text className='td-salary'>{formatSalary(talent.minSalary, talent.maxSalary)}</Text>
            </View>
            {talent.city || talent.province ? (
              <View className='td-salary-block td-right'>
                <Text className='td-label'>所在地</Text>
                <Text className='td-loc'>{talent.city}{talent.province ? ` · ${talent.province}` : ''}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 基本信息（还原网页版两列键值对） */}
        <View className='td-card'>
          <Text className='td-section-title'>基本信息</Text>
          <View className='td-info-grid'>
            <View className='td-info-item'>
              <Text className='td-info-label'>工作年限</Text>
              <Text className='td-info-value'>{talent.workYears ? `${talent.workYears}年` : '未填写'}</Text>
            </View>
            <View className='td-info-item'>
              <Text className='td-info-label'>学历</Text>
              <Text className='td-info-value'>{talent.education || '未填写'}</Text>
            </View>
            {talent.gender ? (
              <View className='td-info-item'>
                <Text className='td-info-label'>性别</Text>
                <Text className='td-info-value'>{talent.gender === 'MALE' ? '男' : '女'}</Text>
              </View>
            ) : null}
            {talent.birthYear ? (
              <View className='td-info-item'>
                <Text className='td-info-label'>出生年月</Text>
                <Text className='td-info-value'>{talent.birthYear}年{talent.birthMonth ? `${talent.birthMonth}月` : ''}</Text>
              </View>
            ) : null}
            {talent.hometown || talent.hometownProvince ? (
              <View className='td-info-item'>
                <Text className='td-info-label'>籍贯</Text>
                <Text className='td-info-value'>{talent.hometownProvince ? `${talent.hometownProvince} ` : ''}{talent.hometown || ''}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 工作经历时间线（还原网页版竖向 timeline） */}
        {workExperiences.length > 0 ? (
          <View className='td-card'>
            <View className='td-section-title-row'>
              <Icon name='calendar' size={32} color='#FF6B00' />
              <Text className='td-section-title'>工作经历</Text>
            </View>
            <View>
              {workExperiences.map((exp, idx) => (
                <View key={exp.id || idx} className='td-exp-row'>
                  <View className='td-exp-timeline'>
                    <View className={`td-exp-dot ${exp.isCurrent ? 'td-exp-dot-current' : ''}`} />
                    {idx < workExperiences.length - 1 ? <View className='td-exp-line' /> : null}
                  </View>
                  <View className='td-exp-content'>
                    <Text className='td-exp-position'>{exp.position}</Text>
                    <Text className='td-exp-company'>{exp.companyName}</Text>
                    <Text className='td-exp-date'>{formatDateRange(exp)}</Text>
                    {exp.description ? <Text className='td-exp-desc'>{exp.description}</Text> : null}
                    {exp.isCurrent ? <Text className='td-exp-badge'>现任</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 专业领域 */}
        {cuisineNames.length > 0 || businessTypeNames.length > 0 ? (
          <View className='td-card'>
            <Text className='td-section-title'>专业领域</Text>
            {cuisineNames.length > 0 ? (
              <View className='td-spec-group'>
                <Text className='td-label'>菜系专长</Text>
                <View className='td-spec-tags'>
                  {cuisineNames.map(name => <Text key={name} className='td-chip td-chip-orange'>{name}</Text>)}
                </View>
              </View>
            ) : null}
            {businessTypeNames.length > 0 ? (
              <View className='td-spec-group'>
                <Text className='td-label'>业态经验</Text>
                <View className='td-spec-tags'>
                  {businessTypeNames.map(name => <Text key={name} className='td-chip td-chip-blue'>{name}</Text>)}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 品牌背书 / 头部品牌经历 / 自我介绍 */}
        {talent.brandEndorsement ? (
          <View className='td-card'>
            <Text className='td-section-title'>品牌背书</Text>
            <Text className='td-text'>{talent.brandEndorsement}</Text>
          </View>
        ) : null}
        {talent.headBrandExp ? (
          <View className='td-card'>
            <Text className='td-section-title'>头部品牌经历</Text>
            <Text className='td-text'>{talent.headBrandExp}</Text>
          </View>
        ) : null}
        {talent.selfIntro ? (
          <View className='td-card'>
            <Text className='td-section-title'>自我介绍</Text>
            <Text className='td-text'>{talent.selfIntro}</Text>
          </View>
        ) : null}

        {/* 合伙开放提示（还原网页版橙底卡） */}
        {talent.acceptPartner ? (
          <View className='td-partner-card'>
            <Icon name='users' size={48} color='#FF6B00' />
            <View className='td-partner-text'>
              <Text className='td-partner-title'>接受合伙/投资机会</Text>
              <Text className='td-partner-sub'>该人才对合伙或投资机会持开放态度</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* 底部沟通按钮（仅企业端可见，还原网页版） */}
      {user?.role === 'ENTERPRISE' ? (
        <View className='td-bottom-bar safe-bottom'>
          <View className='td-contact-btn' onClick={() => Taro.navigateTo({ url: `/pages/chat-conversation/index?chatWith=${talent.userId}` })}>
            <Icon name='message-square' size={36} color='#ffffff' />
            <Text className='td-contact-text'>立即沟通</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
