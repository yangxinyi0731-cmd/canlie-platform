import { Button, ScrollView, Text, View } from '@tarojs/components'
import { ReactNode } from 'react'
import Icon from './Icon'
import './BottomSheet.scss'

interface BottomSheetProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export default function BottomSheet({ open, title, children, onClose }: BottomSheetProps) {
  if (!open) return null

  return (
    <View className='bottom-sheet-layer'>
      <Button
        className='ui-button-reset bottom-sheet-backdrop'
        aria-label='关闭选择面板'
        onClick={onClose}
      />
      <View className='bottom-sheet-surface' role='dialog' aria-label={title}>
        <View className='bottom-sheet-handle' aria-hidden />
        <View className='bottom-sheet-header'>
          <Text className='bottom-sheet-title'>{title}</Text>
          <Button
            className='ui-button-reset bottom-sheet-close'
            hoverClass='bottom-sheet-close-pressed'
            aria-label='关闭'
            onClick={onClose}
          >
            <Icon name='x' size={32} color='#4E5969' />
          </Button>
        </View>
        <ScrollView className='bottom-sheet-body' scrollY enhanced showScrollbar={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  )
}
