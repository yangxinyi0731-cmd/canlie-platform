import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { enterpriseApi } from '../api';
import type { Enterprise, Job } from '../types';
import dayjs from 'dayjs';

const companySizeMap: Record<string, string> = {
  '1-50': '1-50人',
  '50-200': '50-200人',
  '200-500': '200-500人',
  '500-2000': '500-2000人',
  '2000+': '2000人以上',
};

export default function EnterpriseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<(Enterprise & { jobs?: Job[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await enterpriseApi.getById(id!);
        setEnterprise(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || '获取企业信息失败');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center app-container">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !enterprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center app-container">
        <p className="text-gray-400 mb-4">{error || '企业不存在'}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">返回</button>
      </div>
    );
  }

  const activeJobs = enterprise.jobs?.filter(j => j.status === 'ACTIVE') || [];

  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold flex-1">企业详情</h1>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Company Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {enterprise.companyName?.charAt(0) || '企'}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{enterprise.companyName}</h2>
              {enterprise.city && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {enterprise.city}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{activeJobs.length}</p>
              <p className="text-xs text-gray-400">在招职位</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{companySizeMap[enterprise.companySize || ''] || '未填写'}</p>
              <p className="text-xs text-gray-400">公司规模</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#FF6B00]">{enterprise.licenseVerified ? '已认证' : '未认证'}</p>
              <p className="text-xs text-gray-400">企业认证</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {enterprise.description && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">企业简介</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{enterprise.description}</p>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">联系方式</h3>
          <div className="space-y-2 text-sm">
            {enterprise.contactName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">联系人</span>
                <span className="text-gray-700">{enterprise.contactName}</span>
              </div>
            )}
            {enterprise.contactPhone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">电话</span>
                <span className="text-gray-700">{enterprise.contactPhone}</span>
              </div>
            )}
            {enterprise.address && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16">地址</span>
                <span className="text-gray-700">{enterprise.address}</span>
              </div>
            )}
            {enterprise.website && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">官网</span>
                <a href={enterprise.website} target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:underline">
                  {enterprise.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">在招职位 ({activeJobs.length})</h3>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{job.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{job.city}</p>
                    </div>
                    <p className="text-sm font-bold text-[#FF6B00] ml-2 shrink-0">
                      {job.minSalary / 1000}k-{job.maxSalary / 1000}k
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
