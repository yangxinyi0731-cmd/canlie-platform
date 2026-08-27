import { View } from '@tarojs/components'
import { ReactNode } from 'react'
import './StickyActionBar.scss'

interface StickyActionBarProps {
  children: ReactNode
  label?: string
}

export default function StickyActionBar({ children, label = '页面操作' }: StickyActionBarProps) {
  return (
    <View className='sticky-action-bar safe-bottom' role='group' aria-label={label}>
      <View className='sticky-action-bar-inner'>{children}</View>
    </View>
  )
}
