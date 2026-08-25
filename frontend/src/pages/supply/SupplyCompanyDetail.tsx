import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supplyApi } from '../../api';
import type { SupplyCompany } from '../../types';

function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function SupplyCompanyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [company, setCompany] = useState<SupplyCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supplyApi.getCompany(id)
      .then((res) => setCompany(res.data))
      .catch(() => setError('商家不存在或未通过审核'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 px-6">
        <p className="text-sm mb-4">{error || '数据加载失败'}</p>
        <button onClick={() => navigate('/supply')} className="px-4 py-2 bg-[#FF6B00] text-white text-sm rounded-lg">
          返回供应平台
        </button>
      </div>
    );
  }

  const products = company.products || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] px-4 pt-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">←</button>
          <span className="text-xs text-white/80">{company.category?.name || ''}</span>
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold backdrop-blur flex-shrink-0">
            {company.companyName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{company.companyName}</h1>
            <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
              {company.businessLicense ? '✓ 已上传营业执照' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 公司介绍 */}
      <div className="px-4 -mt-12 space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">公司介绍</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {company.introduction || '暂无公司介绍'}
          </p>
          {company.services && (
            <>
              <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">服务内容</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{company.services}</p>
            </>
          )}
          {company.productDesc && (
            <>
              <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">公司产品</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{company.productDesc}</p>
            </>
          )}
        </div>

        {/* 产品列表 */}
        {products.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">在售产品（{products.length}）</h2>
            <div className="space-y-3">
              {products.map((p) => {
                const images = parseImages(p.images);
                return (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-3">
                    {images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
                        {images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={p.name}
                            onClick={() => setPreviewImage(img)}
                            className="w-24 h-24 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                      </div>
                      {p.price && <span className="text-sm font-bold text-[#FF6B00] ml-2 whitespace-nowrap">{p.price}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 联系方式 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">联系方式</h2>
          <div className="space-y-2 text-sm">
            {company.contactName && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">联系人</span>
                <span className="text-gray-900 font-medium">{company.contactName}</span>
              </div>
            )}
            {company.contactPhone && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">联系电话</span>
                <a href={`tel:${company.contactPhone}`} className="text-[#FF6B00] font-medium">{company.contactPhone}</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full rounded-lg" alt="preview" />
        </div>
      )}
    </div>
  );
}
