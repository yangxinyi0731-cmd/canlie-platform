import { create } from 'zustand'
import Taro from '@tarojs/taro'
import api from '../api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, role: string, name?: string) => Promise<void>
  logout: () => void
  forceLogout: () => void // 强制退出，不导航（用于 401 拦截器）
  updateUser: (user: User) => void
}

// 所有应用相关的 storage key，logout 时全部清除
const APP_KEYS = ['token', 'user', 'remembered_phone', 'remembered_password']

function clearAllAppStorage() {
  for (const key of APP_KEYS) {
    try { Taro.removeStorageSync(key) } catch {}
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: Taro.getStorageSync('token') || null,
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    const token = Taro.getStorageSync('token')
    if (!token || token === 'null' || token === 'undefined') {
      set({ initialized: true, user: null, token: null })
      return
    }
    try {
      const res = await api.get('/auth/me')
      // 401 拦截器返回 {data:null}：token 已失效，清登录态（保留 remembered_phone 之外的全部）
      if (!res || res.data == null) {
        Taro.removeStorageSync('token')
        Taro.removeStorageSync('user')
        set({ user: null, token: null, initialized: true })
        return
      }
      set({ user: res.data, initialized: true, token })
    } catch {
      // 网络失败/服务器重启/未开开发调试：保留 token 与记住的手机号，
      // 不标记 initialized，切回前台时（app.ts useDidShow）自动重试，避免误踢登录态
      set({ user: null })
    }
  },

  login: async (phone: string, password: string) => {
    const res = await api.post('/auth/login', { phone, password })
    const { token, user } = res.data
    Taro.setStorageSync('token', token)
    set({ user, token })
  },

  register: async (phone: string, password: string, role: string, name?: string) => {
    const res = await api.post('/auth/register', { phone, password, role, name })
    const { token, user } = res.data
    Taro.setStorageSync('token', token)
    set({ user, token })
  },

  // 用户主动退出：清状态 + 跳登录页
  logout: () => {
    clearAllAppStorage()
    set({ user: null, token: null, initialized: true })
    Taro.reLaunch({ url: '/pages/login/index' })
  },

  // 强制退出（不跳转）：用于 401 拦截器
  forceLogout: () => {
    clearAllAppStorage()
    set({ user: null, token: null, initialized: true })
  },

  updateUser: (user: User) => set({ user }),
}))
