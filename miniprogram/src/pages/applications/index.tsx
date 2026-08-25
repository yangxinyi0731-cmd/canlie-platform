import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { jobsApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import './index.scss'

// 人才端状态映射（还原网页版 MyApplications statusMap）
const TALENT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '待查看', cls: 'st-yellow' },
  VIEWED: { label: '已查看', cls: 'st-blue' },
  CONTACTED: { label: '已沟通', cls: 'st-green' },
  REJECTED: { label: '不合适', cls: 'st-red' },
  ACCEPTED: { label: '已通过', cls: 'st-green' },
}

// 企业端状态映射（还原网页版 EnterpriseApplications statusConfig）
const ENT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '待查看', cls: 'st-yellow-strong' },
  VIEWED: { label: '已查看', cls: 'st-blue-strong' },
  INTERVIEWED: { label: '邀请面试', cls: 'st-green-strong' },
  REJECTED: { label: '不合适', cls: 'st-red-strong' },
  ACCEPTED: { label: '已录用', cls: 'st-green-strong' },
}

function formatMDHM(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Applications() {
  const { user } = useRequireAuth()
  const { user: currentUser } = useAuthStore()

  if (currentUser?.role === 'ENTERPRISE') {
    return <EnterpriseApplications />
  }
  return <MyApplications />
}

// ========== 人才端：投递记录（还原网页版 MyApplications）==========
function MyApplications() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsApi.getMyApplications().then(res => {
      setApplications(safeArray(res.data))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <View className='apps-page'>
        <NavBar title='投递记录' />
        <Loading />
      </View>
    )
  }

  return (
    <View className='apps-page'>
      <NavBar title='投递记录' />

      {applications.length === 0 ? (
        <Empty text='暂无投递记录' icon='file-text' />
      ) : (
        <View className='apps-list'>
          {applications.map((app: any) => {
            const job = app.job
            const enterprise = job?.enterprise
            const status = TALENT_STATUS[app.status] || { label: app.status, cls: 'st-gray' }
            return (
              <View
                key={app.id}
                className='app-card'
                hoverClass='hover-bg'
                onClick={() => job && Taro.navigateTo({ url: `/pages/job-detail/index?id=${job.id}` })}
              >
                <View className='app-card-top'>
                  <View className='app-card-title-wrap'>
                    <Text className='app-card-title'>{job?.title || '职位已下线'}</Text>
                    <Text className='app-card-company'>{enterprise?.companyName}</Text>
                  </View>
                  <Text className={`status-badge ${status.cls}`}>{status.label}</Text>
                </View>
                {job ? (
                  <View className='app-card-bottom'>
                    <Text className='app-card-meta'>{job.city} · {formatMDHM(app.createdAt)}</Text>
                    <Text className='app-card-salary'>{job.minSalary / 1000}k-{job.maxSalary / 1000}k</Text>
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ========== 企业端：收到的简历（还原网页版 EnterpriseApplications）==========
function EnterpriseApplications() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const jobsRes = await jobsApi.getMyJobs()
      const jobs = safeArray<any>((jobsRes.data as any)?.jobs || jobsRes.data)

      const allApps: any[] = []
      for (const job of jobs) {
        try {
          const appsRes = await jobsApi.getApplications(job.id)
          const apps = safeArray(appsRes.data)
          apps.forEach((app: any) => {
            allApps.push({ ...app, job: { id: job.id, title: job.title, city: job.city } })
          })
        } catch {
          // ignore
        }
      }
      allApps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setApplications(allApps)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (jobId: string, appId: string, status: string) => {
    try {
      await jobsApi.updateApplication(jobId, appId, status)
      setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status } : a)))
    } catch {
      Taro.showToast({ title: '更新状态失败', icon: 'none' })
    }
  }

  const filteredApps = filterStatus ? applications.filter(a => a.status === filterStatus) : applications
  const pendingCount = applications.filter(a => a.status === 'PENDING').length

  return (
    <View className='apps-page'>
      <NavBar title='收到的简历' />

      {/* 筛选条（还原网页版：全部/待查看/面试中 chips） */}
      <View className='ent-filter-bar'>
        <ScrollView scrollX enhanced showScrollbar={false} className='ent-filter-scroll'>
          <View className='ent-filter-inner'>
            <Text
              className={`filter-chip ${!filterStatus ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('')}
            >
              全部 ({applications.length})
            </Text>
            <Text
              className={`filter-chip ${filterStatus === 'PENDING' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('PENDING')}
            >
              待查看 ({pendingCount})
            </Text>
            <Text
              className={`filter-chip ${filterStatus === 'INTERVIEWED' ? 'filter-chip-active' : ''}`}
              onClick={() => setFilterStatus('INTERVIEWED')}
            >
              面试中
            </Text>
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <Loading />
      ) : filteredApps.length === 0 ? (
        <Empty text='暂无简历' icon='file-text' />
      ) : (
        <View className='apps-list'>
          {filteredApps.map((app: any) => {
            const cfg = ENT_STATUS[app.status] || { label: app.status, cls: 'st-gray' }
            const talent = app.talent
            return (
              <View key={app.id} className='app-card'>
                {/* 人才信息（还原网页版：渐变头像 + 姓名 + 状态徽标） */}
                <View className='ent-app-header'>
                  <View
                    className='ent-app-avatar'
                    onClick={() => talent?.id && Taro.navigateTo({ url: `/pages/talent-detail/index?id=${talent.id}` })}
                  >
                    <Text className='ent-app-avatar-text'>{talent?.realName?.charAt(0) || '?'}</Text>
                  </View>
                  <View className='ent-app-info'>
                    <View className='ent-app-name-row'>
                      <Text
                        className='ent-app-name'
                        onClick={() => talent?.id && Taro.navigateTo({ url: `/pages/talent-detail/index?id=${talent.id}` })}
                      >
                        {talent?.realName || '匿名人才'}
                      </Text>
                      <Text className={`status-badge ${cfg.cls}`}>{cfg.label}</Text>
                    </View>
                    <Text className='ent-app-title'>
                      {talent?.title || '未填写职位'}{talent?.currentCompany ? ` · ${talent.currentCompany}` : ''}
                    </Text>
                    <Text className='ent-app-meta'>投递：{app.job?.title} · {formatMDHM(app.createdAt)}</Text>
                  </View>
                </View>

                {/* 操作按钮（还原网页版：PENDING 三键 / 其他两键） */}
                <View className='ent-app-actions'>
                  {app.status === 'PENDING' ? (
                    <>
                      <Text className='act-btn act-gray' onClick={() => handleUpdateStatus(app.jobId, app.id, 'VIEWED')}>标记已看</Text>
                      <Text className='act-btn act-green' onClick={() => handleUpdateStatus(app.jobId, app.id, 'INTERVIEWED')}>邀请面试</Text>
                      <Text className='act-btn act-red' onClick={() => handleUpdateStatus(app.jobId, app.id, 'REJECTED')}>不合适</Text>
                    </>
                  ) : (
                    <>
                      <Text
                        className='act-btn act-outline'
                        onClick={() => talent?.userId && Taro.navigateTo({ url: `/pages/chat-conversation/index?chatWith=${talent.userId}&jobId=${app.jobId}` })}
                      >
                        发消息
                      </Text>
                      <Text
                        className='act-btn act-gray'
                        onClick={() => talent?.id && Taro.navigateTo({ url: `/pages/talent-detail/index?id=${talent.id}` })}
                      >
                        查看简历
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
