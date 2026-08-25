import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { jobsApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import Icon from '../../components/Icon'
import './index.scss'

export default function MyFavorites() {
  useRequireAuth('TALENT')
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsApi.getMyFavorites().then(res => {
      setFavorites(safeArray(res.data))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUnfavorite = (jobId: string) => {
    jobsApi.unfavorite(jobId).then(() => {
      setFavorites(prev => prev.filter(f => f.jobId !== jobId))
      Taro.showToast({ title: '已取消收藏', icon: 'success' })
    }).catch(() => {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    })
  }

  const formatMD = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <View className='fav-page'>
      <NavBar title='我的收藏' />

      {loading ? (
        <Loading />
      ) : favorites.length === 0 ? (
        <Empty text='暂无收藏职位' icon='heart' />
      ) : (
        <View className='fav-list'>
          {favorites.map(fav => {
            const job = fav.job
            if (!job) return null
            const enterprise = job.enterprise
            return (
              <View
                key={fav.id}
                className='fav-card'
                hoverClass='hover-bg'
                onClick={() => Taro.navigateTo({ url: `/pages/job-detail/index?id=${job.id}` })}
              >
                <View className='fav-top'>
                  <View className='fav-title-wrap'>
                    <Text className='fav-title'>{job.title}</Text>
                    <Text className='fav-company'>{enterprise?.companyName}</Text>
                  </View>
                  <View className='fav-heart' onClick={(e) => { e.stopPropagation(); handleUnfavorite(job.id) }}>
                    <Icon name='heart' size={36} color='#F87171' fill='#F87171' />
                  </View>
                </View>
                <View className='fav-bottom'>
                  <Text className='fav-meta'>{job.city} · {formatMD(fav.createdAt)}</Text>
                  <Text className='fav-salary'>{job.minSalary / 1000}k-{job.maxSalary / 1000}k</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
