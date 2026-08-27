import { Button, Image, Text, View } from '@tarojs/components'
import type { Job } from '../types'
import { getImageUrl } from '../api'
import Icon from './Icon'
import './JobCard.scss'

interface JobCardProps {
  job: Job
  cuisineMap?: Record<string, string>
  bizTypeMap?: Record<string, string>
  onClick?: () => void
}

const EXPERIENCE_LABELS: Record<string, string> = {
  '0': '经验不限',
  '1': '1年以下',
  '2': '1-3年',
  '3': '3-5年',
  '5': '5-10年',
  '10': '10年以上',
}

const EDUCATION_LABELS: Record<string, string> = {
  '1': '学历不限',
  '2': '初中及以下',
  '3': '中专/中技',
  '4': '高中',
  '5': '大专',
  '6': '本科',
  '7': '硕士',
  '8': '博士',
}

export function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const timestamp = new Date(dateStr).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const diff = Math.max(0, Date.now() - timestamp)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export function formatJobSalary(min?: number, max?: number) {
  if (!min && !max) return '面议'
  const format = (value: number) => {
    const result = value / 1000
    return `${Number.isInteger(result) ? result : result.toFixed(1)}k`
  }
  if (min && max) return `${format(min)}-${format(max)}`
  if (min) return `${format(min)}起`
  return `${format(max || 0)}以内`
}

function resolveFirstLabel(value: string | undefined, labels: Record<string, string>) {
  if (!value) return ''
  const id = value.split(',').map(item => item.trim()).find(Boolean)
  return id ? labels[id] || '' : ''
}

export default function JobCard({ job, cuisineMap = {}, bizTypeMap = {}, onClick }: JobCardProps) {
  const cuisineName = resolveFirstLabel(job.cuisineIds, cuisineMap)
  const bizTypeName = resolveFirstLabel(job.businessTypeIds, bizTypeMap)
  const logo = getImageUrl(job.enterprise?.companyLogo)
  const location = [job.city, job.district].filter(Boolean).join('·') || '工作城市未填写'
  const experience = job.experienceReq == null
    ? '经验不限'
    : EXPERIENCE_LABELS[String(job.experienceReq)] || `${job.experienceReq}年以上`
  const education = job.educationReq
    ? EDUCATION_LABELS[String(job.educationReq)] || String(job.educationReq)
    : ''
  const accessibleLabel = `${job.title}，${formatJobSalary(job.minSalary, job.maxSalary)}，${job.enterprise?.companyName || '企业未填写'}，${location}`

  return (
    <Button
      className='ui-button-reset job-card-v2'
      hoverClass='job-card-v2-pressed'
      hoverStayTime={80}
      aria-label={accessibleLabel}
      onClick={onClick}
    >
      <View className='job-card-header'>
        <Text className='job-title'>{job.title}</Text>
        <Text className='job-salary'>{formatJobSalary(job.minSalary, job.maxSalary)}</Text>
      </View>

      <View className='job-card-meta'>
        <View className='job-card-location'>
          <Icon name='map-pin' size={24} color='#86909C' />
          <Text className='job-card-meta-text'>{location}</Text>
        </View>
        <Text className='job-card-meta-dot'>·</Text>
        <Text className='job-card-meta-text'>{experience}</Text>
        {education ? <Text className='job-card-meta-dot'>·</Text> : null}
        {education ? <Text className='job-card-meta-text'>{education}</Text> : null}
      </View>

      {cuisineName || bizTypeName ? (
        <View className='job-card-tags'>
          {cuisineName ? <Text className='job-card-tag'>{cuisineName}</Text> : null}
          {bizTypeName ? <Text className='job-card-tag'>{bizTypeName}</Text> : null}
        </View>
      ) : null}

      <View className='job-card-company'>
        <View className='company-logo-wrap'>
          {logo ? (
            <Image src={logo} className='company-logo-img' mode='aspectFill' />
          ) : (
            <Text className='company-logo-text'>{job.enterprise?.companyName?.charAt(0) || '企'}</Text>
          )}
        </View>
        <Text className='company-name'>{job.enterprise?.companyName || '企业信息未填写'}</Text>
        {job.enterprise?.companySize ? <Text className='company-size'>· {job.enterprise.companySize}</Text> : null}
        <Text className='job-time'>{timeAgo(job.createdAt)}</Text>
        <Icon name='chevron-right' size={24} color='#C9CDD4' />
      </View>
    </Button>
  )
}
