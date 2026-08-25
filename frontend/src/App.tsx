import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, initChatSocket } from './stores/authStore';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import Chat from './pages/Chat';
import ChatConversation from './pages/ChatConversation';
import Profile from './pages/Profile';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import EnterpriseJobs from './pages/EnterpriseJobs';
import EnterpriseApplications from './pages/EnterpriseApplications';
import PostJob from './pages/PostJob';
import EditTalentProfile from './pages/EditTalentProfile';
import TalentSearch from './pages/TalentSearch';
import AdminDashboard from './pages/AdminDashboard';
import MatchResults from './pages/MatchResults';
import MyMatches from './pages/MyMatches';
import TalentDetail from './pages/TalentDetail';
import EditEnterpriseProfile from './pages/EditEnterpriseProfile';
import EnterpriseDetail from './pages/EnterpriseDetail';
import MyApplications from './pages/MyApplications';
import MyFavorites from './pages/MyFavorites';
import Notifications from './pages/Notifications';
import SupplyHome from './pages/supply/SupplyHome';
import SupplyCategoryList from './pages/supply/SupplyCategoryList';
import SupplyCompanyDetail from './pages/supply/SupplyCompanyDetail';
import ApplySupplyStore from './pages/supply/ApplySupplyStore';
import MySupplyStore from './pages/supply/MySupplyStore';
import ShareFeed from './pages/share/ShareFeed';
import SharePostDetail from './pages/share/SharePostDetail';
import ShareCreate from './pages/share/ShareCreate';
import MyShares from './pages/share/MyShares';

// 加载动画组件
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">餐猎 · 餐饮酒店高端人才平台</p>
    </div>
  );
}

// 404 页面
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">页面不存在</h1>
      <p className="text-gray-500 mb-6">您访问的页面可能已被移除</p>
      <a href="/" className="px-6 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium">
        返回首页
      </a>
    </div>
  );
}

// 路由守卫组件
function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, initialized } = useAuthStore();

  // 未初始化完成时显示加载
  if (!initialized) {
    return <LoadingSpinner />;
  }

  // 未登录时跳转到登录页
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 需要特定角色但用户角色不匹配时跳转到首页
  if (role && user.role !== role && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// 滚动到顶部的组件
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { init, initialized, user } = useAuthStore();

  // 初始化认证状态
  useEffect(() => {
    init();
  }, [init]);

  // bfcache 恢复时重新验证：浏览器后退/前进缓存会恢复整个 JS 堆，
  // 必须强制重新验证 auth 状态
  useEffect(() => {
    const handlePageshow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // 页面从 bfcache 中恢复，立即重新验证
        const token = localStorage.getItem('token');
        if (!token) {
          useAuthStore.getState().forceLogout();
        } else {
          init();
        }
      }
    };
    window.addEventListener('pageshow', handlePageshow);
    return () => window.removeEventListener('pageshow', handlePageshow);
  }, [init]);

  // 标签页从后台切换回来时，重新检查 token 有效性
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized) {
        const token = localStorage.getItem('token');
        const currentUser = useAuthStore.getState().user;
        // 有 token 但没有用户 → 重新初始化
        if (token && !currentUser) {
          init();
        }
        // 没有 token 但有用户 → 强制清除
        if (!token && currentUser) {
          useAuthStore.getState().forceLogout();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [initialized, init]);

  // 设置安全区域
  useEffect(() => {
    document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  }, []);

  // 初始化Socket连接
  useEffect(() => {
    if (initialized && user?.id) {
      initChatSocket(user.id);
    }
  }, [initialized, user?.id]);

  // 未初始化完成时显示加载
  if (!initialized) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 通用路由（所有登录用户） */}
        <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
        <Route path="/chat/:userId" element={<ProtectedRoute><ChatConversation /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/talents/:id" element={<ProtectedRoute><TalentDetail /></ProtectedRoute>} />
        <Route path="/enterprises/:id" element={<ProtectedRoute><EnterpriseDetail /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />

        {/* 供应平台路由（所有登录用户） */}
        <Route path="/supply" element={<ProtectedRoute><SupplyHome /></ProtectedRoute>} />
        <Route path="/supply/category/:categoryId" element={<ProtectedRoute><SupplyCategoryList /></ProtectedRoute>} />
        <Route path="/supply/company/:id" element={<ProtectedRoute><SupplyCompanyDetail /></ProtectedRoute>} />
        <Route path="/supply/apply" element={<ProtectedRoute><ApplySupplyStore /></ProtectedRoute>} />
        <Route path="/supply/my" element={<ProtectedRoute><MySupplyStore /></ProtectedRoute>} />

        {/* 创业分享/学习分享路由（所有登录用户） */}
        <Route path="/share" element={<ProtectedRoute><ShareFeed /></ProtectedRoute>} />
        <Route path="/share/:id" element={<ProtectedRoute><SharePostDetail /></ProtectedRoute>} />
        <Route path="/share/create" element={<ProtectedRoute><ShareCreate /></ProtectedRoute>} />
        <Route path="/share/my" element={<ProtectedRoute><MyShares /></ProtectedRoute>} />

        {/* 企业端路由 */}
        <Route path="/enterprise" element={<ProtectedRoute role="ENTERPRISE"><Layout><EnterpriseDashboard /></Layout></ProtectedRoute>} />
        <Route path="/enterprise/jobs" element={<ProtectedRoute role="ENTERPRISE"><EnterpriseJobs /></ProtectedRoute>} />
        <Route path="/enterprise/applications" element={<ProtectedRoute role="ENTERPRISE"><EnterpriseApplications /></ProtectedRoute>} />
        <Route path="/enterprise/post-job" element={<ProtectedRoute role="ENTERPRISE"><PostJob /></ProtectedRoute>} />
        <Route path="/enterprise/post-job/:id" element={<ProtectedRoute role="ENTERPRISE"><PostJob /></ProtectedRoute>} />
        <Route path="/enterprise/talent-search" element={<ProtectedRoute role="ENTERPRISE"><Layout><TalentSearch /></Layout></ProtectedRoute>} />
        <Route path="/enterprise/matches/:jobId" element={<ProtectedRoute role="ENTERPRISE"><MatchResults /></ProtectedRoute>} />
        <Route path="/enterprise/edit" element={<ProtectedRoute role="ENTERPRISE"><EditEnterpriseProfile /></ProtectedRoute>} />

        {/* 人才端路由 */}
        <Route path="/talent/edit" element={<ProtectedRoute role="TALENT"><EditTalentProfile /></ProtectedRoute>} />
        <Route path="/talent/matches" element={<ProtectedRoute role="TALENT"><Layout><MyMatches /></Layout></ProtectedRoute>} />
        <Route path="/talent/applications" element={<ProtectedRoute role="TALENT"><MyApplications /></ProtectedRoute>} />
        <Route path="/talent/favorites" element={<ProtectedRoute role="TALENT"><MyFavorites /></ProtectedRoute>} />

        {/* 管理员路由 */}
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
