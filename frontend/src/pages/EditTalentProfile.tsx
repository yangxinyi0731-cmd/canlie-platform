import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { talentsApi, refApi, uploadApi } from '../api';
import type { Cuisine, BusinessType, Talent, Verification, WorkExperience, JobCategory } from '../types';
import { useAuthStore } from '../stores/authStore';

interface WorkExpForm {
  id?: string;
  companyName: string;
  position: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrent: boolean;
  description: string;
  bgRefName: string;
  bgRefTitle: string;
  bgRefPhone: string;
}

const emptyWorkExp = (): WorkExpForm => ({
  companyName: '', position: '', startYear: '', startMonth: '',
  endYear: '', endMonth: '', isCurrent: false, description: '',
  bgRefName: '', bgRefTitle: '', bgRefPhone: '',
});

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

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
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);

  // Personal info
  const [realName, setRealName] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [hometown, setHometown] = useState('');
  const [hometownProvince, setHometownProvince] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');

  // Career
  const [title, setTitle] = useState('');
  const [jobCategoryId, setJobCategoryId] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [workYears, setWorkYears] = useState('');
  const [education, setEducation] = useState('');

  // Salary
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');

  // Selections
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);

  // Self intro, brand, etc.
  const [selfIntro, setSelfIntro] = useState('');
  const [brandEndorsement, setBrandEndorsement] = useState('');
  const [headBrandExp, setHeadBrandExp] = useState('');
  const [projectExp, setProjectExp] = useState('');
  const [projectExpDetail, setProjectExpDetail] = useState('');
  const [preferredBusinessModel, setPreferredBusinessModel] = useState('');
  // 人物画像 AI 维度字段
  const [parentInfo, setParentInfo] = useState('');
  const [learningAbility, setLearningAbility] = useState('');
  const [thinkingStyle, setThinkingStyle] = useState('');
  const [personalSkills, setPersonalSkills] = useState('');
  const [brandExperienceDetail, setBrandExperienceDetail] = useState('');

  // 简历完善度
  const [completeness, setCompleteness] = useState<{ totalScore: number; level: string; modules: any[] } | null>(null);

  // Privacy
  const [privacyMode, setPrivacyMode] = useState('REAL_NAME');
  const [contactPrivacy, setContactPrivacy] = useState('PUBLIC');
  const [acceptPartner, setAcceptPartner] = useState(false);

  // Work experiences
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [showWorkExpForm, setShowWorkExpForm] = useState(false);
  const [editingWorkExpIndex, setEditingWorkExpIndex] = useState<number | null>(null);
  const [workExpForm, setWorkExpForm] = useState<WorkExpForm>(emptyWorkExp());

  // Verification
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [refName, setRefName] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [refPhone, setRefPhone] = useState('');

  // Show work exp list or form
  const [showExpList, setShowExpList] = useState(true);

  // Refs for section scrolling
  const privacyRef = useRef<HTMLDivElement>(null);
  const verificationRef = useRef<HTMLDivElement>(null);
  const workExpRef = useRef<HTMLDivElement>(null);

  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊'];
  const provinces = ['北京市', '上海市', '天津市', '重庆市', '河北省', '山西省', '内蒙古', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西', '海南省', '四川省', '贵州省', '云南省', '西藏', '陕西省', '甘肃省', '青海省', '宁夏', '新疆'];
  const educationOptions = ['高中', '中专', '大专', '本科', '硕士', '博士'];
  const birthYears = Array.from({ length: 50 }, (_, i) => currentYear - i - 16).filter(y => y >= 1960);

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
        setBirthMonth(talent.birthMonth?.toString() || '');
        setIdNumber(talent.idNumber || '');
        setPhone(talent.phone || '');
        setEmail(talent.email || '');
        setCity(talent.city || '');
        setProvince(talent.province || '');
        setHometown(talent.hometown || '');
        setHometownProvince(talent.hometownProvince || '');
        setMaritalStatus(talent.maritalStatus || '');
        setTitle(talent.title || '');
        setJobCategoryId(talent.jobCategoryId || '');
        setCurrentCompany(talent.currentCompany || '');
        setWorkYears(talent.workYears?.toString() || '');
        setEducation(talent.education || '');
        setMinSalary(talent.minSalary?.toString() || '');
        setMaxSalary(talent.maxSalary?.toString() || '');
        setSelectedCuisines(talent.cuisineIds ? talent.cuisineIds.split(',').filter(Boolean) : []);
        setSelectedBusinessTypes(talent.businessTypeIds ? talent.businessTypeIds.split(',').filter(Boolean) : []);
        setSelfIntro(talent.selfIntro || '');
        setBrandEndorsement(talent.brandEndorsement || '');
        setHeadBrandExp(talent.headBrandExp || '');
        setProjectExp(talent.projectExp || '');
        setProjectExpDetail(talent.projectExpDetail || '');
        setPreferredBusinessModel(talent.preferredBusinessModel || '');
        setParentInfo((talent as any).parentInfo || '');
        setLearningAbility((talent as any).learningAbility || '');
        setThinkingStyle((talent as any).thinkingStyle || '');
        setPersonalSkills((talent as any).personalSkills || '');
        setBrandExperienceDetail((talent as any).brandExperienceDetail || '');
        setPrivacyMode(talent.privacyMode || 'REAL_NAME');
        setContactPrivacy(talent.contactPrivacy || 'PUBLIC');
        setAcceptPartner(talent.acceptPartner || false);
        setWorkExperiences(talent.workExperiences || []);

        setCuisines(refRes.data.cuisines || []);
        setBusinessTypes(refRes.data.businessTypes || []);
        setJobCategories(refRes.data.jobCategories || []);

        // 加载简历完善度（失败不影响主流程）
        talentsApi.getCompleteness().then((r) => setCompleteness(r.data)).catch(() => {});
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
      try {
        const res = await talentsApi.getVerifications();
        setVerifications(res.data || []);
      } catch { /* ignore */ }
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
      } else if (section === 'experience' && workExpRef.current) {
        workExpRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [section]);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBusinessType = (id: string) => {
    setSelectedBusinessTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ====== Work Experience Handlers ======
  const handleOpenWorkExpForm = (index?: number) => {
    if (index !== undefined && workExperiences[index]) {
      const exp = workExperiences[index];
      setWorkExpForm({
        id: exp.id,
        companyName: exp.companyName || '',
        position: exp.position,
        startYear: exp.startYear.toString(),
        startMonth: exp.startMonth.toString(),
        endYear: exp.endYear?.toString() || '',
        endMonth: exp.endMonth?.toString() || '',
        isCurrent: exp.isCurrent,
        description: exp.description || '',
        bgRefName: exp.bgRefName || '',
        bgRefTitle: exp.bgRefTitle || '',
        bgRefPhone: exp.bgRefPhone || '',
      });
      setEditingWorkExpIndex(index);
    } else {
      setWorkExpForm(emptyWorkExp());
      setEditingWorkExpIndex(null);
    }
    setShowExpList(false);
  };

  const handleSaveWorkExp = async () => {
    const { companyName, position, startYear, startMonth, endYear, endMonth, isCurrent, description, bgRefName, bgRefTitle, bgRefPhone } = workExpForm;
    if (!companyName.trim() || !position.trim() || !startYear || !startMonth) {
      setError('请填写完整的公司名称、职位和起始时间');
      return;
    }

    const payload = {
      companyName: companyName.trim(),
      position: position.trim(),
      startYear: parseInt(startYear),
      startMonth: parseInt(startMonth),
      endYear: isCurrent ? undefined : (endYear ? parseInt(endYear) : undefined),
      endMonth: isCurrent ? undefined : (endMonth ? parseInt(endMonth) : undefined),
      isCurrent,
      description: description.trim() || undefined,
      bgRefName: bgRefName.trim() || undefined,
      bgRefTitle: bgRefTitle.trim() || undefined,
      bgRefPhone: bgRefPhone.trim() || undefined,
    };

    try {
      if (editingWorkExpIndex !== null && workExpForm.id) {
        const res = await talentsApi.updateWorkExperience(workExpForm.id, payload);
        const updated = [...workExperiences];
        updated[editingWorkExpIndex] = res.data;
        setWorkExperiences(updated);
        setSuccess('工作经历更新成功');
      } else {
        const res = await talentsApi.addWorkExperience(payload);
        setWorkExperiences(prev => [res.data, ...prev]);
        setSuccess('工作经历添加成功');
      }
      setShowExpList(true);
      setWorkExpForm(emptyWorkExp());
      setEditingWorkExpIndex(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '操作失败');
    }
  };

  const handleDeleteWorkExp = async (index: number) => {
    const exp = workExperiences[index];
    if (!exp.id) return;
    if (!confirm('确定删除这条工作经历吗？')) return;

    try {
      await talentsApi.deleteWorkExperience(exp.id);
      setWorkExperiences(prev => prev.filter((_, i) => i !== index));
      setSuccess('工作经历已删除');
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
    }
  };

  const formatDateRange = (exp: WorkExperience) => {
    const start = `${exp.startYear}年${exp.startMonth}月`;
    const end = exp.isCurrent ? '至今' : (exp.endYear ? `${exp.endYear}年${exp.endMonth}月` : '');
    return `${start} - ${end}`;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    const payload: Record<string, any> = {
      realName: realName.trim() || undefined,
      gender: gender || undefined,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      birthMonth: birthMonth ? parseInt(birthMonth) : undefined,
      idNumber: idNumber.trim() || undefined,
      email: email.trim() || undefined,
      city: city || undefined,
      province: province || undefined,
      hometown: hometown.trim() || undefined,
      hometownProvince: hometownProvince || undefined,
      maritalStatus: maritalStatus || undefined,
      title: title.trim() || undefined,
      jobCategoryId: jobCategoryId || undefined,
      currentCompany: currentCompany.trim() || undefined,
      workYears: workYears ? parseInt(workYears) : undefined,
      education: education || undefined,
      minSalary: minSalary ? parseInt(minSalary) : undefined,
      maxSalary: maxSalary ? parseInt(maxSalary) : undefined,
      cuisineIds: selectedCuisines.join(',') || undefined,
      businessTypeIds: selectedBusinessTypes.join(',') || undefined,
      selfIntro: selfIntro.trim() || undefined,
      brandEndorsement: brandEndorsement.trim() || undefined,
      headBrandExp: headBrandExp.trim() || undefined,
      projectExp: projectExp.trim() || undefined,
      projectExpDetail: projectExpDetail.trim() || undefined,
      preferredBusinessModel: preferredBusinessModel.trim() || undefined,
      parentInfo: parentInfo.trim() || undefined,
      learningAbility: learningAbility.trim() || undefined,
      thinkingStyle: thinkingStyle.trim() || undefined,
      personalSkills: personalSkills.trim() || undefined,
      brandExperienceDetail: brandExperienceDetail.trim() || undefined,
      privacyMode,
      contactPrivacy,
      acceptPartner,
    };

    try {
      const res = await talentsApi.updateProfile(payload);
      if (user) {
        updateUser({ ...user, profile: res.data });
      }
      setSuccess('保存成功');
      // 保存后刷新完善度
      talentsApi.getCompleteness().then((r) => setCompleteness(r.data)).catch(() => {});
      setTimeout(() => navigate(-1), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '保存失败');
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
      const res = await talentsApi.addVerification({ type: 'REFERENCE', refName, refTitle, refPhone });
      setVerifications(prev => [res.data, ...prev]);
      setRefName(''); setRefTitle(''); setRefPhone('');
      setSuccess('推荐人认证提交成功');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '提交失败');
    }
  };

  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const uploadRes = await uploadApi.upload(file, 'TALENT_CERTIFICATE');
      const res = await talentsApi.addVerification({ type: 'CERTIFICATE', certFileUrl: uploadRes.data.url });
      setVerifications(prev => [res.data, ...prev]);
      setSuccess('离职证明上传成功');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '上传失败');
    }
  };

  const handleUploadSalary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const uploadRes = await uploadApi.upload(file, 'TALENT_SALARY_PROOF');
      const res = await talentsApi.addVerification({ type: 'SALARY_FLOW', salaryFileUrl: uploadRes.data.url });
      setVerifications(prev => [res.data, ...prev]);
      setSuccess('工资流水上传成功');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '上传失败');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const level1Cuisines = cuisines.filter(c => c.level === 1);

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

      <div className="flex-1 p-4 space-y-4 pb-8">
        {/* ====== 简历完善度 ====== */}
        {completeness && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                简历完善度
              </h2>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${completeness.totalScore >= 90 ? 'text-green-600' : completeness.totalScore >= 70 ? 'text-[#FF6B00]' : 'text-red-500'}`}>{completeness.totalScore}</span>
                <span className="text-xs text-gray-400">/ 100 · {completeness.level}</span>
              </div>
            </div>
            {/* 总进度条 */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completeness.totalScore >= 90 ? 'bg-green-500' : completeness.totalScore >= 70 ? 'bg-[#FF6B00]' : 'bg-red-400'}`}
                style={{ width: `${Math.max(3, completeness.totalScore)}%` }}
              />
            </div>
            {/* 各模块明细 */}
            <div className="space-y-2">
              {completeness.modules.map((m: any) => (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{m.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.percent >= 80 ? 'bg-green-400' : m.percent >= 50 ? 'bg-[#FF6B00]' : 'bg-gray-300'}`}
                      style={{ width: `${Math.max(3, m.percent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-8 text-right">{m.score}/{m.max}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">完善度越高，AI 匹配越精准，企业关注度越高。填写上方各模块信息可提升完善度。</p>
          </div>
        )}

        {/* ====== Personal Info ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            个人信息
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">真实姓名</label>
              <input type="text" value={realName} onChange={e => setRealName(e.target.value)} placeholder="请输入真实姓名"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">性别</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">出生年份</label>
                <select value={birthYear} onChange={e => setBirthYear(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  {birthYears.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">出生月份</label>
                <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  {months.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">身份证号</label>
                <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="选填"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">手机号</label>
                <input type="text" value={phone} disabled
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="选填"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">所在省份</label>
                <select value={province} onChange={e => setProvince(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">所在城市</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择城市</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">籍贯省份</label>
                <select value={hometownProvince} onChange={e => setHometownProvince(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">籍贯城市</label>
                <input type="text" value={hometown} onChange={e => setHometown(e.target.value)} placeholder="选填"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">婚姻状况</label>
              <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                <option value="">请选择</option>
                <option value="SINGLE">未婚</option>
                <option value="MARRIED">已婚</option>
              </select>
            </div>
          </div>
        </div>

        {/* ====== Career Info ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
            职业信息
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">岗位分类</label>
              <select value={jobCategoryId} onChange={e => setJobCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                <option value="">请选择</option>
                {jobCategories.map(cat => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subCategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">当前职位</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="如：行政总厨"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">当前公司</label>
                <input type="text" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="公司名称"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">工作年限</label>
                <input type="number" min="0" max="50" value={workYears} onChange={e => setWorkYears(e.target.value)} placeholder="如：5"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">学历</label>
                <select value={education} onChange={e => setEducation(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                  <option value="">请选择</option>
                  {educationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Work Experience Timeline ====== */}
        <div ref={workExpRef} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" /><polyline points="17 5 12 0 7 5" /><polyline points="17 19 12 24 7 19" /></svg>
              工作经历
            </h2>
            {showExpList && (
              <button onClick={() => handleOpenWorkExpForm()} className="text-xs text-[#FF6B00] font-medium">
                + 添加经历
              </button>
            )}
          </div>

          {showExpList ? (
            workExperiences.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无工作经历</p>
            ) : (
              <div className="space-y-3">
                {workExperiences.map((exp, idx) => (
                  <div key={exp.id || idx} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{exp.position}</h4>
                        <p className="text-xs text-gray-600 mt-0.5">{exp.companyName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateRange(exp)}</p>
                        {exp.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{exp.description}</p>}
                        {exp.bgRefName && (
                          <p className="text-xs text-gray-400 mt-1">
                            背景调查：{exp.bgRefName} ({exp.bgRefTitle}) - 仅平台可见
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button onClick={() => handleOpenWorkExpForm(idx)} className="text-xs text-gray-400 hover:text-[#FF6B00]">编辑</button>
                        <button onClick={() => handleDeleteWorkExp(idx)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                      </div>
                    </div>
                    {exp.isCurrent && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full">现任</span>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Work Experience Form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">公司名称 *</label>
                <input type="text" value={workExpForm.companyName} onChange={e => setWorkExpForm(prev => ({ ...prev, companyName: e.target.value }))} placeholder="如：湘味轩餐饮集团"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">担任职务 *</label>
                <input type="text" value={workExpForm.position} onChange={e => setWorkExpForm(prev => ({ ...prev, position: e.target.value }))} placeholder="如：行政总厨"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={workExpForm.isCurrent} onChange={e => setWorkExpForm(prev => ({ ...prev, isCurrent: e.target.checked }))} className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00]" />
                  <span className="text-xs text-gray-600">至今仍在此公司</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">入职年份 *</label>
                  <select value={workExpForm.startYear} onChange={e => setWorkExpForm(prev => ({ ...prev, startYear: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                    <option value="">选择年份</option>
                    {years.map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">入职月份 *</label>
                  <select value={workExpForm.startMonth} onChange={e => setWorkExpForm(prev => ({ ...prev, startMonth: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                    <option value="">选择月份</option>
                    {months.map(m => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
              </div>
              {!workExpForm.isCurrent && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">离职年份</label>
                    <select value={workExpForm.endYear} onChange={e => setWorkExpForm(prev => ({ ...prev, endYear: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                      <option value="">选择年份</option>
                      {years.map(y => <option key={y} value={y}>{y}年</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">离职月份</label>
                    <select value={workExpForm.endMonth} onChange={e => setWorkExpForm(prev => ({ ...prev, endMonth: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]">
                      <option value="">选择月份</option>
                      {months.map(m => <option key={m} value={m}>{m}月</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">工作描述</label>
                <textarea value={workExpForm.description} onChange={e => setWorkExpForm(prev => ({ ...prev, description: e.target.value }))} placeholder="在此公司的职责和成就..."
                  rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
              </div>

              {/* Background Check Section - 隐私，仅平台可见 */}
              <div className="border-t border-gray-100 pt-3 mt-2">
                <h3 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  背景调查信息 <span className="text-[10px] text-gray-400 font-normal">(仅平台管理员可见)</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">调查人姓名</label>
                    <input type="text" value={workExpForm.bgRefName} onChange={e => setWorkExpForm(prev => ({ ...prev, bgRefName: e.target.value }))} placeholder="姓名"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">调查人职位</label>
                    <input type="text" value={workExpForm.bgRefTitle} onChange={e => setWorkExpForm(prev => ({ ...prev, bgRefTitle: e.target.value }))} placeholder="职位"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">联系电话</label>
                    <input type="text" value={workExpForm.bgRefPhone} onChange={e => setWorkExpForm(prev => ({ ...prev, bgRefPhone: e.target.value }))} placeholder="手机号"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowExpList(true); setWorkExpForm(emptyWorkExp()); setEditingWorkExpIndex(null); }} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button onClick={handleSaveWorkExp} className="flex-1 py-2 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e86000]">
                  {editingWorkExpIndex !== null ? '更新经历' : '添加经历'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ====== Salary ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            期望薪资
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">最低期望 (元/月)</label>
              <input type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)} placeholder="如：20000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最高期望 (元/月)</label>
              <input type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} placeholder="如：50000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
          </div>
        </div>

        {/* ====== Professional Area ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
            专业领域
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">菜系专长（一级菜系）</label>
              <div className="flex flex-wrap gap-2">
                {level1Cuisines.map(c => (
                  <button key={c.id} type="button" onClick={() => toggleCuisine(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedCuisines.includes(c.id) ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF6B00]'
                    }`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">业态经验</label>
              <div className="flex flex-wrap gap-2">
                {businessTypes.map(bt => (
                  <button key={bt.id} type="button" onClick={() => toggleBusinessType(bt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedBusinessTypes.includes(bt.id) ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF6B00]'
                    }`}>
                    {bt.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ====== Brand & Self Intro ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">品牌经历与自我介绍</h2>
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">品牌背书</label>
              <textarea value={brandEndorsement} onChange={e => setBrandEndorsement(e.target.value)} placeholder="如：曾任米其林餐厅主厨、黑珍珠三钻餐厅总厨..."
                rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">头部品牌经历</label>
              <textarea value={headBrandExp} onChange={e => setHeadBrandExp(e.target.value)} placeholder="如：曾在海底捞、西贝、外婆家等头部品牌任职..."
                rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">项目经验</label>
              <textarea value={projectExp} onChange={e => setProjectExp(e.target.value)} placeholder="如：成功筹备并开业3家餐厅、主导菜品体系搭建..."
                rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">成功项目经验详情</label>
              <textarea value={projectExpDetail} onChange={e => setProjectExpDetail(e.target.value)} placeholder="如：操盘新品牌从0到1落地，3年门店从1家开到20家，单店月营收突破100万..."
                rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">更适合的业态模型</label>
              <input type="text" value={preferredBusinessModel} onChange={e => setPreferredBusinessModel(e.target.value)} placeholder="如：连锁加盟、直营门店、新零售餐饮、私域外卖..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-[#FF6B00] font-medium mb-2.5">🤖 人物画像（影响 AI 匹配精准度）</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">父母情况</label>
              <input type="text" value={parentInfo} onChange={e => setParentInfo(e.target.value)} placeholder="如：父母健在，退休在家乡；或父母从事餐饮行业"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">学习能力自评</label>
              <input type="text" value={learningAbility} onChange={e => setLearningAbility(e.target.value)} placeholder="如：快速学习新菜系、善于复盘总结"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">思维方式</label>
              <input type="text" value={thinkingStyle} onChange={e => setThinkingStyle(e.target.value)} placeholder="如：灵活务实 / 体系化思维 / 数据驱动"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">个人擅长能力</label>
              <textarea value={personalSkills} onChange={e => setPersonalSkills(e.target.value)} placeholder="如：团队搭建、成本管控、菜品研发、门店运营..."
                rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">知名品牌经验详情</label>
              <textarea value={brandExperienceDetail} onChange={e => setBrandExperienceDetail(e.target.value)} placeholder="如：在某头部品牌经历了从初创到扩张阶段，主导中央厨房搭建..."
                rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">自我介绍</label>
              <textarea value={selfIntro} onChange={e => setSelfIntro(e.target.value)} placeholder="请简要介绍你的职业经历、核心优势和成就..."
                rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none" />
              <p className="text-xs text-gray-400 mt-1.5 text-right">{selfIntro.length} / 500</p>
            </div>
          </div>
        </div>

        {/* ====== Privacy Settings ====== */}
        <div ref={privacyRef} className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            隐私设置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">隐私模式</label>
              {[ { value: 'REAL_NAME', label: '实名认证', desc: '展示真实姓名和完整资料，获得更多企业信任' }, { value: 'ANONYMOUS', label: '匿名展示', desc: '隐藏真实姓名，用"匿名人才"展示，企业仍可联系您' } ].map(opt => (
                <label key={opt.value}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors mb-2 ${
                    privacyMode === opt.value ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <div>
                    <span className="text-sm text-gray-800">{opt.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <input type="radio" name="privacyMode" value={opt.value} checked={privacyMode === opt.value}
                    onChange={e => setPrivacyMode(e.target.value)} className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00]" />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ====== Verification Materials ====== */}
        <div ref={verificationRef} className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            认证材料
          </h2>
          <p className="text-xs text-gray-400 mb-4">平台要求实名认证，请上传以下任意一种材料（建议至少上传2种以提高可信度）</p>

          {verifications.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium">已提交的认证材料：</p>
              {verifications.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">
                      {v.type === 'REFERENCE' ? '推荐人背调' : v.type === 'CERTIFICATE' ? '离职证明' : '工资流水'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      v.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : v.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
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
              <input type="text" value={refName} onChange={e => setRefName(e.target.value)} placeholder="推荐人姓名"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              <input type="text" value={refTitle} onChange={e => setRefTitle(e.target.value)} placeholder="推荐人职位（如：行政总厨）"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              <input type="text" value={refPhone} onChange={e => setRefPhone(e.target.value)} placeholder="推荐人联系电话"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]" />
              <button type="button" onClick={handleSubmitReference}
                className="w-full py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium hover:bg-[#e86000] transition-colors">
                提交推荐人信息
              </button>
            </div>
          </div>

          {/* Option 2: Certificate */}
          <div className="border border-gray-100 rounded-lg p-4 mb-3">
            <h3 className="text-sm font-medium text-gray-800 mb-3">② 离职/在职证明</h3>
            <label className="block w-full py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
              <span>点击上传证明文件</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadCert} className="hidden" />
            </label>
          </div>

          {/* Option 3: Salary Flow */}
          <div className="border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-3">③ 工资流水</h3>
            <label className="block w-full py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
              <span>点击上传工资流水</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadSalary} className="hidden" />
            </label>
          </div>
        </div>

        {/* ====== Partnership Toggle ====== */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">接受合伙/投资引荐</p>
              <p className="text-xs text-gray-400 mt-0.5">开启后，企业可向您发送合伙或投资邀请</p>
            </div>
            <button type="button" onClick={() => setAcceptPartner(!acceptPartner)}
              className={`relative w-11 h-6 rounded-full transition-colors ${acceptPartner ? 'bg-[#FF6B00]' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${acceptPartner ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* ====== Bottom Save Button ====== */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-medium text-sm hover:bg-[#e86000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          保存资料
        </button>
      </div>
    </div>
  );
}
