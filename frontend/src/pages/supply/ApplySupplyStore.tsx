import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplyApi, uploadApi, refApi } from '../../api';
import type { SupplyCategory } from '../../types';

interface Cuisine {
  id: string;
  name: string;
}

export default function ApplySupplyStore() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [productDesc, setProductDesc] = useState('');
  const [services, setServices] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [hasApplied, setHasApplied] = useState(false);

  // 产品子表单
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productUploading, setProductUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isFood = categories.find((c) => c.id === categoryId)?.code === 'FOOD';

  useEffect(() => {
    supplyApi.getCategories().then((res) => setCategories(res.data || [])).catch(() => {});
    refApi.getCuisinesGrouped().then((res) => setCuisines(res.data?.level1 || [])).catch(() => {});
    // 若已申请过，跳到我的店铺
    supplyApi.getMyCompany().then((res) => {
      if (res.data) setHasApplied(true);
    }).catch(() => {});
  }, []);

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 px-6">
        <div className="text-5xl mb-4">🏪</div>
        <p className="text-sm mb-2">您已提交过入驻申请</p>
        <p className="text-xs text-gray-400 mb-6">可在「我的店铺」中查看审核状态或修改信息</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/supply/my')} className="px-5 py-2 bg-[#FF6B00] text-white text-sm rounded-lg">我的店铺</button>
          <button onClick={() => navigate('/supply')} className="px-5 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg">返回</button>
        </div>
      </div>
    );
  }

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseUploading(true);
    try {
      const res = await uploadApi.upload(file);
      setLicenseUrl(res.data.url);
    } catch {
      setError('营业执照上传失败');
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductUploading(true);
    try {
      const res = await uploadApi.upload(file);
      setProductImages((prev) => [...prev, res.data.url]);
    } catch {
      setError('产品图片上传失败');
    } finally {
      setProductUploading(false);
    }
  };

  const toggleCuisine = (id: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!categoryId || !companyName.trim()) {
      setError('请选择分类并填写公司名称');
      return;
    }
    if (!licenseUrl) {
      setError('请上传营业执照');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await supplyApi.applyCompany({
        categoryId,
        companyName: companyName.trim(),
        businessLicense: licenseUrl,
        productDesc: productDesc.trim() || undefined,
        services: services.trim() || undefined,
        introduction: introduction.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
      });
      // 添加第一个产品（可选）
      if (productName.trim()) {
        await supplyApi.addProduct({
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
          description: undefined,
          cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
        });
      }
      navigate('/supply/my', { state: { applied: true } });
    } catch (err: any) {
      setError(err?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]";
  const textareaCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]";

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/supply')} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">商家入驻</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        {/* 基本信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">店铺分类 *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">请选择分类</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">公司名称 *</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="请输入营业执照上的公司名称" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">营业执照 *</label>
              <div className="flex items-center gap-3">
                {licenseUrl ? (
                  <img src={licenseUrl} className="w-24 h-24 rounded-lg object-cover border border-gray-200" alt="营业执照" />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <span className="text-xl">📄</span>
                    <span className="text-[10px] mt-1">营业执照</span>
                  </div>
                )}
                <div className="flex-1">
                  <label className="cursor-pointer inline-block px-4 py-2 bg-orange-50 text-[#FF6B00] text-sm rounded-lg border border-[#FF6B00]/30">
                    {licenseUploading ? '上传中...' : licenseUrl ? '重新上传' : '上传图片'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLicenseUpload} />
                  </label>
                  <p className="text-[11px] text-gray-400 mt-1">支持 jpg/png 格式，用于审核</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">联系人</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="联系人姓名" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">联系电话</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="联系电话" className={inputCls} />
            </div>
          </div>
        </div>

        {/* 食材公司：八大菜系 */}
        {isFood && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">服务菜系（八大菜系）</h2>
            <p className="text-xs text-gray-400 mb-3">可多选，仅食材公司需填写</p>
            <div className="flex flex-wrap gap-2">
              {cuisines.map((c) => {
                const selected = selectedCuisines.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCuisine(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selected ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 公司信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">公司信息</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">公司服务</label>
              <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={2} placeholder="如：蔬菜水果批发配送、宴会食材定制" className={textareaCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">公司产品</label>
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} rows={2} placeholder="主要经营的产品品类" className={textareaCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">公司介绍</label>
              <textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={3} placeholder="介绍公司的规模、实力、合作经验等" className={textareaCls} />
            </div>
          </div>
        </div>

        {/* 产品发布 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">发布产品（可选）</h2>
          <p className="text-xs text-gray-400 mb-3">入驻时发布首个产品，之后可在「我的店铺」管理</p>
          <div className="space-y-3">
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="产品名称，如：岳阳小米椒" className={inputCls} />
            <input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="价格，如：12元/斤" className={inputCls} />
            <div>
              <div className="flex items-center gap-2">
                {productImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} className="w-20 h-20 rounded-lg object-cover border border-gray-200" alt="product" />
                    <button
                      onClick={() => setProductImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
                {productImages.length < 5 && (
                  <label className="cursor-pointer w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    {productUploading ? <span className="text-xs">上传中</span> : <><span className="text-xl">+</span><span className="text-[10px]">图片</span></>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {submitting ? '提交中...' : '提交入驻申请'}
        </button>
        <p className="text-center text-[11px] text-gray-400">提交后由管理员审核，通过后店铺将展示在供应平台</p>
      </div>
    </div>
  );
}
