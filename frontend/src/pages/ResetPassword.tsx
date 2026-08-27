import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: 输入手机号, 2: 输入验证码, 3: 设置新密码
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-code', { phone });
      setSuccess('如果该手机号已注册，验证码将通过短信发送');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位验证码');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码至少6位');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { phone, code, newPassword });
      setSuccess('密码已重置，请重新登录');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col app-container">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold">重置密码</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-4 bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}

      <div className="flex-1 px-6 py-8">
        {/* Step 1: Phone */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-6">请输入注册时使用的手机号</p>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00]">
              <span className="flex items-center gap-1 px-3 py-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
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
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        )}

        {/* Step 2: Code and new password; the server verifies and consumes the code. */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-6">请输入短信收到的验证码并设置新密码</p>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00]">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="验证码"
                maxLength={6}
                className="flex-1 px-4 py-3 text-sm outline-none bg-transparent text-center text-xl tracking-widest"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00]">
              <span className="flex items-center px-3 py-3 text-gray-400 bg-gray-50 border-r border-gray-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少6位）"
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading || code.length !== 6 || newPassword.length < 6}
              className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? '重置中...' : '确认重置'}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 text-gray-500 text-sm"
            >
              重新获取验证码
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
