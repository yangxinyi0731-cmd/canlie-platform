import { PropsWithChildren } from 'react'
import { useLaunch, useDidShow } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  // 应用启动：检查登录态，未登录跳登录页
  useLaunch(() => {
    const token = Taro.getStorageSync('token')
    if (!token || token === 'null' || token === 'undefined') {
      // 启动页已是登录页时不再 reLaunch，避免重复渲染闪屏
      const pages = Taro.getCurrentPages()
      const current = pages[pages.length - 1]?.route
      if (!current || current !== 'pages/login/index') {
        Taro.reLaunch({ url: '/pages/login/index' })
      }
    } else {
      // 已有 token，异步恢复用户信息
      useAuthStore.getState().init()
    }
  })

  // 从后台切回前台时重新校验
  useDidShow(() => {
    const { initialized, user, init } = useAuthStore.getState()
    const token = Taro.getStorageSync('token')
    if (token && initialized && !user) {
      init()
    }
  })

  return children
}

export default App
