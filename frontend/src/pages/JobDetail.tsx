import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, Send, GraduationCap, Clock, Heart, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { jobsApi, refApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import type { Job, Cuisine, BusinessType } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// ---------- Loading Skeleton ----------
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Back button placeholder */}
      <div className="sticky top-0 bg-white z-10 px-4 h-12 flex items-center">
        <div className="w-6 h-6 bg-gray-200 rounded" />
      </div>

      {/* Company header skeleton */}
      <div className="bg-white px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-56 mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-14" />
        </div>
      </div>

      {/* Description skeleton */}
      <div className="bg-white mt-3 px-4 py-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>

      {/* Requirements skeleton */}
      <div className="bg-white mt-3 px-4 py-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-3/6" />
      </div>

      {/* Floating button skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="app-container p-4">
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ---------- Error State ----------
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8 text-[#FF6B00]" />
      </div>
      <p className="text-gray-500 text-sm text-center mb-6">{message}</p>
      <button onClick={onRetry} className="btn-primary px-8">
        重新加载
      </button>
    </div>
  );
}

// ---------- Main Component ----------
export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reference data for tag display
  const [cuisineMap, setCuisineMap] = useState<Map<string, string>>(new Map());
  const [bizTypeMap, setBizTypeMap] = useState<Map<string, string>>(new Map());

  const fetchJob = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await jobsApi.getById(id);
      setJob(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载职位详情失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRefData = useCallback(async () => {
    try {
      const res = await refApi.getAll();
      const data = res.data as { cuisines: Cuisine[]; businessTypes: BusinessType[] };
      if (data.cuisines) {
        const map = new Map<string, string>();
        data.cuisines.forEach((c: Cuisine) => map.set(String(c.id), c.name));
        setCuisineMap(map);
      }
      if (data.businessTypes) {
        const map = new Map<string, string>();
        data.businessTypes.forEach((b: BusinessType) => map.set(String(b.id), b.name));
        setBizTypeMap(map);
      }
    } catch {
      // Non-critical; tags simply won't resolve to names
    }
  }, []);

  useEffect(() => {
    fetchJob();
    fetchRefData();
  }, [fetchJob, fetchRefData]);

  // Check favorite & application status for talent
  useEffect(() => {
    if (user?.role === 'TALENT' && id) {
      jobsApi.isFavorited(id).then(res => setFavorited(res.data.favorited)).catch(() => {});
      jobsApi.checkApplied(id).then(res => {
        setApplied(res.data.applied);
        setApplicationStatus(res.data.status);
      }).catch(() => {});
    }
  }, [user, id]);

  // Jump to chat with the enterprise
  const handleContactEnterprise = () => {
    if (!job?.enterprise?.userId) return;
    navigate(`/chat/${job.enterprise.userId}${id ? `?jobId=${id}` : ''}`);
  };

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      if (favorited) {
        await jobsApi.unfavorite(id);
        setFavorited(false);
      } else {
        await jobsApi.favorite(id);
        setFavorited(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  // Apply to job
  const handleApply = async () => {
    if (!id || actionLoading || applied) return;
    setActionLoading(true);
    try {
      await jobsApi.apply(id);
      setApplied(true);
      setApplicationStatus('PENDING');
      // 不用alert，改用更友好的提示
    } catch (err: any) {
      const errorData = err.response?.data || {};
      if (errorData.alreadyApplied) {
        setApplied(true);
        setApplicationStatus('PENDING');
      } else {
        alert(errorData.error || '投递失败');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Loading ----------
  if (loading) return <DetailSkeleton />;

  // ---------- Error ----------
  if (error || !job) {
    return <ErrorState message={error || '职位不存在'} onRetry={fetchJob} />;
  }

  const { enterprise } = job;

  // Resolve IDs to display names
  const cuisineTags = job.cuisineIds
    ? job.cuisineIds.split(',').map((c) => c.trim()).filter(Boolean).map((id) => cuisineMap.get(id) || id)
    : [];

  const bizTypeTags = job.businessTypeIds
    ? job.businessTypeIds.split(',').map((b) => b.trim()).filter(Boolean).map((id) => bizTypeMap.get(id) || id)
    : [];

  // Education display
  const educationLabel = job.educationReq
    ? ({ '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中', '5': '大专', '6': '本科', '7': '硕士', '8': '博士' }[String(job.educationReq)] || `学历${job.educationReq}`)
    : null;

  // Experience display
  const experienceLabel = job.experienceReq != null
    ? ({ '0': '经验不限', '1': '1年以下', '2': '1-3年', '3': '3-5年', '5': '5-10年', '10': '10年以上' }[String(job.experienceReq)] || `${job.experienceReq}年`)
    : '经验不限';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 app-container">
      {/* ===== Sticky Header with Back Button ===== */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 border-b border-gray-100">
        <div className="flex items-center h-12 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="ml-2 text-sm font-medium text-gray-700">职位详情</span>
        </div>
      </div>

      {/* ===== Company Header ===== */}
      <section className="bg-white px-4 pt-4 pb-5">
        <button
          onClick={() => enterprise?.id && navigate(`/enterprises/${enterprise.id}`)}
          className="flex items-center gap-3 mb-4 w-full text-left hover:opacity-80 transition-opacity"
        >
          {/* Logo placeholder */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
            {enterprise?.companyName ? enterprise.companyName.charAt(0) : '企'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {enterprise?.companyName || '未知企业'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.city || enterprise?.city || '城市未填'}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Salary */}
        <div className="mb-1">
          <span className="text-2xl font-bold text-[#FF6B00]">
            {job.minSalary}k-{job.maxSalary}k
          </span>
          {job.salaryMonth > 0 && (
            <span className="text-base font-medium text-[#FF6B00] ml-1">
              ·{job.salaryMonth}薪
            </span>
          )}
        </div>

        {/* Job Title */}
        <h1 className="text-lg font-semibold text-gray-900 mb-3">{job.title}</h1>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-2">
          {cuisineTags.map((tag) => (
            <span key={tag} className="tag-orange">{tag}</span>
          ))}
          {bizTypeTags.map((tag) => (
            <span key={tag} className="tag-blue">{tag}</span>
          ))}
          {educationLabel && (
            <span key="edu" className="tag-gray">
              <GraduationCap className="w-3 h-3 mr-1" />
              {educationLabel}
            </span>
          )}
          <span key="exp" className="tag-gray">
            <Clock className="w-3 h-3 mr-1" />
            {experienceLabel}
          </span>
        </div>
      </section>

      {/* ===== Job Description ===== */}
      <section className="bg-white mt-2 px-4 py-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">职位描述</h3>
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {job.description || '暂无描述'}
        </div>
      </section>

      {/* ===== Requirements ===== */}
      {job.requirements && (
        <section className="bg-white mt-2 px-4 py-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">任职要求</h3>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {job.requirements}
          </div>
        </section>
      )}

      {/* ===== Additional Info ===== */}
      <section className="bg-white mt-2 px-4 py-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">更多信息</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div>
            <span className="text-gray-400">招聘人数</span>
            <p className="text-gray-700 mt-0.5">{job.headcount}人</p>
          </div>
          {job.department && (
            <div>
              <span className="text-gray-400">所属部门</span>
              <p className="text-gray-700 mt-0.5">{job.department}</p>
            </div>
          )}
          {job.address && (
            <div className="col-span-2">
              <span className="text-gray-400">工作地址</span>
              <p className="text-gray-700 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {job.address}
              </p>
            </div>
          )}
          <div>
            <span className="text-gray-400">发布时间</span>
            <p className="text-gray-700 mt-0.5">{dayjs(job.createdAt).format('YYYY-MM-DD')}</p>
          </div>
          {enterprise?.companySize && (
            <div>
              <span className="text-gray-400">公司规模</span>
              <p className="text-gray-700 mt-0.5">{enterprise.companySize}</p>
            </div>
          )}
        </div>
      </section>

      {/* ===== Floating Bottom Button ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100">
        <div className="app-container px-4 py-3 safe-bottom">
          {user?.role === 'TALENT' ? (
            <div className="flex items-center gap-3">
              {/* Favorite Button */}
              <button
                onClick={handleToggleFavorite}
                disabled={actionLoading}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  favorited ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400 hover:text-red-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
              </button>
              {/* Apply Button */}
              {applied ? (
                <button
                  disabled
                  className="flex-1 h-12 bg-gray-100 text-gray-500 font-medium rounded-xl flex flex-col items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mb-0.5" />
                  <span className="text-xs">
                    {applicationStatus === 'PENDING' && '已投递·待查看'}
                    {applicationStatus === 'VIEWED' && '已查看'}
                    {applicationStatus === 'INTERVIEWED' && '邀请面试'}
                    {applicationStatus === 'REJECTED' && '不合适'}
                    {applicationStatus === 'ACCEPTED' && '已通过'}
                    {!applicationStatus && '已投递'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={actionLoading}
                  className="flex-1 h-12 bg-[#FF6B00] hover:bg-[#e06000] active:bg-[#cc5500] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? '投递中...' : '投递简历'}
                </button>
              )}
              {/* Chat Button */}
              <button
                onClick={handleContactEnterprise}
                className="w-12 h-12 rounded-xl border border-[#FF6B00] text-[#FF6B00] flex items-center justify-center hover:bg-orange-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleContactEnterprise}
              className="w-full h-12 bg-[#FF6B00] hover:bg-[#e06000] active:bg-[#cc5500] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-2"
            >
              <Send className="w-4 h-4" />
              立即沟通
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
