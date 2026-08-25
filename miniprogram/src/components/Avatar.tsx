import { View, Text, Image } from '@tarojs/components'
import { getAvatarUrl, getAvatarText } from '../api'

interface AvatarProps {
  url?: string | null
  name?: string
  size?: number
}

export default function Avatar({ url, name, size = 80 }: AvatarProps) {
  const src = getAvatarUrl(url, name)
  if (src) {
    return (
      <Image
        src={src}
        style={{ width: `${size}rpx`, height: `${size}rpx`, borderRadius: '50%' }}
        mode='aspectFill'
      />
    )
  }
  // 无头像：首字母占位
  return (
    <View
      style={{
        width: `${size}rpx`,
        height: `${size}rpx`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: `${size * 0.4}rpx`, fontWeight: '600' }}>
        {getAvatarText(name)}
      </Text>
    </View>
  )
}
