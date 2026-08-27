import { Text, View } from '@tarojs/components'
import type { Match } from '../types'
import StatusBadge from './StatusBadge'
import './MatchEvidence.scss'

interface MatchEvidenceProps {
  match: Match | null
  loading?: boolean
  error?: boolean
}

const SAFE_DIMENSIONS: { key: keyof Match; label: string }[] = [
  { key: 'cityMatch', label: '城市' },
  { key: 'salaryMatch', label: '薪资' },
  { key: 'experienceMatch', label: '经验' },
  { key: 'educationMatch', label: '学历' },
  { key: 'cuisineMatch', label: '菜系' },
  { key: 'businessMatch', label: '业态' },
]

export default function MatchEvidence({ match, loading = false, error = false }: MatchEvidenceProps) {
  const evidence = match
    ? SAFE_DIMENSIONS
      .map(item => ({ ...item, value: match[item.key] }))
      .filter((item): item is { key: keyof Match; label: string; value: number } => typeof item.value === 'number')
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
    : []

  return (
    <View className='match-evidence'>
      <View className='match-evidence-heading'>
        <View>
          <Text className='match-evidence-title'>匹配依据</Text>
          <Text className='match-evidence-subtitle'>仅展示现有记录中的非敏感规则维度</Text>
        </View>
        <StatusBadge text={match ? '已有规则记录' : '辅助建议'} tone={match ? 'brand' : 'neutral'} />
      </View>

      {loading ? <Text className='match-evidence-state'>正在读取已有匹配记录…</Text> : null}
      {!loading && error ? (
        <Text className='match-evidence-state'>匹配记录暂时无法读取，不影响查看、收藏或投递。</Text>
      ) : null}
      {!loading && !error && !match ? (
        <Text className='match-evidence-state'>当前没有可展示的匹配记录。系统不会在详情页临时生成或猜测结果。</Text>
      ) : null}
      {!loading && !error && match && evidence.length === 0 ? (
        <Text className='match-evidence-state'>已找到匹配记录，但当前接口没有返回可安全展示的依据。</Text>
      ) : null}
      {!loading && !error && evidence.length > 0 ? (
        <View className='match-evidence-list'>
          {evidence.map(item => {
            const value = Math.max(0, Math.min(100, Math.round(item.value)))
            return (
              <View key={String(item.key)} className='match-evidence-item'>
                <View className='match-evidence-label-row'>
                  <Text className='match-evidence-label'>{item.label}</Text>
                  <Text className='match-evidence-value'>{value}分</Text>
                </View>
                <View className='match-evidence-track' aria-label={`${item.label} ${value} 分`}>
                  <View className='match-evidence-fill' style={{ width: `${value}%` }} />
                </View>
              </View>
            )
          })}
        </View>
      ) : null}

      <Text className='match-evidence-note'>这些维度来自已有规则记录，仅辅助人工判断，不代表录用、淘汰或顾问承诺。</Text>
    </View>
  )
}
