import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import { jobsApi, refApi, subscriptionApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Icon from '../../components/Icon'
import './index.scss'

interface Plan {
  id: string
  name: string
  type: string
  price: number
  jobQuota: number
  durationDays: number
}

const STEPS = ['基础信息', '职位要求', '薪资地点', '业态菜系', '发布付费']

const EDUCATION_OPTIONS = ['不限', '高中', '中专', '大专', '本科', '硕士', '博士']
const EXPERIENCE_OPTIONS = ['不限', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上']
const SALARY_MONTH_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 20, 24]
const GENDER_OPTIONS = ['不限', '男', '女']
const TENURE_OPTIONS = ['不限', '3年以上', '5年以上']
const CITIES = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊']
const PROVINCES = ['北京市', '上海市', '天津市', '重庆市', '河北省', '山西省', '内蒙古', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西', '海南省', '四川省', '贵州省', '云南省', '西藏', '陕西省', '甘肃省', '青海省', '宁夏', '新疆']

export default function PostJob() {
  useRequireAuth('ENTERPRISE')
  const router = useRouter()
  const { id } = router.params
  const isEditing = Boolean(id)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!id)

  const [cuisines, setCuisines] = useState<any[]>([])
  const [businessTypes, setBusinessTypes] = useState<any[]>([])
  const [jobCategories, setJobCategories] = useState<any[]>([])
  const [plans, setPlans] = useState<Plan[]>([])

  // 表单状态
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [jobCategoryId, setJobCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [educationReq, setEducationReq] = useState('')
  const [experienceReq, setExperienceReq] = useState('')
  const [minSalary, setMinSalary] = useState('')
  const [maxSalary, setMaxSalary] = useState('')
  const [salaryMonth, setSalaryMonth] = useState('12')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([])
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [openPartner, setOpenPartner] = useState(false)
  const [genderReq, setGenderReq] = useState('')
  const [minTenureReq, setMinTenureReq] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    refApi.getAll().then(res => {
      const data: any = res.data
      setCuisines(safeArray(data?.cuisines))
      setBusinessTypes(safeArray(data?.businessTypes))
      setJobCategories(safeArray(data?.jobCategories))
    }).catch(() => {})
    refApi.getPlans().then(res => {
      setPlans(safeArray(res.data as any))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    jobsApi.getById(id).then(res => {
      const job: any = res.data
      if (!job) return
      setTitle(job.title || '')
      setDepartment(job.department || '')
      setJobCategoryId(job.jobCategoryId || '')
      setDescription(job.description || '')
      setRequirements(job.requirements || '')
      setEducationReq(job.educationReq || '')
      setExperienceReq(job.experienceReq?.toString() || '')
      setMinSalary(job.minSalary?.toString() || '')
      setMaxSalary(job.maxSalary?.toString() || '')
      setSalaryMonth(job.salaryMonth?.toString() || '12')
      setCity(job.city || '')
      setProvince(job.province || '')
      setDistrict(job.district || '')
      setAddress(job.address || '')
      setSelectedBusinessTypes(job.businessTypeIds ? job.businessTypeIds.split(',').filter(Boolean) : [])
      setSelectedCuisines(job.cuisineIds ? job.cuisineIds.split(',').filter(Boolean) : [])
      setOpenPartner(!!job.openPartner)
      setGenderReq(job.genderReq || '')
      setMinTenureReq(job.minTenureReq?.toString() || '')
    }).catch(() => {
      setError('加载职位信息失败')
    }).finally(() => setLoading(false))
  }, [id])

  const validateStep = (): boolean => {
    setError('')
    if (step === 1) {
      if (!title.trim()) { setError('请填写职位名称'); return false }
      return true
    }
    if (step === 2) {
      if (!description.trim()) { setError('请填写职位描述'); return false }
      if (!requirements.trim()) { setError('请填写任职要求'); return false }
      return true
    }
    if (step === 3) {
      const min = parseInt(minSalary)
      const max = parseInt(maxSalary)
      if (!min || !max) { setError('请填写薪资范围'); return false }
      if (min < 8000) { setError('平台职位月薪不低于8000元'); return false }
      if (min >= max) { setError('最高薪资应高于最低薪资'); return false }
      if (!city) { setError('请选择城市'); return false }
      return true
    }
    if (step === 4) {
      if (selectedBusinessTypes.length < 3) { setError('请至少选择3个业态（不低于3个）'); return false }
      if (selectedBusinessTypes.length > 5) { setError('业态选择不能超过5个'); return false }
      return true
    }
    if (step === 5) {
      if (!selectedPlanId) { setError('请选择发布方案'); return false }
      return true
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep(s => Math.min(s + 1, 5))
  }

  const handlePrev = () => {
    setError('')
    setStep(s => Math.max(s - 1, 1))
  }

  const toggleBusinessType = (btId: string) => {
    setSelectedBusinessTypes(prev => {
      if (prev.includes(btId)) return prev.filter(x => x !== btId)
      if (prev.length >= 5) {
        setError('业态选择不能超过5个')
        return prev
      }
      return [...prev, btId]
    })
  }

  const toggleCuisine = (cid: string) => {
    setSelectedCuisines(prev => (prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]))
  }

  const handleSubmit = async () => {
    if (!validateStep() || submitting) return
    setSubmitting(true)
    setError('')

    const payload: Record<string, unknown> = {
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
    }

    try {
      // 新发布时购买订阅（还原网页版：失败静默跳过继续发布）
      if (!isEditing && selectedPlanId) {
        try {
          await subscriptionApi.buy(selectedPlanId)
        } catch {
          // ignore
        }
      }
      if (isEditing && id) {
        await jobsApi.update(id, payload)
      } else {
        await jobsApi.create(payload)
      }
      Taro.showToast({ title: isEditing ? '保存成功' : '发布成功', icon: 'success' })
      setTimeout(() => Taro.reLaunch({ url: '/pages/jobs/index' }), 800)
    } catch (err: any) {
      setError(err?.message || (isEditing ? '更新失败' : '发布失败'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className='pj-page'>
        <NavBar title={isEditing ? '编辑职位' : '发布新职位'} />
        <View className='pj-loading'>
          <View className='pj-loading-spinner' />
        </View>
      </View>
    )
  }

  // 岗位分类扁平化（parent - sub）
  const flatCategories: { id: string; label: string }[] = []
  jobCategories.forEach((cat: any) => {
    safeArray(cat.subCategories).forEach((sub: any) => {
      flatCategories.push({ id: sub.id, label: `${cat.name} - ${sub.name}` })
    })
  })
  const jobCategoryLabel = flatCategories.find(c => c.id === jobCategoryId)?.label || '请选择岗位分类'

  const bizCount = selectedBusinessTypes.length

  return (
    <View className='pj-page'>
      <NavBar title={isEditing ? '编辑职位' : '发布新职位'} />

      {/* 步骤条（还原网页版：圆点 + 连接线，完成绿/当前橙） */}
      <View className='pj-steps'>
        {STEPS.map((label, idx) => {
          const num = idx + 1
          const isActive = step === num
          const isDone = step > num
          return (
            <View key={num} className='pj-step'>
              <View className={`pj-step-dot ${isActive ? 'pj-step-active' : ''} ${isDone ? 'pj-step-done' : ''}`}>
                {isDone ? <Icon name='check' size={24} color='#ffffff' strokeWidth={3} /> : <Text className='pj-step-num'>{num}</Text>}
              </View>
              <Text className={`pj-step-label ${isActive ? 'pj-step-label-active' : ''}`}>{label}</Text>
            </View>
          )
        })}
      </View>

      {/* 错误条 */}
      {error ? (
        <View className='pj-error'><Text className='pj-error-text'>{error}</Text></View>
      ) : null}

      <View className='pj-body'>
        {/* Step 1: 基础信息 */}
        {step === 1 && (
          <View className='pj-card'>
            <View className='pj-field'>
              <Text className='pj-label'>职位名称 <Text className='pj-required'>*</Text></Text>
              <Input
                className='pj-input'
                value={title}
                placeholder='如：行政总厨'
                placeholderClass='pj-placeholder'
                onInput={(e) => setTitle(e.detail.value)}
              />
            </View>
            <View className='pj-field'>
              <Text className='pj-label'>岗位分类</Text>
              <Picker
                mode='selector'
                range={flatCategories.map(c => c.label)}
                onChange={(e) => setJobCategoryId(flatCategories[Number(e.detail.value)]?.id || '')}
              >
                <View className='pj-select'>
                  <Text className={`pj-select-text ${jobCategoryId ? '' : 'pj-placeholder'}`}>{jobCategoryLabel}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='pj-field'>
              <Text className='pj-label'>所属部门</Text>
              <Input
                className='pj-input'
                value={department}
                placeholder='如：后厨部'
                placeholderClass='pj-placeholder'
                onInput={(e) => setDepartment(e.detail.value)}
              />
            </View>
          </View>
        )}

        {/* Step 2: 职位要求 */}
        {step === 2 && (
          <View className='pj-card'>
            <View className='pj-field'>
              <Text className='pj-label'>职位描述 <Text className='pj-required'>*</Text></Text>
              <Textarea
                className='pj-textarea'
                value={description}
                placeholder='请描述岗位职责...'
                placeholderClass='pj-placeholder'
                maxlength={2000}
                onInput={(e) => setDescription(e.detail.value)}
              />
            </View>
            <View className='pj-field'>
              <Text className='pj-label'>任职要求 <Text className='pj-required'>*</Text></Text>
              <Textarea
                className='pj-textarea'
                value={requirements}
                placeholder='请描述任职要求...'
                placeholderClass='pj-placeholder'
                maxlength={2000}
                onInput={(e) => setRequirements(e.detail.value)}
              />
            </View>
            <View className='pj-row'>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>学历要求</Text>
                <Picker
                  mode='selector'
                  range={EDUCATION_OPTIONS}
                  onChange={(e) => setEducationReq(EDUCATION_OPTIONS[Number(e.detail.value)] === '不限' ? '' : EDUCATION_OPTIONS[Number(e.detail.value)])}
                >
                  <View className='pj-select'>
                    <Text className={`pj-select-text ${educationReq ? '' : 'pj-placeholder'}`}>
                      {educationReq || '不限'}
                    </Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>经验要求</Text>
                <Picker
                  mode='selector'
                  range={EXPERIENCE_OPTIONS}
                  onChange={(e) => setExperienceReq(EXPERIENCE_OPTIONS[Number(e.detail.value)] === '不限' ? '' : EXPERIENCE_OPTIONS[Number(e.detail.value)])}
                >
                  <View className='pj-select'>
                    <Text className={`pj-select-text ${experienceReq ? '' : 'pj-placeholder'}`}>
                      {experienceReq || '不限'}
                    </Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
            </View>
            <View className='pj-row'>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>性别要求</Text>
                <Picker
                  mode='selector'
                  range={GENDER_OPTIONS}
                  onChange={(e) => {
                    const opt = GENDER_OPTIONS[Number(e.detail.value)]
                    setGenderReq(opt === '男' ? 'MALE' : opt === '女' ? 'FEMALE' : '')
                  }}
                >
                  <View className='pj-select'>
                    <Text className='pj-select-text'>
                      {genderReq === 'MALE' ? '男' : genderReq === 'FEMALE' ? '女' : '不限'}
                    </Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>单位任职时长</Text>
                <Picker
                  mode='selector'
                  range={TENURE_OPTIONS}
                  onChange={(e) => {
                    const opt = TENURE_OPTIONS[Number(e.detail.value)]
                    setMinTenureReq(opt === '3年以上' ? '3' : opt === '5年以上' ? '5' : '')
                  }}
                >
                  <View className='pj-select'>
                    <Text className='pj-select-text'>
                      {minTenureReq === '3' ? '3年以上' : minTenureReq === '5' ? '5年以上' : '不限'}
                    </Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: 薪资地点 */}
        {step === 3 && (
          <View className='pj-card'>
            <View className='pj-row'>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>最低月薪 (元) <Text className='pj-required'>*</Text></Text>
                <Input
                  className='pj-input'
                  type='number'
                  value={minSalary}
                  placeholder='≥ 8000'
                  placeholderClass='pj-placeholder'
                  onInput={(e) => setMinSalary(e.detail.value)}
                />
              </View>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>最高月薪 (元) <Text className='pj-required'>*</Text></Text>
                <Input
                  className='pj-input'
                  type='number'
                  value={maxSalary}
                  placeholder='如：50000'
                  placeholderClass='pj-placeholder'
                  onInput={(e) => setMaxSalary(e.detail.value)}
                />
              </View>
            </View>
            <View className='pj-field'>
              <Text className='pj-label'>年薪月数</Text>
              <Picker
                mode='selector'
                range={SALARY_MONTH_OPTIONS.map(m => `${m} 薪`)}
                onChange={(e) => setSalaryMonth(String(SALARY_MONTH_OPTIONS[Number(e.detail.value)]))}
              >
                <View className='pj-select'>
                  <Text className='pj-select-text'>{salaryMonth} 薪</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='pj-row'>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>省份 <Text className='pj-required'>*</Text></Text>
                <Picker
                  mode='selector'
                  range={PROVINCES}
                  onChange={(e) => setProvince(PROVINCES[Number(e.detail.value)])}
                >
                  <View className='pj-select'>
                    <Text className={`pj-select-text ${province ? '' : 'pj-placeholder'}`}>{province || '请选择省份'}</Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>城市 <Text className='pj-required'>*</Text></Text>
                <Picker
                  mode='selector'
                  range={CITIES}
                  onChange={(e) => setCity(CITIES[Number(e.detail.value)])}
                >
                  <View className='pj-select'>
                    <Text className={`pj-select-text ${city ? '' : 'pj-placeholder'}`}>{city || '请选择城市'}</Text>
                    <Icon name='chevron-down' size={28} color='#9CA3AF' />
                  </View>
                </Picker>
              </View>
            </View>
            <View className='pj-row'>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>区域</Text>
                <Input
                  className='pj-input'
                  value={district}
                  placeholder='如：朝阳区'
                  placeholderClass='pj-placeholder'
                  onInput={(e) => setDistrict(e.detail.value)}
                />
              </View>
              <View className='pj-field pj-half'>
                <Text className='pj-label'>详细地址</Text>
                <Input
                  className='pj-input'
                  value={address}
                  placeholder='街道门牌号'
                  placeholderClass='pj-placeholder'
                  onInput={(e) => setAddress(e.detail.value)}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 4: 业态菜系 */}
        {step === 4 && (
          <View className='pj-card'>
            <View className='pj-field'>
              <View className='pj-bt-header'>
                <Text className='pj-label'>业态选择 <Text className='pj-required'>*</Text></Text>
                <Text className={`pj-bt-count ${bizCount < 3 || bizCount > 5 ? 'pj-bt-count-bad' : 'pj-bt-count-good'}`}>
                  已选 {bizCount} 个<Text className='pj-bt-hint'>（要求3-5个）</Text>
                </Text>
              </View>
              {bizCount < 3 ? <Text className='pj-bt-warn'>⚠️ 至少需要选择3个业态</Text> : null}
              <View className='pj-chips'>
                {businessTypes.map(bt => (
                  <Text
                    key={bt.id}
                    className={`pj-chip ${selectedBusinessTypes.includes(bt.id) ? 'pj-chip-active' : ''}`}
                    onClick={() => toggleBusinessType(bt.id)}
                  >
                    {bt.name}
                  </Text>
                ))}
                {businessTypes.length === 0 ? <Text className='pj-loading-text'>加载中...</Text> : null}
              </View>
            </View>

            <View className='pj-field'>
              <Text className='pj-label'>菜系选择</Text>
              <View className='pj-chips'>
                {cuisines.filter((c: any) => c.level === 1).map((c: any) => (
                  <Text
                    key={c.id}
                    className={`pj-chip ${selectedCuisines.includes(c.id) ? 'pj-chip-active' : ''}`}
                    onClick={() => toggleCuisine(c.id)}
                  >
                    {c.name}
                  </Text>
                ))}
                {cuisines.length === 0 ? <Text className='pj-loading-text'>加载中...</Text> : null}
              </View>
            </View>

            {/* 开放合伙开关（还原网页版 toggle） */}
            <View className='pj-switch-row'>
              <Text className='pj-switch-label'>开放合伙/投资引荐</Text>
              <View
                className={`pj-switch ${openPartner ? 'pj-switch-on' : ''}`}
                onClick={() => setOpenPartner(!openPartner)}
              >
                <View className={`pj-switch-knob ${openPartner ? 'pj-switch-knob-on' : ''}`} />
              </View>
            </View>
          </View>
        )}

        {/* Step 5: 发布付费 */}
        {step === 5 && (
          <View className='pj-card'>
            <View className='pj-plan-header'>
              <Text className='pj-plan-title'>选择发布方案</Text>
              <Text className='pj-plan-sub'>选择合适的付费方案发布职位</Text>
            </View>

            <View>
              {plans.map(plan => {
                const isSelected = selectedPlanId === plan.id
                const quotaLabel = plan.jobQuota === -1 ? '不限发布数' : `可发布${plan.jobQuota}个职位`
                const durationLabel = plan.type === 'PER_JOB' ? '30天有效期' : `${plan.durationDays}天内有效`
                let badge = ''
                let badgeCls = ''
                if (plan.type === 'YEARLY') { badge = '最划算'; badgeCls = 'pj-badge-red' }
                else if (plan.type === 'QUARTERLY') { badge = '推荐'; badgeCls = 'pj-badge-blue' }
                else if (plan.type === 'MONTHLY') { badge = '灵活'; badgeCls = 'pj-badge-green' }
                return (
                  <View
                    key={plan.id}
                    className={`pj-plan-card ${isSelected ? 'pj-plan-selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <View className={`pj-radio ${isSelected ? 'pj-radio-selected' : ''}`}>
                      {isSelected ? <View className='pj-radio-dot' /> : null}
                    </View>
                    <View className='pj-plan-info'>
                      <View className='pj-plan-name-row'>
                        <Text className='pj-plan-name'>{plan.name}</Text>
                        {badge ? <Text className={`pj-badge ${badgeCls}`}>{badge}</Text> : null}
                      </View>
                      <View className='pj-plan-meta'>
                        <Text className='pj-plan-meta-text'>{quotaLabel}</Text>
                        <Text className='pj-plan-meta-dot'>·</Text>
                        <Text className='pj-plan-meta-text'>{durationLabel}</Text>
                      </View>
                      {plan.type === 'YEARLY' ? (
                        <Text className='pj-plan-tip'>
                          相当于 ¥{(plan.price / 12).toFixed(0)}/月，比月度VIP节省 ¥{(299 * 12 - plan.price).toFixed(0)}
                        </Text>
                      ) : null}
                    </View>
                    <View className='pj-plan-price'>
                      <Text className='pj-price'>¥{plan.price}</Text>
                      {plan.type !== 'PER_JOB' ? (
                        <Text className='pj-price-sub'>约¥{(plan.price / (plan.durationDays / 30)).toFixed(0)}/月</Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
              {plans.length === 0 ? <Text className='pj-loading-text pj-plan-loading'>加载方案中...</Text> : null}
            </View>

            {/* 提交按钮（还原网页版） */}
            <View className={`pj-submit-btn ${submitting ? 'pj-submit-disabled' : ''}`} onClick={handleSubmit}>
              {submitting ? (
                <View className='pj-submit-loading'>
                  <View className='pj-submit-spinner' />
                  <Text className='pj-submit-text'>提交中...</Text>
                </View>
              ) : (
                <Text className='pj-submit-text'>
                  {isEditing
                    ? '保存修改'
                    : `确认发布${selectedPlanId ? `（¥${plans.find(p => p.id === selectedPlanId)?.price || ''}）` : ''}`}
                </Text>
              )}
            </View>

            <Text className='pj-agreement'>发布即代表同意平台协议，平台将对职位信息进行审核</Text>
          </View>
        )}
      </View>

      {/* 底部导航（还原网页版：取消/上一步 + 下一步） */}
      <View className='pj-bottom-bar safe-bottom'>
        {step > 1 ? (
          <Text className='pj-nav-btn pj-nav-gray' onClick={handlePrev}>上一步</Text>
        ) : (
          <Text className='pj-nav-btn pj-nav-gray' onClick={() => Taro.navigateBack()}>取消</Text>
        )}
        {step < 5 ? (
          <Text className='pj-nav-btn pj-nav-primary' onClick={handleNext}>下一步</Text>
        ) : null}
      </View>
    </View>
  )
}
