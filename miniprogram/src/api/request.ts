import Taro from '@tarojs/taro'
import { BASE_URL, API_PREFIX } from '../constants'

// 与 frontend/src/api/index.ts 行为一致的 Taro.request 封装：
// - 注入 Bearer token
// - 401 清存储 + 跳登录页 + 返回 { data: null }（不 reject，调用方优雅处理）
// - 统一错误消息提取
// - 返回形如 { data } 的对象，使现有 res.data 调用方式保持不变

interface RequestConfig {
  params?: Record<string, any>
  data?: any
  header?: Record<string, string>
}

// 标记是否已触发登出跳转，防止多个 401 并发重复跳转
let logoutTriggered = false

function getToken(): string | null {
  const t = Taro.getStorageSync('token')
  if (t && t !== 'null' && t !== 'undefined') return t
  return null
}

// GET 请求的 query string 拼接（过滤空值）
function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length ? '?' + pairs.join('&') : ''
}

async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  config: RequestConfig = {}
): Promise<{ data: T }> {
  const fullUrl = BASE_URL + API_PREFIX + url + (method === 'GET' ? buildQuery(config.params) : '')
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.header,
  }
  const token = getToken()
  if (token) header.Authorization = `Bearer ${token}`

  try {
    const res = await Taro.request({
      url: fullUrl,
      method,
      header,
      data: config.data,
      timeout: 15000,
    })

    // 401：清存储 + 跳登录
    if (res.statusCode === 401) {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      if (!logoutTriggered) {
        logoutTriggered = true
        // 动态引入避免循环依赖，清空内存状态
        import('../stores/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().forceLogout()
          logoutTriggered = false
        })
        Taro.reLaunch({ url: '/pages/login/index' })
      }
      return { data: null as any }
    }

    // 4xx/5xx：提取错误消息后 reject
    if (res.statusCode >= 400) {
      const msg = res.data?.error || res.data?.message || '网络错误'
      throw new Error(typeof msg === 'string' ? msg : '请求失败')
    }

    return { data: res.data as T }
  } catch (err: any) {
    // Taro 网络层失败（如断网、域名不通）
    if (err && err.errMsg && err.errMsg.indexOf('request:fail') !== -1) {
      // 真机未开「开发调试」时 http 后端会被微信拦截，给出明确指引
      const msg = String(err.errMsg)
      if (msg.indexOf('url not in domain list') !== -1 || msg.indexOf('not in domain') !== -1) {
        throw new Error('无法连接服务器：请点右上角···→开发调试→开启后重启小程序')
      }
      throw new Error('网络连接失败，请检查网络后重试')
    }
    throw err
  }
}

const api = {
  get: (url: string, config?: RequestConfig) => request('GET', url, config),
  post: (url: string, data?: any, config?: RequestConfig) => request('POST', url, { ...config, data }),
  put: (url: string, data?: any, config?: RequestConfig) => request('PUT', url, { ...config, data }),
  patch: (url: string, data?: any, config?: RequestConfig) => request('PATCH', url, { ...config, data }),
  delete: (url: string, config?: RequestConfig) => request('DELETE', url, config),
}

export default api
