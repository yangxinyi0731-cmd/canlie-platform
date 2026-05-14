import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { useAuthStore } from '../stores/authStore';

// 图片URL处理：将相对路径转为完整URL（支持手机端访问）
const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // 通过Vite代理访问，不需要拼接host
  return url;
};

interface AdminStats {
  userCount: number;
  enterpriseCount: number;
  talentCount: number;
  jobCount: number;
  matchCount: number;
}

type TabKey = 'users' | 'enterprises' | 'talents' | 'verifications';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'enterprises', label: '企业审核' },
  { key: 'talents', label: '人才星级' },
  { key: 'verifications', label: '认证审核' },
];

const STAR_OPTIONS = [
  { value: 0, label: '普通' },
  { value: 3, label: '三星' },
  { value: 4, label: '四星' },
  { value: 5, label: '五星' },
  { value: 6, label: '金牌' },
];

function getStarLabel(level: number): string {
  const found = STAR_OPTIONS.find((s) => s.value === level);
  return found ? found.label : '普通';
}

const VERIFY_TYPE_LABEL: Record<string, string> = {
  REFERENCE: '推荐人背调',
  CERTIFICATE: '离职证明',
  SALARY_FLOW: '工资流水',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const extractList = (res: any): any[] => {
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.users) return res.data.users;
    if (res.data?.items) return res.data.items;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(extractList(res));
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEnterprises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ role: 'ENTERPRISE' });
      setEnterprises(extractList(res));
    } catch (err) {
      console.error('Failed to load enterprises', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ role: 'TALENT' });
      setTalents(extractList(res));
    } catch (err) {
      console.error('Failed to load talents', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getVerifications();
      setVerifications(extractList(res));
    } catch (err) {
      console.error('Failed to load verifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    switch (activeTab) {
      case 'users':
        fetchUsers();
        break;
      case 'enterprises':
        fetchEnterprises();
        break;
      case 'talents':
        fetchTalents();
        break;
      case 'verifications':
        fetchVerifications();
        break;
    }
  }, [activeTab, fetchUsers, fetchEnterprises, fetchTalents, fetchVerifications]);

  const handleToggleUser = async (userId: string) => {
    setActionId(userId);
    try {
      await adminApi.toggleUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user', err);
      alert('操作失败，请重试');
    } finally {
      setActionId(null);
    }
  };

  const handleVerifyEnterprise = async (entId: string, status: string, userId: string) => {
    setActionId(userId);
    try {
      await adminApi.verifyEnterprise(entId, status);
      await fetchEnterprises();
    } catch (err) {
      console.error('Failed to verify enterprise', err);
      alert('操作失败，请重试');
    } finally {
      setActionId(null);
    }
  };

  const handleUpdateStar = async (talentId: string, starLevel: number, userId: string) => {
    setActionId(userId);
    try {
      await adminApi.updateTalentStar(talentId, starLevel);
      await fetchTalents();
    } catch (err) {
      console.error('Failed to update star', err);
      alert('操作失败，请重试');
    } finally {
      setActionId(null);
    }
  };

  const handleVerifyMaterial = async (verId: string, status: string) => {
    setActionId(verId);
    try {
      await adminApi.updateVerification(verId, status);
      await fetchVerifications();
    } catch (err) {
      console.error('Failed to update verification', err);
      alert('操作失败，请重试');
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ========== Render Functions ==========

  const renderStats = () => {
    if (!stats) return null;
    const items: { label: string; value: number }[] = [
      { label: '总用户', value: stats.userCount },
      { label: '企业', value: stats.enterpriseCount },
      { label: '人才', value: stats.talentCount },
      { label: '职位', value: stats.jobCount },
      { label: '匹配', value: stats.matchCount },
    ];
    return (
      <div className="grid grid-cols-5 gap-2 mb-4">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-lg font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabNav = () => (
    <div className="flex gap-1 mb-4 bg-white rounded-xl shadow-sm p-1 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 min-w-[70px] px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === tab.key
              ? 'bg-[#FF6B00] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ========== Users Tab ==========
  const renderUsers = () => (
    <div className="space-y-2">
      {users.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无用户数据</div>
      ) : (
        users.map((u: any) => (
          <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{u.name || u.phone}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                    u.role === 'ENTERPRISE' ? 'bg-blue-50 text-blue-700' :
                    'bg-orange-50 text-[#FF6B00]'
                  }`}>
                    {u.role === 'ADMIN' ? '管理员' : u.role === 'ENTERPRISE' ? '企业' : '人才'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{u.phone}</div>
              </div>
              <button
                onClick={() => handleToggleUser(u.id)}
                disabled={actionId === u.id}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  u.status === 'ACTIVE'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-600'
                }`}
              >
                {u.status === 'ACTIVE' ? '禁用' : '启用'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ========== Enterprises Tab ==========
  const renderEnterprises = () => (
    <div className="space-y-3">
      {enterprises.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无企业数据</div>
      ) : (
        enterprises.map((u: any) => {
          const p = u.enterprise;
          return (
            <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(p?.companyName || '企').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{p?.companyName || '未填写'}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    {p?.contactName} · {p?.contactPhone || u.phone}
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p?.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                      p?.status === 'APPROVED' ? 'bg-green-50 text-green-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {p?.status === 'PENDING' ? '待审核' : p?.status === 'APPROVED' ? '已通过' : '已拒绝'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 营业执照图片 */}
              {getImageUrl(p?.businessLicense) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">营业执照：</p>
                  <img
                    src={getImageUrl(p.businessLicense)!}
                    alt="营业执照"
                    className="w-full max-w-[200px] h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(getImageUrl(p.businessLicense)!)}
                  />
                </div>
              )}

              {/* 操作按钮 */}
              {p?.status === 'PENDING' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleVerifyEnterprise(p.id, 'APPROVED', u.id)}
                    disabled={actionId === u.id}
                    className="flex-1 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleVerifyEnterprise(p.id, 'REJECTED', u.id)}
                    disabled={actionId === u.id}
                    className="flex-1 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    拒绝
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // ========== Talents Tab ==========
  const renderTalents = () => (
    <div className="space-y-3">
      {talents.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无人才数据</div>
      ) : (
        talents.map((u: any) => {
          const p = u.talent;
          return (
            <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{p?.realName || u.name || '未填写'}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    {p?.title} · {p?.currentCompany || '无公司'}
                  </div>
                </div>
                <div className="text-yellow-500 font-medium text-sm">
                  {getStarLabel(p?.starLevel ?? 0)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="text-xs text-gray-400">设置星级：</label>
                <select
                  value={p?.starLevel ?? 0}
                  onChange={(e) => handleUpdateStar(p?.id, Number(e.target.value), u.id)}
                  disabled={actionId === u.id}
                  className="ml-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                >
                  {STAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ========== Verifications Tab ==========
  const renderVerifications = () => (
    <div className="space-y-3">
      {verifications.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无认证审核数据</div>
      ) : (
        verifications.map((v: any) => (
          <div key={v.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{v.talent?.realName || '未知'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {VERIFY_TYPE_LABEL[v.type] || v.type}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${
                  v.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                  v.status === 'VERIFIED' ? 'bg-green-50 text-green-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {v.status === 'PENDING' ? '待审核' : v.status === 'VERIFIED' ? '已通过' : '已拒绝'}
                </span>
              </div>
            </div>

            {/* 认证详情 */}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {v.type === 'REFERENCE' && (
                <div className="text-sm text-gray-600">
                  <p>推荐人：{v.refName} ({v.refTitle})</p>
                  <p>电话：{v.refPhone}</p>
                </div>
              )}
              {v.type === 'CERTIFICATE' && getImageUrl(v.certFileUrl) && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">离职证明：</p>
                  <img
                    src={getImageUrl(v.certFileUrl)!}
                    alt="离职证明"
                    className="w-full max-w-[200px] h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(getImageUrl(v.certFileUrl)!)}
                  />
                </div>
              )}
              {v.type === 'SALARY_FLOW' && getImageUrl(v.salaryFileUrl) && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">工资流水：</p>
                  <img
                    src={getImageUrl(v.salaryFileUrl)!}
                    alt="工资流水"
                    className="w-full max-w-[200px] h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(getImageUrl(v.salaryFileUrl)!)}
                  />
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            {v.status === 'PENDING' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleVerifyMaterial(v.id, 'VERIFIED')}
                  disabled={actionId === v.id}
                  className="flex-1 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  通过
                </button>
                <button
                  onClick={() => handleVerifyMaterial(v.id, 'REJECTED')}
                  disabled={actionId === v.id}
                  className="flex-1 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'users':
        return renderUsers();
      case 'enterprises':
        return renderEnterprises();
      case 'talents':
        return renderTalents();
      case 'verifications':
        return renderVerifications();
      default:
        return null;
    }
  };

  // ========== Main Render ==========
  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-[#FF6B00]">管理后台</h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500">退出</button>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-8">
        {renderStats()}
        {renderTabNav()}
        {renderContent()}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
