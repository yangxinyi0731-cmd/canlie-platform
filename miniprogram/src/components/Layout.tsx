import { Button, View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { notificationApi } from '../api';
import Icon from './Icon';
import './Layout.scss';

interface LayoutProps {
  children: ReactNode;
  /** 当前激活的 tab 页面路径 */
  active: string;
}

interface TabItem {
  path: string;
  label: string;
  icon: string;
}

const TABS: Record<string, TabItem> = {
  jobs: { path: '/pages/jobs/index', label: '职位', icon: 'home' },
  talentSearch: { path: '/pages/talent-search/index', label: '人才', icon: 'users' },
  notifications: { path: '/pages/notifications/index', label: '通知', icon: 'bell' },
  profile: { path: '/pages/profile/index', label: '我的', icon: 'user' },
};

/**
 * 页面底部导航（1:1 还原网页版 Layout.tsx）
 * - 人才端 3 个 Tab：职位 / 通知 / 我的
 * - 企业端 4 个 Tab：职位 / 人才 / 通知 / 我的
 * - 通知 Tab 带未读角标（15 秒轮询，同网页版）
 * - 替代原生 tabBar（原生无法按角色出不同 Tab 且无图标）
 */
export default function Layout({ children, active }: LayoutProps) {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      notificationApi.getUnreadCount().then(res => setUnreadCount(res.data?.count || 0)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const tabs: TabItem[] = [TABS.jobs];
  if (user?.role === 'ENTERPRISE') {
    tabs.push(TABS.talentSearch);
  }
  tabs.push(TABS.notifications, TABS.profile);

  const switchTo = (path: string) => {
    if (path === active) return;
    Taro.reLaunch({ url: path });
  };

  return (
    <View className='layout'>
      <View className='layout-main tab-page-padding'>{children}</View>
      <View className='tab-nav safe-bottom'>
        <View className='tab-nav-inner'>
          {tabs.map(tab => {
            const isActive = active === tab.path;
            return (
              <Button
                key={tab.path}
                className={`ui-button-reset tab-item ${isActive ? 'tab-item-active' : ''}`}
                hoverClass='tab-item-pressed'
                aria-label={`${tab.label}${isActive ? '，当前页面' : ''}`}
                onClick={() => switchTo(tab.path)}
              >
                <View className='tab-icon-wrap'>
                  <Icon
                    name={tab.icon}
                    size={44}
                    color={isActive ? '#C2410C' : '#5F6B7A'}
                    fill={isActive ? '#C2410C' : 'none'}
                  />
                  {tab.path === TABS.notifications.path && unreadCount > 0 && (
                    <Text className='tab-badge'>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  )}
                </View>
                <Text className={`tab-label ${isActive ? 'tab-label-active' : ''}`}>{tab.label}</Text>
                {isActive ? <View className='tab-current-mark' /> : null}
              </Button>
            );
          })}
        </View>
      </View>
    </View>
  );
}
