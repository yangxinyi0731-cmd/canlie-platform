import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { chatApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; name?: string; avatar?: string };
}

export default function ChatConversation() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const { socket, initSocket } = useChatStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('用户');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化 Socket 连接
  useEffect(() => {
    if (me?.id && !socket) {
      initSocket(me.id);
    }
  }, [me?.id, socket, initSocket]);

  // 加载消息并获取对方名称（先取名称，避免消息里的昵称覆盖企业名）
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await fetchOtherName();
      if (!cancelled) loadMessages();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchOtherName = async () => {
    if (!userId) return;
    try {
      const res = await chatApi.getConversations();
      const conv = (res.data || []).find((c: any) => c.chatWith === userId);
      // 企业方优先显示公司名，人才方显示真实姓名，最后才回退到用户昵称
      if (conv?.otherProfile?.companyName) {
        setOtherName(conv.otherProfile.companyName);
      } else if (conv?.otherProfile?.realName) {
        setOtherName(conv.otherProfile.realName);
      } else if (conv?.otherUser?.name) {
        setOtherName(conv.otherUser.name);
      }
    } catch {}
  };

  const loadMessages = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await chatApi.getMessages(userId, jobId ? { jobId } : undefined);
      const msgs = res.data.messages || [];
      setMessages(msgs);

      // 仅当尚未拿到企业/真实姓名时，才回退到消息里的昵称，避免把"经理"这类昵称
      // 误显示成对方企业名称
      if (msgs.length > 0 && otherName === '用户') {
        const otherMsg = msgs.find((m: Message) => m.senderId !== me?.id);
        if (otherMsg?.sender?.name) {
          setOtherName(otherMsg.sender.name);
        }
      }

      chatApi.markRead(userId).catch(() => {});
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 滚动到底部
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, loading]);

  // 发送消息
  const handleSend = async () => {
    const content = text.trim();
    if (!content || !userId || sending) return;

    setSending(true);
    const savedText = content;
    setText('');

    try {
      const res = await chatApi.sendMessage({ receiverId: userId, content: savedText, jobId: jobId || undefined });
      const sentMsg = res.data;
      setMessages(prev => [...prev, sentMsg]);
    } catch (err: any) {
      console.error('Send message error:', err);
      const errorMsg = err.response?.data?.error || err.message || '发送失败，请重试';
      alert(errorMsg);
      setText(savedText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center h-12 px-4">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="ml-2 text-base font-semibold text-gray-900">
            {otherName}
          </h1>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-sm">暂无消息，发送第一条消息开始沟通</p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <>
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === me?.id;
              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-start gap-2.5 mb-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium ${
                    isMine ? 'bg-[#FF6B00]' : 'bg-gray-400'
                  }`}>
                    {msg.sender?.name ? msg.sender.name.charAt(0) : (isMine ? '我' : '?')}
                  </div>
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <div className={`px-3 py-2 rounded-2xl ${
                      isMine
                        ? 'bg-[#FF6B00] text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 safe-bottom">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 h-10 bg-gray-50 rounded-xl px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
            disabled={sending}
            maxLength={2000}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              text.trim() && !sending
                ? 'bg-[#FF6B00] text-white shadow-sm'
                : 'bg-gray-100 text-gray-300'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}