import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { chatApi } from '../api';
import type { ChatConversation, ChatMessage } from '../types';

// 延迟获取 authStore 避免循环依赖
let getAuthUser: () => any = () => null;
import('../stores/authStore').then(({ useAuthStore }) => {
  getAuthUser = () => useAuthStore.getState().user;
});

interface ChatState {
  socket: Socket | null;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  activeChat: string | null;
  loading: boolean;
  unreadTotal: number;
  initSocket: (userId: string) => void;
  disconnectSocket: () => void;
  loadConversations: () => Promise<void>;
  loadMessages: (chatWith: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string, jobId?: string) => void;
  setActiveChat: (chatWith: string | null) => void;
  addMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  messages: [],
  activeChat: null,
  loading: false,
  unreadTotal: 0,

  initSocket: (userId: string) => {
    // 连接到后端Socket.IO服务器
    // 通过Vite代理，socket.io也走/api/socket.io路径
    const socket = io('/socket.io', {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    socket.emit('join', { userId });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('newMessage', (message: ChatMessage) => {
      console.log('Received newMessage:', message);
      const state = get();
      if (state.activeChat === message.senderId) {
        set((s) => ({ messages: [...s.messages, message] }));
      }
      get().loadConversations();
    });

    socket.on('messageSent', (message: ChatMessage) => {
      console.log('Message sent confirmed:', message);
      const state = get();
      if (state.activeChat === message.receiverId) {
        set((s) => ({ messages: [...s.messages, message] }));
      }
      get().loadConversations();
    });

    socket.on('messageError', (err: { error: string }) => {
      console.error('Message error:', err);
      alert(err.error);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    set({ socket: null });
  },

  loadConversations: async () => {
    try {
      const res = await chatApi.getConversations();
      const conversations = res.data;
      const unreadTotal = conversations.reduce((sum: number, c: ChatConversation) => sum + c.unreadCount, 0);
      set({ conversations, unreadTotal });
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  },

  loadMessages: async (chatWith: string) => {
    set({ loading: true });
    try {
      const res = await chatApi.getMessages(chatWith);
      set({ messages: res.data.messages, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  sendMessage: (receiverId: string, content: string, jobId?: string) => {
    const { socket } = get();
    const user = getAuthUser();
    if (socket && user) {
      socket.emit('sendMessage', {
        senderId: user.id,
        receiverId,
        content,
        jobId,
      });
    } else {
      // Socket不可用时使用HTTP API
      chatApi.sendMessage({ receiverId, content, jobId }).then(() => {
        get().loadConversations();
      });
    }
  },

  setActiveChat: (chatWith: string | null) => {
    set({ activeChat: chatWith, messages: [] });
    if (chatWith) get().loadMessages(chatWith);
  },

  addMessage: (message: ChatMessage) => {
    set((s) => ({ messages: [...s.messages, message] }));
  },
}));
