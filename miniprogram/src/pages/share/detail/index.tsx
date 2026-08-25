import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Image, Video } from '@tarojs/components'
import { sharesApi, getImageUrl, safeArray } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import Loading from '../../../components/Loading'
import NavBar from '../../../components/NavBar'
import type { SharePost, ShareComment } from '../../../types'
import './index.scss'

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
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
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function SharePostDetail() {
  useRequireAuth()
  const router = useRouter()
  const { id } = router.params

  const [post, setPost] = useState<SharePost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    if (!id) return
    sharesApi.getById(id)
      .then(res => {
        const data = res.data as any
        setPost(data)
        setLiked(!!data?.likedByMe)
      })
      .catch((err: any) => setError(err?.message || '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  const handleLike = async () => {
    if (!post || liking) return
    setLiking(true)
    try {
      const res = await sharesApi.toggleLike(post.id)
      const isLiked = (res.data as any)?.liked
      setLiked(isLiked)
      setPost(prev => (prev ? { ...prev, likeCount: Math.max(0, prev.likeCount + (isLiked ? 1 : -1)) } : prev))
    } catch {
      // ignore
    } finally {
      setLiking(false)
    }
  }

  const handleComment = async () => {
    if (!post || !comment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await sharesApi.addComment(post.id, comment.trim())
      const newComment = res.data as any
      setPost(prev => (prev ? { ...prev, commentCount: prev.commentCount + 1, comments: [...(prev.comments || []), newComment] } : prev))
      setComment('')
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className='spd-page'>
        <Loading />
      </View>
    )
  }

  if (!post) {
    return (
      <View className='spd-error-page'>
        <Text className='spd-error-text'>{error || '内容不存在'}</Text>
        <View className='spd-error-btn' onClick={() => Taro.navigateBack()}>
          <Text className='spd-error-btn-text'>返回</Text>
        </View>
      </View>
    )
  }

  const images = parseImages(post.images).map(u => getImageUrl(u) || u)
  const comments = safeArray<ShareComment>(post.comments)

  return (
    <View className='spd-page'>
      {/* 头部（还原网页版：白底 sticky + 紫色分类标签） */}
      <NavBar
        title='分享详情'
        right={<Text className='spd-category'>{CATEGORY_LABEL[post.category] || '分享'}</Text>}
      />

      <View className='spd-body'>
        {/* 帖子卡 */}
        <View className='spd-card'>
          <View className='spd-user-row'>
            <View className='spd-avatar'>
              <Text className='spd-avatar-text'>{(post.user?.name || post.user?.phone || '餐').charAt(0)}</Text>
            </View>
            <View className='spd-user-info'>
              <Text className='spd-user-name'>{post.user?.name || post.user?.phone || '用户'}</Text>
              <Text className='spd-user-time'>{formatDateTime(post.createdAt)}</Text>
            </View>
          </View>

          <Text className='spd-post-title'>{post.title}</Text>
          {post.content ? <Text className='spd-post-content'>{post.content}</Text> : null}

          {images.length > 0 ? (
            <View className={`spd-images spd-img-${images.length === 1 ? 'one' : images.length === 2 || images.length === 4 ? 'two' : 'three'}`}>
              {images.slice(0, 9).map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  className={images.length === 1 ? 'spd-img-single' : 'spd-img'}
                  mode={images.length === 1 ? 'widthFix' : 'aspectFill'}
                  onClick={() => Taro.previewImage({ urls: images, current: img })}
                />
              ))}
            </View>
          ) : null}

          {post.videoUrl ? (
            <Video src={getImageUrl(post.videoUrl) || ''} className='spd-video' controls />
          ) : null}

          {/* 操作栏 */}
          <View className='spd-actions'>
            <View className={`spd-action ${liked ? 'spd-action-liked' : ''}`} onClick={handleLike}>
              <Text className='spd-action-icon'>{liked ? '❤️' : '🤍'}</Text>
              <Text className='spd-action-num'>{post.likeCount}</Text>
            </View>
            <View className='spd-action'>
              <Text className='spd-action-icon'>💬</Text>
              <Text className='spd-action-num'>{post.commentCount}</Text>
            </View>
          </View>
        </View>

        {/* 评论区 */}
        <View className='spd-card'>
          <Text className='spd-comment-title'>评论（{comments.length}）</Text>
          {comments.length === 0 ? (
            <Text className='spd-comment-empty'>暂无评论，来说两句吧</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} className='spd-comment-row'>
                <View className='spd-comment-avatar'>
                  <Text className='spd-comment-avatar-text'>{(c.user?.name || c.user?.phone || '餐').charAt(0)}</Text>
                </View>
                <View className='spd-comment-main'>
                  <Text className='spd-comment-meta'>
                    {c.user?.name || c.user?.phone || '用户'}  {formatDateTime(c.createdAt)}
                  </Text>
                  <Text className='spd-comment-content'>{c.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* 评论输入（还原网页版底部圆角输入 + 发布按钮） */}
      <View className='spd-input-bar'>
        <Input
          className='spd-input'
          value={comment}
          placeholder='写下你的评论...'
          placeholderClass='spd-placeholder'
          confirmType='send'
          onInput={(e) => setComment(e.detail.value)}
          onConfirm={handleComment}
        />
        <View className={`spd-send-btn ${!comment.trim() || submitting ? 'spd-send-disabled' : ''}`} onClick={handleComment}>
          <Text className='spd-send-text'>{submitting ? '...' : '发布'}</Text>
        </View>
      </View>
    </View>
  )
}
