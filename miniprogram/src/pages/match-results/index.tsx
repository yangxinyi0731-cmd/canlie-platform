import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { matchesApi, jobsApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import type { Match, Job } from '../../types'
import './index.scss'

// 15 个匹配维度（还原网页版 BREAKDOWN_ITEMS）
const BREAKDOWN_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'salaryMatch', label: '薪资', icon: '💰' },
  { key: 'cuisineMatch', label: '菜系', icon: '🍳' },
  { key: 'businessMatch', label: '业态', icon: '🏢' },
  { key: 'cityMatch', label: '地域', icon: '📍' },
  { key: 'experienceMatch', label: '经验', icon: '📋' },
  { key: 'educationMatch', label: '学历', icon: '🎓' },

  { key: 'brandMatch', label: '品牌', icon: '⭐' },
  { key: 'stabilityMatch', label: '稳定性', icon: '🏠' },
  { key: 'growthMatch', label: '成长', icon: '📈' },
  { key: 'partnerMatch', label: '合伙', icon: '🤝' },
  { key: 'ageMatch', label: '年龄', icon: '🎂' },
  { key: 'skillMatch', label: '技能', icon: '🔧' },
  { key: 'genderMatch', label: '性别', icon: '👤' },
  { key: 'tenureMatch', label: '任职', icon: '⏳' },
  { key: 'enterpriseMatch', label: '企业', icon: '🏢' },
]

function getScoreLevel(score: number): { text: string; cls: string; border: string } {
  if (score >= 80) return { text: '高度匹配', cls: 'text-green', border: 'bl-green' }
  if (score >= 60) return { text: '中等匹配', cls: 'text-yellow', border: 'bl-yellow' }
  return { text: '低匹配', cls: 'text-red', border: 'bl-red' }
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'sb-green'
  if (score >= 60) return 'sb-yellow'
  return 'sb-red'
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bar-green'
  if (score >= 60) return 'bar-yellow'
  return 'bar-red'
}

// 星级展示（还原网页版 StarDisplay）
function StarDisplay({ level }: { level: number }) {
  if (level >= 6) {
    return <Text className='mr-star mr-star-gold'>🏅 金牌</Text>
  }
  if (level <= 0) {
    return <Text className='mr-star mr-star-gray'>普通</Text>
  }
  return <Text className='mr-star mr-star-orange'>{'★'.repeat(Math.min(level, 5))}</Text>
}

// 维度进度条（还原网页版 BreakdownBar）
function BreakdownBar({ value, label, icon }: { value: number; label: string; icon: string }) {
  const v = value ?? 0
  const scoreCls = v >= 80 ? 'text-green' : v >= 60 ? 'text-yellow' : 'text-red'
  return (
    <View className='mr-bar-row'>
      <Text className='mr-bar-icon'>{icon}</Text>
      <Text className='mr-bar-label'>{label}</Text>
      <View className='mr-bar-track'>
        <View className={`mr-bar-fill ${getBarColor(v)}`} style={{ width: `${Math.max(3, v)}%` }} />
      </View>
      <Text className={`mr-bar-score ${scoreCls}`}>{v}</Text>
    </View>
  )
}

