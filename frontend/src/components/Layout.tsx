import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { notificationApi } from '../api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  // 轮询未读通知数量
  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      notificationApi.getUnreadCount().then(res => setUnreadCount(res.data.count)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // 根据用户角色显示不同的Tab
  type TabItem = {
    path: string;
    label: string;
    icon: (active: boolean) => React.ReactNode;
    badge?: number;
  };

  const getTabs = (): TabItem[] => {
    const baseTabs: TabItem[] = [
      {
        path: '/',
        label: user?.role === 'ENTERPRISE' ? '职位' : '职位',
        icon: (active: boolean) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#FF6B00' : 'none'} stroke={active ? '#FF6B00' : '#9CA3AF'} strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
    ];

    // 企业端：职位、人才、通知、我的
    if (user?.role === 'ENTERPRISE') {
      baseTabs.push({
        path: '/enterprise/talent-search',
        label: '人才',
        icon: (active: boolean) => (
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#FF6B00' : 'none'} stroke={active ? '#FF6B00' : '#9CA3AF'} strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      });
    }

    // 合并消息和通知为一个"通知"入口
    baseTabs.push({
      path: '/notifications',
      label: '通知',
      badge: unreadCount,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#FF6B00' : 'none'} stroke={active ? '#FF6B00' : '#9CA3AF'} strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    });

    baseTabs.push({
      path: '/profile',
      label: '我的',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#FF6B00' : 'none'} stroke={active ? '#FF6B00' : '#9CA3AF'} strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    });

    return baseTabs;
  };

  const tabs = getTabs();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-16 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 safe-bottom">
        <div className="app-container flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              >
                <div className="relative">
                  {tab.icon(isActive)}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? 'text-[#FF6B00] font-medium' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
