import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { talentsApi, refApi } from '../api';
import type { Cuisine, BusinessType } from '../types';

interface TalentResult {
  id: string;
  realName?: string;
  title?: string;
  currentCompany?: string;
  city?: string;
  minSalary?: number;
  maxSalary?: number;
  workYears?: number;
  education?: string;
  starLevel: number;
  starLevelStr?: string;
  avatar?: string;
  cuisineIds?: string;
  businessTypeIds?: string;
  brandEndorsement?: string;
}

interface SearchFilters {
  keyword: string;
  city: string;
  cuisineId: string;
  businessTypeId: string;
  minSalary: string;
  maxSalary: string;
  starLevel: string;
}

export default function TalentSearch() {
  const navigate = useNavigate();

  const [talents, setTalents] = useState<TalentResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 20;

  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    city: '',
    cuisineId: '',
    businessTypeId: '',
    minSalary: '',
    maxSalary: '',
    starLevel: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const res = await refApi.getAll();
        setCuisines(res.data.cuisines || []);
        setBusinessTypes(res.data.businessTypes || []);
      } catch {
        // ignore
      }
    };
    loadRefData();
  }, []);

  const search = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {
        page: pageNum,
        pageSize,
      };
      if (filters.keyword.trim()) params.keyword = filters.keyword.trim();
      if (filters.city) params.city = filters.city;
      if (filters.cuisineId) params.cuisineId = filters.cuisineId;
      if (filters.businessTypeId) params.businessTypeId = filters.businessTypeId;
      if (filters.minSalary) params.minSalary = parseInt(filters.minSalary);
      if (filters.maxSalary) params.maxSalary = parseInt(filters.maxSalary);
      if (filters.starLevel) params.starLevel = parseInt(filters.starLevel);

      const res = await talentsApi.search(params);
      const data = res.data;
      setTalents(data.talents || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch {
      setError('搜索失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    search(1);
  }, []);

  const handleSearch = () => {
    search(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      city: '',
      cuisineId: '',
      businessTypeId: '',
      minSalary: '',
      maxSalary: '',
      starLevel: '',
    });
  };

  const hasActiveFilters =
    filters.city || filters.cuisineId || filters.businessTypeId ||
    filters.minSalary || filters.maxSalary || filters.starLevel;

  const cities = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊'];

  const starLabels = ['', '一星', '二星', '三星', '四星', '五星'];

  const renderStars = (level: number) => {
    const full = Math.floor(level);
    return (
      <span className="text-amber-400 text-xs">
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder="搜索人才（姓名、职位、公司）"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-[#FF6B00] text-white text-sm rounded-lg font-medium hover:bg-[#e86000] transition-colors"
        >
          搜索
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-[#FF6B00] text-[#FF6B00] bg-orange-50'
              : 'border-gray-200 text-gray-400'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 mb-4 space-y-3">
          {/* City */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">城市</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilters((f) => ({ ...f, city: '' }))}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  !filters.city ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                不限
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilters((f) => ({ ...f, city: f.city === c ? '' : c }))}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    filters.city === c
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">菜系</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilters((f) => ({ ...f, cuisineId: '' }))}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  !filters.cuisineId ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                不限
              </button>
              {cuisines.filter((c) => c.level === 1).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilters((f) => ({ ...f, cuisineId: f.cuisineId === c.id ? '' : c.id }))}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    filters.cuisineId === c.id
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">业态</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilters((f) => ({ ...f, businessTypeId: '' }))}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  !filters.businessTypeId ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                不限
              </button>
              {businessTypes.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => setFilters((f) => ({ ...f, businessTypeId: f.businessTypeId === bt.id ? '' : bt.id }))}
                  className={`px-2.5 py-1 rounded-full text-xs border ${
                    filters.businessTypeId === bt.id
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {bt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">最低薪资</label>
              <select
                value={filters.minSalary}
                onChange={(e) => setFilters((f) => ({ ...f, minSalary: e.target.value }))}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              >
                <option value="">不限</option>
                <option value="8000">8k以上</option>
                <option value="15000">15k以上</option>
                <option value="20000">20k以上</option>
                <option value="30000">30k以上</option>
                <option value="50000">50k以上</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">星级</label>
              <select
                value={filters.starLevel}
                onChange={(e) => setFilters((f) => ({ ...f, starLevel: e.target.value }))}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              >
                <option value="">不限</option>
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>{starLabels[l]}及以上</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                clearFilters();
              }}
              className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              重置
            </button>
            <button
              onClick={() => {
                setShowFilters(false);
                handleSearch();
              }}
              className="flex-1 py-2 text-xs text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000]"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filters.city && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-full">
              {filters.city}
              <button onClick={() => setFilters((f) => ({ ...f, city: '' }))} className="text-[#FF6B00]/60 hover:text-[#FF6B00]">×</button>
            </span>
          )}
          {filters.cuisineId && cuisines.find((c) => c.id === filters.cuisineId) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-full">
              {cuisines.find((c) => c.id === filters.cuisineId)?.name}
              <button onClick={() => setFilters((f) => ({ ...f, cuisineId: '' }))} className="text-[#FF6B00]/60 hover:text-[#FF6B00]">×</button>
            </span>
          )}
          {filters.businessTypeId && businessTypes.find((bt) => bt.id === filters.businessTypeId) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-full">
              {businessTypes.find((bt) => bt.id === filters.businessTypeId)?.name}
              <button onClick={() => setFilters((f) => ({ ...f, businessTypeId: '' }))} className="text-[#FF6B00]/60 hover:text-[#FF6B00]">×</button>
            </span>
          )}
          {filters.minSalary && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-full">
              {parseInt(filters.minSalary) / 1000}k以上
              <button onClick={() => setFilters((f) => ({ ...f, minSalary: '' }))} className="text-[#FF6B00]/60 hover:text-[#FF6B00]">×</button>
            </span>
          )}
          {filters.starLevel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#FF6B00] text-xs rounded-full">
              {starLabels[parseInt(filters.starLevel)]}及以上
              <button onClick={() => setFilters((f) => ({ ...f, starLevel: '' }))} className="text-[#FF6B00]/60 hover:text-[#FF6B00]">×</button>
            </span>
          )}
        </div>
      )}

      {/* Results Info */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          共找到 <span className="text-gray-600 font-medium">{total}</span> 位人才
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : talents.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-50">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">未找到匹配的人才</p>
          <p className="text-gray-400 text-xs mt-1">尝试调整筛选条件</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {talents.map((talent) => (
              <button
                key={talent.id}
                onClick={() => navigate(`/talents/${talent.id}`)}
                className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:border-[#FF6B00]/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B00] to-orange-400 flex items-center justify-center text-white font-semibold text-base shrink-0 overflow-hidden">
                    {talent.avatar ? (
                      <img src={talent.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      talent.realName?.[0] || '?'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {talent.realName || '匿名人才'}
                      </h3>
                      {renderStars(talent.starLevel)}
                      <span className="text-[10px] text-gray-400">
                        {talent.starLevelStr || starLabels[talent.starLevel] || ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {talent.title || '未填写职位'}
                      {talent.currentCompany ? ` | ${talent.currentCompany}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-[#FF6B00] font-medium">
                        {talent.minSalary && talent.maxSalary
                          ? `${(talent.minSalary / 1000).toFixed(0)}k-${(talent.maxSalary / 1000).toFixed(0)}k`
                          : '薪资面议'}
                      </span>
                      {talent.workYears != null && (
                        <span className="text-gray-400">
                          {talent.workYears}年经验
                        </span>
                      )}
                      {talent.city && (
                        <span className="text-gray-400">{talent.city}</span>
                      )}
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {talent.education && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded">
                          {talent.education}
                        </span>
                      )}
                      {talent.brandEndorsement && (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded">
                          品牌背书
                        </span>
                      )}
                      {talent.businessTypeIds && talent.businessTypeIds.split(',').slice(0, 2).map((btId) => {
                        const bt = businessTypes.find((b) => b.id === btId);
                        return bt ? (
                          <span key={btId} className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded">
                            {bt.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-2">
              <button
                onClick={() => search(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                上一页
              </button>
              <span className="text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => search(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
