import Taro from '@tarojs/taro'
import api from './request'
import { BASE_URL, API_PREFIX } from '../constants'

// 重新导出默认 api，使 import api from '../api' 可用（与前端原结构一致）
export { default } from './request'


// ========== Auth API ==========
export const authApi = {
  login: (data: { phone: string; password: string }) => api.post('/auth/login', data),
  register: (data: { phone: string; password: string; role: string; name?: string }) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
}

// ========== Enterprise API ==========
export const enterpriseApi = {
  getProfile: () => api.get('/enterprises/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/enterprises/profile', data),
  getById: (id: string) => api.get(`/enterprises/${id}`),
}

// ========== Jobs API ==========
export const jobsApi = {
  list: (params?: Record<string, unknown>) => api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data),
  close: (id: string) => api.patch(`/jobs/${id}/close`),
  getMyJobs: (params?: Record<string, unknown>) => api.get('/jobs/my/list', { params }),
  getHotCities: () => api.get('/jobs/hot-cities'),
  apply: (id: string) => api.post(`/jobs/${id}/apply`),
  checkApplied: (id: string) => api.get(`/jobs/${id}/applied`),
  getMyApplications: () => api.get('/jobs/my/applications'),
  getApplications: (id: string) => api.get(`/jobs/${id}/applications`),
  updateApplication: (jobId: string, appId: string, status: string) =>
    api.patch(`/jobs/${jobId}/applications/${appId}`, { status }),
  favorite: (id: string) => api.post(`/jobs/${id}/favorite`),
  unfavorite: (id: string) => api.delete(`/jobs/${id}/favorite`),
  isFavorited: (id: string) => api.get(`/jobs/${id}/favorited`),
  getMyFavorites: () => api.get('/jobs/my/favorites'),
}

// ========== Talents API ==========
export const talentsApi = {
  getProfile: () => api.get('/talents/profile'),
  getCompleteness: () => api.get('/talents/profile/completeness'),
  updateProfile: (data: Record<string, unknown>) => api.put('/talents/profile', data),
  search: (params?: Record<string, unknown>) => api.get('/talents/search', { params }),
  getById: (id: string) => api.get(`/talents/${id}`),
  addVerification: (data: Record<string, unknown>) => api.post('/talents/verification', data),
  getVerifications: () => api.get('/talents/verifications'),
  // 工作经历 CRUD
  getWorkExperiences: () => api.get('/talents/work-experiences'),
  addWorkExperience: (data: Record<string, unknown>) => api.post('/talents/work-experiences', data),
  updateWorkExperience: (id: string, data: Record<string, unknown>) => api.put(`/talents/work-experiences/${id}`, data),
  deleteWorkExperience: (id: string) => api.delete(`/talents/work-experiences/${id}`),
}

// ========== Chat API ==========
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (chatWith: string, params?: Record<string, unknown>) =>
    api.get(`/chat/messages/${chatWith}`, { params }),
  sendMessage: (data: { receiverId: string; content: string; jobId?: string }) =>
    api.post('/chat/send', data),
  markRead: (chatWith: string) => api.post(`/chat/read/${chatWith}`),
}

// ========== Notification API ==========
export const notificationApi = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}

// ========== Matches API ==========
export const matchesApi = {
  getJobMatches: (jobId: string) => api.get(`/matches/job/${jobId}`),
  getMyMatches: () => api.get('/matches/talent'),
  runMatch: (jobId: string) => api.post(`/matches/run/${jobId}`),
}

// ========== Admin API ==========
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  toggleUser: (id: string) => api.patch(`/admin/users/${id}/toggle`),
  updateTalentStar: (id: string, starLevel: number) => api.put(`/admin/talents/${id}/star`, { starLevel }),
  verifyEnterprise: (id: string, status: string) => api.put(`/admin/enterprises/${id}/verify`, { status }),
  getVerifications: () => api.get('/admin/verifications'),
  updateVerification: (id: string, status: string) => api.put(`/admin/verifications/${id}`, { status }),
  getTalentDetail: (id: string) => api.get(`/admin/talents/${id}/detail`),
}

// ========== Subscription API ==========
export const subscriptionApi = {
  getStatus: () => api.get('/enterprises/subscription/status'),
}

