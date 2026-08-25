import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Picker } from '@tarojs/components'
import { matchesApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import Loading from '../../components/Loading'
import { NAV_SAFE_TOP } from '../../components/NavBar'
import type { Match } from '../../types'
import './index.scss'

function getScoreBadge(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: '高度匹配', cls: 'sb-green' }
  if (score >= 60) return { label: '中等匹配', cls: 'sb-yellow' }
  return { label: '较低匹配', cls: 'sb-red' }
}

function getScoreBoxClass(score: number): string {
  if (score >= 80) return 'box-green'
  if (score >= 60) return 'box-yellow'
  return 'box-red'
}

function formatSalary(min?: number, max?: number): string {
  if (min == null && max == null) return '薪资面议'
  const minK = min != null ? Math.round(min / 1000) : 0
  const maxK = max != null ? Math.round(max / 1000) : 0
  if (minK === maxK) return `${minK}K`
  return `${minK}-${maxK}K`
}

// 企业星级（还原网页版 EnterpriseStar）
function EnterpriseStar({ level }: { level?: number }) {
  if (!level || level <= 0) return <Text className='mm-ent-star mm-ent-star-gray'>普通</Text>
  if (level >= 6) return <Text className='mm-ent-star mm-ent-star-gold'>🏅 金牌</Text>
  return <Text className='mm-ent-star mm-ent-star-orange'>{'★'.repeat(Math.min(level, 5))}</Text>
}

const SORT_OPTIONS = [
  { value: 'score', label: '按匹配度' },
  { value: 'salary', label: '按薪资' },
  { value: 'date', label: '按发布时间' },
]

export default function MyMatches() {
  useRequireAuth('TALENT')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'salary' | 'date'>('score')

  useEffect(() => {
    matchesApi.getMyMatches().then(res => {
      const data: any = res.data
      const list: Match[] = Array.isArray(data) ? data : data?.items ?? []
      list.sort((a: any, b: any) => b.score - a.score)
      setMatches(list)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'salary') return (b.job?.maxSalary || 0) - (a.job?.maxSalary || 0)
    if (sortBy === 'date') return new Date(b.job?.createdAt || '').getTime() - new Date(a.job?.createdAt || '').getTime()
    return b.score - a.score
  })

  if (loading) {
    return (
      <View className='mm-page'>
        <Loading text='AI 匹配加载中...' />
      </View>
    )
  }

  const highMatches = matches.filter(m => m.score >= 80).length
  const midMatches = matches.filter(m => m.score >= 60 && m.score < 80).length
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label

  return (
    <View className='mm-page'>
      <View style={{ height: `${NAV_SAFE_TOP - 25}px` }} />
      {/* 头部（还原网页版：AI 智能匹配标题 + 统计 + 排序下拉） */}
      <View className='mm-header'>
        <View className='mm-header-left'>
          <Text className='mm-title'>AI 智能匹配</Text>
          <Text className='mm-subtitle'>共 {matches.length} 个匹配 · {highMatches} 高度 · {midMatches} 中等</Text>
        </View>
        <Picker
          mode='selector'
          range={SORT_OPTIONS.map(o => o.label)}
          onChange={(e) => setSortBy(SORT_OPTIONS[Number(e.detail.value)].value as any)}
        >
          <View className='mm-sort'>
            <Text className='mm-sort-text'>{sortLabel}</Text>
          </View>
        </Picker>
      </View>

      {matches.length === 0 ? (
        <View className='mm-empty'>
          <Text className='mm-empty-icon'>📊</Text>
          <Text className='mm-empty-text'>暂无智能匹配职位</Text>
          <Text className='mm-empty-sub'>完善您的简历信息，AI 将自动为您匹配适合的职位</Text>
          <View className='mm-empty-btn' onClick={() => Taro.navigateTo({ url: '/pages/edit-talent-profile/index' })}>
            <Text className='mm-empty-btn-text'>完善简历 →</Text>
          </View>
        </View>
      ) : (
        <View className='mm-list'>
          {sortedMatches.map(match => {
            const job: any = match.job
            const enterprise = job?.enterprise
            const scoreBadge = getScoreBadge(match.score)
            const dims = [
              { key: 'salaryMatch', label: '薪资', v: match.salaryMatch },
              { key: 'experienceMatch', label: '经验', v: match.experienceMatch },
              { key: 'genderMatch', label: '性别', v: match.genderMatch },
              { key: 'tenureMatch', label: '任职', v: match.tenureMatch },
              { key: 'enterpriseMatch', label: '企业', v: match.enterpriseMatch },
              { key: 'brandMatch', label: '品牌', v: match.brandMatch },
            ]
            return (
              <View
                key={match.id}
                className='mm-card'
                hoverClass='hover-bg'
                onClick={() => Taro.navigateTo({ url: `/pages/job-detail/index?id=${match.jobId}` })}
              >
                <View className='mm-card-main'>
                  <View className='mm-title-row'>
                    <Text className='mm-job-title'>{job?.title || '未知职位'}</Text>
                    {match.score >= 80 ? <Text className='mm-recommend'>🔥 推荐</Text> : null}
                  </View>
                  <View className='mm-company-row'>
                    <Text className='mm-company'>{enterprise?.companyName || '未知企业'}</Text>
                    {enterprise?.starLevel != null ? <EnterpriseStar level={enterprise.starLevel} /> : null}
                  </View>
                  <View className='mm-meta-row'>
                    <Text className='mm-salary'>{formatSalary(job?.minSalary, job?.maxSalary)}</Text>
                    {job?.city ? <Text className='mm-city'>📍 {job.city}</Text> : null}
                  </View>

                  {/* 快捷维度分 */}
                  <View className='mm-dims'>
                    {dims.map(d => {
                      const v = d.v ?? 0
                      const cls = v >= 80 ? 'dim-green' : v >= 60 ? 'dim-yellow' : 'dim-gray'
                      return (
                        <Text key={d.key} className={`mm-dim ${cls}`}>
                          {d.label} {v}
                        </Text>
                      )
                    })}
                  </View>

                  <View className='mm-badge-row'>
                    <Text className={`mm-score-badge ${scoreBadge.cls}`}>{scoreBadge.label}</Text>
                    {job?.openPartner ? <Text className='mm-partner'>🤝 可合伙</Text> : null}
                  </View>
                </View>

                {/* 分数盒（还原网页版 w-14 h-14 rounded-xl） */}
                <View className={`mm-score-box ${getScoreBoxClass(match.score)}`}>
                  <Text className='mm-score-num'>{match.score}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
