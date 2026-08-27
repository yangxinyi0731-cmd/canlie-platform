import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 标记是否已经触发 forceLogout，防止多个 401 并发时重复调用
let logoutTriggered = false;

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      // 清空 localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 使用 Zustand forceLogout 而不是 window.location.replace
      // 这样 React 的 ProtectedRoute 会平滑重定向到 /login
      // 避免了硬导航导致的页面撕裂和白屏
      if (!logoutTriggered) {
        logoutTriggered = true;
        import('../stores/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().forceLogout();
          logoutTriggered = false;
        });
      }
      // 不 reject，返回 null 让调用方优雅处理
      return Promise.resolve({ data: null } as any);
    }
    // 统一错误消息提取
    const message = error.response?.data?.error || error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);

export default api;

// ========== Auth API ==========
export const authApi = {
  login: (data: { phone: string; password: string }) => api.post('/auth/login', data),
  register: (data: { phone: string; password: string; role: string; name?: string }) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
};

// ========== Enterprise API ==========
export const enterpriseApi = {
  getProfile: () => api.get('/enterprises/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/enterprises/profile', data),
  getById: (id: string) => api.get(`/enterprises/${id}`),
};

// ========== Jobs API ==========
export const jobsApi = {
  list: (params?: Record<string, unknown>) => api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data),
  close: (id: string) => api.patch(`/jobs/${id}/close`),
  getMyJobs: (params?: Record<string, unknown>) => api.get('/jobs/my/list', { params }),
  apply: (id: string) => api.post(`/jobs/${id}/apply`),
  checkApplied: (id: string) => api.get(`/jobs/${id}/applied`),
  getMyApplications: () => api.get('/jobs/my/applications'),
  getApplications: (id: string) => api.get(`/jobs/${id}/applications`),
  updateApplication: (jobId: string, appId: string, status: string) => api.patch(`/jobs/${jobId}/applications/${appId}`, { status }),
  favorite: (id: string) => api.post(`/jobs/${id}/favorite`),
  unfavorite: (id: string) => api.delete(`/jobs/${id}/favorite`),
  isFavorited: (id: string) => api.get(`/jobs/${id}/favorited`),
  getMyFavorites: () => api.get('/jobs/my/favorites'),
};

// ========== Talents API ==========
export const talentsApi = {
  getProfile: () => api.get('/talents/profile'),
  getCompleteness: () => api.get('/talents/profile/completeness'),
  updateProfile: (data: Record<string, unknown>) => api.put('/talents/profile', data),
  search: (params?: Record<string, unknown>) => api.get('/talents/search', { params }),
  getById: (id: string) => api.get(`/talents/${id}`),
  addVerification: (data: Record<string, unknown>) => api.post('/talents/verification', data),
  getVerifications: () => api.get('/talents/verifications'),
  // Work experience CRUD
  getWorkExperiences: () => api.get('/talents/work-experiences'),
  addWorkExperience: (data: Record<string, unknown>) => api.post('/talents/work-experiences', data),
  updateWorkExperience: (id: string, data: Record<string, unknown>) => api.put(`/talents/work-experiences/${id}`, data),
  deleteWorkExperience: (id: string) => api.delete(`/talents/work-experiences/${id}`),
};

// ========== Chat API ==========
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (chatWith: string, params?: Record<string, unknown>) => api.get(`/chat/messages/${chatWith}`, { params }),
  sendMessage: (data: { receiverId: string; content: string; jobId?: string }) => api.post('/chat/send', data),
  markRead: (chatWith: string) => api.post(`/chat/read/${chatWith}`),
};

// ========== Matches API ==========
export const matchesApi = {
  getJobMatches: (jobId: string) => api.get(`/matches/job/${jobId}`),
  getMyMatches: () => api.get('/matches/talent'),
  runMatch: (jobId: string) => api.post(`/matches/run/${jobId}`),
};

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
};

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
};

// ========== Subscription API ==========
export const subscriptionApi = {
  getStatus: () => api.get('/enterprises/subscription/status'),
  buy: (planId: string) => api.post('/enterprises/subscription/buy', { planId }),
};

// ========== Upload API ==========
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
  | 'SUPPLY_LICENSE';

export const uploadApi = {
  upload: (file: File, purpose: UploadPurpose) => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadVideo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'SHARE_VIDEO');
    return api.post('/uploads/video', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getPrivate: (url: string) => api.get(url.replace(/^\/api/, ''), { responseType: 'blob' }),
};

// ========== Notification API ==========
export const notificationApi = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

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
  adminVerifyCompany: (id: string, status: string, reason?: string) => api.put(`/supply/admin/companies/${id}/verify`, { status, reason }),
};

// ========== Share (创业/学习分享) API ==========
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
};

// ========== Helper Functions ==========

// 安全获取数组，防止 null/undefined 导致 .map() 崩溃
export const safeArray = <T>(data: T[] | null | undefined): T[] => {
  if (!data || !Array.isArray(data)) return [];
  return data;
};

// 安全获取图片URL，支持手机端访问
export const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // 旧版 /uploads 路径也必须经过新的受控 API 兼容端点。
  return url.startsWith('/uploads/') ? `/api${url}` : url;
};

// 安全获取头像，提供默认占位图
export const getAvatarUrl = (url: string | null | undefined, name?: string): string => {
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/uploads/') ? `/api${url}` : url;
  }
  // 默认头像：使用首字母
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=FF6B00&color=fff&size=128`;
};
