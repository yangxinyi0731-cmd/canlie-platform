import { useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useDidHide } from '@tarojs/taro'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { chatApi } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useChatStore } from '../../stores/chatStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Icon from '../../components/Icon'
import './index.scss'

export default function ChatConversation() {
  const params = (Taro.getCurrentInstance().router.params || {}) as {
    chatWith?: string
    name?: string
    jobId?: string
  }
  const chatWith = params.chatWith || ''
  const jobId = params.jobId || ''
  // 对方姓名：来源页传入优先，否则从会话列表解析（还原网页版 fetchOtherName）
  const [otherName, setOtherName] = useState(decodeURIComponent(params.name || '') || '用户')

  const { user } = useRequireAuth()
  const { messages, loading, sendMessage, setActiveChat, startMsgPolling, stopMsgPolling } = useChatStore()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [firstLoading, setFirstLoading] = useState(true)
  const seenLoadRef = useRef(false)
  const activeRef = useRef<string | null>(null)

  const myId = user?.id

  // 对方名称解析（还原网页版：企业公司名 > 人才真实姓名 > 用户昵称 > 消息昵称）
  const fetchOtherName = async () => {
    if (!chatWith) return
    try {
      const res = await chatApi.getConversations()
      const conv = ((res.data as any) || []).find((c: any) => c.chatWith === chatWith)
      if (conv?.otherProfile?.companyName) {
        setOtherName(conv.otherProfile.companyName)
      } else if (conv?.otherProfile?.realName) {
        setOtherName(conv.otherProfile.realName)
      } else if (conv?.otherUser?.name) {
        setOtherName(conv.otherUser.name)
      }
    } catch {
      // ignore
    }
  }

  // 首屏 loading：store 的 loading 完成一轮 false→true→false 后结束
  useEffect(() => {
    if (loading) {
      seenLoadRef.current = true
    } else if (seenLoadRef.current) {
      setFirstLoading(false)
    }
  }, [loading])

  const startChat = () => {
    if (!chatWith || activeRef.current === chatWith) return
    activeRef.current = chatWith
    setActiveChat(chatWith)
    startMsgPolling(chatWith)
    if (!params.name) fetchOtherName()
  }

  const stopChat = () => {
    if (!activeRef.current) return
    activeRef.current = null
    stopMsgPolling()
    setActiveChat(null)
  }

  useDidShow(() => {
    if (useAuthStore.getState().user) startChat()
  })

  useDidHide(() => stopChat())

  // 兜底：首次进入时 didShow 可能早于登录态初始化完成
  useEffect(() => {
    if (user) startChat()
    return () => stopChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // 发送消息：空内容不发；成功后才清空输入框
  const handleSend = async () => {
    const content = input.trim()
    if (!content || !chatWith || sending) return
    setSending(true)
    try {
      const sent = await sendMessage(chatWith, content, jobId || undefined)
      if (sent) setInput('')
    } finally {
      setSending(false)
    }
  }

  if (!chatWith) {
    return (
      <View className='cc-page'>
        <NavBar title='对话' />
        <View className='cc-empty'>
          <Text className='cc-empty-text'>缺少会话参数</Text>
        </View>
      </View>
    )
  }

  // 轮询到新消息时滚动到最后一条
  const lastMsg = messages[messages.length - 1]
  const scrollTarget = lastMsg?.id ? `msg-${lastMsg.id}` : ''

  const formatTimeHM = (timeStr: string): string => {
    const date = new Date(timeStr)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <View className='cc-page'>
      {/* 顶部（还原网页版：白底 h-12 返回 + 对方名称） */}
      <NavBar title={otherName} />

      {/* 消息区（还原网页版：灰底 + 头像 + 圆角气泡） */}
      <ScrollView className='cc-msg-list' scrollY scrollIntoView={scrollTarget} scrollWithAnimation>
        <View className='cc-msg-inner'>
          {firstLoading ? (
            <View className='cc-loading'>
              <View className='cc-loading-spinner' />
            </View>
          ) : messages.length === 0 ? (
            <View className='cc-empty'>
              <Text className='cc-empty-text'>暂无消息，发送第一条消息开始沟通</Text>
            </View>
          ) : (
            messages.map((m, idx) => {
              const isMine = m.senderId === myId
              const initial = m.sender?.name ? m.sender.name.charAt(0) : (isMine ? '我' : '?')
              return (
                <View key={m.id || idx} className={`cc-msg-row ${isMine ? 'cc-msg-mine' : ''}`}>
                  {/* 头像（还原网页版：我方橙 / 对方灰） */}
                  <View className={`cc-avatar ${isMine ? 'cc-avatar-mine' : 'cc-avatar-other'}`}>
                    <Text className='cc-avatar-text'>{initial}</Text>
                  </View>
                  <View className={`cc-bubble-col ${isMine ? 'cc-bubble-col-mine' : ''}`}>
                    <View className={`cc-bubble ${isMine ? 'cc-bubble-mine' : 'cc-bubble-other'}`}>
                      <Text className='cc-bubble-text'>{m.content}</Text>
                    </View>
                    <Text className='cc-msg-time'>{formatTimeHM(m.createdAt)}</Text>
                  </View>
                </View>
              )
            })
          )}
          <View id={`msg-${lastMsg?.id}`} className='cc-msg-bottom' />
        </View>
      </ScrollView>

      {/* 底部输入栏（还原网页版：h-10 灰底圆角输入 + 圆角发送钮） */}
      <View className='cc-input-bar safe-bottom'>
        <Input
          className='cc-input'
          value={input}
          placeholder='输入消息...'
          placeholderClass='cc-placeholder'
          maxlength={2000}
          confirmType='send'
          onInput={(e) => setInput(e.detail.value)}
          onConfirm={handleSend}
        />
        <View
          className={`cc-send-btn ${input.trim() && !sending ? 'cc-send-active' : ''}`}
          onClick={handleSend}
        >
          <Icon name='send' size={32} color={input.trim() && !sending ? '#ffffff' : '#D1D5DB'} />
        </View>
      </View>
    </View>
  )
}
