import { Button, Input, View } from '@tarojs/components'
import Icon from './Icon'
import './SearchBar.scss'

interface SearchBarProps {
  value: string
  placeholder?: string
  loading?: boolean
  onInput: (value: string) => void
  onClear: () => void
  onConfirm?: () => void
}

export default function SearchBar({
  value,
  placeholder = '搜索',
  loading = false,
  onInput,
  onClear,
  onConfirm,
}: SearchBarProps) {
  return (
    <View className='search-bar'>
      <View className='search-bar-icon' aria-hidden>
        <Icon name='search' size={32} color='#5F6B7A' />
      </View>
      <Input
        className='search-bar-input'
        value={value}
        placeholder={placeholder}
        placeholderClass='search-bar-placeholder'
        confirmType='search'
        aria-label={placeholder}
        onInput={(event) => onInput(event.detail.value)}
        onConfirm={() => onConfirm?.()}
      />
      <View className='search-bar-end'>
        {loading ? <View className='search-bar-spinner' aria-label='正在搜索' /> : null}
        {!loading && value ? (
          <Button
            className='ui-button-reset search-bar-clear'
            hoverClass='search-bar-clear-pressed'
            aria-label='清空搜索'
            onClick={onClear}
          >
            <Icon name='x' size={28} color='#5F6B7A' />
          </Button>
        ) : null}
      </View>
    </View>
  )
}
