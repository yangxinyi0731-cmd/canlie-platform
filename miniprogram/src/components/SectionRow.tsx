import { View, Text } from '@tarojs/components';
import Icon from './Icon';
import './SectionRow.scss';

interface SectionRowProps {
  /** Icon 图标名（优先） */
  icon?: string;
  /** emoji 图标（供应/分享等板块用） */
  emoji?: string;
  label: string;
  value?: string;
  danger?: boolean;
  /** 图标底色主题（默认 gray） */
  tint?: 'gray' | 'blue' | 'orange' | 'purple' | 'green' | 'red';
  onClick?: () => void;
}

/**
 * 列表行（还原网页版 Profile ActionList：左图标 + 右 ChevronRight，danger 红色）
 * 图标带浅色圆角底（小程序端更舒适的列表视觉），行间有分隔线
 */
const TINT_ICON_COLOR: Record<string, string> = {
  gray: '#6B7280',
  blue: '#3B82F6',
  orange: '#FF6B00',
  purple: '#9333EA',
  green: '#22C55E',
  red: '#F87171',
};

export default function SectionRow({ icon, emoji, label, value, danger, tint = 'gray', onClick }: SectionRowProps) {
  const tintClass = danger ? 'section-row-icon-red' : `section-row-icon-${tint}`;
  return (
    <View className={`section-row ${danger ? 'section-row-danger' : ''}`} onClick={onClick} hoverClass='section-row-hover'>
      <View className={`section-row-icon ${tintClass}`}>
        {icon ? <Icon name={icon} size={40} color={danger ? '#F87171' : TINT_ICON_COLOR[tint]} /> : null}
        {emoji ? <Text className='section-row-emoji'>{emoji}</Text> : null}
      </View>
      <Text className={`section-row-label ${danger ? 'text-danger font-medium' : ''}`}>{label}</Text>
      {value ? <Text className='section-row-value'>{value}</Text> : null}
      <Icon name='chevron-right' size={32} color='#D1D5DB' />
    </View>
  );
}
