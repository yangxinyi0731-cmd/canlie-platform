import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Image, Video } from '@tarojs/components'
import { sharesApi, uploadApi, getImageUrl } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import NavBar from '../../../components/NavBar'
import './index.scss'

const CATEGORIES = [
  { key: 'STARTUP', label: '📣 创业分享', desc: '开店/创业经历' },
  { key: 'LEARNING', label: '📚 学习分享', desc: '经验/知识干货' },
]

export default function ShareCreate() {
  useRequireAuth()
  const [category, setCategory] = useState('STARTUP')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleImageUpload = async () => {
    const remain = 9 - images.length
    if (remain <= 0) return
    try {
      const choose = await Taro.chooseImage({ count: Math.min(remain, 9), sizeType: ['compressed'] })
      const files = choose.tempFilePaths || []
      if (files.length === 0) return
      setUploading(true)
      setError('')
      const urls: string[] = []
      for (const file of files) {
        const res = await uploadApi.upload(file, 'SHARE_IMAGE')
        urls.push((res.data as any)?.url || '')
      }
      setImages(prev => [...prev, ...urls.filter(Boolean)])
    } catch {
      setError('图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleVideoUpload = async () => {
    try {
      const choose = await Taro.chooseVideo({ maxDuration: 60, compressed: true })
      const filePath = choose.tempFilePath
      if (!filePath) return
      setUploading(true)
      setError('')
      const res = await uploadApi.uploadVideo(filePath)
      setVideoUrl((res.data as any)?.url || '')
    } catch {
      setError('视频上传失败（支持 mp4/mov，最大100MB）')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!category) {
      setError('请选择分类')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await sharesApi.create({
        category,
        title: title.trim(),
        content: content.trim() || undefined,
        images,
        videoUrl: videoUrl || undefined,
      })
      Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/share/detail/index?id=${(res.data as any)?.id}` })
      }, 800)
    } catch (err: any) {
      setError(err?.message || '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='sc-page'>
      {/* 头部（还原网页版：白底 sticky + 右侧发布按钮） */}
      <NavBar
        title='发布分享'
        right={
          <Text
            className={`sc-publish-btn ${submitting || uploading ? 'sc-btn-disabled' : ''}`}
            onClick={() => !(submitting || uploading) && handleSubmit()}
          >
            {submitting ? '发布中...' : '发布'}
          </Text>
        }
      />

      <View className='sc-body'>
        {error ? (
          <View className='sc-error'><Text className='sc-error-text'>{error}</Text></View>
        ) : null}

        {/* 分类选择（还原网页版双卡） */}
        <View className='sc-card'>
          <Text className='sc-label'>选择分类</Text>
          <View className='sc-category-row'>
            {CATEGORIES.map(c => (
              <View
                key={c.key}
                className={`sc-category-card ${category === c.key ? 'sc-category-active' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                <Text className='sc-category-label'>{c.label}</Text>
                <Text className='sc-category-desc'>{c.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 标题与内容 */}
        <View className='sc-card'>
          <Input
            className='sc-input'
            value={title}
            placeholder='标题 *'
            placeholderClass='sc-placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
          <Textarea
            className='sc-textarea resize-none'
            value={content}
            placeholder='分享你的故事、经验、干货内容...'
            placeholderClass='sc-placeholder'
            maxlength={2000}
            onInput={(e) => setContent(e.detail.value)}
          />
        </View>

        {/* 图片上传（还原网页版四列宫格） */}
        <View className='sc-card'>
          <Text className='sc-label'>图片（最多9张）</Text>
          <View className='sc-img-grid'>
            {images.map((img, idx) => (
              <View key={idx} className='sc-img-wrap'>
                <Image src={getImageUrl(img) || img} className='sc-img' mode='aspectFill' />
                <View className='sc-img-del' onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}>
                  <Text className='sc-img-del-text'>✕</Text>
                </View>
              </View>
            ))}
            {images.length < 9 ? (
              <View className='sc-img-add' onClick={handleImageUpload}>
                <Text className='sc-img-add-plus'>{uploading ? '⏳' : '＋'}</Text>
                <Text className='sc-img-add-count'>{images.length}/9</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 视频上传 */}
        <View className='sc-card'>
          <Text className='sc-label'>视频（可选，单个≤100MB）</Text>
          {videoUrl ? (
            <View className='sc-video-wrap'>
              <Video src={getImageUrl(videoUrl) || videoUrl} className='sc-video' controls />
              <View className='sc-video-del' onClick={() => setVideoUrl('')}>
                <Text className='sc-img-del-text'>✕</Text>
              </View>
            </View>
          ) : (
            <View className='sc-video-add' onClick={handleVideoUpload}>
              <Text className='sc-video-icon'>🎬</Text>
              <Text className='sc-video-text'>{uploading ? '上传中...' : '上传视频'}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
