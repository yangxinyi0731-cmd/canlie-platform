import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../stores/authStore'

// 页面级路由守卫：未登录跳登录页，角色不匹配跳首页
export function useRequireAuth(role?: string) {
  const { user, initialized, init } = useAuthStore()

  useEffect(() => {
    if (!initialized) init()
  }, [initialized, init])

  useEffect(() => {
    if (initialized && !user) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    if (initialized && user && role && user.role !== role && user.role !== 'ADMIN') {
      Taro.reLaunch({ url: '/pages/jobs/index' })
    }
  }, [initialized, user, role])

  return { user, initialized }
}

// 格式化时间 HH:mm
export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// 格式化相对时间
export function formatRelativeTime(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day}天前`
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${month}-${date}`
}

// 薪资格式化
export function formatSalary(min: number, max: number, month?: number): string {
  if (!min && !max) return '面议'
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`)
  if (min && max) {
    const s = `${fmt(min)}-${fmt(max)}`
    return month ? `${s}·${month}薪` : s
  }
  return min ? `${fmt(min)}起` : `${fmt(max)}以内`
}
