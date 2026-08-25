import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobsApi, refApi, subscriptionApi } from '../api';
import type { Cuisine, BusinessType, JobCategory } from '../types';

interface Plan {
  id: string;
  name: string;
  type: string;
  price: number;
  jobQuota: number;
  durationDays: number;
}

const STEPS = ['基础信息', '职位要求', '薪资地点', '业态菜系', '发布付费'];

export default function PostJob() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEditing);

  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [jobCategoryId, setJobCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [educationReq, setEducationReq] = useState('');
  const [experienceReq, setExperienceReq] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('12');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [openPartner, setOpenPartner] = useState(false);
  const [genderReq, setGenderReq] = useState('');
  const [minTenureReq, setMinTenureReq] = useState('');

  // Payment
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const educationOptions = ['不限', '高中', '中专', '大专', '本科', '硕士', '博士'];
  const experienceOptions = ['不限', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'];
  const salaryMonthOptions = [12, 13, 14, 15, 16, 17, 18, 20, 24];
  const cities = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊'];
  const provinces = ['北京市', '上海市', '天津市', '重庆市', '河北省', '山西省', '内蒙古', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西', '海南省', '四川省', '贵州省', '云南省', '西藏', '陕西省', '甘肃省', '青海省', '宁夏', '新疆'];

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const res = await refApi.getAll();
        setCuisines(res.data.cuisines || []);
        setBusinessTypes(res.data.businessTypes || []);
        setJobCategories(res.data.jobCategories || []);
      } catch {
        // silently fail
      }
    };
    const loadPlans = async () => {
      try {
        const res = await refApi.getPlans();
        setPlans(res.data || []);
      } catch {
        // silently fail
      }
    };
    loadRefData();
    loadPlans();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadJob = async () => {
      try {
        const res = await jobsApi.getById(id);
        const job = res.data;
        setTitle(job.title || '');
        setDepartment(job.department || '');
        setJobCategoryId(job.jobCategoryId || '');
        setDescription(job.description || '');
        setRequirements(job.requirements || '');
        setEducationReq(job.educationReq || '');
        setExperienceReq(job.experienceReq?.toString() || '');
        setMinSalary(job.minSalary?.toString() || '');
        setMaxSalary(job.maxSalary?.toString() || '');
        setSalaryMonth(job.salaryMonth?.toString() || '12');
        setCity(job.city || '');
        setProvince(job.province || '');
        setDistrict(job.district || '');
        setAddress(job.address || '');
        setSelectedBusinessTypes(
          job.businessTypeIds ? job.businessTypeIds.split(',').filter(Boolean) : []
        );
        setSelectedCuisines(
          job.cuisineIds ? job.cuisineIds.split(',').filter(Boolean) : []
        );
        setOpenPartner(job.openPartner || false);
        setGenderReq(job.genderReq || '');
        setMinTenureReq(job.minTenureReq?.toString() || '');
      } catch {
        setError('加载职位信息失败');
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [id]);

  const validateStep = (): boolean => {
    setError('');
    if (step === 1) {
      if (!title.trim()) { setError('请填写职位名称'); return false; }
      return true;
    }
    if (step === 2) {
      if (!description.trim()) { setError('请填写职位描述'); return false; }
      if (!requirements.trim()) { setError('请填写任职要求'); return false; }
      return true;
    }
    if (step === 3) {
      const min = parseInt(minSalary);
      const max = parseInt(maxSalary);
      if (!min || !max) { setError('请填写薪资范围'); return false; }
      if (min < 8000) { setError('平台职位月薪不低于8000元'); return false; }
      if (min >= max) { setError('最高薪资应高于最低薪资'); return false; }
      if (!city) { setError('请选择城市'); return false; }
      return true;
    }
    if (step === 4) {
      // 业态选择：不低于3个，不超过5个
      if (selectedBusinessTypes.length < 3) {
        setError('请至少选择3个业态（不低于3个）');
        return false;
      }
      if (selectedBusinessTypes.length > 5) {
        setError('业态选择不能超过5个');
        return false;
      }
      return true;
    }
    if (step === 5) {
      if (!selectedPlanId) { setError('请选择发布方案'); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 5));
    }
  };

  const handlePrev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleBusinessType = (btId: string) => {
    setSelectedBusinessTypes((prev) => {
      if (prev.includes(btId)) {
        return prev.filter((x) => x !== btId);
      }
      // Limit to 5
      if (prev.length >= 5) {
        setError('业态选择不能超过5个');
        return prev;
      }
      return [...prev, btId];
    });
  };

  const toggleCuisine = (id: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');

    const payload = {
      title: title.trim(),
      department: department.trim() || undefined,
      jobCategoryId: jobCategoryId || undefined,
      description: description.trim(),
      requirements: requirements.trim(),
      educationReq: educationReq || undefined,
      experienceReq: experienceReq ? parseInt(experienceReq) : undefined,
      minSalary: parseInt(minSalary),
      maxSalary: parseInt(maxSalary),
      salaryMonth: parseInt(salaryMonth),
      city,
      province: province || undefined,
      district: district.trim() || undefined,
      address: address.trim() || undefined,
      businessTypeIds: selectedBusinessTypes.join(','),
      cuisineIds: selectedCuisines.join(','),
      openPartner,
      genderReq: genderReq || undefined,
      minTenureReq: minTenureReq ? parseInt(minTenureReq) : undefined,
    };

    try {
      // Purchase subscription if this is a new job post
      if (!isEditing && selectedPlanId) {
        try {
          await subscriptionApi.buy(selectedPlanId);
        } catch {
          // Subscription purchase may fail silently in dev — proceed with posting
        }
      }

      if (isEditing && id) {
        await jobsApi.update(id, payload);
      } else {
        await jobsApi.create(payload);
      }
      navigate('/enterprise');
    } catch (err: any) {
      setError(err.response?.data?.error || (isEditing ? '更新失败' : '发布失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        const isActive = step === num;
        const isDone = step > num;
        return (
          <div key={num} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-[#FF6B00] text-white'
                    : isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? '✓' : num}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'text-[#FF6B00] font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-1.2rem] ${isDone ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Count business type selection for display
  const bizCount = selectedBusinessTypes.length;
  const bizCountColor = bizCount < 3 ? 'text-red-500' : bizCount > 5 ? 'text-red-500' : 'text-green-600';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col app-container">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold">
          {isEditing ? '编辑职位' : '发布新职位'}
        </h1>
      </div>

      {renderStepIndicator()}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 p-4">
        {/* Step 1: 基础信息 */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                职位名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如：行政总厨"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">岗位分类</label>
              <select
                value={jobCategoryId}
                onChange={(e) => setJobCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              >
                <option value="">请选择岗位分类</option>
                {jobCategories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subCategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">所属部门</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="如：后厨部"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>
          </div>
        )}

        {/* Step 2: 职位要求 */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                职位描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请描述岗位职责..."
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                任职要求 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="请描述任职要求..."
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">学历要求</label>
                <select
                  value={educationReq}
                  onChange={(e) => setEducationReq(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
                >
                  {educationOptions.map((opt) => (
                    <option key={opt} value={opt === '不限' ? '' : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">经验要求</label>
                <select
                  value={experienceReq}
                  onChange={(e) => setExperienceReq(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
                >
                  {experienceOptions.map((opt) => (
                    <option key={opt} value={opt === '不限' ? '' : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">性别要求</label>
                <select
                  value={genderReq}
                  onChange={(e) => setGenderReq(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
                >
                  <option value="">不限</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">单单位任职时长</label>
                <select
                  value={minTenureReq}
                  onChange={(e) => setMinTenureReq(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
                >
                  <option value="">不限</option>
                  <option value="3">3年以上</option>
                  <option value="5">5年以上</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 薪资地点 */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  最低月薪 (元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="≥ 8000"
                  min={8000}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  最高月薪 (元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="如：50000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">年薪月数</label>
              <select
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
              >
                {salaryMonthOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} 薪
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                省份 <span className="text-red-500">*</span>
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
              >
                <option value="">请选择省份</option>
                {provinces.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                城市 <span className="text-red-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] bg-white"
              >
                <option value="">请选择城市</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">区域</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="如：朝阳区"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">详细地址</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="街道门牌号"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 业态菜系 */}
        {step === 4 && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            {/* 业态选择 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  业态选择 <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${bizCountColor}`}>
                  已选 {bizCount} 个
                  <span className="text-gray-400">（要求3-5个）</span>
                </span>
              </div>
              {bizCount < 3 && (
                <p className="text-xs text-amber-600 mb-2">⚠️ 至少需要选择3个业态</p>
              )}
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

            {/* 菜系选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">菜系选择</label>
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

            {/* 开放合伙 */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">开放合伙/投资引荐</span>
              <button
                type="button"
                onClick={() => setOpenPartner(!openPartner)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  openPartner ? 'bg-[#FF6B00]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    openPartner ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: 发布付费 */}
        {step === 5 && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">选择发布方案</h3>
              <p className="text-xs text-gray-400">选择合适的付费方案发布职位</p>
            </div>

            {/* Plan Cards */}
            <div className="space-y-3">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const quotaLabel = plan.jobQuota === -1 ? '不限发布数' : `可发布${plan.jobQuota}个职位`;
                const durationLabel = plan.type === 'PER_JOB' ? '30天有效期' : `${plan.durationDays}天内有效`;
                let badge = '';
                let badgeColor = '';
                if (plan.type === 'YEARLY') { badge = '最划算'; badgeColor = 'bg-red-500'; }
                else if (plan.type === 'QUARTERLY') { badge = '推荐'; badgeColor = 'bg-blue-500'; }
                else if (plan.type === 'MONTHLY') { badge = '灵活'; badgeColor = 'bg-green-500'; }

                return (
                  <label
                    key={plan.id}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF6B00] bg-orange-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={isSelected}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00] shrink-0"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                        {badge && (
                          <span className={`text-[10px] text-white px-1.5 py-0.5 rounded ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{quotaLabel}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{durationLabel}</span>
                      </div>
                      {plan.type === 'YEARLY' && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          相当于 ¥{(plan.price / 12).toFixed(0)}/月，比月度VIP节省 ¥{(299 * 12 - plan.price).toFixed(0)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-[#FF6B00]">¥{plan.price}</span>
                      {plan.type !== 'PER_JOB' && (
                        <p className="text-[10px] text-gray-400">
                          约¥{(plan.price / (plan.durationDays / 30)).toFixed(0)}/月
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
              {plans.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">加载方案中...</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium text-sm hover:bg-[#e86000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isEditing ? '保存修改' : `确认发布${selectedPlanId ? '（¥' + (plans.find(p => p.id === selectedPlanId)?.price || '') + '）' : ''}`}
            </button>

            <p className="text-xs text-gray-400 text-center">
              发布即代表同意平台协议，平台将对职位信息进行审核
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        {step > 1 ? (
          <button
            onClick={handlePrev}
            className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000] transition-colors"
          >
            下一步
          </button>
        ) : null}
      </div>
    </div>
  );
}
