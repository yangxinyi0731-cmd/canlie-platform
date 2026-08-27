import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplyApi, uploadApi, refApi } from '../../api';
import type { SupplyCategory, SupplyCompany, SupplyProduct } from '../../types';

interface Cuisine {
  id: string;
  name: string;
}

function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: '审核中', className: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '已通过', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: '未通过', className: 'bg-red-100 text-red-700' },
};

export default function MySupplyStore() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<SupplyCompany | null>(null);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 编辑字段
  const [categoryId, setCategoryId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [services, setServices] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  // 产品管理
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<SupplyProduct | null>(null);

  const load = () => {
    setLoading(true);
    supplyApi.getMyCompany()
      .then((res) => {
        const data = res.data;
        if (!data) { setCompany(null); return; }
        setCompany(data);
        setCategoryId(data.categoryId);
        setCompanyName(data.companyName);
        setLicenseUrl(data.businessLicense || '');
        setServices(data.services || '');
        setProductDesc(data.productDesc || '');
        setIntroduction(data.introduction || '');
        setContactName(data.contactName || '');
        setContactPhone(data.contactPhone || '');
        setSelectedCuisines(data.cuisineIds ? data.cuisineIds.split(',') : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    supplyApi.getCategories().then((res) => setCategories(res.data || [])).catch(() => {});
    refApi.getCuisinesGrouped().then((res) => setCuisines(res.data?.level1 || [])).catch(() => {});
    load();
  }, []);

  const isFood = categories.find((c) => c.id === categoryId)?.code === 'FOOD';
  const statusCfg = company ? (STATUS_CONFIG[company.status] || STATUS_CONFIG.PENDING) : null;

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadApi.upload(file, 'SUPPLY_LICENSE');
      setLicenseUrl(res.data.url);
    } catch {
      setError('营业执照上传失败');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await supplyApi.updateCompany({
        categoryId,
        companyName,
        businessLicense: licenseUrl || undefined,
        productDesc: productDesc.trim() || undefined,
        services: services.trim() || undefined,
        introduction: introduction.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
      });
      setEditing(false);
      load();
    } catch (err: any) {
      setError(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productName.trim()) { setError('请填写产品名称'); return; }
    setError('');
    try {
      if (editingProduct) {
        await supplyApi.updateProduct(editingProduct.id, {
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
        });
      } else {
        await supplyApi.addProduct({
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
          cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
        });
      }
      setShowAddProduct(false);
      setEditingProduct(null);
      setProductName('');
      setProductPrice('');
      setProductImages([]);
      load();
    } catch (err: any) {
      setError(err?.message || '保存产品失败');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('确定删除该产品吗？')) return;
    try {
      await supplyApi.deleteProduct(id);
      load();
    } catch {
      setError('删除产品失败');
    }
  };

  const handleEditProduct = (p: SupplyProduct) => {
    setEditingProduct(p);
    setProductName(p.name);
    setProductPrice(p.price || '');
    setProductImages(parseImages(p.images));
    setShowAddProduct(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadApi.upload(file, 'SUPPLY_PRODUCT_IMAGE');
      setProductImages((prev) => [...prev, res.data.url]);
    } catch {
      setError('图片上传失败');
    }
  };

  const inputCls = "w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]";
  const textareaCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 px-6">
        <div className="text-5xl mb-4">🏪</div>
        <p className="text-sm mb-6">您还没有店铺</p>
        <button onClick={() => navigate('/supply/apply')} className="px-6 py-2.5 bg-[#FF6B00] text-white text-sm rounded-lg">
          立即入驻
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/supply')} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">我的店铺</h1>
          {statusCfg && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        {/* 审核状态提示 */}
        {company.status === 'REJECTED' && company.reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800 mb-1">审核未通过</p>
            <p className="text-xs text-red-600">{company.reason}</p>
            <button onClick={() => setEditing(true)} className="mt-2 text-xs text-red-700 underline">修改后重新提交</button>
          </div>
        )}
        {company.status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">审核中</p>
            <p className="text-xs text-yellow-600">管理员正在审核您的入驻申请，请耐心等待</p>
          </div>
        )}

        {/* 店铺信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">店铺信息</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs text-[#FF6B00] font-medium">编辑</button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {company.companyName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{company.companyName}</p>
                  <p className="text-xs text-gray-400">{company.category?.name || ''}</p>
                </div>
              </div>
              {company.services && <p className="text-xs text-gray-600 whitespace-pre-line"><span className="text-gray-400">服务：</span>{company.services}</p>}
              {company.introduction && <p className="text-xs text-gray-600 line-clamp-2"><span className="text-gray-400">介绍：</span>{company.introduction}</p>}
              {company.contactName && <p className="text-xs text-gray-600"><span className="text-gray-400">联系人：</span>{company.contactName}</p>}
              {company.contactPhone && <p className="text-xs text-gray-600"><span className="text-gray-400">电话：</span>{company.contactPhone}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="公司名称" />
              <div className="flex items-center gap-3">
                {licenseUrl && <img src={licenseUrl} className="w-20 h-20 rounded-lg object-cover border border-gray-200" alt="营业执照" />}
                <label className="cursor-pointer inline-block px-4 py-2 bg-orange-50 text-[#FF6B00] text-sm rounded-lg border border-[#FF6B00]/30">
                  上传/更换营业执照
                  <input type="file" accept="image/*" className="hidden" onChange={handleLicenseUpload} />
                </label>
              </div>
              {isFood && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">服务菜系</p>
                  <div className="flex flex-wrap gap-2">
                    {cuisines.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCuisines((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedCuisines.includes(c.id) ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={2} placeholder="公司服务" className={textareaCls} />
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} rows={2} placeholder="公司产品" className={textareaCls} />
              <textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={3} placeholder="公司介绍" className={textareaCls} />
              <div className="grid grid-cols-2 gap-3">
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="联系人" className={inputCls} />
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="联系电话" className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
                <button onClick={() => { setEditing(false); load(); }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">
                  取消
                </button>
              </div>
              {company.status === 'APPROVED' && (
                <p className="text-[11px] text-gray-400">修改信息后将重新进入审核</p>
              )}
            </div>
          )}
        </div>

        {/* 产品管理 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">产品管理（{company.products?.length || 0}）</h2>
            <button onClick={() => { setShowAddProduct(true); setEditingProduct(null); setProductName(''); setProductPrice(''); setProductImages([]); }} className="text-xs text-[#FF6B00] font-medium">
              + 添加产品
            </button>
          </div>

          {showAddProduct && (
            <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 mb-3 space-y-2">
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="产品名称 *" className={inputCls} />
              <input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="价格，如：12元/斤" className={inputCls} />
              <div className="flex items-center gap-2 flex-wrap">
                {productImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} className="w-16 h-16 rounded-lg object-cover border border-gray-200" alt="product" />
                    <button onClick={() => setProductImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                  </div>
                ))}
                {productImages.length < 5 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-orange-200 flex flex-col items-center justify-center text-orange-400">
                    <span className="text-lg">+</span>
                    <span className="text-[10px]">图片</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                  </label>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddProduct} className="flex-1 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-medium">
                  {editingProduct ? '保存修改' : '添加产品'}
                </button>
                <button onClick={() => { setShowAddProduct(false); setEditingProduct(null); }} className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs">
                  取消
                </button>
              </div>
            </div>
          )}

          {!company.products || company.products.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">暂无产品，点击「添加产品」发布</p>
          ) : (
            <div className="space-y-2">
              {company.products.map((p) => {
                const images = parseImages(p.images);
                return (
                  <div key={p.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-2.5">
                    {images.length > 0 ? (
                      <img src={images[0]} className="w-14 h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0" alt={p.name} />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 flex-shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      {p.price && <p className="text-xs text-[#FF6B00] font-medium mt-0.5">{p.price}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditProduct(p)} className="text-xs text-gray-500">编辑</button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="text-xs text-red-500">删除</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
