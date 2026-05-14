import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import type { JobApplication } from '../types';
import dayjs from 'dayjs';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待查看', color: 'text-yellow-600 bg-yellow-50' },
  VIEWED: { label: '已查看', color: 'text-blue-600 bg-blue-50' },
  CONTACTED: { label: '已沟通', color: 'text-green-600 bg-green-50' },
  REJECTED: { label: '不合适', color: 'text-red-600 bg-red-50' },
  ACCEPTED: { label: '已通过', color: 'text-green-600 bg-green-50' },
};

export default function MyApplications() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await jobsApi.getMyApplications();
        setApplications(res.data);
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center app-container">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold flex-1">投递记录</h1>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">暂无投递记录</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {applications.map((app) => {
            const job = app.job;
            const enterprise = job?.enterprise;
            const status = statusMap[app.status] || { label: app.status, color: 'text-gray-600 bg-gray-50' };

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => job && navigate(`/jobs/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{job?.title || '职位已下线'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{enterprise?.companyName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>
                {job && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{job.city}</span>
                      <span>·</span>
                      <span>{dayjs(app.createdAt).format('MM-DD HH:mm')}</span>
                    </div>
                    <span className="text-sm font-bold text-[#FF6B00]">
                      {job.minSalary / 1000}k-{job.maxSalary / 1000}k
                    </span>
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
