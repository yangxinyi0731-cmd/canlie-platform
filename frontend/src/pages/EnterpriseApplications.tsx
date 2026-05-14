import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待查看', className: 'bg-yellow-100 text-yellow-700' },
  VIEWED: { label: '已查看', className: 'bg-blue-100 text-blue-700' },
  INTERVIEWED: { label: '邀请面试', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: '不合适', className: 'bg-red-100 text-red-700' },
  ACCEPTED: { label: '已录用', className: 'bg-green-100 text-green-700' },
};

export default function EnterpriseApplications() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      // 获取所有职位的投递
      const jobsRes = await jobsApi.getMyJobs();
      const jobs = jobsRes.data || [];

      const allApps: any[] = [];
      for (const job of jobs) {
        try {
          const appsRes = await jobsApi.getApplications(job.id);
          const apps = appsRes.data || [];
          apps.forEach((app: any) => {
            allApps.push({
              ...app,
              job: { id: job.id, title: job.title, city: job.city },
            });
          });
        } catch {
          // ignore
        }
      }

      // 按时间排序
      allApps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setApplications(allApps);
    } catch {
      setError('加载简历列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (jobId: string, appId: string, status: string) => {
    try {
      await jobsApi.updateApplication(jobId, appId, status);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch {
      setError('更新状态失败');
    }
  };

  const filteredApps = filterStatus
    ? applications.filter(a => a.status === filterStatus)
    : applications;

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;

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
          <h1 className="text-base font-semibold">收到的简历</h1>
          {pendingCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white px-4 py-2 border-b border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1 rounded-full text-xs ${
              !filterStatus ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部 ({applications.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1 rounded-full text-xs ${
              filterStatus === 'PENDING' ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            待查看 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('INTERVIEWED')}
            className={`px-3 py-1 rounded-full text-xs ${
              filterStatus === 'INTERVIEWED' ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            面试中
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">暂无简历</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-6">
          {filteredApps.map((app) => {
            const cfg = statusConfig[app.status] || { label: app.status, className: 'bg-gray-100 text-gray-500' };
            const talent = app.talent;

            return (
              <div key={app.id} className="bg-white rounded-xl shadow-sm p-4">
                {/* Talent Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    onClick={() => talent?.id && navigate(`/talents/${talent.id}`)}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white font-semibold cursor-pointer"
                  >
                    {talent?.realName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => talent?.id && navigate(`/talents/${talent.id}`)}
                        className="text-sm font-semibold text-gray-900 cursor-pointer"
                      >
                        {talent?.realName || '匿名人才'}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {talent?.title || '未填写职位'}
                      {talent?.currentCompany ? ` · ${talent.currentCompany}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      投递：{app.job?.title} · {dayjs(app.createdAt).format('MM-DD HH:mm')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {app.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(app.jobId, app.id, 'VIEWED')}
                        className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        标记已看
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(app.jobId, app.id, 'INTERVIEWED')}
                        className="flex-1 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600"
                      >
                        邀请面试
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(app.jobId, app.id, 'REJECTED')}
                        className="py-2 px-3 text-sm text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        不合适
                      </button>
                    </>
                  )}
                  {app.status !== 'PENDING' && (
                    <>
                      <button
                        onClick={() => talent?.userId && navigate(`/chat/${talent.userId}?jobId=${app.jobId}`)}
                        className="flex-1 py-2 text-sm text-[#FF6B00] border border-[#FF6B00] rounded-lg hover:bg-orange-50"
                      >
                        发消息
                      </button>
                      <button
                        onClick={() => talent?.id && navigate(`/talents/${talent.id}`)}
                        className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        查看简历
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}