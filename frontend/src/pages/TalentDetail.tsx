import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { talentsApi, refApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import type { Talent, Cuisine, BusinessType, WorkExperience, JobCategory } from '../types';

function StarRating({ level }: { level: number }) {
  return (
    <span className="star-level text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < level ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

function formatSalary(min?: number, max?: number): string {
  if (min != null && max != null) return `${min / 1000}k-${max / 1000}k`;
  if (min != null) return `${min / 1000}k以上`;
  if (max != null) return `${max / 1000}k以下`;
  return '面议';
}

function formatDateRange(exp: WorkExperience) {
  const start = `${exp.startYear}年${exp.startMonth}月`;
  const end = exp.isCurrent ? '至今' : (exp.endYear ? `${exp.endYear}年${exp.endMonth}月` : '');
  return `${start} - ${end}`;
}

export default function TalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [talentRes, refRes] = await Promise.all([
          talentsApi.getById(id!),
          refApi.getAll(),
        ]);
        setTalent(talentRes.data);
        setCuisines(refRes.data.cuisines || []);
        setBusinessTypes(refRes.data.businessTypes || []);
        setJobCategories(refRes.data.jobCategories || []);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || '获取人才信息失败');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  const getCuisineNames = (ids?: string) => {
    if (!ids) return [];
    return ids.split(',').map(id => cuisines.find(c => c.id === id)?.name).filter(Boolean) as string[];
  };

  const getBusinessTypeNames = (ids?: string) => {
    if (!ids) return [];
    return ids.split(',').map(id => businessTypes.find(b => b.id === id)?.name).filter(Boolean) as string[];
  };

  const getJobCategoryName = (catId?: string) => {
    if (!catId) return null;
    for (const cat of jobCategories) {
      const sub = cat.subCategories.find(s => s.id === catId);
      if (sub) return `${cat.name} · ${sub.name}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center app-container">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !talent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center app-container">
        <p className="text-gray-400 mb-4">{error || '人才不存在'}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">返回</button>
      </div>
    );
  }

  const displayName = talent.realName || '匿名人才';
  const cuisineNames = getCuisineNames(talent.cuisineIds);
  const businessTypeNames = getBusinessTypeNames(talent.businessTypeIds);
  const jobCategoryLabel = getJobCategoryName(talent.jobCategoryId);
  const workExperiences = talent.workExperiences || [];

  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold flex-1">人才详情</h1>
      </div>

      <div className="p-4 space-y-4 pb-20">
        {/* Profile Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
                {talent.starLevel > 0 && (
                  <span className="flex items-center gap-1">
                    <StarRating level={talent.starLevel} />
                    <span className="text-xs text-gray-400">({talent.starLevelStr})</span>
                  </span>
                )}
              </div>
              {jobCategoryLabel && (
                <p className="text-sm text-gray-500 mb-0.5">{jobCategoryLabel}</p>
              )}
              <p className="text-sm text-gray-600">{talent.title || '未填写职位'}</p>
              {talent.currentCompany && (
                <p className="text-xs text-gray-500 mt-0.5">{talent.currentCompany}</p>
              )}
            </div>
          </div>

          {/* Salary */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400">期望薪资</span>
              <p className="text-lg font-bold text-[#FF6B00]">{formatSalary(talent.minSalary, talent.maxSalary)}</p>
            </div>
            {(talent.city || talent.province) && (
              <div className="text-right">
                <span className="text-xs text-gray-400">所在地</span>
                <p className="text-sm text-gray-700">{talent.city}{talent.province ? ` · ${talent.province}` : ''}</p>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">工作年限</span><p className="text-gray-700">{talent.workYears ? `${talent.workYears}年` : '未填写'}</p></div>
            <div><span className="text-gray-400">学历</span><p className="text-gray-700">{talent.education || '未填写'}</p></div>
            {talent.gender && <div><span className="text-gray-400">性别</span><p className="text-gray-700">{talent.gender === 'MALE' ? '男' : '女'}</p></div>}
            {talent.birthYear && <div><span className="text-gray-400">出生年月</span><p className="text-gray-700">{talent.birthYear}年{talent.birthMonth ? `${talent.birthMonth}月` : ''}</p></div>}
            {(talent.hometown || talent.hometownProvince) && <div><span className="text-gray-400">籍贯</span><p className="text-gray-700">{talent.hometownProvince ? `${talent.hometownProvince} ` : ''}{talent.hometown || ''}</p></div>}
          </div>
        </div>

        {/* Work Experience Timeline */}
        {workExperiences.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" /><polyline points="17 5 12 0 7 5" /></svg>
              工作经历
            </h3>
            <div className="relative">
              {workExperiences.map((exp, idx) => (
                <div key={exp.id || idx} className="flex gap-3 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 mt-1 ${exp.isCurrent ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-white border-gray-300'}`} />
                    {idx < workExperiences.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{exp.position}</h4>
                    <p className="text-xs text-gray-600">
                      {exp.companyName || '企业名称未授权展示'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateRange(exp)}</p>
                    {exp.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{exp.description}</p>}
                    {exp.isCurrent && <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full">现任</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specialty */}
        {(cuisineNames.length > 0 || businessTypeNames.length > 0) && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">专业领域</h3>
            <div className="space-y-3">
              {cuisineNames.length > 0 && (
                <div>
                  <span className="text-xs text-gray-400">菜系专长</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cuisineNames.map(name => <span key={name} className="px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-md">{name}</span>)}
                  </div>
                </div>
              )}
              {businessTypeNames.length > 0 && (
                <div>
                  <span className="text-xs text-gray-400">业态经验</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {businessTypeNames.map(name => <span key={name} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md">{name}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Brand & Self Intro */}
        {talent.brandEndorsement && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">品牌背书</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.brandEndorsement}</p>
          </div>
        )}
        {talent.headBrandExp && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">头部品牌经历</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.headBrandExp}</p>
          </div>
        )}
        {talent.selfIntro && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">自我介绍</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.selfIntro}</p>
          </div>
        )}
        {talent.acceptPartner && (
          <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <div><p className="text-sm font-medium text-[#FF6B00]">接受合伙/投资机会</p><p className="text-xs text-gray-500">该人才对合伙或投资机会持开放态度</p></div>
          </div>
        )}
      </div>

      {/* Floating Chat Button - Only for Enterprise */}
      {user?.role === 'ENTERPRISE' && talent.userId && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100">
          <div className="px-4 py-3">
            <button
              onClick={() => navigate(`/chat/${talent.userId}`)}
              className="w-full h-12 bg-[#FF6B00] hover:bg-[#e06000] active:bg-[#cc5500] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              立即沟通
            </button>
          </div>
        </div>
      )}
      {user?.role === 'ENTERPRISE' && !talent.userId && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100">
          <div className="px-4 py-3">
            <div className="w-full min-h-12 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-center text-sm text-orange-800">
              建立投递或匹配关系后可发起沟通
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
