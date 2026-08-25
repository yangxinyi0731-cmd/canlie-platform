import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { chatApi } from '../api'
import type { ChatConversation, ChatMessage } from '../types'

// 首版聊天：用 HTTP 轮询替代 Socket.IO（后端零改动）
// - 页面在 onShow 时调用 startPolling，onHide 时调用 stopPolling
// - 发消息走 chatApi.sendMessage（HTTP）
// - 会话列表 / 消息每 POLL_INTERVAL 毫秒刷新一次

const POLL_INTERVAL = 5000 // 5 秒

interface ChatState {
  conversations: ChatConversation[]
  messages: ChatMessage[]
  activeChat: string | null
  loading: boolean
  unreadTotal: number
  // 轮询控制
  pollTimer: any
  msgPollTimer: any
  loadConversations: () => Promise<void>
  loadMessages: (chatWith: string) => Promise<void>
  sendMessage: (receiverId: string, content: string, jobId?: string) => Promise<ChatMessage | null>
  setActiveChat: (chatWith: string | null) => void
  startConvPolling: () => void
  stopConvPolling: () => void
  startMsgPolling: (chatWith: string) => void
  stopMsgPolling: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  activeChat: null,
  loading: false,
  unreadTotal: 0,
  pollTimer: null,
  msgPollTimer: null,

  loadConversations: async () => {
    try {
      const res = await chatApi.getConversations()
      const conversations = res.data || []
      const unreadTotal = conversations.reduce(
        (sum: number, c: ChatConversation) => sum + (c.unreadCount || 0),
        0
      )
      set({ conversations, unreadTotal })
    } catch (err) {
      console.error('Load conversations error:', err)
    }
  },

  loadMessages: async (chatWith: string) => {
    set({ loading: true })
    try {
      const res = await chatApi.getMessages(chatWith)
      set({ messages: res.data?.messages || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  sendMessage: async (receiverId: string, content: string, jobId?: string) => {
    try {
      const res = await chatApi.sendMessage({ receiverId, content, jobId })
      const sentMsg = res.data
      if (sentMsg) {
        set((s) => ({ messages: [...s.messages, sentMsg] }))
        // 刷新会话列表最后一条消息
        get().loadConversations()
      }
      return sentMsg
    } catch (err: any) {
      console.error('Send message error:', err)
      Taro.showToast({ title: err.message || '发送失败', icon: 'none' })
      return null
    }
  },

  setActiveChat: (chatWith: string | null) => {
    set({ activeChat: chatWith, messages: [] })
    if (chatWith) {
      get().loadMessages(chatWith)
      chatApi.markRead(chatWith).catch(() => {})
    }
  },

  // 会话列表轮询
  startConvPolling: () => {
    const state = get()
    if (state.pollTimer) return
    get().loadConversations()
    const timer = setInterval(() => get().loadConversations(), POLL_INTERVAL)
    set({ pollTimer: timer })
  },

  stopConvPolling: () => {
    const { pollTimer } = get()
    if (pollTimer) {
      clearInterval(pollTimer)
      set({ pollTimer: null })
    }
  },

  // 单会话消息轮询
  startMsgPolling: (chatWith: string) => {
    const state = get()
    if (state.msgPollTimer) state.stopMsgPolling()
    const timer = setInterval(() => {
      if (get().activeChat === chatWith) get().loadMessages(chatWith)
    }, POLL_INTERVAL)
    set({ msgPollTimer: timer })
  },

  stopMsgPolling: () => {
    const { msgPollTimer } = get()
    if (msgPollTimer) {
      clearInterval(msgPollTimer)
      set({ msgPollTimer: null })
    }
  },
}))
