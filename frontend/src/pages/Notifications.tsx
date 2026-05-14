import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, chatApi } from '../api';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  data?: string;
}

interface Conversation {
  id: string;
  chatWith: string;
  unreadCount: number;
  lastMessage?: string;
  lastTime?: string;
  otherUser?: { id: string; name?: string; avatar?: string; role: string };
  otherProfile?: { companyName?: string; realName?: string };
}

const typeIcon: Record<string, string> = {
  APPLICATION: '📋',
  MESSAGE: '💬',
  SYSTEM: '🔔',
  VERIFICATION: '✅',
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, convRes] = await Promise.all([
        notificationApi.list(),
        chatApi.getConversations(),
      ]);
      setNotifications(notifRes.data);
      setConversations(convRes.data || []);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleClickNotification = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    try {
      const extra = n.data ? JSON.parse(n.data) : {};
      if (extra.jobId) navigate(`/jobs/${extra.jobId}`);
      else if (extra.chatWith) navigate(`/chat/${extra.chatWith}`);
    } catch {
      // ignore
    }
  };

  const handleClickConversation = (conv: Conversation) => {
    navigate(`/chat/${conv.chatWith}`);
  };

  const getDisplayName = (conv: Conversation): string => {
    if (conv.otherProfile?.companyName) return conv.otherProfile.companyName;
    if (conv.otherProfile?.realName) return conv.otherProfile.realName;
    if (conv.otherUser?.name) return conv.otherUser.name;
    return '用户';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center app-container">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const unreadMsgCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold">通知中心</h1>
          {(unreadNotifCount > 0 || unreadMsgCount > 0) && (
            <button onClick={handleMarkAllRead} className="text-xs text-[#FF6B00]">全部已读</button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-2.5 text-sm font-medium relative ${
              activeTab === 'messages' ? 'text-[#FF6B00]' : 'text-gray-500'
            }`}
          >
            消息
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1 right-1/4 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2.5 text-sm font-medium relative ${
              activeTab === 'notifications' ? 'text-[#FF6B00]' : 'text-gray-500'
            }`}
          >
            系统通知
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 right-1/4 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">暂无消息</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleClickConversation(conv)}
                className="px-4 py-3.5 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white font-medium shrink-0">
                  {getDisplayName(conv).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{getDisplayName(conv)}</h3>
                    {conv.lastTime && (
                      <span className="text-[11px] text-gray-300">
                        {new Date(conv.lastTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage || '暂无消息'}</p>
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">暂无系统通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={`px-4 py-3.5 flex items-start gap-3 cursor-pointer active:bg-gray-50 transition-colors ${
                  !n.read ? 'bg-orange-50/50' : 'bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
                  {typeIcon[n.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    {new Date(n.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
