declare const __CANLIE_API_BASE_URL__: string

// 由 Taro 构建配置注入：生产默认 HTTPS，开发默认本机服务。
// 如需覆盖，请在构建环境设置 TARO_APP_API_BASE_URL。
export const BASE_URL = __CANLIE_API_BASE_URL__.replace(/\/+$/, '')

// API 前缀
export const API_PREFIX = '/api'

// 主色等品牌常量
export const THEME = {
  primary: '#C2410C',
  primaryLight: '#EA580C',
}
