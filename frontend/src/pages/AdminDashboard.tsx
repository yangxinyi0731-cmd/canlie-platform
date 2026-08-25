import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, refApi, supplyApi, sharesApi } from '../api';
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

type TabKey = 'users' | 'enterprises' | 'talents' | 'verifications' | 'supply' | 'shares';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'enterprises', label: '企业审核' },
  { key: 'talents', label: '人才星级' },
  { key: 'verifications', label: '认证审核' },
  { key: 'supply', label: '供应审核' },
  { key: 'shares', label: '分享审核' },
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
  const [supplyCompanies, setSupplyCompanies] = useState<any[]>([]);
  const [supplyTab, setSupplyTab] = useState('PENDING');
  const [sharePosts, setSharePosts] = useState<any[]>([]);
  const [shareTab, setShareTab] = useState('VISIBLE');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | false>(false); // 'talents' | 'enterprises' | false

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

  const fetchSupplyCompanies = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await supplyApi.adminListCompanies({ status });
      setSupplyCompanies(extractList(res));
    } catch (err) {
      console.error('Failed to load supply companies', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSharePosts = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await sharesApi.adminList({ status });
      setSharePosts(extractList(res));
    } catch (err) {
      console.error('Failed to load share posts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifySupply = async (id: string, status: string, reason: string) => {
    setActionId(id);
    try {
      await supplyApi.adminVerifyCompany(id, status, reason);
      await fetchSupplyCompanies(supplyTab);
    } catch (err) {
      console.error('Failed to verify supply company', err);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleShare = async (id: string, status: string) => {
    setActionId(id);
    try {
      await sharesApi.adminSetStatus(id, status);
      await fetchSharePosts(shareTab);
    } catch (err) {
      console.error('Failed to toggle share post', err);
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch star criteria on mount
  useEffect(() => {
    const loadCriteria = async () => {
      try {
        const res = await refApi.getStarCriteria();
        setStarCriteria(res.data || []);
      } catch { /* ignore */ }
    };
    loadCriteria();
  }, []);

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
      case 'supply':
        fetchSupplyCompanies(supplyTab);
        break;
      case 'shares':
        fetchSharePosts(shareTab);
        break;
    }
  }, [activeTab, fetchUsers, fetchEnterprises, fetchTalents, fetchVerifications, fetchSupplyCompanies, supplyTab, fetchSharePosts, shareTab]);

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

  const handleAutoEvaluateTalents = async () => {
    setEvaluating('talents');
    try {
      const res = await fetch('/api/matches/evaluate-all-talents', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      alert(`AI评估完成：${data.count} 位人才已重新评定星级`);
      await fetchTalents();
      await fetchStats();
    } catch (err) {
      console.error('Auto-evaluate talents failed', err);
      alert('AI评估失败，请重试');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAutoEvaluateEnterprises = async () => {
    setEvaluating('enterprises');
    try {
      const res = await fetch('/api/matches/evaluate-all-enterprises', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      alert(`AI评估完成：${data.count} 家企业已重新评定星级`);
      await fetchEnterprises();
      await fetchStats();
    } catch (err) {
      console.error('Auto-evaluate enterprises failed', err);
      alert('AI评估失败，请重试');
    } finally {
      setEvaluating(false);
    }
  };

  const handleLogout = () => {
    // logout() 内部已经调用 window.location.replace('/login')
    // 不需要额外的 navigate，否则会产生竞态条件
    logout();
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
  const [expandedTalentId, setExpandedTalentId] = useState<string | null>(null);
  const [talentDetail, setTalentDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showStarCriteria, setShowStarCriteria] = useState(false);
  const [starCriteria, setStarCriteria] = useState<any[]>([]);

  const handleViewBgCheck = async (talentId: string) => {
    if (expandedTalentId === talentId) {
      setExpandedTalentId(null);
      setTalentDetail(null);
      return;
    }
    setExpandedTalentId(talentId);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getTalentDetail(talentId);
      setTalentDetail(res.data);
    } catch {
      setTalentDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const renderTalents = () => (
    <div className="space-y-3">
      {/* 星级评定标准按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowStarCriteria(true)}
          className="text-xs text-[#FF6B00] font-medium flex items-center gap-1 hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          查看星级评定标准
        </button>
      </div>
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
                    {p?.title} · {p?.currentCompany || '无公司'} · {p?.city || '未知城市'}
                  </div>
                </div>
                <div className="text-yellow-500 font-medium text-sm">
                  {getStarLabel(p?.starLevel ?? 0)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">星级：</label>
                  <select
                    value={p?.starLevel ?? 0}
                    onChange={(e) => handleUpdateStar(p?.id, Number(e.target.value), u.id)}
                    disabled={actionId === u.id}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  >
                    {STAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleViewBgCheck(p?.id)}
                  className="text-xs text-[#FF6B00] hover:underline"
                >
                  {expandedTalentId === p?.id ? '收起背调' : '查看背调'}
                </button>
              </div>

              {/* Background Check Details (admin only) */}
              {expandedTalentId === p?.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {loadingDetail ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : talentDetail?.workExperiences?.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 font-medium">工作经历 & 背景调查信息：</p>
                      {talentDetail.workExperiences.map((exp: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-800">{exp.position}</span>
                            <span className="text-xs text-gray-400">{exp.startYear}.{exp.startMonth} - {exp.isCurrent ? '至今' : `${exp.endYear}.${exp.endMonth}`}</span>
                          </div>
                          <p className="text-xs text-gray-600">{exp.companyName}</p>
                          {exp.description && <p className="text-xs text-gray-500 mt-1">{exp.description}</p>}
                          {/* Background Check Data - 隐私，仅管理员可见 */}
                          {(exp.bgRefName || exp.bgRefTitle || exp.bgRefPhone) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-orange-600 font-medium mb-1">🔒 背景调查信息：</p>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><span className="text-gray-400">调查人：</span><span className="text-gray-700">{exp.bgRefName || '-'}</span></div>
                                <div><span className="text-gray-400">职位：</span><span className="text-gray-700">{exp.bgRefTitle || '-'}</span></div>
                                <div><span className="text-gray-400">电话：</span><span className="text-gray-700">{exp.bgRefPhone || '-'}</span></div>
                              </div>
                            </div>
                          )}
                          {!exp.bgRefName && !exp.bgRefTitle && !exp.bgRefPhone && (
                            <p className="text-xs text-gray-400 mt-1">无背景调查信息</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-3">暂无工作经历数据</p>
                  )}
                </div>
              )}
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

  const renderSupply = () => {
    const tabs = [
      { key: 'PENDING', label: '待审核' },
      { key: 'APPROVED', label: '已通过' },
      { key: 'REJECTED', label: '已驳回' },
    ];
    return (
      <div>
        <div className="flex gap-1 mb-3 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSupplyTab(t.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                supplyTab === t.key ? 'bg-[#FF6B00] text-white' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {supplyCompanies.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {supplyCompanies.map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center text-white font-bold">
                      {c.companyName?.charAt(0) || '供'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.companyName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.category?.name || ''} · {c.user?.phone || ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c._count?.products ?? 0} 款产品
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    c.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.status === 'PENDING' ? '待审核' : c.status === 'APPROVED' ? '已通过' : '已驳回'}
                  </span>
                </div>

                {/* 信息详情 */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  {c.services && <p className="text-gray-600"><span className="text-gray-400">服务：</span>{c.services}</p>}
                  {c.introduction && <p className="text-gray-600 line-clamp-2"><span className="text-gray-400">介绍：</span>{c.introduction}</p>}
                  {c.contactName && <p className="text-gray-600"><span className="text-gray-400">联系人：</span>{c.contactName} {c.contactPhone}</p>}
                  {c.cuisineIds && <p className="text-gray-600"><span className="text-gray-400">菜系：</span>{c.cuisineIds}</p>}
                  {c.status === 'REJECTED' && c.reason && (
                    <p className="text-red-500"><span className="text-gray-400">驳回原因：</span>{c.reason}</p>
                  )}
                </div>

                {/* 营业执照 */}
                {c.businessLicense && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">营业执照：</p>
                    <img
                      src={getImageUrl(c.businessLicense)!}
                      alt="营业执照"
                      className="w-full max-w-[200px] h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewImage(getImageUrl(c.businessLicense)!)}
                    />
                  </div>
                )}

                {/* 审核操作 */}
                {c.status === 'PENDING' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifySupply(c.id, 'APPROVED', '')}
                        disabled={actionId === c.id}
                        className="flex-1 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handleVerifySupply(c.id, 'REJECTED', rejectReason[c.id] || '资料不完整，请补充后重新提交')}
                        disabled={actionId === c.id}
                        className="flex-1 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        驳回
                      </button>
                    </div>
                    <input
                      value={rejectReason[c.id] || ''}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="驳回原因（可选）"
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderShares = () => {
    const tabs = [
      { key: 'VISIBLE', label: '已发布' },
      { key: 'HIDDEN', label: '已隐藏' },
    ];
    return (
      <div>
        <div className="flex gap-1 mb-3 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setShareTab(t.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                shareTab === t.key ? 'bg-[#FF6B00] text-white' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {sharePosts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {sharePosts.map((p: any) => {
              let images: string[] = [];
              try { images = JSON.parse(p.images || '[]'); } catch { images = []; }
              return (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-600">
                        {p.category === 'STARTUP' ? '创业分享' : '学习分享'}
                      </span>
                      <span className="text-xs text-gray-400">{p.user?.name || p.user?.phone || ''}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      👍 {p.likeCount} · 💬 {p.commentCount}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-2">{p.title}</p>
                  {p.content && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.content}</p>}
                  {images.length > 0 && (
                    <img
                      src={getImageUrl(images[0])!}
                      alt="分享图"
                      className="mt-2 w-full max-w-[200px] h-28 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => setPreviewImage(getImageUrl(images[0])!)}
                    />
                  )}
                  {p.videoUrl && (
                    <p className="text-xs text-gray-400 mt-2">🎬 含视频内容</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {new Date(p.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <button
                      onClick={() => handleToggleShare(p.id, p.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}
                      disabled={actionId === p.id}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${
                        p.status === 'VISIBLE'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {p.status === 'VISIBLE' ? '隐藏' : '恢复'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
      case 'supply':
        return renderSupply();
      case 'shares':
        return renderShares();
      default:
        return null;
    }
  };

  // ========== Main Render ==========
  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header - 管理员端不需要返回按钮，只有退出 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <h1 className="text-base font-bold text-[#FF6B00]">管理后台</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500">退出</button>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-8">
        {renderStats()}
        {/* AI 自动评估按钮 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleAutoEvaluateTalents}
            disabled={!!evaluating}
            className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 hover:from-blue-600 transition-all"
          >
            {evaluating === 'talents' ? '🤖 AI评估中...' : '🤖 AI评估所有人才星级'}
          </button>
          <button
            onClick={handleAutoEvaluateEnterprises}
            disabled={!!evaluating}
            className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 hover:from-purple-600 transition-all"
          >
            {evaluating === 'enterprises' ? '🤖 AI评估中...' : '🏢 AI评估所有企业星级'}
          </button>
        </div>
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

      {/* Star Rating Criteria Modal */}
      {showStarCriteria && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setShowStarCriteria(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">⭐ 人才星级评定标准</h2>
              <button
                onClick={() => setShowStarCriteria(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              星级评定由平台管理员根据人才的综合素质、工作经验、行业影响力等因素综合评定。
            </p>

            <div className="space-y-4">
              {starCriteria.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">加载中...</p>
              ) : (
                starCriteria.map((criteria) => {
                  const starEmoji = criteria.starLevel === 0 ? '👤' : criteria.starLevel === 3 ? '⭐⭐⭐' : criteria.starLevel === 4 ? '⭐⭐⭐⭐' : criteria.starLevel === 5 ? '⭐⭐⭐⭐⭐' : '🏅';
                  const bgColor = criteria.starLevel === 0 ? 'bg-gray-50 border-gray-200' : criteria.starLevel === 3 ? 'bg-yellow-50 border-yellow-200' : criteria.starLevel === 4 ? 'bg-blue-50 border-blue-200' : criteria.starLevel === 5 ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200';
                  let requirements: string[] = [];
                  try {
                    requirements = JSON.parse(criteria.requirements || '[]');
                  } catch { requirements = [criteria.requirements]; }

                  return (
                    <div key={criteria.starLevel} className={`border rounded-xl p-4 ${bgColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{starEmoji}</span>
                        <span className="font-semibold text-gray-900">{criteria.starName}</span>
                        {criteria.minWorkYears > 0 && (
                          <span className="text-xs text-gray-500 ml-auto">
                            最低 {criteria.minWorkYears} 年经验
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{criteria.description}</p>
                      <ul className="space-y-1">
                        {requirements.map((req: string, idx: number) => (
                          <li key={idx} className="text-xs text-gray-500 flex items-start gap-1.5">
                            <span className="text-[#FF6B00] shrink-0 mt-0.5">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">
                💡 提示：星级评定需综合考量人才的工作经历、品牌背书、项目经验、背调结果等多维度信息。建议每季度复审一次。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
