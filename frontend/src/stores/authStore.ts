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
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, initialized: true, token });
    } catch {
      localStorage.removeItem('token');
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

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  updateUser: (user: User) => set({ user }),
}));

// 初始化Socket的函数（在App.tsx中调用）
export function initChatSocket(userId: string) {
  // 动态导入避免循环依赖
  import('./chatStore').then(({ useChatStore }) => {
    useChatStore.getState().initSocket(userId);
  });
}
