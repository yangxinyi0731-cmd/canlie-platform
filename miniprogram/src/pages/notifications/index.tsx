import { useEffect, useState } from 'react'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { notificationApi, chatApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import Loading from '../../components/Loading'
import Empty from '../../components/Empty'
import Avatar from '../../components/Avatar'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import type { Notification, ChatConversation } from '../../types'
import './index.scss'

const TYPE_ICON: Record<string, string> = {
  APPLICATION: '📋',
  MESSAGE: '💬',
  SYSTEM: '🔔',
  VERIFICATION: '✅',
}

export default function Notifications() {
  useRequireAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages')

  const loadData = async () => {
    setLoading(true)
    try {
      const [notifRes, convRes] = await Promise.all([
        notificationApi.list(),
        chatApi.getConversations(),
      ])
      setNotifications(safeArray(notifRes.data))
      setConversations(safeArray(convRes.data))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useDidShow(() => {
    // 从聊天页返回时刷新未读状态
    if (!loading) loadData()
  })

  usePullDownRefresh(() => {
    Promise.resolve(loadData()).finally(() => Taro.stopPullDownRefresh())
  })

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // ignore
    }
  }

  const handleClickNotification = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id)
    try {
      const extra = n.data ? JSON.parse(n.data) : {}
      if (extra.jobId) {
        Taro.navigateTo({ url: `/pages/job-detail/index?id=${extra.jobId}` })
      } else if (extra.chatWith) {
        Taro.navigateTo({ url: `/pages/chat-conversation/index?chatWith=${extra.chatWith}` })
      }
    } catch {
      // ignore
    }
  }

  const handleClickConversation = (conv: ChatConversation) => {
    Taro.navigateTo({
      url: `/pages/chat-conversation/index?chatWith=${conv.chatWith}${conv.jobId ? `&jobId=${conv.jobId}` : ''}`,
    })
  }

  // 会话显示名（还原网页版：企业公司名 > 人才真实姓名 > 用户昵称）
  const getDisplayName = (conv: ChatConversation): string => {
    if (conv.otherProfile?.companyName) return conv.otherProfile.companyName
    if (conv.otherProfile?.realName) return conv.otherProfile.realName
    if (conv.otherUser?.name) return conv.otherUser.name
    return '用户'
  }

  const formatTimeHM = (t?: string) => {
    if (!t) return ''
    const d = new Date(t)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const formatDateTime = (t?: string) => {
    if (!t) return ''
    const d = new Date(t)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Layout active='/pages/notifications/index'>
        <Loading />
      </Layout>
    )
  }

    const unreadNotifCount = notifications.filter(n => !n.read).length
    const unreadMsgCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

    return (
      <Layout active='/pages/notifications/index'>
        <View className='notif-page'>
          {/* 头部（还原网页版：白底 sticky + 通知中心 + 全部已读 + 双 Tab） */}
          <View className='notif-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}>
          <View className='notif-header-row'>
            <Text className='notif-header-title'>通知中心</Text>
            {(unreadNotifCount > 0 || unreadMsgCount > 0) && (
              <Text className='notif-mark-all' onClick={handleMarkAllRead}>全部已读</Text>
            )}
          </View>
          <View className='notif-tabs'>
            <View className={`notif-tab ${activeTab === 'messages' ? 'notif-tab-active' : ''}`} onClick={() => setActiveTab('messages')}>
              <Text className='notif-tab-text'>消息</Text>
              {unreadMsgCount > 0 && (
                <Text className='notif-tab-badge'>{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</Text>
              )}
            </View>
            <View className={`notif-tab ${activeTab === 'notifications' ? 'notif-tab-active' : ''}`} onClick={() => setActiveTab('notifications')}>
              <Text className='notif-tab-text'>系统通知</Text>
              {unreadNotifCount > 0 && (
                <Text className='notif-tab-badge'>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
              )}
            </View>
          </View>
        </View>

        {/* 消息 Tab（还原网页版会话列表） */}
        {activeTab === 'messages' && (
          conversations.length === 0 ? (
            <Empty text='暂无消息' icon='message-square' />
          ) : (
            <View className='notif-list'>
              {conversations.map(conv => (
                <View
                  key={conv.id}
                  className='conv-row'
                  hoverClass='hover-bg'
                  onClick={() => handleClickConversation(conv)}
                >
                  <Avatar name={getDisplayName(conv)} url={conv.otherUser?.avatar} size={80} />
                  <View className='conv-main'>
                    <View className='conv-top'>
                      <Text className='conv-name'>{getDisplayName(conv)}</Text>
                      {conv.lastTime ? <Text className='conv-time'>{formatTimeHM(conv.lastTime)}</Text> : null}
                    </View>
                    <View className='conv-bottom'>
                      <Text className='conv-lastmsg'>{conv.lastMessage || '暂无消息'}</Text>
                      {conv.unreadCount > 0 && (
                        <Text className='conv-badge'>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {/* 系统通知 Tab（还原网页版通知行） */}
        {activeTab === 'notifications' && (
          notifications.length === 0 ? (
            <Empty text='暂无系统通知' icon='bell' />
          ) : (
            <View className='notif-list'>
              {notifications.map(n => (
                <View
                  key={n.id}
                  className={`notif-row ${!n.read ? 'notif-row-unread' : ''}`}
                  hoverClass='hover-bg'
                  onClick={() => handleClickNotification(n)}
                >
                  <View className='notif-icon'>
                    <Text className='notif-icon-emoji'>{TYPE_ICON[n.type] || '🔔'}</Text>
                  </View>
                  <View className='notif-main'>
                    <View className='notif-top'>
                      <Text className={`notif-title ${!n.read ? 'notif-title-unread' : ''}`}>{n.title}</Text>
                      {!n.read && <View className='notif-dot' />}
                    </View>
                    <Text className='notif-content'>{n.content}</Text>
                    <Text className='notif-date'>{formatDateTime(n.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
        </View>
    </Layout>
  )
}
