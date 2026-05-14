import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { jobsApi } from '../api';
import type { Job } from '../types';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '招聘中', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: '已关闭', className: 'bg-gray-100 text-gray-500' },
  DRAFT: { label: '草稿', className: 'bg-yellow-100 text-yellow-700' },
};

export default function EnterpriseDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const enterprise = user?.profile as { companyName?: string; _count?: { jobs: number }; status?: string; licenseVerified?: boolean } | undefined;

  // 检查企业认证状态
  const isVerified = enterprise?.status === 'APPROVED';
  const isPending = enterprise?.status === 'PENDING';
  const isRejected = enterprise?.status === 'REJECTED';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await jobsApi.getMyJobs();
      setJobs(res.data);
    } catch {
      setError('加载职位列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCloseJob = async (jobId: string) => {
    try {
      await jobsApi.close(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'CLOSED' } : j))
      );
      setExpandedJob(null);
    } catch {
      setError('关闭职位失败');
    }
  };

  const totalApplications = jobs.reduce(
    (sum, job) => sum + (job._count?.applications ?? 0),
    0
  );

  return (
    <div className="p-4">
      {/* 认证状态提示 */}
      {!isVerified && (
        <div className={`mb-4 p-4 rounded-xl ${isPending ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isPending ? 'text-yellow-800' : 'text-red-800'}`}>
                {isPending ? '企业信息审核中' : '企业认证未通过'}
              </p>
              <p className={`text-xs mt-1 ${isPending ? 'text-yellow-600' : 'text-red-600'}`}>
                {isPending ? '审核通过后即可发布职位，请耐心等待' : '请修改企业信息后重新提交审核'}
              </p>
              <button
                onClick={() => navigate('/enterprise/edit')}
                className={`mt-2 text-xs font-medium ${isPending ? 'text-yellow-700 underline' : 'text-red-700 underline'}`}
              >
                {isPending ? '查看企业信息' : '修改企业信息'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {enterprise?.companyName || '企业中心'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理你的职位和候选人</p>
        </div>
        <button
          onClick={() => navigate('/enterprise/post-job')}
          disabled={!isVerified}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
            isVerified
              ? 'bg-[#FF6B00] text-white hover:bg-[#e86000] active:bg-[#d45500] shadow-orange-200'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          + 发布新职位
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <p className="text-xs text-gray-400 mb-1">发布职位数</p>
          <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <p className="text-xs text-gray-400 mb-1">收到简历数</p>
          <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <p className="text-xs text-gray-400 mb-1">匹配候选人</p>
          <p className="text-2xl font-bold text-[#FF6B00]">
            {jobs.filter((j) => j.status === 'ACTIVE').length > 0 ? '…' : '0'}
          </p>
        </div>
      </div>

      {/* Search Talent Button */}
      <button
        onClick={() => navigate('/enterprise/talent-search')}
        className="w-full bg-white border border-[#FF6B00] text-[#FF6B00] rounded-xl py-3 text-sm font-medium mb-6 flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        搜索人才
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">我的职位</h2>
        <span className="text-xs text-gray-400">{jobs.length} 个职位</span>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-50">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">还没有发布职位</p>
          <button
            onClick={() => navigate('/enterprise/post-job')}
            className="mt-3 text-[#FF6B00] text-sm font-medium"
          >
            立即发布 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const cfg = statusConfig[job.status] || { label: job.status, className: 'bg-gray-100 text-gray-500' };
            const isExpanded = expandedJob === job.id;
            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-50 overflow-hidden">
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{job.title}</h3>
                      <p className="text-sm text-[#FF6B00] font-medium mt-1">
                        {job.minSalary?.toLocaleString()} - {job.maxSalary?.toLocaleString()} 元/月
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {job._count?.applications ?? 0} 份简历
                        </span>
                        <span className="text-xs text-gray-400">
                          {dayjs(job.createdAt).format('MM-DD')}
                        </span>
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-300 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                    <div className="flex items-center gap-3 mt-3">
                      {job.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/enterprise/post-job/${job.id}`);
                            }}
                            className="flex-1 py-2 text-sm text-[#FF6B00] border border-[#FF6B00] rounded-lg hover:bg-orange-50 transition-colors"
                          >
                            编辑职位
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseJob(job.id);
                            }}
                            className="flex-1 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            关闭职位
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/enterprise/matches/${job.id}`);
                        }}
                        className={`py-2 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000] transition-colors ${job.status === 'ACTIVE' ? 'flex-1' : 'w-full'}`}
                      >
                        查看匹配
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
