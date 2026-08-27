import { Text } from '@tarojs/components'
import './StatusBadge.scss'

type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

interface StatusBadgeProps {
  text: string
  tone?: StatusTone
}

export default function StatusBadge({ text, tone = 'neutral' }: StatusBadgeProps) {
  return <Text className={`status-badge status-badge-${tone}`}>{text}</Text>
}
