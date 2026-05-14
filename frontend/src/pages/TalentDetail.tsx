import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { talentsApi, refApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import type { Talent, Cuisine, BusinessType } from '../types';

const educationMap: Record<string, string> = {
  '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中',
  '5': '大专', '6': '本科', '7': '硕士', '8': '博士',
};

function StarRating({ level }: { level: number }) {
  const max = 5;
  return (
    <span className="star-level text-amber-400">
      {Array.from({ length: max }, (_, i) => (
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

export default function TalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);

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
      } catch (err: any) {
        setError(err.response?.data?.error || '获取人才信息失败');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  const getCuisineNames = (ids?: string) => {
    if (!ids) return [];
    return ids.split(',').map((id) => cuisines.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  };

  const getBusinessTypeNames = (ids?: string) => {
    if (!ids) return [];
    return ids.split(',').map((id) => businessTypes.find((b) => b.id === id)?.name).filter(Boolean) as string[];
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

      <div className="p-4 space-y-4 pb-8">
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
            {talent.city && (
              <div className="text-right">
                <span className="text-xs text-gray-400">所在城市</span>
                <p className="text-sm text-gray-700">{talent.city}</p>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">工作年限</span>
              <p className="text-gray-700">{talent.workYears ? `${talent.workYears}年` : '未填写'}</p>
            </div>
            <div>
              <span className="text-gray-400">学历</span>
              <p className="text-gray-700">{talent.education || '未填写'}</p>
            </div>
            {talent.gender && (
              <div>
                <span className="text-gray-400">性别</span>
                <p className="text-gray-700">{talent.gender === 'MALE' ? '男' : '女'}</p>
              </div>
            )}
            {talent.birthYear && (
              <div>
                <span className="text-gray-400">出生年份</span>
                <p className="text-gray-700">{talent.birthYear}年</p>
              </div>
            )}
            {talent.hometown && (
              <div>
                <span className="text-gray-400">籍贯</span>
                <p className="text-gray-700">{talent.hometown}</p>
              </div>
            )}
          </div>
        </div>

        {/* Specialty */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">专业领域</h3>
          <div className="space-y-3">
            {cuisineNames.length > 0 && (
              <div>
                <span className="text-xs text-gray-400">菜系专长</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {cuisineNames.map((name) => (
                    <span key={name} className="tag-orange">{name}</span>
                  ))}
                </div>
              </div>
            )}
            {businessTypeNames.length > 0 && (
              <div>
                <span className="text-xs text-gray-400">业态经验</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {businessTypeNames.map((name) => (
                    <span key={name} className="tag-gray">{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Endorsement */}
        {talent.brandEndorsement && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">品牌背书</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.brandEndorsement}</p>
          </div>
        )}

        {/* Brand Experience */}
        {talent.headBrandExp && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">头部品牌经历</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.headBrandExp}</p>
          </div>
        )}

        {/* Project Experience */}
        {talent.projectExp && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">项目经验</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.projectExp}</p>
          </div>
        )}

        {/* Self Introduction */}
        {talent.selfIntro && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">自我介绍</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{talent.selfIntro}</p>
          </div>
        )}

        {/* Partner */}
        {talent.acceptPartner && (
          <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#FF6B00]">接受合伙/投资机会</p>
              <p className="text-xs text-gray-500">该人才对合伙或投资机会持开放态度</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Button - Only for Enterprise users */}
      {user?.role === 'ENTERPRISE' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100">
          <div className="app-container px-4 py-3 safe-bottom">
            <button
              onClick={() => navigate(`/chat/${talent.userId}`)}
              className="w-full h-12 bg-[#FF6B00] hover:bg-[#e06000] active:bg-[#cc5500] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              立即沟通
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