// ========== Supply Platform API ==========
export const supplyApi = {
  getCategories: () => api.get('/supply/categories'),
  listCompanies: (params?: Record<string, unknown>) => api.get('/supply/companies', { params }),
  getCompany: (id: string) => api.get(`/supply/companies/${id}`),
  getMyCompany: () => api.get('/supply/my/company'),
  applyCompany: (data: Record<string, unknown>) => api.post('/supply/my/company', data),
  updateCompany: (data: Record<string, unknown>) => api.put('/supply/my/company', data),
  addProduct: (data: Record<string, unknown>) => api.post('/supply/my/company/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) => api.put(`/supply/my/company/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/supply/my/company/products/${id}`),
  adminListCompanies: (params?: Record<string, unknown>) => api.get('/supply/admin/companies', { params }),
  adminVerifyCompany: (id: string, status: string, reason?: string) =>
    api.put(`/supply/admin/companies/${id}/verify`, { status, reason }),
}

// ========== Share（创业/学习分享）API ==========
export const sharesApi = {
  list: (params?: Record<string, unknown>) => api.get('/shares', { params }),
  getById: (id: string) => api.get(`/shares/${id}`),
  create: (data: Record<string, unknown>) => api.post('/shares', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/shares/${id}`, data),
  remove: (id: string) => api.delete(`/shares/${id}`),
  toggleLike: (id: string) => api.post(`/shares/${id}/like`),
  addComment: (id: string, content: string) => api.post(`/shares/${id}/comment`, { content }),
  getMy: (params?: Record<string, unknown>) => api.get('/shares/my/list', { params }),
  adminList: (params?: Record<string, unknown>) => api.get('/shares/admin/list', { params }),
  adminSetStatus: (id: string, status: string) => api.patch(`/shares/admin/${id}/status`, { status }),
}

// ========== Reference Data API ==========
export const refApi = {
  getCuisines: () => api.get('/cuisines/cuisines'),
  getCuisinesGrouped: () => api.get('/cuisines/cuisines/grouped'),
  getBusinessTypes: () => api.get('/cuisines/business-types'),
  getJobCategories: () => api.get('/cuisines/job-categories'),
  getCities: () => api.get('/cuisines/cities'),
  getAll: () => api.get('/cuisines/all'),
  getPlans: () => api.get('/cuisines/plans'),
  getStarCriteria: () => api.get('/cuisines/star-criteria'),
}

// ========== Upload API ==========
// 小程序文件上传用 Taro.uploadFile（非 axios FormData）
// Taro.uploadFile 对 401/4xx/5xx 同样 resolve（状态码在 res.statusCode），必须显式校验
function parseUploadResult(res: { statusCode: number; data: string }): { data: any } {
  if (res.statusCode >= 400) {
    let msg = '上传失败'
    try {
      const errBody = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      msg = errBody?.error || errBody?.message || msg
    } catch { /* 网关返回 HTML 等非 JSON 体 */ }
    throw new Error(msg)
  }
  try {
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    return { data }
  } catch {
    throw new Error('上传失败：服务器响应异常')
  }
}

export type UploadPurpose =
  | 'AVATAR'
  | 'ENTERPRISE_LOGO'
  | 'SHARE_IMAGE'
  | 'SHARE_VIDEO'
  | 'SUPPLY_PRODUCT_IMAGE'
  | 'TALENT_CERTIFICATE'
  | 'TALENT_SALARY_PROOF'
  | 'RESUME'
  | 'ENTERPRISE_LICENSE'
  | 'PERSONAL_ID'
  | 'SUPPLY_LICENSE'

export const uploadApi = {
  upload: (filePath: string, purpose: UploadPurpose): Promise<{ data: any }> => {
    const token = Taro.getStorageSync('token')
    return Taro.uploadFile({
      url: BASE_URL + API_PREFIX + '/uploads',
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      formData: { purpose },
    }).then(parseUploadResult)
  },
  uploadVideo: (filePath: string): Promise<{ data: any }> => {
    const token = Taro.getStorageSync('token')
    return Taro.uploadFile({
      url: BASE_URL + API_PREFIX + '/uploads/video',
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      formData: { purpose: 'SHARE_VIDEO' },
    }).then(parseUploadResult)
  },
  downloadPrivate: (url: string) => {
    const token = Taro.getStorageSync('token')
    const requestUrl = url.startsWith('/uploads/') ? `${API_PREFIX}${url}` : url
    return Taro.downloadFile({
      url: requestUrl.startsWith('http://') || requestUrl.startsWith('https://') ? requestUrl : BASE_URL + requestUrl,
      header: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((res) => {
      if (res.statusCode >= 400) throw new Error('无权读取该文件或文件已失效')
      return res.tempFilePath
    })
  },
}

// ========== Helper Functions ==========

// 安全获取数组
export const safeArray = <T>(data: T[] | null | undefined): T[] => {
  if (!data || !Array.isArray(data)) return []
  return data
}

// 安全获取图片URL：后端返回相对路径（/uploads/xxx），小程序无代理需拼绝对地址
export const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return BASE_URL + (url.startsWith('/uploads/') ? `${API_PREFIX}${url}` : url)
}

// 安全获取头像：无头像时用首字母占位（本地生成，避免外部 ui-avatars 依赖）
export const getAvatarUrl = (url: string | null | undefined, name?: string): string => {
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return BASE_URL + (url.startsWith('/uploads/') ? `${API_PREFIX}${url}` : url)
  }
  return ''
}

// 取姓名首字符作为头像占位文本
export const getAvatarText = (name?: string): string => {
  return name?.charAt(0)?.toUpperCase() || '?'
}
