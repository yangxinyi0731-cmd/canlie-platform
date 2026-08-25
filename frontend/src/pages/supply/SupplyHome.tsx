import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplyApi } from '../../api';
import type { SupplyCategory } from '../../types';

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🥬', TABLEWARE: '🍽️', KITCHENWARE: '🍳', FURNITURE: '🪑',
  BRAND_PLANNING: '📣', DESIGN: '🎨', TRAINING: '🎓', RENT_TRANSFER: '🔑',
  SECOND_HAND: '🔄', INVESTMENT: '💰',
};

export default function SupplyHome() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supplyApi.getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => setError('加载分类失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] px-4 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
            ←
          </button>
          <h1 className="text-lg font-bold text-white">供应平台</h1>
          <div className="w-8" />
        </div>
        <p className="text-white/90 text-sm leading-relaxed">餐饮行业一站式供应链平台<br />食材 · 设备 · 品牌 · 培训 · 转让 · 投资</p>
      </div>

      {/* 操作入口 */}
      <div className="px-4 -mt-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-4 flex gap-3">
          <button
            onClick={() => navigate('/supply/apply')}
            className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-lg text-sm font-medium"
          >
            商家入驻
          </button>
          <button
            onClick={() => navigate('/supply/my')}
            className="flex-1 py-2.5 bg-orange-50 text-[#FF6B00] border border-[#FF6B00]/30 rounded-lg text-sm font-medium"
          >
            我的店铺
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 mt-3">
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        </div>
      )}

      {/* 分类宫格 */}
      <div className="px-4 mt-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">全部分类</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/supply/category/${cat.id}`)}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"
              >
                <span className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                  {CATEGORY_ICONS[cat.code] || '🏪'}
                </span>
                <span className="text-xs text-gray-700 font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 入驻说明 */}
      <div className="px-4 mt-5 pb-8">
        <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-4">
          <p className="text-sm font-medium text-orange-800 mb-2">如何入驻？</p>
          <p className="text-xs text-orange-700 leading-relaxed">
            1. 点击「商家入驻」填写公司信息并上传营业执照<br />
            2. 食材公司可勾选八大菜系、发布产品图片和价格<br />
            3. 管理员审核通过后，您的店铺将展示在对应分类下
          </p>
        </div>
      </div>
    </div>
  );
}
