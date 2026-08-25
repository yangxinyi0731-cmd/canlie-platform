import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { sharesApi, getImageUrl, safeArray } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import Loading from '../../../components/Loading'
import NavBar from '../../../components/NavBar'
import type { SharePost } from '../../../types'
import './index.scss'

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
}

const STATUS_LABEL: Record<string, string> = {
  VISIBLE: '已发布',
  HIDDEN: '已隐藏',
}

function parseImages(json?: string): string[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MyShares() {
  useRequireAuth()
  const [posts, setPosts] = useState<SharePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    sharesApi.getMy()
      .then(res => setPosts(safeArray<SharePost>(res.data)))
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定删除该分享吗？',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await sharesApi.remove(id)
          setPosts(prev => prev.filter(p => p.id !== id))
        } catch {
          setError('删除失败')
        }
      },
    })
  }

  return (
    <View className='ms-page'>
      {/* 头部（还原网页版：白底 sticky + 发布按钮） */}
      <NavBar
        title='我的分享'
        right={
          <Text className='ms-publish-btn' onClick={() => Taro.navigateTo({ url: '/pages/share/create/index' })}>
            ＋ 发布
          </Text>
        }
      />

      <View className='ms-body'>
        {error ? (
          <View className='ms-error'><Text className='ms-error-text'>{error}</Text></View>
        ) : null}

        {loading ? (
          <Loading />
        ) : posts.length === 0 ? (
          <View className='ms-empty'>
            <Text className='ms-empty-icon'>📝</Text>
            <Text className='ms-empty-text'>还没有发布过分享</Text>
            <View className='ms-empty-btn' onClick={() => Taro.navigateTo({ url: '/pages/share/create/index' })}>
              <Text className='ms-empty-btn-text'>立即发布</Text>
            </View>
          </View>
        ) : (
          posts.map(p => {
            const images = parseImages(p.images)
            return (
              <View key={p.id} className='ms-card' onClick={() => Taro.navigateTo({ url: `/pages/share/detail/index?id=${p.id}` })}>
                <View className='ms-card-tags'>
                  <Text className={`ms-tag ${p.category === 'STARTUP' ? 'ms-tag-orange' : 'ms-tag-purple'}`}>
                    {CATEGORY_LABEL[p.category] || '分享'}
                  </Text>
                  <Text className={`ms-tag ${p.status === 'VISIBLE' ? 'ms-tag-green' : 'ms-tag-gray'}`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </Text>
                </View>

                <Text className='ms-card-title'>{p.title}</Text>
                {p.content ? <Text className='ms-card-content'>{p.content}</Text> : null}

                <View className='ms-card-meta'>
                  {images.length > 0 ? (
                    <Image src={getImageUrl(images[0]) || images[0]} className='ms-card-img' mode='aspectFill' />
                  ) : null}
                  {p.videoUrl ? <Text className='ms-video-icon'>🎬</Text> : null}
                  <Text className='ms-card-stats'>👍 {p.likeCount} · 💬 {p.commentCount}</Text>
                </View>

                <View className='ms-card-footer'>
                  <Text className='ms-card-time'>{formatDateTime(p.createdAt)}</Text>
                  <View className='ms-card-ops'>
                    <Text
                      className='ms-op'
                      onClick={(e) => {
                        e.stopPropagation()
                        Taro.navigateTo({ url: `/pages/share/detail/index?id=${p.id}` })
                      }}
                    >
                      查看
                    </Text>
                    <Text
                      className='ms-op danger'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(p.id)
                      }}
                    >
                      删除
                    </Text>
                  </View>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}
