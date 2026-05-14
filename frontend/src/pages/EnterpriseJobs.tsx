import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '招聘中', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: '已关闭', className: 'bg-gray-100 text-gray-500' },
  DRAFT: { label: '草稿', className: 'bg-yellow-100 text-yellow-700' },
};

export default function EnterpriseJobs() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const enterprise = user?.profile as { companyName?: string; status?: string } | undefined;

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isVerified = enterprise?.status === 'APPROVED';

  useEffect(() => {
    fetchJobs();
  }, []);

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

  const handleCloseJob = async (jobId: string) => {
    try {
      await jobsApi.close(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'CLOSED' } : j));
    } catch {
      setError('关闭职位失败');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('确定要删除这个职位吗？')) return;
    try {
      // 暂时用关闭代替删除
      await jobsApi.close(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch {
      setError('删除职位失败');
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'ACTIVE');
  const closedJobs = jobs.filter(j => j.status === 'CLOSED');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-base font-semibold">职位管理</h1>
        </div>
        <button
          onClick={() => navigate('/enterprise/post-job')}
          disabled={!isVerified}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            isVerified ? 'bg-[#FF6B00] text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          + 发布
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3">
        <div className="flex gap-4 text-xs">
          <span className="text-gray-500">招聘中 <span className="font-medium text-gray-700">{activeJobs.length}</span></span>
          <span className="text-gray-500">已关闭 <span className="font-medium text-gray-700">{closedJobs.length}</span></span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">还没有发布职位</p>
          <button
            onClick={() => navigate('/enterprise/post-job')}
            disabled={!isVerified}
            className="mt-4 text-[#FF6B00] text-sm font-medium disabled:text-gray-300"
          >
            立即发布 →
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-6">
          {jobs.map((job) => {
            const cfg = statusConfig[job.status] || { label: job.status, className: 'bg-gray-100 text-gray-500' };
            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-[#FF6B00] font-medium">
                    {job.minSalary?.toLocaleString()} - {job.maxSalary?.toLocaleString()} 元/月
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{job.city}</span>
                    <span>{job._count?.applications ?? 0} 份简历</span>
                    <span>{dayjs(job.createdAt).format('MM-DD')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                  {job.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => navigate(`/enterprise/post-job/${job.id}`)}
                        className="flex-1 py-2 text-sm text-[#FF6B00] border border-[#FF6B00] rounded-lg hover:bg-orange-50"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleCloseJob(job.id)}
                        className="flex-1 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                      >
                        关闭
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/enterprise/matches/${job.id}`)}
                    className={`py-2 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000] ${
                      job.status === 'ACTIVE' ? 'flex-1' : 'w-full'
                    }`}
                  >
                    查看匹配
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}