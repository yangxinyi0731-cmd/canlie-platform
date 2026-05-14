import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, refApi, safeArray, getImageUrl } from '../api';
import { useAuthStore } from '../stores/authStore';

interface RefItem {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  minSalary: number;
  maxSalary: number;
  salaryMonth: number;
  city: string;
  district: string;
  cuisineIds: string;
  businessTypeIds: string;
  enterprise?: {
    id: string;
    companyName: string;
    companyLogo?: string;
  };
  createdAt: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 企业端显示管理首页
  if (user?.role === 'ENTERPRISE') {
    return <EnterpriseHome />;
  }

  // 人才端显示职位搜索
  return <TalentHome />;
}

// ========== 人才端首页：职位搜索 ==========
function TalentHome() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisines, setCuisines] = useState<RefItem[]>([]);
  const [businessTypes, setBusinessTypes] = useState<RefItem[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedBizType, setSelectedBizType] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, refRes] = await Promise.allSettled([
        jobsApi.list(),
        refApi.getAll(),
      ]);

      if (jobsRes.status === 'fulfilled') {
        const data = jobsRes.value.data;
        setJobs(safeArray(data?.jobs || data));
      }
      if (refRes.status === 'fulfilled') {
        const ref = refRes.value.data;
        setCuisines(safeArray(ref?.cuisines));
        setBusinessTypes(safeArray(ref?.businessTypes));
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  // ID -> 名称映射
  const cuisineMap = new Map(cuisines.map(c => [c.id, c.name]));
  const bizTypeMap = new Map(businessTypes.map(b => [b.id, b.name]));

  // 筛选职位
  const filteredJobs = jobs.filter((job) => {
    const location = `${job.city} ${job.district}`;
    if (keyword && !job.title.includes(keyword) && !location.includes(keyword)) return false;
    if (selectedCuisine && job.cuisineIds !== selectedCuisine) return false;
    if (selectedBizType && job.businessTypeIds !== selectedBizType) return false;
    return true;
  });

  const formatSalary = (job: Job) => {
    if (!job.minSalary && !job.maxSalary) return '面议';
    const min = job.minSalary ? `${job.minSalary / 1000}k` : '';
    const max = job.maxSalary ? `${job.maxSalary / 1000}k` : '';
    if (min && max) return `${min}-${max}`;
    return min || max || '面议';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部搜索栏 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-xl font-bold text-[#FF6B00]">餐猎</h1>
            <span className="text-xs text-gray-400">餐饮酒店高端人才平台</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索职位、地点..."
              className="w-full h-9 bg-gray-100 rounded-lg pl-9 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </div>
        </div>

        {/* 筛选标签 */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCuisine('')}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedCuisine ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部菜系
          </button>
          {cuisines.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCuisine(selectedCuisine === c.id ? '' : c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCuisine === c.id ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 职位列表 */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">暂无匹配的职位</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900 flex-1 mr-3">{job.title}</h3>
                  <span className="text-[#FF6B00] font-bold text-sm whitespace-nowrap">
                    {formatSalary(job)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {job.cuisineIds && cuisineMap.get(job.cuisineIds) && (
                    <span className="px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-md">{cuisineMap.get(job.cuisineIds)}</span>
                  )}
                  {job.businessTypeIds && bizTypeMap.get(job.businessTypeIds) && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md">{bizTypeMap.get(job.businessTypeIds)}</span>
                  )}
                  {job.city && (
                    <span className="text-xs text-gray-400">{job.city} {job.district}</span>
                  )}
                </div>
                {job.enterprise && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                      {job.enterprise.companyLogo ? (
                        <img src={getImageUrl(job.enterprise.companyLogo) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#FF6B00]">{job.enterprise.companyName?.charAt(0) || '企'}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{job.enterprise.companyName}</span>
                    <span className="text-xs text-gray-300 ml-auto">{timeAgo(job.createdAt)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 企业端首页：管理界面 ==========
function EnterpriseHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const enterprise = user?.profile as { companyName?: string; _count?: { jobs: number }; status?: string; licenseVerified?: boolean } | undefined;

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 检查企业认证状态
  const isVerified = enterprise?.status === 'APPROVED';
  const isPending = enterprise?.status === 'PENDING';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.allSettled([
        jobsApi.getMyJobs(),
        jobsApi.getMyApplications ? jobsApi.getMyApplications() : Promise.resolve({ data: [] }),
      ]);
      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'ACTIVE');
  const totalApplications = jobs.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white px-4 pt-4 pb-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#FF6B00]">餐猎企业版</h1>
            <p className="text-xs text-gray-400 mt-0.5">{enterprise?.companyName || '企业中心'}</p>
          </div>
          <button
            onClick={() => navigate('/enterprise/post-job')}
            disabled={!isVerified}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isVerified
                ? 'bg-[#FF6B00] text-white hover:bg-[#e86000]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            + 发布职位
          </button>
        </div>

        {/* 认证状态提示 */}
        {!isVerified && (
          <div className={`p-3 rounded-lg ${isPending ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-xs ${isPending ? 'text-yellow-700' : 'text-red-700'}`}>
              {isPending ? '⏳ 企业信息审核中，审核通过后可发布职位' : '⚠️ 企业认证未通过，请修改信息后重新提交'}
            </p>
            <button
              onClick={() => navigate('/enterprise/edit')}
              className={`text-xs font-medium mt-1 ${isPending ? 'text-yellow-800 underline' : 'text-red-800 underline'}`}
            >
              {isPending ? '查看企业信息' : '修改企业信息'}
            </button>
          </div>
        )}
      </div>

      {/* 数据概览 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
            <p className="text-xs text-gray-400 mt-1">在招职位</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
            <p className="text-xs text-gray-400 mt-1">收到简历</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#FF6B00]">0</p>
            <p className="text-xs text-gray-400 mt-1">待处理</p>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="bg-white rounded-xl shadow-sm mb-4">
          <div className="grid grid-cols-4 py-4">
            <button
              onClick={() => navigate('/enterprise/talent-search')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">搜人才</span>
            </button>
            <button
              onClick={() => navigate('/enterprise/applications')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">收到的简历</span>
            </button>
            <button
              onClick={() => navigate('/enterprise/jobs')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">职位管理</span>
            </button>
            <button
              onClick={() => navigate('/enterprise/edit')}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">企业信息</span>
            </button>
          </div>
        </div>

        {/* 我的职位 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">我的职位</h3>
            <button
              onClick={() => navigate('/enterprise/jobs')}
              className="text-xs text-[#FF6B00]"
            >
              查看全部 &gt;
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">暂无职位</p>
              <button
                onClick={() => navigate('/enterprise/post-job')}
                disabled={!isVerified}
                className="mt-3 text-[#FF6B00] text-sm font-medium disabled:text-gray-300"
              >
                立即发布 →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/enterprise/matches/${job.id}`)}
                  className="px-4 py-3 flex items-center justify-between active:bg-gray-50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{job.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.city} · {job._count?.applications ?? 0}份简历
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    job.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {job.status === 'ACTIVE' ? '招聘中' : '已关闭'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}