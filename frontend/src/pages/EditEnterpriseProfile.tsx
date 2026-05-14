import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterpriseApi, uploadApi } from '../api';
import type { Enterprise } from '../types';
import { useAuthStore } from '../stores/authStore';

const companySizes = ['1-50人', '50-200人', '200-500人', '500-2000人', '2000人以上'];
const revenues = ['100万以下', '100-500万', '500-1000万', '1000-5000万', '5000万以上'];

const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊'];

export default function EditEnterpriseProfile() {
  const navigate = useNavigate();
  const { updateUser, user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [revenue, setRevenue] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [licenseVerified, setLicenseVerified] = useState(false);
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await enterpriseApi.getProfile();
        const ent: Enterprise = res.data;
        setCompanyName(ent.companyName || '');
        setCompanyLogo(ent.companyLogo || '');
        setBusinessLicense(ent.businessLicense || '');
        setCompanySize(ent.companySize || '');
        setRevenue(ent.revenue || '');
        setDescription(ent.description || '');
        setAddress(ent.address || '');
        setCity(ent.city || '');
        setWebsite(ent.website || '');
        setContactName(ent.contactName || '');
        setContactPhone(ent.contactPhone || '');
        setLicenseVerified(ent.licenseVerified);
        setStatus(ent.status);
      } catch {
        setError('加载企业信息失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const res = await uploadApi.upload(file);
      setCompanyLogo(res.data.url);
      setSuccess('Logo上传成功');
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
    }
  };

  const handleUploadLicense = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const res = await uploadApi.upload(file);
      setBusinessLicense(res.data.url);
      setSuccess('营业执照上传成功，等待平台审核');
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      setError('请填写企业名称');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await enterpriseApi.updateProfile({
        companyName: companyName.trim(),
        companyLogo,
        businessLicense,
        companySize,
        revenue,
        description: description.trim(),
        address: address.trim(),
        city,
        website: website.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
      });
      if (user) {
        updateUser({ ...user, profile: res.data });
      }
      setSuccess('保存成功');
      setTimeout(() => navigate(-1), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center app-container">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold flex-1">企业信息</h1>
        <button onClick={handleSave} disabled={saving} className="text-sm text-[#FF6B00] font-medium disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Messages */}
      {error && <div className="mx-4 mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
      {success && (
        <div className="mx-4 mt-3 bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          {success}
        </div>
      )}

      {/* Verification Status Banner */}
      <div className="mx-4 mt-3">
        {status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-700">企业信息待审核</p>
              <p className="text-xs text-yellow-600">请上传营业执照，等待平台审核通过后即可发布职位</p>
            </div>
          </div>
        )}
        {status === 'APPROVED' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-700">企业已认证</p>
              <p className="text-xs text-green-600">您可以正常发布职位和招聘人才</p>
            </div>
          </div>
        )}
        {status === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">审核未通过</p>
              <p className="text-xs text-red-600">请检查营业执照是否清晰有效，重新上传</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-4 pb-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">基本信息</h2>
          <div className="space-y-3.5">
            {/* Logo */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">企业Logo</label>
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                <label className="text-xs text-[#FF6B00] cursor-pointer hover:underline">
                  上传Logo
                  <input type="file" accept=".jpg,.jpeg,.png" onChange={handleUploadLogo} className="hidden" />
                </label>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">企业名称 *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="请输入企业全称"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">所在城市</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              >
                <option value="">请选择城市</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">详细地址</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="企业详细地址"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Business License */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            营业执照
          </h2>
          <p className="text-xs text-gray-400 mb-3">上传营业执照照片或扫描件（支持 jpg/png/pdf，不超过 10MB）</p>

          {businessLicense ? (
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
                {businessLicense.endsWith('.pdf') ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                ) : (
                  <img src={businessLicense} alt="营业执照" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  licenseVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {licenseVerified ? '已认证' : '待审核'}
                </span>
                <label className="block mt-2 text-xs text-[#FF6B00] cursor-pointer hover:underline">
                  重新上传
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadLicense} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="block w-full py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition-colors">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" className="mx-auto mb-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-sm text-gray-500">点击上传营业执照</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadLicense} className="hidden" />
            </label>
          )}
        </div>

        {/* Company Details */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">企业规模</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">员工规模</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              >
                <option value="">请选择</option>
                {companySizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">年营业额</label>
              <select
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              >
                <option value="">请选择</option>
                {revenues.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">企业简介</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请简要介绍企业背景、主营业务、企业文化等..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none"
          />
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">联系方式</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">联系人</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="联系人姓名"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">联系电话</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="联系电话"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">企业官网</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium text-sm hover:bg-[#e86000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          保存信息
        </button>
      </div>
    </div>
  );
}