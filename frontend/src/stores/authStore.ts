import { create } from 'zustand';
import api from '../api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, role: string, name?: string) => Promise<void>;
  logout: () => void;
  forceLogout: () => void; // 强制退出，不导航（用于 401 拦截器）
  updateUser: (user: User) => void;
}

// 所有应用相关的 localStorage key，logout 时全部清除
const APP_KEYS = [
  'token', 'user', 'remembered_phone', 'remembered_password',
];

function clearAllAppStorage() {
  for (const key of APP_KEYS) {
    try { localStorage.removeItem(key); } catch {}
  }
  // 同时清除 sessionStorage（二次保险）
  for (const key of APP_KEYS) {
    try { sessionStorage.removeItem(key); } catch {}
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  initialized: false,

  init: async () => {
    // 防止重复初始化
    if (get().initialized) return;

    const token = localStorage.getItem('token');
    if (!token) {
      set({ initialized: true, user: null, token: null });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, initialized: true, token });
    } catch {
      clearAllAppStorage();
      set({ user: null, token: null, initialized: true });
    }
  },

  login: async (phone: string, password: string) => {
    const res = await api.post('/auth/login', { phone, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    set({ user, token });
  },

  register: async (phone: string, password: string, role: string, name?: string) => {
    const res = await api.post('/auth/register', { phone, password, role, name });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    set({ user, token });
  },

  // 用户主动退出：清除所有状态 + 强制跳转登录页
  logout: () => {
    clearAllAppStorage();
    // 先同步清空内存状态，防止短暂闪烁
    set({ user: null, token: null, initialized: true });
    // 使用 replace 清除浏览器历史，然后强制整页重载到 /login
    // 整页重载确保所有 JS 状态从零开始，不留任何残留
    window.location.replace('/login');
  },

  // 强制退出（不跳转）：用于 401 拦截器等场景
  forceLogout: () => {
    clearAllAppStorage();
    set({ user: null, token: null, initialized: true });
  },

  updateUser: (user: User) => set({ user }),
}));

// 初始化Socket的函数（在App.tsx中调用）
export function initChatSocket(userId: string) {
  import('./chatStore').then(({ useChatStore }) => {
    useChatStore.getState().initSocket(userId);
  });
}
