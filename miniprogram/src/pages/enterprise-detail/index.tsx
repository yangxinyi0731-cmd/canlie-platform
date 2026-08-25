import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { enterpriseApi, getImageUrl } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Icon from '../../components/Icon'
import type { Enterprise, Job } from '../../types'
import './index.scss'

// 公司规模映射（还原网页版 companySizeMap）
const COMPANY_SIZE_MAP: Record<string, string> = {
  '1-50': '1-50人',
  '50-200': '50-200人',
  '200-500': '200-500人',
  '500-2000': '500-2000人',
  '2000+': '2000人以上',
}

export default function EnterpriseDetail() {
  useRequireAuth()
  const router = useRouter()
  const { id } = router.params

  const [enterprise, setEnterprise] = useState<(Enterprise & { jobs?: Job[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    enterpriseApi.getById(id!).then(res => {
      setEnterprise(res.data as any)
    }).catch((err: any) => {
      setError(err?.message || '获取企业信息失败')
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <View className='ed-page'>
        <NavBar title='企业详情' />
        <Loading />
      </View>
    )
  }

  if (error || !enterprise) {
    return (
      <View className='ed-page'>
        <NavBar title='企业详情' />
        <View className='ed-error'>
          <Text className='ed-error-text'>{error || '企业不存在'}</Text>
          <View className='btn-primary ed-error-btn' onClick={() => Taro.navigateBack()}>
            <Text className='ed-error-btn-text'>返回</Text>
          </View>
        </View>
      </View>
    )
  }

  const activeJobs = enterprise.jobs?.filter(j => j.status === 'ACTIVE') || []
  const logo = getImageUrl(enterprise.companyLogo)

  return (
    <View className='ed-page'>
      <NavBar title='企业详情' />

      <View className='ed-body'>
        {/* 公司卡（还原网页版：64 渐变 logo + 3 列统计） */}
        <View className='ed-card'>
          <View className='ed-head'>
            {logo ? (
              <Image src={logo} className='ed-logo-img' mode='aspectFill' />
            ) : (
              <View className='ed-logo'>
                <Text className='ed-logo-text'>{enterprise.companyName?.charAt(0) || '企'}</Text>
              </View>
            )}
            <View className='ed-head-info'>
              <Text className='ed-name'>{enterprise.companyName}</Text>
              {enterprise.city ? (
                <View className='ed-city'>
                  <Icon name='map-pin' size={28} color='#6B7280' />
                  <Text className='ed-city-text'>{enterprise.city}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className='ed-stats'>
            <View className='ed-stat'>
              <Text className='ed-stat-num'>{activeJobs.length}</Text>
              <Text className='ed-stat-label'>在招职位</Text>
            </View>
            <View className='ed-stat'>
              <Text className='ed-stat-num'>{COMPANY_SIZE_MAP[enterprise.companySize || ''] || '未填写'}</Text>
              <Text className='ed-stat-label'>公司规模</Text>
            </View>
            <View className='ed-stat'>
              <Text className='ed-stat-num ed-stat-primary'>{enterprise.licenseVerified ? '已认证' : '未认证'}</Text>
              <Text className='ed-stat-label'>企业认证</Text>
            </View>
          </View>
        </View>

        {/* 企业简介 */}
        {enterprise.description ? (
          <View className='ed-card'>
            <Text className='ed-section-title'>企业简介</Text>
            <Text className='ed-text'>{enterprise.description}</Text>
          </View>
        ) : null}

        {/* 联系方式 */}
        <View className='ed-card'>
          <Text className='ed-section-title'>联系方式</Text>
          {enterprise.contactName ? (
            <View className='ed-contact-row'>
              <Text className='ed-contact-label'>联系人</Text>
              <Text className='ed-contact-value'>{enterprise.contactName}</Text>
            </View>
          ) : null}
          {enterprise.contactPhone ? (
            <View className='ed-contact-row'>
              <Text className='ed-contact-label'>电话</Text>
              <Text className='ed-contact-value'>{enterprise.contactPhone}</Text>
            </View>
          ) : null}
          {enterprise.address ? (
            <View className='ed-contact-row'>
              <Text className='ed-contact-label'>地址</Text>
              <Text className='ed-contact-value'>{enterprise.address}</Text>
            </View>
          ) : null}
          {enterprise.website ? (
            <View className='ed-contact-row'>
              <Text className='ed-contact-label'>官网</Text>
              <Text
                className='ed-contact-link'
                onClick={() => {
                  Taro.setClipboardData({ data: enterprise.website || '' })
                }}
              >
                {enterprise.website}（点击复制）
              </Text>
            </View>
          ) : null}
        </View>

        {/* 在招职位 */}
        {activeJobs.length > 0 ? (
          <View className='ed-card'>
            <Text className='ed-section-title'>在招职位 ({activeJobs.length})</Text>
            <View>
              {activeJobs.map(job => (
                <View
                  key={job.id}
                  className='ed-job-row'
                  hoverClass='hover-bg'
                  onClick={() => Taro.navigateTo({ url: `/pages/job-detail/index?id=${job.id}` })}
                >
                  <View className='ed-job-info'>
                    <Text className='ed-job-title'>{job.title}</Text>
                    <Text className='ed-job-city'>{job.city}</Text>
                  </View>
                  <Text className='ed-job-salary'>{job.minSalary / 1000}k-{job.maxSalary / 1000}k</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}
