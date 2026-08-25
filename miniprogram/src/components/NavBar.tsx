import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ReactNode } from 'react';
import './NavBar.scss';

/** 状态栏高度（px，全 app 共享） */
export const STATUS_BAR_HEIGHT = Taro.getSystemInfoSync().statusBarHeight || 20;

// 胶囊按钮实测位置：标题行与胶囊垂直居中对齐（固定 96rpx 在真机上会和胶囊错位）
interface MenuRect { top: number; bottom: number; height: number; width: number; left: number; right: number }
let menuRect: MenuRect | null = null;
try {
  menuRect = Taro.getMenuButtonBoundingClientRect();
} catch {
  menuRect = null;
}
const menuGap = menuRect && menuRect.top > STATUS_BAR_HEIGHT ? menuRect.top - STATUS_BAR_HEIGHT : 6;

/** 导航栏内容行高度（px）= 胶囊高度 + 上下等距留白 */
export const NAV_ROW_HEIGHT = menuRect && menuRect.height ? menuRect.height + menuGap * 2 : 44;

/** 胶囊底部安全线（px）：无导航头页面的顶部留白用，保证内容不被胶囊压住 */
export const NAV_SAFE_TOP = menuRect ? menuRect.bottom + 10 : STATUS_BAR_HEIGHT + 48;

interface NavBarProps {
  title?: string;
  /** 是否显示返回按钮（默认 true） */
  showBack?: boolean;
  /** 透明模式（渐变头部页面用） */
  transparent?: boolean;
  /** 右侧自定义内容 */
  right?: ReactNode;
  onBack?: () => void;
}

/**
 * 自定义导航头（还原网页版全屏页的白色返回头：h-12 白底 + 圆形返回钮 + 居中标题）
 * 全局 navigationStyle: custom 后所有全屏页用它
 * 返回箭头用纯 CSS 边框绘制，不依赖 image 渲染，真机永不空白
 */
export default function NavBar({ title = '', showBack = true, transparent = false, right, onBack }: NavBarProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.reLaunch({ url: '/pages/jobs/index' });
    }
  };

  return (
    <View
      className={`navbar ${transparent ? 'navbar-transparent' : ''}`}
      style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}
    >
      <View className='navbar-inner' style={{ height: `${NAV_ROW_HEIGHT}px` }}>
        {showBack ? (
          <View className='navbar-back' onClick={handleBack} hoverClass='navbar-back-hover'>
            <View className={`navbar-back-arrow ${transparent ? 'navbar-back-arrow-white' : ''}`} />
          </View>
        ) : (
          <View className='navbar-back' />
        )}
        <Text className={`navbar-title ${transparent ? 'navbar-title-white' : ''}`}>{title}</Text>
        <View className='navbar-right'>{right || null}</View>
      </View>
    </View>
  );
}
