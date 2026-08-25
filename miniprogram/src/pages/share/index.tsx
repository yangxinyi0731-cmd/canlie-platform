import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Video } from '@tarojs/components'
import { sharesApi, getImageUrl, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import Loading from '../../components/Loading'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import type { SharePost } from '../../types'
import './index.scss'

// 分类标签（还原网页版）
const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
}

const CATEGORY_STYLE: Record<string, string> = {
  STARTUP: 'cat-orange',
  LEARNING: 'cat-purple',
}

const TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'STARTUP', label: '创业分享' },
  { key: 'LEARNING', label: '学习分享' },
]

function parseImages(json?: string): string[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export default function ShareFeed() {
  useRequireAuth()
  const [tab, setTab] = useState('ALL')
  const [posts, setPosts] = useState<SharePost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likingId, setLikingId] = useState('')

  const load = (p: number, cat: string, reset: boolean) => {
    setLoading(true)
    sharesApi.list({ category: cat === 'ALL' ? undefined : cat, page: p, pageSize: 10 })
      .then(res => {
        const data: any = res.data
        const list = safeArray<SharePost>(data?.posts)
        setPosts(prev => (reset ? list : [...prev, ...list]))
        setHasMore(prev => {
          const total = data?.total ?? 0
          return prev && list.length > 0 && p * 10 < total
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(1)
    setPosts([])
    setHasMore(true)
    load(1, tab, true)
  }, [tab])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, tab, false)
  }

  const handleLike = async (id: string) => {
    if (likingId) return
    setLikingId(id)
    try {
      const res = await sharesApi.toggleLike(id)
      const liked = (res.data as any)?.liked
      setLikedSet(prev => {
        const next = new Set(prev)
        if (liked) next.add(id)
        else next.delete(id)
        return next
      })
      setPosts(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
            : p
        )
      )
    } catch {
      // ignore
    } finally {
      setLikingId('')
    }
  }

  const previewPostImage = (images: string[], current: string) => {
    Taro.previewImage({ urls: images, current })
  }

  return (
    <View className='feed-page'>
      {/* 紫色渐变头（还原网页版 from-purple-500 to-purple-700） */}
      <View className='feed-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT + 32}px` }}>
        <View className='feed-header-row'>
          <View className='feed-back' onClick={() => Taro.navigateBack()}>
            <View className='feed-back-arrow' />
          </View>
          <Text className='feed-title'>创业分享</Text>
          <Text className='feed-mine' onClick={() => Taro.navigateTo({ url: '/pages/share/my/index' })}>我的</Text>
        </View>
        <Text className='feed-desc'>
          餐饮人交流分享社区{'\n'}创业故事 · 经验学习 · 行业干货
        </Text>
      </View>

      {/* 分类 Tab（-mt-8 上浮分段卡，还原网页版渐变激活段） */}
      <View className='feed-tabs-wrap'>
        <View className='feed-tabs'>
          {TABS.map(t => (
            <Text
              key={t.key}
              className={`feed-tab ${tab === t.key ? 'feed-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Text>
          ))}
        </View>
      </View>

      {/* 信息流 */}
      <View className='feed-list'>
        {loading && posts.length === 0 ? (
          <Loading />
        ) : posts.length === 0 ? (
          <View className='feed-empty'>
            <Text className='feed-empty-icon'>📝</Text>
            <Text className='feed-empty-text'>还没有分享，快来发布第一条吧</Text>
          </View>
        ) : (
          posts.map(p => {
            const images = parseImages(p.images).map(u => getImageUrl(u) || u)
            const liked = likedSet.has(p.id)
            return (
              <View key={p.id} className='post-card' onClick={() => Taro.navigateTo({ url: `/pages/share/detail/index?id=${p.id}` })}>
                {/* 用户信息 */}
                <View className='post-user-row'>
                  <View className='post-avatar'>
                    <Text className='post-avatar-text'>{(p.user?.name || p.user?.phone || '餐').charAt(0)}</Text>
                  </View>
                  <View className='post-user-info'>
                    <Text className='post-user-name'>{p.user?.name || p.user?.phone || '用户'}</Text>
                    <Text className='post-time'>{timeAgo(p.createdAt)}</Text>
                  </View>
                  <Text className={`post-category ${CATEGORY_STYLE[p.category] || 'cat-gray'}`}>
                    {CATEGORY_LABEL[p.category] || '分享'}
                  </Text>
                </View>

                {/* 标题与内容 */}
                <View className='post-content'>
                  <Text className='post-title'>{p.title}</Text>
                  {p.content ? <Text className='post-text'>{p.content}</Text> : null}
                </View>

                {/* 图片九宫格（还原网页版 1 大图 / 2、4 两列 / 其余三列） */}
                {images.length > 0 ? (
                  <View className={`post-images post-img-${images.length === 1 ? 'one' : images.length === 2 || images.length === 4 ? 'two' : 'three'}`}>
                    {images.slice(0, 9).map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        className={images.length === 1 ? 'post-img-single' : 'post-img'}
                        mode={images.length === 1 ? 'widthFix' : 'aspectFill'}
                        onClick={(e) => {
                          e.stopPropagation()
                          previewPostImage(images, img)
                        }}
                      />
                    ))}
                  </View>
                ) : null}

                {/* 视频 */}
                {p.videoUrl ? (
                  <View className='post-video-wrap'>
                    <Video
                      src={getImageUrl(p.videoUrl) || ''}
                      className='post-video'
                      controls
                      onClick={(e) => e.stopPropagation()}
                    />
                  </View>
                ) : null}

                {/* 操作栏 */}
                <View className='post-actions'>
                  <View
                    className={`post-action ${liked ? 'post-action-liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(p.id)
                    }}
                  >
                    <Text className='post-action-icon'>{liked ? '❤️' : '🤍'}</Text>
                    <Text className='post-action-num'>{p.likeCount || 0}</Text>
                  </View>
                  <View
                    className='post-action'
                    onClick={(e) => {
                      e.stopPropagation()
                      Taro.navigateTo({ url: `/pages/share/detail/index?id=${p.id}` })
                    }}
                  >
                    <Text className='post-action-icon'>💬</Text>
                    <Text className='post-action-num'>{p.commentCount || 0}</Text>
                  </View>
                  <Text className='post-date'>
                    {new Date(p.createdAt).getMonth() + 1}月{new Date(p.createdAt).getDate()}日
                  </Text>
                </View>
              </View>
            )
          })
        )}

        {/* 加载更多 */}
        {posts.length > 0 ? (
          <View className='feed-load-more'>
            {hasMore ? (
              <Text className='feed-load-more-btn' onClick={handleLoadMore}>
                {loading ? '加载中...' : '加载更多'}
              </Text>
            ) : (
              <Text className='feed-end'>— 已经到底啦 —</Text>
            )}
          </View>
        ) : null}
      </View>

      {/* 发布 FAB（还原网页版右下渐变悬浮钮） */}
      <View className='feed-fab' onClick={() => Taro.navigateTo({ url: '/pages/share/create/index' })}>
        <Text className='feed-fab-text'>＋</Text>
      </View>
    </View>
  )
}
