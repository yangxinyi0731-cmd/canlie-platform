import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { talentsApi, refApi, uploadApi } from '../api';
import type { Cuisine, BusinessType, Talent, Verification } from '../types';
import { useAuthStore } from '../stores/authStore';

export default function EditTalentProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');
  const { updateUser, user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);

  // Personal info
  const [realName, setRealName] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');

  // Career
  const [title, setTitle] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [workYears, setWorkYears] = useState('');
  const [education, setEducation] = useState('');

  // Salary
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');

  // Selections
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);

  // Self intro
  const [selfIntro, setSelfIntro] = useState('');

  // Privacy
  const [privacyMode, setPrivacyMode] = useState('REAL_NAME');
  const [contactPrivacy, setContactPrivacy] = useState('PUBLIC');

  // Partnership
  const [acceptPartner, setAcceptPartner] = useState(false);

  // Verification
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [refName, setRefName] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [refPhone, setRefPhone] = useState('');

  // Refs for section scrolling
  const privacyRef = useRef<HTMLDivElement>(null);
  const verificationRef = useRef<HTMLDivElement>(null);

  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊'];
  const educationOptions = ['高中', '中专', '大专', '本科', '硕士', '博士'];
  const privacyOptions = [
    { value: 'REAL_NAME', label: '实名认证', desc: '展示真实姓名和完整资料，获得更多企业信任' },
    { value: 'ANONYMOUS', label: '匿名展示', desc: '隐藏真实姓名，用"匿名人才"展示，企业仍可联系您' },
  ];
  const contactOptions = [
    { value: 'PUBLIC', label: '公开' },
    { value: 'VERIFIED_ONLY', label: '仅认证企业' },
    { value: 'PRIVATE', label: '不公开' },
  ];
  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 50 }, (_, i) => currentYear - i - 18).filter((y) => y >= 1960);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, refRes] = await Promise.all([
          talentsApi.getProfile(),
          refApi.getAll(),
        ]);

        const talent: Talent = profileRes.data;
        setRealName(talent.realName || '');
        setGender(talent.gender || '');
        setBirthYear(talent.birthYear?.toString() || '');
        setCity(talent.city || '');
        setTitle(talent.title || '');
        setCurrentCompany(talent.currentCompany || '');
        setWorkYears(talent.workYears?.toString() || '');
        setEducation(talent.education || '');
        setMinSalary(talent.minSalary?.toString() || '');
        setMaxSalary(talent.maxSalary?.toString() || '');
        setSelectedCuisines(talent.cuisineIds ? talent.cuisineIds.split(',').filter(Boolean) : []);
        setSelectedBusinessTypes(talent.businessTypeIds ? talent.businessTypeIds.split(',').filter(Boolean) : []);
        setSelfIntro(talent.selfIntro || '');
        setPrivacyMode(talent.privacyMode || 'REAL_NAME');
        setContactPrivacy(talent.contactPrivacy || 'PUBLIC');
        setAcceptPartner(talent.acceptPartner || false);

        setCuisines(refRes.data.cuisines || []);
        setBusinessTypes(refRes.data.businessTypes || []);
      } catch {
        setError('加载个人信息失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load verifications
  useEffect(() => {
    (async () => {
      setVerificationLoading(true);
      try {
        const res = await talentsApi.getVerifications();
        setVerifications(res.data || []);
      } catch { /* ignore */ } finally {
        setVerificationLoading(false);
      }
    })();
  }, []);

  // Scroll to section from query param
  useEffect(() => {
    if (!section) return;
    const timer = setTimeout(() => {
      if (section === 'privacy' && privacyRef.current) {
        privacyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (section === 'verification' && verificationRef.current) {
        verificationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [section]);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleBusinessType = (id: string) => {
    setSelectedBusinessTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    const payload: Record<string, any> = {
      realName: realName.trim() || undefined,
      gender: gender || undefined,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      city: city || undefined,
      title: title.trim() || undefined,
      currentCompany: currentCompany.trim() || undefined,
      workYears: workYears ? parseInt(workYears) : undefined,
      education: education || undefined,
      minSalary: minSalary ? parseInt(minSalary) : undefined,
      maxSalary: maxSalary ? parseInt(maxSalary) : undefined,
      cuisineIds: selectedCuisines.join(',') || undefined,
      businessTypeIds: selectedBusinessTypes.join(',') || undefined,
      selfIntro: selfIntro.trim() || undefined,
      privacyMode,
      contactPrivacy,
      acceptPartner,
    };

    try {
      const res = await talentsApi.updateProfile(payload);
      // Update the user store with the new profile data
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

  // Submit reference verification
  const handleSubmitReference = async () => {
    if (!refName || !refTitle || !refPhone) {
      setError('请填写完整的推荐人信息');
      return;
    }
    if (!/^1\d{10}$/.test(refPhone)) {
      setError('推荐人手机号格式不正确');
      return;
    }
    try {
      setError('');
      const res = await talentsApi.addVerification({
        type: 'REFERENCE',
        refName,
        refTitle,
        refPhone,
      });
      setVerifications((prev) => [res.data, ...prev]);
      setRefName('');
      setRefTitle('');
      setRefPhone('');
      setSuccess('推荐人认证提交成功');
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败');
    }
  };

  // Upload certificate file
  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const uploadRes = await uploadApi.upload(file);
      const res = await talentsApi.addVerification({
        type: 'CERTIFICATE',
        certFileUrl: uploadRes.data.url,
      });
      setVerifications((prev) => [res.data, ...prev]);
      setSuccess('离职证明上传成功');
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
    }
  };

  // Upload salary flow file
  const handleUploadSalary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const uploadRes = await uploadApi.upload(file);
      const res = await talentsApi.addVerification({
        type: 'SALARY_FLOW',
        salaryFileUrl: uploadRes.data.url,
      });
      setVerifications((prev) => [res.data, ...prev]);
      setSuccess('工资流水上传成功');
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold flex-1">编辑个人资料</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm text-[#FF6B00] font-medium disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          {success}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 pb-8">
        {/* Personal Info Section */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人信息
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">真实姓名</label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="请输入真实姓名"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">性别</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  <option value="">请选择</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">出生年份</label>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  <option value="">请选择</option>
                  {birthYears.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
            </div>
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
          </div>
        </div>

        {/* Career Info Section */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            职业信息
          </h2>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">当前职位</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="如：行政总厨"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">当前公司</label>
                <input
                  type="text"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="公司名称"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">工作年限</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={workYears}
                  onChange={(e) => setWorkYears(e.target.value)}
                  placeholder="如：5"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">学历</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  <option value="">请选择</option>
                  {educationOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Section */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            期望薪资
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">最低期望 (元/月)</label>
              <input
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder="如：20000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最高期望 (元/月)</label>
              <input
                type="number"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                placeholder="如：50000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Cuisine & Business Type */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            专业领域
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">菜系专长</label>
              <div className="flex flex-wrap gap-2">
                {cuisines.filter((c) => c.level === 1).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCuisine(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedCuisines.includes(c.id)
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF6B00]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {cuisines.length === 0 && (
                  <span className="text-xs text-gray-400">加载中...</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">业态经验</label>
              <div className="flex flex-wrap gap-2">
                {businessTypes.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => toggleBusinessType(bt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedBusinessTypes.includes(bt.id)
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF6B00]'
                    }`}
                  >
                    {bt.name}
                  </button>
                ))}
                {businessTypes.length === 0 && (
                  <span className="text-xs text-gray-400">加载中...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Self Introduction */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            自我介绍
          </h2>
          <textarea
            value={selfIntro}
            onChange={(e) => setSelfIntro(e.target.value)}
            placeholder="请简要介绍你的职业经历、核心优势和成就..."
            rows={5}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5 text-right">{selfIntro.length} / 500</p>
        </div>

        {/* Privacy Settings */}
        <div ref={privacyRef} className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            隐私设置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">隐私模式</label>
              <div className="space-y-2">
                {privacyOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      privacyMode === opt.value
                        ? 'border-[#FF6B00] bg-orange-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div>
                      <span className="text-sm text-gray-800">{opt.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                    <input
                      type="radio"
                      name="privacyMode"
                      value={opt.value}
                      checked={privacyMode === opt.value}
                      onChange={(e) => setPrivacyMode(e.target.value)}
                      className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">联系方式可见性</label>
              <div className="grid grid-cols-3 gap-2">
                {contactOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContactPrivacy(opt.value)}
                    className={`py-2 rounded-lg text-xs border transition-colors ${
                      contactPrivacy === opt.value
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF6B00]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Materials */}
        <div ref={verificationRef} className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            认证材料
          </h2>
          <p className="text-xs text-gray-400 mb-4">平台要求实名认证，请上传以下任意一种材料（建议至少上传2种以提高可信度）</p>

          {/* Existing verifications */}
          {verifications.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium">已提交的认证材料：</p>
              {verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">
                      {v.type === 'REFERENCE' ? '推荐人背调' : v.type === 'CERTIFICATE' ? '离职证明' : '工资流水'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      v.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      v.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {v.status === 'VERIFIED' ? '已通过' : v.status === 'REJECTED' ? '已驳回' : '审核中'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Option 1: Reference */}
          <div className="border border-gray-100 rounded-lg p-4 mb-3">
            <h3 className="text-sm font-medium text-gray-800 mb-3">① 推荐人背调</h3>
            <p className="text-xs text-gray-400 mb-3">提供上级/前任老板的姓名、职位和联系电话，平台将进行背景调查</p>
            <div className="space-y-3">
              <input
                type="text"
                value={refName}
                onChange={(e) => setRefName(e.target.value)}
                placeholder="推荐人姓名"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
              <input
                type="text"
                value={refTitle}
                onChange={(e) => setRefTitle(e.target.value)}
                placeholder="推荐人职位（如：行政总厨）"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
              <input
                type="text"
                value={refPhone}
                onChange={(e) => setRefPhone(e.target.value)}
                placeholder="推荐人联系电话"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
              <button
                type="button"
                onClick={handleSubmitReference}
                className="w-full py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e86000] transition-colors"
              >
                提交推荐人信息
              </button>
            </div>
          </div>

          {/* Option 2: Certificate */}
          <div className="border border-gray-100 rounded-lg p-4 mb-3">
            <h3 className="text-sm font-medium text-gray-800 mb-3">② 离职/在职证明</h3>
            <p className="text-xs text-gray-400 mb-3">上传企业开具的离职证明或在职证明（支持 jpg/png/pdf，不超过 10MB）</p>
            <label className="block w-full py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
              <span>点击上传证明文件</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadCert} className="hidden" />
            </label>
          </div>

          {/* Option 3: Salary Flow */}
          <div className="border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-3">③ 工资流水</h3>
            <p className="text-xs text-gray-400 mb-3">上传连续3个月以上的工资流水或收入证明（支持 jpg/png/pdf，不超过 10MB）</p>
            <label className="block w-full py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
              <span>点击上传工资流水</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadSalary} className="hidden" />
            </label>
          </div>
        </div>

        {/* Partnership Toggle */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            合伙/投资机会
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">接受合伙/投资引荐</p>
              <p className="text-xs text-gray-400 mt-0.5">开启后，企业可向您发送合伙或投资邀请</p>
            </div>
            <button
              type="button"
              onClick={() => setAcceptPartner(!acceptPartner)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                acceptPartner ? 'bg-[#FF6B00]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  acceptPartner ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium text-sm hover:bg-[#e86000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          保存资料
        </button>
      </div>
    </div>
  );
}
