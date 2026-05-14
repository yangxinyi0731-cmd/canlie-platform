import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api';

interface Conversation {
  id: string;
  chatWith: string;
  unreadCount: number;
  lastMessage?: string;
  lastTime?: string;
  otherUser?: {
    id: string;
    name?: string;
    avatar?: string;
    role?: string;
  };
  otherProfile?: {
    companyName?: string;
    realName?: string;
    companyLogo?: string;
    avatar?: string;
  };
}

export default function Chat() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.data || []);
      setError('');
    } catch (err: any) {
      console.error('Load conversations error:', err);
      if (!loading) setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (c: Conversation): string => {
    if (c.otherUser?.name) return c.otherUser.name;
    if (c.otherProfile?.companyName) return c.otherProfile.companyName;
    if (c.otherProfile?.realName) return c.otherProfile.realName;
    return '用户';
  };

  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (diff < oneDay && date.getDate() === now.getDate()) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      if (diff < 2 * oneDay) return '昨天';
      if (diff < 7 * oneDay) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[date.getDay()];
      }
      return `${date.getMonth() + 1}-${date.getDate()}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">消息</h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={loadConversations} className="text-[#FF6B00] text-sm">
            重新加载
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && conversations.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">暂无消息</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {conversations.filter(c => c.otherUser).map((c) => (
            <div
              key={c.id || c.chatWith}
              onClick={() => navigate(`/chat/${c.chatWith}`)}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 cursor-pointer border-b border-gray-50"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] font-bold shrink-0">
                {getDisplayName(c).charAt(0) || '?'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {getDisplayName(c)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatTime(c.lastTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500 truncate">
                    {c.lastMessage || '开始聊天'}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
