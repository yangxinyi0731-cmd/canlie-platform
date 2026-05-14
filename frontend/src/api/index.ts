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

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  getMyJobs: () => api.get('/jobs/my/list'),
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
  updateProfile: (data: Record<string, unknown>) => api.put('/talents/profile', data),
  search: (params?: Record<string, unknown>) => api.get('/talents/search', { params }),
  getById: (id: string) => api.get(`/talents/${id}`),
  addVerification: (data: Record<string, unknown>) => api.post('/talents/verification', data),
  getVerifications: () => api.get('/talents/verifications'),
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
};

// ========== Reference Data API ==========
export const refApi = {
  getCuisines: () => api.get('/cuisines/cuisines'),
  getBusinessTypes: () => api.get('/cuisines/business-types'),
  getAll: () => api.get('/cuisines/all'),
};

// ========== Upload API ==========
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ========== Notification API ==========
export const notificationApi = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
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
  // 通过Vite代理访问，不需要拼接host
  return url;
};

// 安全获取头像，提供默认占位图
export const getAvatarUrl = (url: string | null | undefined, name?: string): string => {
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url; // 通过Vite代理访问
  }
  // 默认头像：使用首字母
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=FF6B00&color=fff&size=128`;
};
