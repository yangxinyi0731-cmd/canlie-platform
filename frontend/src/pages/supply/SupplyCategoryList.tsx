import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supplyApi } from '../../api';
import type { SupplyCategory, SupplyCompany } from '../../types';

export default function SupplyCategoryList() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [category, setCategory] = useState<SupplyCategory | null>(null);
  const [companies, setCompanies] = useState<SupplyCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    supplyApi.getCategories().then((res) => {
      const found = (res.data || []).find((c: SupplyCategory) => c.id === categoryId);
      if (found) setCategory(found);
    }).catch(() => {});
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    supplyApi.listCompanies({ categoryId, page, pageSize })
      .then((res) => {
        setCompanies(res.data?.companies || []);
        setTotal(res.data?.total || 0);
      })
      .catch(() => setError('加载商家列表失败'))
      .finally(() => setLoading(false));
  }, [categoryId, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/supply')} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">{category?.name || '供应商家'}</h1>
          <span className="text-xs text-gray-400 ml-auto">{total} 家</span>
        </div>
      </div>

      <div className="p-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-50">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-gray-500 text-sm">该分类下暂无商家</p>
            <button
              onClick={() => navigate('/supply/apply')}
              className="mt-3 text-[#FF6B00] text-sm font-medium"
            >
              立即入驻 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/supply/company/${c.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {c.companyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{c.companyName}</h3>
                    {c.services && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.services}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-[#FF6B00] font-medium">
                        {c._count?.products ?? 0} 款产品
                      </span>
                      {c.contactName && <span className="text-xs text-gray-400">{c.contactName}</span>}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-30 bg-white"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-30 bg-white"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
