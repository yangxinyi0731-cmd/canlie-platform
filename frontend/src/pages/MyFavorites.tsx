import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import type { JobFavorite } from '../types';
import dayjs from 'dayjs';

export default function MyFavorites() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<JobFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await jobsApi.getMyFavorites();
        setFavorites(res.data);
      } catch (err) {
        console.error('Failed to load favorites:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUnfavorite = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await jobsApi.unfavorite(jobId);
      setFavorites(prev => prev.filter(f => f.jobId !== jobId));
    } catch (err) {
      console.error('Failed to unfavorite:', err);
    }
  };

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
        <h1 className="text-base font-semibold flex-1">我的收藏</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">暂无收藏职位</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {favorites.map((fav) => {
            const job = fav.job;
            const enterprise = job?.enterprise;

            if (!job) return null;

            return (
              <div
                key={fav.id}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{enterprise?.companyName}</p>
                  </div>
                  <button
                    onClick={(e) => handleUnfavorite(job.id, e)}
                    className="text-red-400 hover:text-red-500 p-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{job.city}</span>
                    <span>·</span>
                    <span>{dayjs(fav.createdAt).format('MM-DD')}</span>
                  </div>
                  <span className="text-sm font-bold text-[#FF6B00]">
                    {job.minSalary / 1000}k-{job.maxSalary / 1000}k
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
