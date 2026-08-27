import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'TALENT' | 'ENTERPRISE'>('TALENT');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 显示密码 & 记住账号
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);

  // 页面加载时读取记住的账号
  useEffect(() => {
    const savedPhone = localStorage.getItem('remembered_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      setRememberAccount(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneRegex = /^1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('请输入姓名/企业名称');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(phone, password, role, name.trim());
      } else {
        await login(phone, password);
        // 只记住非敏感账号标识，绝不持久化密码。
        if (rememberAccount) {
          localStorage.setItem('remembered_phone', phone);
        } else {
          localStorage.removeItem('remembered_phone');
        }
      }
      // After successful auth, redirect based on role
      const user = useAuthStore.getState().user;
      if (user?.role === 'TALENT') navigate('/', { replace: true });
      else if (user?.role === 'ENTERPRISE') navigate('/enterprise', { replace: true });
      else if (user?.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '操作失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col app-container">
      <div className="header-gradient pt-16 pb-12 px-6 rounded-b-[32px]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-wider">餐猎</h1>
          <p className="text-white/80 text-sm mt-3 tracking-wide">
            餐饮酒店高端人才专属平台
          </p>
        </div>
        {/* Decorative circles */}
        <div className="relative mt-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white/10 absolute -left-4 -bottom-6" />
          <div className="w-12 h-12 rounded-full bg-white/10 absolute -right-2 -bottom-2" />
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {isRegister ? '创建账号' : '欢迎回来'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Phone Input */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00] transition-colors">
              <span className="flex items-center gap-1 px-3 py-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="3" />
                </svg>
                +86
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="手机号"
                maxLength={11}
                autoComplete="tel"
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
            </div>

            {/* Password Input */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00] transition-colors">
              <span className="flex items-center px-3 py-3 text-gray-400 bg-gray-50 border-r border-gray-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Confirm Password (register only) */}
            {isRegister && (
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00] transition-colors">
                <span className="flex items-center px-3 py-3 text-gray-400 bg-gray-50 border-r border-gray-200">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="确认密码"
                  autoComplete="new-password"
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* Name (register only) */}
            {isRegister && (
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00] transition-colors">
                <span className="flex items-center px-3 py-3 text-gray-400 bg-gray-50 border-r border-gray-200">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'TALENT' ? '您的姓名' : '企业名称'}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
                />
              </div>
            )}

            {/* Remember Me (login only) */}
            {!isRegister && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberAccount}
                    onChange={(e) => setRememberAccount(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00] rounded"
                  />
                  <span className="text-xs text-gray-500">记住账号</span>
                </label>
              </div>
            )}

            {/* Role Selector (register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">注册身份</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('TALENT')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      role === 'TALENT'
                        ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    求职者
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ENTERPRISE')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      role === 'ENTERPRISE'
                        ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    招聘方
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-base shadow-lg shadow-orange-200 disabled:opacity-60 transition-all"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #FF8C38 0%, #FF6B00 100%)'
                  : 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRegister ? '注册中...' : '登录中...'}
                </span>
              ) : (
                isRegister ? '注册' : '登录'
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center flex items-center justify-center gap-4">
            <button
              onClick={switchMode}
              className="text-sm text-gray-500 hover:text-[#FF6B00] transition-colors"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
            {!isRegister && (
              <button
                onClick={() => navigate('/reset-password')}
                className="text-sm text-[#FF6B00] hover:underline transition-colors"
              >
                忘记密码？
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center">
        <p className="text-xs text-gray-400">
          登录即代表同意《服务协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}
