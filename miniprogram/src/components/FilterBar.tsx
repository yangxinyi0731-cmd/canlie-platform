import { Button, ScrollView, Text, View } from '@tarojs/components'
import Icon from './Icon'
import './FilterBar.scss'

export interface FilterBarItem {
  key: string
  label: string
  active?: boolean
}

interface FilterBarProps {
  items: FilterBarItem[]
  onSelect: (key: string) => void
}

export default function FilterBar({ items, onSelect }: FilterBarProps) {
  return (
    <ScrollView className='filter-bar-scroll' scrollX enhanced showScrollbar={false}>
      <View className='filter-bar'>
        {items.map(item => (
          <Button
            key={item.key}
            className={`ui-button-reset filter-bar-item ${item.active ? 'filter-bar-item-active' : ''}`}
            hoverClass='filter-bar-item-pressed'
            aria-label={`${item.label}，打开筛选`}
            onClick={() => onSelect(item.key)}
          >
            <Text className='filter-bar-label'>{item.label}</Text>
            <Icon name='chevron-down' size={24} color={item.active ? '#C2410C' : '#4E5969'} />
          </Button>
        ))}
      </View>
    </ScrollView>
  )
}
