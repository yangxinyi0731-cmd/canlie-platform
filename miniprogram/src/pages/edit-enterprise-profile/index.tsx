import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Picker, Image } from '@tarojs/components'
import { enterpriseApi, uploadApi, getImageUrl } from '../../api'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar from '../../components/NavBar'
import Loading from '../../components/Loading'
import Icon from '../../components/Icon'
import './index.scss'

const COMPANY_SIZES = ['1-50人', '50-200人', '200-500人', '500-2000人', '2000人以上']
const REVENUES = ['100万以下', '100-500万', '500-1000万', '1000-5000万', '5000万以上']
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '大连', '厦门', '合肥', '福州', '南昌', '济南', '沈阳', '长春', '哈尔滨', '石家庄', '太原', '呼和浩特', '南宁', '海口', '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐', '佛山', '无锡', '常州', '徐州', '温州', '绍兴', '嘉兴', '珠海', '中山', '惠州', '泉州', '烟台', '潍坊', '洛阳', '唐山', '三亚', '桂林', '丽江', '张家界', '秦皇岛', '北海', '大理', '遵义', '襄阳', '宜昌', '九江', '芜湖', '廊坊']
const PROVINCES = ['北京市', '上海市', '天津市', '重庆市', '河北省', '山西省', '内蒙古', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西', '海南省', '四川省', '贵州省', '云南省', '西藏', '陕西省', '甘肃省', '青海省', '宁夏', '新疆']

export default function EditEnterpriseProfile() {
  useRequireAuth('ENTERPRISE')
  const { user, updateUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [businessLicense, setBusinessLicense] = useState('')
  const [isPreparation, setIsPreparation] = useState(false)
  const [personalIdFront, setPersonalIdFront] = useState('')
  const [personalIdBack, setPersonalIdBack] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [revenue, setRevenue] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [website, setWebsite] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [businessModelDescription, setBusinessModelDescription] = useState('')
  const [developmentPlan, setDevelopmentPlan] = useState('')
  const [shareholderInfo, setShareholderInfo] = useState('')
  const [mainMarkets, setMainMarkets] = useState('')
  const [welfareBenefits, setWelfareBenefits] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [bossInfo, setBossInfo] = useState('')
  const [equityOpportunity, setEquityOpportunity] = useState(false)

  const [licenseVerified, setLicenseVerified] = useState(false)
  const [status, setStatus] = useState('PENDING')

  useEffect(() => {
    enterpriseApi.getProfile().then(res => {
      const ent: any = res.data
      if (!ent) return
      setCompanyName(ent.companyName || '')
      setCompanyLogo(ent.companyLogo || '')
      setBusinessLicense(ent.businessLicense || '')
      setIsPreparation(!!ent.isPreparation)
      setPersonalIdFront(ent.personalIdFront || '')
      setPersonalIdBack(ent.personalIdBack || '')
      setCompanySize(ent.companySize || '')
      setRevenue(ent.revenue || '')
      setDescription(ent.description || '')
      setAddress(ent.address || '')
      setCity(ent.city || '')
      setProvince(ent.province || '')
      setWebsite(ent.website || '')
      setContactName(ent.contactName || '')
      setContactPhone(ent.contactPhone || '')
      setNotes(ent.notes || '')
      setBusinessModelDescription(ent.businessModelDescription || '')
      setDevelopmentPlan(ent.developmentPlan || '')
      setShareholderInfo(ent.shareholderInfo || '')
      setMainMarkets(ent.mainMarkets || '')
      setWelfareBenefits(ent.welfareBenefits || '')
      setCurrentStatus(ent.currentStatus || '')
      setBossInfo(ent.bossInfo || '')
      setEquityOpportunity(!!ent.equityOpportunity)
      setLicenseVerified(!!ent.licenseVerified)
      setStatus(ent.status || 'PENDING')
    }).catch(() => {
      setError('加载企业信息失败')
    }).finally(() => setLoading(false))
  }, [])

  // 上传图片通用封装
  const uploadImage = async (onSuccess: (url: string) => void, successMsg: string) => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      setError('')
      const res = await uploadApi.upload(filePath)
      onSuccess((res.data as any)?.url || '')
      setSuccess(successMsg)
    } catch (err: any) {
      setError(err?.message || '上传失败')
    }
  }

  const handleSave = async () => {
    if (!companyName.trim()) {
      setError('请填写企业名称')
      return
    }
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await enterpriseApi.updateProfile({
        companyName: companyName.trim(),
        companyLogo,
        businessLicense,
        isPreparation,
        personalIdFront,
        personalIdBack,
        companySize,
        revenue,
        description: description.trim(),
        address: address.trim(),
        city,
        province,
        website: website.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        notes: notes.trim(),
        businessModelDescription: businessModelDescription.trim() || undefined,
        developmentPlan: developmentPlan.trim() || undefined,
        shareholderInfo: shareholderInfo.trim() || undefined,
        mainMarkets: mainMarkets.trim() || undefined,
        welfareBenefits: welfareBenefits.trim() || undefined,
        currentStatus: currentStatus.trim() || undefined,
        bossInfo: bossInfo.trim() || undefined,
        equityOpportunity,
      })
      if (user) {
        updateUser({ ...user, profile: res.data as any })
      }
      setSuccess('保存成功')
      setTimeout(() => Taro.navigateBack(), 1000)
    } catch (err: any) {
      setError(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className='eep-page'>
        <NavBar title='企业信息' />
        <Loading />
      </View>
    )
  }

  return (
    <View className='eep-page'>
      <NavBar
        title='企业信息'
        right={
          <Text className={`eep-save-link ${saving ? 'eep-link-disabled' : ''}`} onClick={() => !saving && handleSave()}>
            {saving ? '保存中...' : '保存'}
          </Text>
        }
      />

      {/* 提示条（还原网页版红/绿提示） */}
      {error ? (
        <View className='eep-msg eep-msg-error'><Text className='eep-msg-text eep-msg-error-text'>{error}</Text></View>
      ) : null}
      {success ? (
        <View className='eep-msg eep-msg-success'>
          <Icon name='check' size={32} color='#16A34A' />
          <Text className='eep-msg-text eep-msg-success-text'>{success}</Text>
        </View>
      ) : null}

      {/* 认证状态横幅（还原网页版三态） */}
      <View className='eep-banner-wrap'>
        {status === 'PENDING' ? (
          <View className='eep-banner eep-banner-pending'>
            <Icon name='clock' size={40} color='#EAB308' />
            <View>
              <Text className='eep-banner-title eep-banner-pending-title'>企业信息待审核</Text>
              <Text className='eep-banner-text eep-banner-pending-text'>
                {isPreparation ? '筹备阶段企业，请上传个人身份证进行实名认证' : '请上传营业执照，等待平台审核通过后即可发布职位'}
              </Text>
            </View>
          </View>
        ) : null}
        {status === 'APPROVED' ? (
          <View className='eep-banner eep-banner-approved'>
            <Icon name='check-circle' size={40} color='#22C55E' />
            <View>
              <Text className='eep-banner-title eep-banner-approved-title'>企业已认证</Text>
              <Text className='eep-banner-text eep-banner-approved-text'>您可以正常发布职位和招聘人才</Text>
            </View>
          </View>
        ) : null}
        {status === 'REJECTED' ? (
          <View className='eep-banner eep-banner-rejected'>
            <Icon name='x' size={40} color='#EF4444' />
            <View>
              <Text className='eep-banner-title eep-banner-rejected-title'>审核未通过</Text>
              <Text className='eep-banner-text eep-banner-rejected-text'>请检查材料是否清晰有效，重新上传</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View className='eep-body'>
        {/* 企业类型（筹备阶段开关） */}
        <View className='eep-card'>
          <Text className='eep-card-title'>企业类型</Text>
          <View className='eep-switch-row'>
            <View className='eep-switch-info'>
              <Text className='eep-switch-label'>筹备阶段</Text>
              <Text className='eep-switch-desc'>初创公司尚未取得营业执照，需用个人身份证做实名认证</Text>
            </View>
            <View className={`eep-switch ${isPreparation ? 'eep-switch-on' : ''}`} onClick={() => setIsPreparation(!isPreparation)}>
              <View className={`eep-switch-knob ${isPreparation ? 'eep-switch-knob-on' : ''}`} />
            </View>
          </View>
        </View>

        {/* 基本信息 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>基本信息</Text>
          <View className='eep-field'>
            <Text className='eep-label'>企业Logo</Text>
            <View className='eep-logo-row'>
              {companyLogo ? (
                <Image src={getImageUrl(companyLogo) || companyLogo} className='eep-logo-img' mode='aspectFill' />
              ) : (
                <View className='eep-logo-placeholder'>
                  <Icon name='image' size={48} color='#9CA3AF' />
                </View>
              )}
              <Text
                className='eep-upload-link'
                onClick={() => uploadImage(setCompanyLogo, 'Logo上传成功')}
              >
                上传Logo
              </Text>
            </View>
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>企业名称 *</Text>
            <Input className='eep-input' value={companyName} placeholder='请输入企业全称' placeholderClass='eep-placeholder' onInput={(e) => setCompanyName(e.detail.value)} />
          </View>
          <View className='eep-row'>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>所在省份</Text>
              <Picker mode='selector' range={['请选择省份', ...PROVINCES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setProvince(idx === 0 ? '' : PROVINCES[idx - 1])
              }}>
                <View className='eep-select'>
                  <Text className={`eep-select-text ${province ? '' : 'eep-placeholder'}`}>{province || '请选择省份'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>所在城市</Text>
              <Picker mode='selector' range={['请选择城市', ...CITIES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setCity(idx === 0 ? '' : CITIES[idx - 1])
              }}>
                <View className='eep-select'>
                  <Text className={`eep-select-text ${city ? '' : 'eep-placeholder'}`}>{city || '请选择城市'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>详细地址</Text>
            <Input className='eep-input' value={address} placeholder='企业详细地址' placeholderClass='eep-placeholder' onInput={(e) => setAddress(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>企业官网</Text>
            <Input className='eep-input' value={website} placeholder='https://...' placeholderClass='eep-placeholder' onInput={(e) => setWebsite(e.detail.value)} />
          </View>
        </View>

        {/* 营业执照 / 身份证 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>{isPreparation ? '个人身份证（筹备阶段实名认证）' : '营业执照'}</Text>
          {isPreparation ? (
            <View>
              <Text className='eep-hint'>筹备阶段企业无需营业执照，请上传个人身份证正反面进行实名认证</Text>
              <View className='eep-field'>
                <Text className='eep-label'>身份证正面（人像面）</Text>
                {personalIdFront ? (
                  <View className='eep-license-row'>
                    <Image src={getImageUrl(personalIdFront) || personalIdFront} className='eep-id-img' mode='aspectFill' />
                    <Text className='eep-upload-link' onClick={() => uploadImage(setPersonalIdFront, '身份证正面上传成功')}>重新上传</Text>
                  </View>
                ) : (
                  <View className='eep-upload-box' onClick={() => uploadImage(setPersonalIdFront, '身份证正面上传成功')}>
                    <Text className='eep-upload-box-text'>点击上传身份证正面</Text>
                  </View>
                )}
              </View>
              <View className='eep-field'>
                <Text className='eep-label'>身份证反面（国徽面）</Text>
                {personalIdBack ? (
                  <View className='eep-license-row'>
                    <Image src={getImageUrl(personalIdBack) || personalIdBack} className='eep-id-img' mode='aspectFill' />
                    <Text className='eep-upload-link' onClick={() => uploadImage(setPersonalIdBack, '身份证反面上传成功')}>重新上传</Text>
                  </View>
                ) : (
                  <View className='eep-upload-box' onClick={() => uploadImage(setPersonalIdBack, '身份证反面上传成功')}>
                    <Text className='eep-upload-box-text'>点击上传身份证反面</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View>
              <Text className='eep-hint'>上传营业执照照片或扫描件（支持 jpg/png，不超过 10MB）</Text>
              {businessLicense ? (
                <View className='eep-license-row'>
                  <Image src={getImageUrl(businessLicense) || businessLicense} className='eep-license-img' mode='aspectFill' />
                  <View className='eep-license-right'>
                    <Text className={`eep-status-pill ${licenseVerified ? 'eep-pill-green' : 'eep-pill-yellow'}`}>
                      {licenseVerified ? '已认证' : '待审核'}
                    </Text>
                    <Text className='eep-upload-link' onClick={() => uploadImage(setBusinessLicense, '营业执照上传成功，等待平台审核')}>重新上传</Text>
                  </View>
                </View>
              ) : (
                <View className='eep-upload-box tall' onClick={() => uploadImage(setBusinessLicense, '营业执照上传成功，等待平台审核')}>
                  <Icon name='send' size={64} color='#9CA3AF' />
                  <Text className='eep-upload-box-text'>点击上传营业执照</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 企业规模 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>企业规模</Text>
          <View className='eep-row'>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>员工规模</Text>
              <Picker mode='selector' range={['请选择', ...COMPANY_SIZES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setCompanySize(idx === 0 ? '' : COMPANY_SIZES[idx - 1])
              }}>
                <View className='eep-select'>
                  <Text className={`eep-select-text ${companySize ? '' : 'eep-placeholder'}`}>{companySize || '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>年营业额</Text>
              <Picker mode='selector' range={['请选择', ...REVENUES]} onChange={(e) => {
                const idx = Number(e.detail.value)
                setRevenue(idx === 0 ? '' : REVENUES[idx - 1])
              }}>
                <View className='eep-select'>
                  <Text className={`eep-select-text ${revenue ? '' : 'eep-placeholder'}`}>{revenue || '请选择'}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
            </View>
          </View>
        </View>

        {/* 企业简介 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>企业简介</Text>
          <Textarea className='eep-textarea' value={description} placeholder='请简要介绍企业背景、主营业务、企业文化等...' placeholderClass='eep-placeholder' maxlength={2000} onInput={(e) => setDescription(e.detail.value)} />
        </View>

        {/* AI 企业画像 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>🤖 AI 企业画像</Text>
          <Text className='eep-hint'>完善以下信息可大幅提升 AI 匹配与星级评估准确度</Text>
          <View className='eep-field'>
            <Text className='eep-label'>商业模式</Text>
            <Textarea className='eep-textarea short' value={businessModelDescription} placeholder='如：直营连锁+加盟，主打品质湘菜中高端市场...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setBusinessModelDescription(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>发展规划</Text>
            <Textarea className='eep-textarea short' value={developmentPlan} placeholder='如：未来3年目标开设50家门店，布局华东市场...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setDevelopmentPlan(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>股东结构</Text>
            <Textarea className='eep-textarea short' value={shareholderInfo} placeholder='如：创始人持股60%，核心团队持股40%...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setShareholderInfo(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>主要发展市场</Text>
            <Input className='eep-input' value={mainMarkets} placeholder='如：一二线城市商圈、社区店、外卖市场...' placeholderClass='eep-placeholder' onInput={(e) => setMainMarkets(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>福利待遇</Text>
            <Textarea className='eep-textarea short' value={welfareBenefits} placeholder='如：五险一金、包吃住、年终奖、股权激励...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setWelfareBenefits(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>经营现状</Text>
            <Textarea className='eep-textarea short' value={currentStatus} placeholder='如：现有8家门店，单店日均营业额3-5万，经营稳定盈利...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setCurrentStatus(e.detail.value)} />
          </View>
          <View className='eep-field'>
            <Text className='eep-label'>老板个人情况</Text>
            <Textarea className='eep-textarea short' value={bossInfo} placeholder='如：创始人深耕餐饮20年，为人务实，重视人才...' placeholderClass='eep-placeholder' maxlength={500} onInput={(e) => setBossInfo(e.detail.value)} />
          </View>
          {/* 投资入股开关 */}
          <View className='eep-checkbox-row' onClick={() => setEquityOpportunity(!equityOpportunity)}>
            <View className='eep-checkbox-info'>
              <Text className='eep-switch-label'>提供投资入股绑定机会</Text>
              <Text className='eep-switch-desc'>愿意为核心人才提供股权/分红绑定，增强人才吸引力</Text>
            </View>
            <View className={`eep-switch ${equityOpportunity ? 'eep-switch-on' : ''}`}>
              <View className={`eep-switch-knob ${equityOpportunity ? 'eep-switch-knob-on' : ''}`} />
            </View>
          </View>
        </View>

        {/* 备注 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>备注信息</Text>
          <Textarea className='eep-textarea' value={notes} placeholder='如：本企业招聘酒店总经理、星级酒店总厨等特殊职位...' placeholderClass='eep-placeholder' maxlength={1000} onInput={(e) => setNotes(e.detail.value)} />
        </View>

        {/* 联系方式 */}
        <View className='eep-card'>
          <Text className='eep-card-title'>联系方式</Text>
          <View className='eep-row'>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>联系人</Text>
              <Input className='eep-input' value={contactName} placeholder='联系人姓名' placeholderClass='eep-placeholder' onInput={(e) => setContactName(e.detail.value)} />
            </View>
            <View className='eep-field eep-half'>
              <Text className='eep-label'>联系电话</Text>
              <Input className='eep-input' type='number' value={contactPhone} placeholder='联系电话' placeholderClass='eep-placeholder' onInput={(e) => setContactPhone(e.detail.value)} />
            </View>
          </View>
        </View>

        {/* 保存按钮 */}
        <View className={`eep-save-btn ${saving ? 'eep-btn-disabled' : ''}`} onClick={() => !saving && handleSave()}>
          <Text className='eep-save-btn-text'>保存信息</Text>
        </View>
      </View>
    </View>
  )
}
