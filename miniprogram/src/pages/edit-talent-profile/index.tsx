import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Textarea, Picker, ScrollView } from '@tarojs/components'
import { talentsApi, refApi, uploadApi, safeArray } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Icon from '../../components/Icon'
import './index.scss'

interface WorkExpForm {
  id?: string
  companyName: string
  position: string
  startYear: string
  startMonth: string
  endYear: string
  endMonth: string
  isCurrent: boolean
  description: string
  bgRefName: string
  bgRefTitle: string
  bgRefPhone: string
}

const emptyWorkExp = (): WorkExpForm => ({
  companyName: '', position: '', startYear: '', startMonth: '',
  endYear: '', endMonth: '', isCurrent: false, description: '',
  bgRefName: '', bgRefTitle: '', bgRefPhone: '',
})

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i)
const BIRTH_YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i - 16).filter(y => y >= 1960)

const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊']
const PROVINCES = ['北京市', '上海市', '天津市', '重庆市', '河北省', '山西省', '内蒙古', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西', '海南省', '四川省', '贵州省', '云南省', '西藏', '陕西省', '甘肃省', '青海省', '宁夏', '新疆']
const EDUCATION_OPTIONS = ['高中', '中专', '大专', '本科', '硕士', '博士']
const GENDER_OPTIONS = ['请选择', '男', '女']
const MARITAL_OPTIONS = ['请选择', '未婚', '已婚']

export default function EditTalentProfile() {
  useRequireAuth('TALENT')
  const router = useRouter()
  const section = router.params.section
  const { user, updateUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [cuisines, setCuisines] = useState<any[]>([])
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [jobCategories, setJobCategories] = useState<any[]>([])

  // 个人信息
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [hometown, setHometown] = useState('')
  const [hometownProvince, setHometownProvince] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')

  // 职业信息
  const [title, setTitle] = useState('')
  const [jobCategoryId, setJobCategoryId] = useState('')
  const [currentCompany, setCurrentCompany] = useState('')
  const [workYears, setWorkYears] = useState('')
  const [education, setEducation] = useState('')

  // 期望薪资
  const [minSalary, setMinSalary] = useState('')
  const [maxSalary, setMaxSalary] = useState('')

  // 专业领域
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([])

  // 品牌经历与自我介绍
  const [selfIntro, setSelfIntro] = useState('')
  const [brandEndorsement, setBrandEndorsement] = useState('')
  const [headBrandExp, setHeadBrandExp] = useState('')
  const [projectExp, setProjectExp] = useState('')
  const [projectExpDetail, setProjectExpDetail] = useState('')
  const [preferredBusinessModel, setPreferredBusinessModel] = useState('')
  const [parentInfo, setParentInfo] = useState('')
  const [learningAbility, setLearningAbility] = useState('')
  const [thinkingStyle, setThinkingStyle] = useState('')
  const [personalSkills, setPersonalSkills] = useState('')
  const [brandExperienceDetail, setBrandExperienceDetail] = useState('')

  // 简历完善度
  const [completeness, setCompleteness] = useState<{ totalScore: number; level: string; modules: any[] } | null>(null)

  // 隐私
  const [privacyMode, setPrivacyMode] = useState('REAL_NAME')
  const [acceptPartner, setAcceptPartner] = useState(false)

  // 工作经历
  const [workExperiences, setWorkExperiences] = useState<any[]>([])
  const [showExpList, setShowExpList] = useState(true)
  const [editingWorkExpIndex, setEditingWorkExpIndex] = useState<number | null>(null)
  const [workExpForm, setWorkExpForm] = useState<WorkExpForm>(emptyWorkExp())

  // 认证材料
  const [verifications, setVerifications] = useState<any[]>([])
  const [refName, setRefName] = useState('')
  const [refTitle, setRefTitle] = useState('')
  const [refPhone, setRefPhone] = useState('')

  useEffect(() => {
    Promise.all([talentsApi.getProfile(), refApi.getAll()]).then(([profileRes, refRes]) => {
      const talent: any = profileRes.data
      const ref: any = refRes.data
      setRealName(talent.realName || '')
      setGender(talent.gender || '')
      setBirthYear(talent.birthYear?.toString() || '')
      setBirthMonth(talent.birthMonth?.toString() || '')
      setIdNumber(talent.idNumber || '')
      setPhone(talent.phone || '')
      setEmail(talent.email || '')
      setCity(talent.city || '')
      setProvince(talent.province || '')
      setHometown(talent.hometown || '')
      setHometownProvince(talent.hometownProvince || '')
      setMaritalStatus(talent.maritalStatus || '')
      setTitle(talent.title || '')
      setJobCategoryId(talent.jobCategoryId || '')
      setCurrentCompany(talent.currentCompany || '')
      setWorkYears(talent.workYears?.toString() || '')
      setEducation(talent.education || '')
      setMinSalary(talent.minSalary?.toString() || '')
      setMaxSalary(talent.maxSalary?.toString() || '')
      setSelectedCuisines(talent.cuisineIds ? talent.cuisineIds.split(',').filter(Boolean) : [])
      setSelectedBusinessTypes(talent.businessTypeIds ? talent.businessTypeIds.split(',').filter(Boolean) : [])
      setSelfIntro(talent.selfIntro || '')
      setBrandEndorsement(talent.brandEndorsement || '')
      setHeadBrandExp(talent.headBrandExp || '')
      setProjectExp(talent.projectExp || '')
      setProjectExpDetail(talent.projectExpDetail || '')
      setPreferredBusinessModel(talent.preferredBusinessModel || '')
      setParentInfo(talent.parentInfo || '')
      setLearningAbility(talent.learningAbility || '')
      setThinkingStyle(talent.thinkingStyle || '')
      setPersonalSkills(talent.personalSkills || '')
      setBrandExperienceDetail(talent.brandExperienceDetail || '')
      setPrivacyMode(talent.privacyMode || 'REAL_NAME')
      setAcceptPartner(!!talent.acceptPartner)
      setWorkExperiences(safeArray(talent.workExperiences))
      setCuisines(safeArray(ref?.cuisines))
      setBusinessTypes(safeArray(ref?.businessTypes))
      setJobCategories(safeArray(ref?.jobCategories))
      talentsApi.getCompleteness().then(r => setCompleteness(r.data as any)).catch(() => {})
    }).catch(() => {
      setError('加载个人信息失败')
    }).finally(() => setLoading(false))

    talentsApi.getVerifications().then(res => {
      setVerifications(safeArray(res.data))
    }).catch(() => {})
  }, [])

  // 定位到指定分区（还原网页版 ?section= 滚动定位）
  useEffect(() => {
    if (!section || loading) return
    const timer = setTimeout(() => {
      Taro.pageScrollTo({ selector: `#section-${section}`, offsetTop: -20, duration: 300 }).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [section, loading])

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const toggleBusinessType = (id: string) => {
    setSelectedBusinessTypes(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  // ====== 工作经历 ======
  const handleOpenWorkExpForm = (index?: number) => {
    if (index !== undefined && workExperiences[index]) {
      const exp = workExperiences[index]
      setWorkExpForm({
        id: exp.id,
        companyName: exp.companyName,
        position: exp.position,
        startYear: exp.startYear.toString(),
        startMonth: exp.startMonth.toString(),
        endYear: exp.endYear?.toString() || '',
        endMonth: exp.endMonth?.toString() || '',
        isCurrent: !!exp.isCurrent,
        description: exp.description || '',
        bgRefName: exp.bgRefName || '',
        bgRefTitle: exp.bgRefTitle || '',
        bgRefPhone: exp.bgRefPhone || '',
      })
      setEditingWorkExpIndex(index)
    } else {
      setWorkExpForm(emptyWorkExp())
      setEditingWorkExpIndex(null)
    }
    setShowExpList(false)
  }

  const handleSaveWorkExp = async () => {
    const { companyName, position, startYear, startMonth, endYear, endMonth, isCurrent, description, bgRefName, bgRefTitle, bgRefPhone } = workExpForm
    if (!companyName.trim() || !position.trim() || !startYear || !startMonth) {
      setError('请填写完整的公司名称、职位和起始时间')
      return
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
    }
    try {
      if (editingWorkExpIndex !== null && workExpForm.id) {
        const res = await talentsApi.updateWorkExperience(workExpForm.id, payload)
        const updated = [...workExperiences]
        updated[editingWorkExpIndex] = res.data
        setWorkExperiences(updated)
        setSuccess('工作经历更新成功')
      } else {
        const res = await talentsApi.addWorkExperience(payload)
        setWorkExperiences(prev => [res.data, ...prev])
        setSuccess('工作经历添加成功')
      }
      setShowExpList(true)
      setWorkExpForm(emptyWorkExp())
      setEditingWorkExpIndex(null)
      setError('')
    } catch (err: any) {
      setError(err?.message || '操作失败')
    }
  }

  const handleDeleteWorkExp = (index: number) => {
    const exp = workExperiences[index]
    if (!exp.id) return
    Taro.showModal({
      title: '确认删除',
      content: '确定删除这条工作经历吗？',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await talentsApi.deleteWorkExperience(exp.id)
          setWorkExperiences(prev => prev.filter((_, i) => i !== index))
          setSuccess('工作经历已删除')
        } catch (err: any) {
          setError(err?.message || '删除失败')
        }
      },
    })
  }

  const formatDateRange = (exp: any) => {
    const start = `${exp.startYear}年${exp.startMonth}月`
    const end = exp.isCurrent ? '至今' : (exp.endYear ? `${exp.endYear}年${exp.endMonth}月` : '')
    return `${start} - ${end}`
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
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
      acceptPartner,
    }
    try {
      const res = await talentsApi.updateProfile(payload)
      if (user) {
        updateUser({ ...user, profile: res.data as any })
      }
      setSuccess('保存成功')
      talentsApi.getCompleteness().then(r => setCompleteness(r.data as any)).catch(() => {})
      setTimeout(() => Taro.navigateBack(), 1000)
    } catch (err: any) {
      setError(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // ====== 认证材料 ======
  const handleSubmitReference = async () => {
    if (!refName || !refTitle || !refPhone) {
      setError('请填写完整的推荐人信息')
      return
    }
    if (!/^1\d{10}$/.test(refPhone)) {
      setError('推荐人手机号格式不正确')
      return
    }
    try {
      setError('')
      const res = await talentsApi.addVerification({ type: 'REFERENCE', refName, refTitle, refPhone })
      setVerifications(prev => [res.data, ...prev])
      setRefName(''); setRefTitle(''); setRefPhone('')
      setSuccess('推荐人认证提交成功')
    } catch (err: any) {
      setError(err?.message || '提交失败')
    }
  }

  const handleUploadFile = async (type: 'CERTIFICATE' | 'SALARY_FLOW', successMsg: string) => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      setError('')
      const purpose = type === 'CERTIFICATE' ? 'TALENT_CERTIFICATE' : 'TALENT_SALARY_PROOF'
      const uploadRes = await uploadApi.upload(filePath, purpose)
      const res = await talentsApi.addVerification({ type, [type === 'CERTIFICATE' ? 'certFileUrl' : 'salaryFileUrl']: (uploadRes.data as any)?.url })
      setVerifications(prev => [res.data, ...prev])
      setSuccess(successMsg)
    } catch (err: any) {
      setError(err?.message || '上传失败')
    }
  }

  if (loading) {
    return (
      <View className='etp-page'>
        <NavBar title='编辑个人资料' />
        <Loading />
      </View>
    )
  }

  const level1Cuisines = cuisines.filter(c => c.level === 1)

  // 岗位分类扁平化
  const flatCategories: { id: string; label: string }[] = []
  jobCategories.forEach((cat: any) => {
    safeArray(cat.subCategories).forEach((sub: any) => {
      flatCategories.push({ id: sub.id, label: `${cat.name} - ${sub.name}` })
    })
  })
  const jobCategoryLabel = flatCategories.find(c => c.id === jobCategoryId)?.label || '请选择'

  return (
    <View className='etp-page'>
      <NavBar
        title='编辑个人资料'
        right={
          <Text className={`etp-save-link ${saving ? 'etp-link-disabled' : ''}`} onClick={() => !saving && handleSave()}>
            {saving ? '保存中...' : '保存'}
          </Text>
        }
      />

      {/* 提示条 */}
      {error ? (
        <View className='etp-msg etp-msg-error'><Text className='etp-msg-text etp-msg-error-text'>{error}</Text></View>
      ) : null}
      {success ? (
        <View className='etp-msg etp-msg-success'>
          <Icon name='check' size={32} color='#16A34A' />
          <Text className='etp-msg-text etp-msg-success-text'>{success}</Text>
        </View>
      ) : null}

      <View className='etp-body'>
        {/* ====== 简历完善度 ====== */}
        {completeness ? (
          <View className='etp-card'>
            <View className='etp-card-header'>
              <Text className='etp-card-title'>简历完善度</Text>
              <View className='etp-score-wrap'>
                <Text className={`etp-score ${completeness.totalScore >= 90 ? 'etp-score-green' : completeness.totalScore >= 70 ? 'etp-score-orange' : 'etp-score-red'}`}>
                  {completeness.totalScore}
                </Text>
                <Text className='etp-score-sub'>/ 100 · {completeness.level}</Text>
              </View>
            </View>
            <View className='etp-progress-track'>
              <View
                className={`etp-progress-fill ${completeness.totalScore >= 90 ? 'fill-green' : completeness.totalScore >= 70 ? 'fill-orange' : 'fill-red'}`}
                style={{ width: `${Math.max(3, completeness.totalScore)}%` }}
              />
            </View>
            {safeArray(completeness.modules).map((m: any) => (
              <View key={m.key} className='etp-module-row'>
                <Text className='etp-module-name'>{m.name}</Text>
                <View className='etp-module-track'>
                  <View
                    className={`etp-module-fill ${m.percent >= 80 ? 'mfill-green' : m.percent >= 50 ? 'mfill-orange' : 'mfill-gray'}`}
                    style={{ width: `${Math.max(3, m.percent)}%` }}
                  />
                </View>
                <Text className='etp-module-score'>{m.score}/{m.max}</Text>
              </View>
            ))}
            <Text className='etp-module-hint'>完善度越高，AI 匹配越精准，企业关注度越高。填写上方各模块信息可提升完善度。</Text>
          </View>
        ) : null}

        {/* ====== 个人信息 ====== */}
        <View className='etp-card'>
          <Text className='etp-card-title'>个人信息</Text>
          <View className='etp-field'>
            <Text className='etp-label'>真实姓名</Text>
            <Input className='etp-input' value={realName} placeholder='请输入真实姓名' placeholderClass='etp-placeholder' onInput={(e) => setRealName(e.detail.value)} />
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>性别</Text>
              <Picker mode='selector' range={GENDER_OPTIONS} onChange={(e) => {
                const opt = GENDER_OPTIONS[Number(e.detail.value)]
                setGender(opt === '男' ? 'MALE' : opt === '女' ? 'FEMALE' : '')
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${gender ? '' : 'etp-placeholder'}`}>
                    {gender === 'MALE' ? '男' : gender === 'FEMALE' ? '女' : '请选择'}
                  </Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>出生年份</Text>
              <Picker mode='selector' range={['请选择', ...BIRTH_YEARS.map(y => `${y}年`)]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setBirthYear(idx === 0 ? '' : String(BIRTH_YEARS[idx - 1]))
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${birthYear ? '' : 'etp-placeholder'}`}>{birthYear ? `${birthYear}年` : '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>出生月份</Text>
              <Picker mode='selector' range={['请选择', ...MONTHS.map(m => `${m}月`)]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setBirthMonth(idx === 0 ? '' : String(MONTHS[idx - 1]))
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${birthMonth ? '' : 'etp-placeholder'}`}>{birthMonth ? `${birthMonth}月` : '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>身份证号</Text>
              <Input className='etp-input' value={idNumber} placeholder='选填' placeholderClass='etp-placeholder' onInput={(e) => setIdNumber(e.detail.value)} />
            </View>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>手机号</Text>
              <Input className='etp-input etp-input-disabled' value={phone} disabled />
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>邮箱</Text>
              <Input className='etp-input' value={email} placeholder='选填' placeholderClass='etp-placeholder' onInput={(e) => setEmail(e.detail.value)} />
            </View>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>所在省份</Text>
              <Picker mode='selector' range={['请选择', ...PROVINCES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setProvince(idx === 0 ? '' : PROVINCES[idx - 1])
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${province ? '' : 'etp-placeholder'}`}>{province || '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>所在城市</Text>
              <Picker mode='selector' range={['请选择城市', ...CITIES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setCity(idx === 0 ? '' : CITIES[idx - 1])
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${city ? '' : 'etp-placeholder'}`}>{city || '请选择城市'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>籍贯省份</Text>
              <Picker mode='selector' range={['请选择', ...PROVINCES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setHometownProvince(idx === 0 ? '' : PROVINCES[idx - 1])
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${hometownProvince ? '' : 'etp-placeholder'}`}>{hometownProvince || '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>籍贯城市</Text>
              <Input className='etp-input' value={hometown} placeholder='选填' placeholderClass='etp-placeholder' onInput={(e) => setHometown(e.detail.value)} />
            </View>
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>婚姻状况</Text>
            <Picker mode='selector' range={MARITAL_OPTIONS} onChange={(e) => {
              const opt = MARITAL_OPTIONS[Number(e.detail.value)]
              setMaritalStatus(opt === '未婚' ? 'SINGLE' : opt === '已婚' ? 'MARRIED' : '')
            }}>
              <View className='etp-select'>
                <Text className={`etp-select-text ${maritalStatus ? '' : 'etp-placeholder'}`}>
                  {maritalStatus === 'SINGLE' ? '未婚' : maritalStatus === 'MARRIED' ? '已婚' : '请选择'}
                </Text>
                <Icon name='chevron-down' size={28} color='#9CA3AF' />
              </View>
            </Picker>
          </View>
        </View>

        {/* ====== 职业信息 ====== */}
        <View className='etp-card'>
          <Text className='etp-card-title'>职业信息</Text>
          <View className='etp-field'>
            <Text className='etp-label'>岗位分类</Text>
            <Picker mode='selector' range={['请选择', ...flatCategories.map(c => c.label)]} onChange={(e) => {
              const idx = Number(e.detail.value)
              setJobCategoryId(idx === 0 ? '' : flatCategories[idx - 1].id)
            }}>
              <View className='etp-select'>
                <Text className={`etp-select-text ${jobCategoryId ? '' : 'etp-placeholder'}`}>{jobCategoryLabel}</Text>
                <Icon name='chevron-down' size={28} color='#9CA3AF' />
              </View>
            </Picker>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>当前职位</Text>
              <Input className='etp-input' value={title} placeholder='如：行政总厨' placeholderClass='etp-placeholder' onInput={(e) => setTitle(e.detail.value)} />
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>当前公司</Text>
              <Input className='etp-input' value={currentCompany} placeholder='公司名称' placeholderClass='etp-placeholder' onInput={(e) => setCurrentCompany(e.detail.value)} />
            </View>
          </View>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>工作年限</Text>
              <Input className='etp-input' type='number' value={workYears} placeholder='如：5' placeholderClass='etp-placeholder' onInput={(e) => setWorkYears(e.detail.value)} />
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>学历</Text>
              <Picker mode='selector' range={['请选择', ...EDUCATION_OPTIONS]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setEducation(idx === 0 ? '' : EDUCATION_OPTIONS[idx - 1])
              }}>
                <View className='etp-select'>
                  <Text className={`etp-select-text ${education ? '' : 'etp-placeholder'}`}>{education || '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
          </View>
        </View>

        {/* ====== 工作经历 ====== */}
        <View id='section-experience' className='etp-card'>
          <View className='etp-card-header'>
            <Text className='etp-card-title'>工作经历</Text>
            {showExpList ? (
              <Text className='etp-add-link' onClick={() => handleOpenWorkExpForm()}>+ 添加经历</Text>
            ) : null}
          </View>

          {showExpList ? (
            workExperiences.length === 0 ? (
              <Text className='etp-empty-text'>暂无工作经历</Text>
            ) : (
              workExperiences.map((exp, idx) => (
                <View key={exp.id || idx} className='etp-exp-item'>
                  <View className='etp-exp-main'>
                    <Text className='etp-exp-position'>{exp.position}</Text>
                    <Text className='etp-exp-company'>{exp.companyName}</Text>
                    <Text className='etp-exp-date'>{formatDateRange(exp)}</Text>
                    {exp.description ? <Text className='etp-exp-desc'>{exp.description}</Text> : null}
                    {exp.bgRefName ? (
                      <Text className='etp-exp-bgref'>背景调查：{exp.bgRefName} ({exp.bgRefTitle}) - 仅平台可见</Text>
                    ) : null}
                    {exp.isCurrent ? <Text className='etp-exp-badge'>现任</Text> : null}
                  </View>
                  <View className='etp-exp-ops'>
                    <Text className='etp-exp-op' onClick={() => handleOpenWorkExpForm(idx)}>编辑</Text>
                    <Text className='etp-exp-op danger' onClick={() => handleDeleteWorkExp(idx)}>删除</Text>
                  </View>
                </View>
              ))
            )
          ) : (
            <View>
              <View className='etp-field'>
                <Text className='etp-label'>公司名称 *</Text>
                <Input className='etp-input' value={workExpForm.companyName} placeholder='如：湘味轩餐饮集团' placeholderClass='etp-placeholder' onInput={(e) => setWorkExpForm(prev => ({ ...prev, companyName: e.detail.value }))} />
              </View>
              <View className='etp-field'>
                <Text className='etp-label'>担任职务 *</Text>
                <Input className='etp-input' value={workExpForm.position} placeholder='如：行政总厨' placeholderClass='etp-placeholder' onInput={(e) => setWorkExpForm(prev => ({ ...prev, position: e.detail.value }))} />
              </View>
              <View className='etp-check-row' onClick={() => setWorkExpForm(prev => ({ ...prev, isCurrent: !prev.isCurrent }))}>
                <View className={`etp-checkbox ${workExpForm.isCurrent ? 'etp-checkbox-on' : ''}`}>
                  {workExpForm.isCurrent ? <Icon name='check' size={24} color='#fff' strokeWidth={3} /> : null}
                </View>
                <Text className='etp-check-label'>至今仍在此公司</Text>
              </View>
              <View className='etp-row'>
                <View className='etp-field etp-half'>
                  <Text className='etp-label'>入职年份 *</Text>
                  <Picker mode='selector' range={['选择年份', ...YEARS.map(y => `${y}年`)]} onChange={(e) => {
                    const idx = Number(e.detail.value)
                    setWorkExpForm(prev => ({ ...prev, startYear: idx === 0 ? '' : String(YEARS[idx - 1]) }))
                  }}>
                    <View className='etp-select'>
                      <Text className={`etp-select-text ${workExpForm.startYear ? '' : 'etp-placeholder'}`}>{workExpForm.startYear ? `${workExpForm.startYear}年` : '选择年份'}</Text>
                      <Icon name='chevron-down' size={28} color='#9CA3AF' />
                    </View>
                  </Picker>
                </View>
                <View className='etp-field etp-half'>
                  <Text className='etp-label'>入职月份 *</Text>
                  <Picker mode='selector' range={['选择月份', ...MONTHS.map(m => `${m}月`)]} onChange={(e) => {
                    const idx = Number(e.detail.value)
                    setWorkExpForm(prev => ({ ...prev, startMonth: idx === 0 ? '' : String(MONTHS[idx - 1]) }))
                  }}>
                    <View className='etp-select'>
                      <Text className={`etp-select-text ${workExpForm.startMonth ? '' : 'etp-placeholder'}`}>{workExpForm.startMonth ? `${workExpForm.startMonth}月` : '选择月份'}</Text>
                      <Icon name='chevron-down' size={28} color='#9CA3AF' />
                    </View>
                  </Picker>
                </View>
              </View>
              {!workExpForm.isCurrent ? (
                <View className='etp-row'>
                  <View className='etp-field etp-half'>
                    <Text className='etp-label'>离职年份</Text>
                    <Picker mode='selector' range={['选择年份', ...YEARS.map(y => `${y}年`)]} onChange={(e) => {
                      const idx = Number(e.detail.value)
                      setWorkExpForm(prev => ({ ...prev, endYear: idx === 0 ? '' : String(YEARS[idx - 1]) }))
                    }}>
                      <View className='etp-select'>
                        <Text className={`etp-select-text ${workExpForm.endYear ? '' : 'etp-placeholder'}`}>{workExpForm.endYear ? `${workExpForm.endYear}年` : '选择年份'}</Text>
                        <Icon name='chevron-down' size={28} color='#9CA3AF' />
                      </View>
                    </Picker>
                  </View>
                  <View className='etp-field etp-half'>
                    <Text className='etp-label'>离职月份</Text>
                    <Picker mode='selector' range={['选择月份', ...MONTHS.map(m => `${m}月`)]} onChange={(e) => {
                      const idx = Number(e.detail.value)
                      setWorkExpForm(prev => ({ ...prev, endMonth: idx === 0 ? '' : String(MONTHS[idx - 1]) }))
                    }}>
                      <View className='etp-select'>
                        <Text className={`etp-select-text ${workExpForm.endMonth ? '' : 'etp-placeholder'}`}>{workExpForm.endMonth ? `${workExpForm.endMonth}月` : '选择月份'}</Text>
                        <Icon name='chevron-down' size={28} color='#9CA3AF' />
                      </View>
                    </Picker>
                  </View>
                </View>
              ) : null}
              <View className='etp-field'>
                <Text className='etp-label'>工作描述</Text>
                <Textarea className='etp-textarea short' value={workExpForm.description} placeholder='在此公司的职责和成就...' placeholderClass='etp-placeholder' maxlength={1000} onInput={(e) => setWorkExpForm(prev => ({ ...prev, description: e.detail.value }))} />
              </View>

              {/* 背景调查（仅平台可见） */}
              <View className='etp-bgref-section'>
                <Text className='etp-bgref-title'>🔒 背景调查信息 (仅平台管理员可见)</Text>
                <View className='etp-bgref-row'>
                  <Input className='etp-input etp-bgref-input' value={workExpForm.bgRefName} placeholder='调查人姓名' placeholderClass='etp-placeholder' onInput={(e) => setWorkExpForm(prev => ({ ...prev, bgRefName: e.detail.value }))} />
                  <Input className='etp-input etp-bgref-input' value={workExpForm.bgRefTitle} placeholder='调查人职位' placeholderClass='etp-placeholder' onInput={(e) => setWorkExpForm(prev => ({ ...prev, bgRefTitle: e.detail.value }))} />
                  <Input className='etp-input etp-bgref-input' type='number' value={workExpForm.bgRefPhone} placeholder='联系电话' placeholderClass='etp-placeholder' onInput={(e) => setWorkExpForm(prev => ({ ...prev, bgRefPhone: e.detail.value }))} />
                </View>
              </View>

              <View className='etp-form-actions'>
                <Text
                  className='etp-btn-cancel'
                  onClick={() => {
                    setShowExpList(true)
                    setWorkExpForm(emptyWorkExp())
                    setEditingWorkExpIndex(null)
                  }}
                >
                  取消
                </Text>
                <Text className='etp-btn-primary' onClick={handleSaveWorkExp}>
                  {editingWorkExpIndex !== null ? '更新经历' : '添加经历'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ====== 期望薪资 ====== */}
        <View className='etp-card'>
          <Text className='etp-card-title'>期望薪资</Text>
          <View className='etp-row'>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>最低期望 (元/月)</Text>
              <Input className='etp-input' type='number' value={minSalary} placeholder='如：20000' placeholderClass='etp-placeholder' onInput={(e) => setMinSalary(e.detail.value)} />
            </View>
            <View className='etp-field etp-half'>
              <Text className='etp-label'>最高期望 (元/月)</Text>
              <Input className='etp-input' type='number' value={maxSalary} placeholder='如：50000' placeholderClass='etp-placeholder' onInput={(e) => setMaxSalary(e.detail.value)} />
            </View>
          </View>
        </View>

        {/* ====== 专业领域 ====== */}
        <View className='etp-card'>
          <Text className='etp-card-title'>专业领域</Text>
          <View className='etp-field'>
            <Text className='etp-label'>菜系专长（一级菜系）</Text>
            <View className='etp-chips'>
              {level1Cuisines.map(c => (
                <Text
                  key={c.id}
                  className={`etp-chip ${selectedCuisines.includes(c.id) ? 'etp-chip-active' : ''}`}
                  onClick={() => toggleCuisine(c.id)}
                >
                  {c.name}
                </Text>
              ))}
            </View>
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>业态经验</Text>
            <View className='etp-chips'>
              {businessTypes.map(bt => (
                <Text
                  key={bt.id}
                  className={`etp-chip ${selectedBusinessTypes.includes(bt.id) ? 'etp-chip-active' : ''}`}
                  onClick={() => toggleBusinessType(bt.id)}
                >
                  {bt.name}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* ====== 品牌经历与自我介绍 ====== */}
        <View className='etp-card'>
          <Text className='etp-card-title'>品牌经历与自我介绍</Text>
          <View className='etp-field'>
            <Text className='etp-label'>品牌背书</Text>
            <Textarea className='etp-textarea short' value={brandEndorsement} placeholder='如：曾任米其林餐厅主厨、黑珍珠三钻餐厅总厨...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setBrandEndorsement(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>头部品牌经历</Text>
            <Textarea className='etp-textarea short' value={headBrandExp} placeholder='如：曾在海底捞、西贝、外婆家等头部品牌任职...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setHeadBrandExp(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>项目经验</Text>
            <Textarea className='etp-textarea short' value={projectExp} placeholder='如：成功筹备并开业3家餐厅、主导菜品体系搭建...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setProjectExp(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>成功项目经验详情</Text>
            <Textarea className='etp-textarea' value={projectExpDetail} placeholder='如：操盘新品牌从0到1落地，3年门店从1家开到20家，单店月营收突破100万...' placeholderClass='etp-placeholder' maxlength={1000} onInput={(e) => setProjectExpDetail(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>更适合的业态模型</Text>
            <Input className='etp-input' value={preferredBusinessModel} placeholder='如：连锁加盟、直营门店、新零售餐饮、私域外卖...' placeholderClass='etp-placeholder' onInput={(e) => setPreferredBusinessModel(e.detail.value)} />
          </View>

          {/* AI 人物画像 */}
          <View className='etp-ai-divider' />
          <Text className='etp-ai-title'>🤖 人物画像（影响 AI 匹配精准度）</Text>
          <View className='etp-field'>
            <Text className='etp-label'>父母情况</Text>
            <Input className='etp-input' value={parentInfo} placeholder='如：父母健在，退休在家乡；或父母从事餐饮行业' placeholderClass='etp-placeholder' onInput={(e) => setParentInfo(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>学习能力自评</Text>
            <Input className='etp-input' value={learningAbility} placeholder='如：快速学习新菜系、善于复盘总结' placeholderClass='etp-placeholder' onInput={(e) => setLearningAbility(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>思维方式</Text>
            <Input className='etp-input' value={thinkingStyle} placeholder='如：灵活务实 / 体系化思维 / 数据驱动' placeholderClass='etp-placeholder' onInput={(e) => setThinkingStyle(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>个人擅长能力</Text>
            <Textarea className='etp-textarea short' value={personalSkills} placeholder='如：团队搭建、成本管控、菜品研发、门店运营...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setPersonalSkills(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>知名品牌经验详情</Text>
            <Textarea className='etp-textarea short' value={brandExperienceDetail} placeholder='如：在某头部品牌经历了从初创到扩张阶段，主导中央厨房搭建...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setBrandExperienceDetail(e.detail.value)} />
          </View>
          <View className='etp-field'>
            <Text className='etp-label'>自我介绍</Text>
            <Textarea className='etp-textarea' value={selfIntro} placeholder='请简要介绍你的职业经历、核心优势和成就...' placeholderClass='etp-placeholder' maxlength={500} onInput={(e) => setSelfIntro(e.detail.value)} />
            <Text className='etp-counter'>{selfIntro.length} / 500</Text>
          </View>
        </View>

        {/* ====== 隐私设置 ====== */}
        <View id='section-privacy' className='etp-card'>
          <Text className='etp-card-title'>隐私设置</Text>
          {[
            { value: 'REAL_NAME', label: '实名认证', desc: '展示真实姓名和完整资料，获得更多企业信任' },
            { value: 'ANONYMOUS', label: '匿名展示', desc: '隐藏真实姓名，用"匿名人才"展示，企业仍可联系您' },
          ].map(opt => (
            <View
              key={opt.value}
              className={`etp-radio-card ${privacyMode === opt.value ? 'etp-radio-active' : ''}`}
              onClick={() => setPrivacyMode(opt.value)}
            >
              <View className='etp-radio-info'>
                <Text className='etp-radio-label'>{opt.label}</Text>
                <Text className='etp-radio-desc'>{opt.desc}</Text>
              </View>
              <View className={`etp-radio ${privacyMode === opt.value ? 'etp-radio-selected' : ''}`}>
                {privacyMode === opt.value ? <View className='etp-radio-dot' /> : null}
              </View>
            </View>
          ))}
        </View>

        {/* ====== 认证材料 ====== */}
        <View id='section-verification' className='etp-card'>
          <Text className='etp-card-title'>认证材料</Text>
          <Text className='etp-hint'>平台要求实名认证，请上传以下任意一种材料（建议至少上传2种以提高可信度）</Text>

          {verifications.length > 0 ? (
            <View className='etp-verify-list'>
              <Text className='etp-verify-list-title'>已提交的认证材料：</Text>
              {verifications.map(v => (
                <View key={v.id} className='etp-verify-row'>
                  <View className='etp-verify-left'>
                    <Text className='etp-verify-type'>
                      {v.type === 'REFERENCE' ? '推荐人背调' : v.type === 'CERTIFICATE' ? '离职证明' : '工资流水'}
                    </Text>
                    <Text className={`etp-verify-status ${v.status === 'VERIFIED' ? 'vs-green' : v.status === 'REJECTED' ? 'vs-red' : 'vs-yellow'}`}>
                      {v.status === 'VERIFIED' ? '已通过' : v.status === 'REJECTED' ? '已驳回' : '审核中'}
                    </Text>
                  </View>
                  <Text className='etp-verify-date'>{new Date(v.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ① 推荐人背调 */}
          <View className='etp-verify-option'>
            <Text className='etp-verify-option-title'>① 推荐人背调</Text>
            <Text className='etp-verify-option-desc'>提供上级/前任老板的姓名、职位和联系电话，平台将进行背景调查</Text>
            <Input className='etp-input' value={refName} placeholder='推荐人姓名' placeholderClass='etp-placeholder' onInput={(e) => setRefName(e.detail.value)} />
            <Input className='etp-input' value={refTitle} placeholder='推荐人职位（如：行政总厨）' placeholderClass='etp-placeholder' onInput={(e) => setRefTitle(e.detail.value)} />
            <Input className='etp-input' type='number' value={refPhone} placeholder='推荐人联系电话' placeholderClass='etp-placeholder' onInput={(e) => setRefPhone(e.detail.value)} />
            <View className='etp-btn-primary' onClick={handleSubmitReference}>
              <Text className='etp-btn-primary-text'>提交推荐人信息</Text>
            </View>
          </View>

          {/* ② 离职/在职证明 */}
          <View className='etp-verify-option'>
            <Text className='etp-verify-option-title'>② 离职/在职证明</Text>
            <View className='etp-upload-box' onClick={() => handleUploadFile('CERTIFICATE', '离职证明上传成功')}>
              <Text className='etp-upload-box-text'>点击上传证明文件</Text>
            </View>
          </View>

          {/* ③ 工资流水 */}
          <View className='etp-verify-option'>
            <Text className='etp-verify-option-title'>③ 工资流水</Text>
            <View className='etp-upload-box' onClick={() => handleUploadFile('SALARY_FLOW', '工资流水上传成功')}>
              <Text className='etp-upload-box-text'>点击上传工资流水</Text>
            </View>
          </View>
        </View>

        {/* ====== 合伙开关 ====== */}
        <View className='etp-card'>
          <View className='etp-switch-row'>
            <View className='etp-switch-info'>
              <Text className='etp-switch-label'>接受合伙/投资引荐</Text>
              <Text className='etp-switch-desc'>开启后，企业可向您发送合伙或投资邀请</Text>
            </View>
            <View className={`etp-switch ${acceptPartner ? 'etp-switch-on' : ''}`} onClick={() => setAcceptPartner(!acceptPartner)}>
              <View className={`etp-switch-knob ${acceptPartner ? 'etp-switch-knob-on' : ''}`} />
            </View>
          </View>
        </View>

        {/* 保存按钮 */}
        <View className={`etp-save-btn ${saving ? 'etp-btn-disabled' : ''}`} onClick={() => !saving && handleSave()}>
          <Text className='etp-save-btn-text'>保存资料</Text>
        </View>
      </View>
    </View>
  )
}