export default function MatchResults() {
  useRequireAuth('ENTERPRISE')
  const router = useRouter()
  const { jobId } = router.params

  const [job, setJob] = useState<Job | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [rematching, setRematching] = useState(false)

  useEffect(() => {
    if (!jobId) return
    loadData()
  }, [jobId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [jobRes, matchRes] = await Promise.all([
        jobsApi.getById(jobId!).catch(() => null),
        matchesApi.getJobMatches(jobId!),
      ])
      if (jobRes) setJob(jobRes.data as any)
      const raw = safeArray<any>((matchRes.data as any)?.items || matchRes.data)
      const sorted: Match[] = raw.sort((a: any, b: any) => b.score - a.score)
      setMatches(sorted)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleRematch = async () => {
    if (!jobId || rematching) return
    setRematching(true)
    try {
      await matchesApi.runMatch(jobId)
      await loadData()
    } catch {
      Taro.showToast({ title: '重新匹配失败，请重试', icon: 'none' })
    } finally {
      setRematching(false)
    }
  }

  const handleChat = (match: Match) => {
    const talentUserId = (match.talent as any)?.userId
    if (!talentUserId) return
    Taro.navigateTo({
      url: `/pages/chat-conversation/index?chatWith=${talentUserId}&jobId=${match.jobId}`,
    })
  }

  if (loading) {
    return (
      <View className='mr-page'>
        <NavBar title='AI 匹配结果' />
        <Loading text='AI 匹配计算中...' />
      </View>
    )
  }

  return (
    <View className='mr-page'>
      <NavBar
        title={job?.title || 'AI 匹配结果'}
        right={
          <Text
            className={`mr-rematch-btn ${rematching ? 'mr-rematch-disabled' : ''}`}
            onClick={handleRematch}
          >
            {rematching ? 'AI匹配中...' : '重新匹配'}
          </Text>
        }
      />

      <View className='mr-body'>
        {matches.length === 0 ? (
          <View className='mr-empty'>
            <Text className='mr-empty-icon'>🔍</Text>
            <Text className='mr-empty-text'>暂无智能匹配结果</Text>
            <Text className='mr-empty-sub'>点击"重新匹配"，AI 将自动分析所有人才</Text>
            <View className={`mr-empty-btn ${rematching ? 'mr-rematch-disabled' : ''}`} onClick={handleRematch}>
              <Text className='mr-empty-btn-text'>{rematching ? 'AI分析中...' : '开始 AI 匹配'}</Text>
            </View>
          </View>
        ) : (
          <View>
            <View className='mr-meta-row'>
              <Text className='mr-meta'>
                AI 匹配 <Text className='mr-meta-num'>{matches.length}</Text> 位候选人
              </Text>
              <Text className='mr-meta'>按匹配度排列</Text>
            </View>

            {matches.map(match => {
              const talent: any = match.talent
              const scoreLevel = getScoreLevel(match.score)
              return (
                <View key={match.id} className={`mr-card ${scoreLevel.border}`}>
                  <View className='mr-card-body'>
                    <View className='mr-head'>
                      {/* 分数圆环（还原网页版 w-16 圆形分数卡） */}
                      <View className={`mr-score-circle ${match.score >= 80 ? 'sc-green' : match.score >= 60 ? 'sc-yellow' : 'sc-red'}`}>
                        <Text className={`mr-score-num ${scoreLevel.cls}`}>{match.score}</Text>
                        <Text className='mr-score-label'>匹配度</Text>
                      </View>

                      {/* 人才信息 */}
                      <View className='mr-talent-info'>
                        <View className='mr-talent-name-row'>
                          <Text className='mr-talent-name'>{talent?.realName || '未知'}</Text>
                          <StarDisplay level={talent?.starLevel ?? 0} />
                        </View>
                        <Text className='mr-talent-title'>{talent?.title || '-'}</Text>
                        <Text className='mr-talent-meta'>
                          {[talent?.currentCompany, talent?.city].filter(Boolean).join(' · ') || '-'}
                        </Text>
                        <View className='mr-talent-tags'>
                          {talent?.workYears != null ? <Text className='mr-talent-tag'>🏗 {talent.workYears}年经验</Text> : null}
                          {talent?.education ? <Text className='mr-talent-tag'>🎓 {talent.education}</Text> : null}
                          {talent?.maritalStatus ? (
                            <Text className='mr-talent-tag'>{talent.maritalStatus === 'MARRIED' ? '💍 已婚' : '👤 单身'}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* 维度分解 */}
                    <View className='mr-breakdown'>
                      <Text className='mr-breakdown-title'>AI 匹配维度分解</Text>
                      {BREAKDOWN_ITEMS.map(item => (
                        <BreakdownBar
                          key={item.key}
                          label={item.label}
                          icon={item.icon}
                          value={(match as any)[item.key] ?? 0}
                        />
                      ))}
                    </View>

                    {/* 底部操作 */}
                    <View className='mr-actions'>
                      <Text className={`mr-level-badge ${getScoreBadgeClass(match.score)}`}>
                        {match.score >= 80 ? '🟢' : match.score >= 60 ? '🟡' : '🔴'} {scoreLevel.text}
                      </Text>
                      <View className='mr-action-btns'>
                        <Text
                          className='mr-btn mr-btn-gray'
                          onClick={() => Taro.navigateTo({ url: `/pages/talent-detail/index?id=${match.talentId}` })}
                        >
                          查看简历
                        </Text>
                        <Text className='mr-btn mr-btn-primary' onClick={() => handleChat(match)}>沟通</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}
