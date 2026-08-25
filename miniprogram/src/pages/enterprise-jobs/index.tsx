import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { jobsApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import './index.scss'

// 状态映射（还原网页版 EnterpriseJobs statusConfig）
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '招聘中', cls: 'st-green-strong' },
  CLOSED: { label: '已关闭', cls: 'st-gray' },
  DRAFT: { label: '草稿', cls: 'st-yellow-strong' },
}

export default function EnterpriseJobs() {
  useRequireAuth('ENTERPRISE')
  const { user } = useAuthStore()
  const enterprise = (user?.profile || {}) as { companyName?: string; status?: string }

  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isVerified = enterprise?.status === 'APPROVED'

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const res = await jobsApi.getMyJobs()
      setJobs(safeArray((res.data as any)?.jobs || res.data))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleCloseJob = async (jobId: string) => {
    try {
      await jobsApi.close(jobId)
      setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'CLOSED' } : j)))
      Taro.showToast({ title: '已关闭', icon: 'success' })
    } catch {
      Taro.showToast({ title: '关闭职位失败', icon: 'none' })
    }
  }

  const formatMD = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const activeJobs = jobs.filter(j => j.status === 'ACTIVE')
  const closedJobs = jobs.filter(j => j.status === 'CLOSED')

  return (
    <View className='ej-page'>
      <NavBar
        title='职位管理'
        right={
          <Text
            className={`ej-post-btn ${isVerified ? '' : 'ej-post-btn-disabled'}`}
            onClick={() => isVerified && Taro.navigateTo({ url: '/pages/post-job/index' })}
          >
            + 发布
          </Text>
        }
      />

      {/* 统计（还原网页版：招聘中 N 已关闭 N） */}
      <View className='ej-stats'>
        <Text className='ej-stat'>招聘中 <Text className='ej-stat-num'>{activeJobs.length}</Text></Text>
        <Text className='ej-stat'>已关闭 <Text className='ej-stat-num'>{closedJobs.length}</Text></Text>
      </View>

      {loading ? (
        <Loading />
      ) : jobs.length === 0 ? (
        <Empty text='还没有发布职位' icon='briefcase'>
          <Text
            className={`ej-empty-link ${isVerified ? '' : 'ej-empty-link-disabled'}`}
            onClick={() => isVerified && Taro.navigateTo({ url: '/pages/post-job/index' })}
          >
            立即发布 →
          </Text>
        </Empty>
      ) : (
        <View className='ej-list'>
          {jobs.map(job => {
            const cfg = STATUS_CONFIG[job.status] || { label: job.status, cls: 'st-gray' }
            return (
              <View key={job.id} className='ej-card'>
                <View className='ej-card-body'>
                  <View className='ej-card-top'>
                    <Text className='ej-card-title'>{job.title}</Text>
                    <Text className={`status-badge ${cfg.cls}`}>{cfg.label}</Text>
                  </View>
                  <Text className='ej-card-salary'>
                    {(job.minSalary || 0).toLocaleString()} - {(job.maxSalary || 0).toLocaleString()} 元/月
                  </Text>
                  <View className='ej-card-meta'>
                    <Text className='ej-meta-item'>{job.city}</Text>
                    <Text className='ej-meta-item'>{job._count?.applications ?? 0} 份简历</Text>
                    <Text className='ej-meta-item'>{formatMD(job.createdAt)}</Text>
                  </View>
                </View>

                {/* 操作区（还原网页版灰底操作条） */}
                <View className='ej-card-actions'>
                  {job.status === 'ACTIVE' ? (
                    <>
                      <Text
                        className='ej-act-btn ej-act-outline'
                        onClick={() => Taro.navigateTo({ url: `/pages/post-job/index?id=${job.id}` })}
                      >
                        编辑
                      </Text>
                      <Text className='ej-act-btn ej-act-white' onClick={() => handleCloseJob(job.id)}>关闭</Text>
                    </>
                  ) : null}
                  <Text
                    className={`ej-act-btn ej-act-primary ${job.status === 'ACTIVE' ? '' : 'ej-act-full'}`}
                    onClick={() => Taro.navigateTo({ url: `/pages/match-results/index?jobId=${job.id}` })}
                  >
                    查看匹配
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
