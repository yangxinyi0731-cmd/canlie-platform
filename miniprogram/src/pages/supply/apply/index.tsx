import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Picker, Image } from '@tarojs/components'
import { supplyApi, uploadApi, refApi, getImageUrl, safeArray } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import NavBar from '../../../components/NavBar'
import Icon from '../../../components/Icon'
import './index.scss'

export default function ApplySupplyStore() {
  useRequireAuth()
  const [categories, setCategories] = useState<any[]>([])
  const [cuisines, setCuisines] = useState<any[]>([])

  const [categoryId, setCategoryId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [licenseUploading, setLicenseUploading] = useState(false)
  const [productDesc, setProductDesc] = useState('')
  const [services, setServices] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [hasApplied, setHasApplied] = useState(false)

  // 产品子表单
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productImages, setProductImages] = useState<string[]>([])
  const [productUploading, setProductUploading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isFood = categories.find(c => c.id === categoryId)?.code === 'FOOD'

  useEffect(() => {
    supplyApi.getCategories().then(res => setCategories(safeArray(res.data))).catch(() => {})
    refApi.getCuisinesGrouped().then(res => {
      const data: any = res.data
      setCuisines(safeArray(data?.level1))
    }).catch(() => {})
    supplyApi.getMyCompany().then(res => {
      if (res.data) setHasApplied(true)
    }).catch(() => {})
  }, [])

  // 已申请过 → 引导去我的店铺（还原网页版）
  if (hasApplied) {
    return (
      <View className='apply-page'>
        <View className='apply-applied'>
          <Text className='apply-applied-icon'>🏪</Text>
          <Text className='apply-applied-text'>您已提交过入驻申请</Text>
          <Text className='apply-applied-sub'>可在「我的店铺」中查看审核状态或修改信息</Text>
          <View className='apply-applied-btns'>
            <View className='apply-btn-primary' onClick={() => Taro.redirectTo({ url: '/pages/supply/my/index' })}>
              <Text className='apply-btn-primary-text'>我的店铺</Text>
            </View>
            <View className='apply-btn-outline' onClick={() => Taro.navigateBack()}>
              <Text className='apply-btn-outline-text'>返回</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // 营业执照上传（Taro.chooseImage + uploadFile）
  const handleLicenseUpload = async () => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      setLicenseUploading(true)
      const res = await uploadApi.upload(filePath, 'SUPPLY_LICENSE')
      setLicenseUrl((res.data as any)?.url || '')
    } catch {
      setError('营业执照上传失败')
    } finally {
      setLicenseUploading(false)
    }
  }

  const handleProductImageUpload = async () => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      setProductUploading(true)
      const res = await uploadApi.upload(filePath, 'SUPPLY_PRODUCT_IMAGE')
      setProductImages(prev => [...prev, (res.data as any)?.url || ''])
    } catch {
      setError('产品图片上传失败')
    } finally {
      setProductUploading(false)
    }
  }

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]))
  }

  const handleSubmit = async () => {
    if (!categoryId || !companyName.trim()) {
      setError('请选择分类并填写公司名称')
      return
    }
    if (!licenseUrl) {
      setError('请上传营业执照')
      return
    }
    setSubmitting(true)
    setError('')
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
      })
      // 添加第一个产品（可选）
      if (productName.trim()) {
        await supplyApi.addProduct({
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
          description: undefined,
          cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
        })
      }
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => Taro.redirectTo({ url: '/pages/supply/my/index' }), 800)
    } catch (err: any) {
      setError(err?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryLabel = categories.find(c => c.id === categoryId)?.name || '请选择分类'

  return (
    <View className='apply-page'>
      {/* 头部（还原网页版白底 sticky） */}
      <NavBar title='商家入驻' />

      <View className='apply-body'>
        {error ? (
          <View className='apply-error'><Text className='apply-error-text'>{error}</Text></View>
        ) : null}

        {/* 基本信息 */}
        <View className='apply-card'>
          <Text className='apply-card-title'>基本信息</Text>
          <View className='apply-field'>
            <Text className='apply-label'>店铺分类 *</Text>
            <Picker mode='selector' range={categories.map(c => c.name)} onChange={(e) => setCategoryId(categories[Number(e.detail.value)]?.id || '')}>
              <View className='apply-select'>
                <Text className={`apply-select-text ${categoryId ? '' : 'apply-placeholder'}`}>{categoryLabel}</Text>
                <Icon name='chevron-down' size={28} color='#9CA3AF' />
              </View>
            </Picker>
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>公司名称 *</Text>
            <Input className='apply-input' value={companyName} placeholder='请输入营业执照上的公司名称' placeholderClass='apply-placeholder' onInput={(e) => setCompanyName(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>营业执照 *</Text>
            <View className='apply-license-row'>
              {licenseUrl ? (
                <Image src={getImageUrl(licenseUrl) || licenseUrl} className='apply-license-img' mode='aspectFill' />
              ) : (
                <View className='apply-license-placeholder'>
                  <Text className='apply-license-icon'>📄</Text>
                  <Text className='apply-license-text'>营业执照</Text>
                </View>
              )}
              <View className='apply-license-right'>
                <View className='apply-upload-btn' onClick={handleLicenseUpload}>
                  <Text className='apply-upload-text'>
                    {licenseUploading ? '上传中...' : licenseUrl ? '重新上传' : '上传图片'}
                  </Text>
                </View>
                <Text className='apply-upload-hint'>支持 jpg/png 格式，用于审核</Text>
              </View>
            </View>
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>联系人</Text>
            <Input className='apply-input' value={contactName} placeholder='联系人姓名' placeholderClass='apply-placeholder' onInput={(e) => setContactName(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>联系电话</Text>
            <Input className='apply-input' type='number' value={contactPhone} placeholder='联系电话' placeholderClass='apply-placeholder' onInput={(e) => setContactPhone(e.detail.value)} />
          </View>
        </View>

        {/* 食材公司：八大菜系 */}
        {isFood ? (
          <View className='apply-card'>
            <Text className='apply-card-title'>服务菜系（八大菜系）</Text>
            <Text className='apply-card-sub'>可多选，仅食材公司需填写</Text>
            <View className='apply-chips'>
              {cuisines.map(c => (
                <Text
                  key={c.id}
                  className={`apply-chip ${selectedCuisines.includes(c.id) ? 'apply-chip-active' : ''}`}
                  onClick={() => toggleCuisine(c.id)}
                >
                  {c.name}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* 公司信息 */}
        <View className='apply-card'>
          <Text className='apply-card-title'>公司信息</Text>
          <View className='apply-field'>
            <Text className='apply-label'>公司服务</Text>
            <Textarea className='apply-textarea' value={services} placeholder='如：蔬菜水果批发配送、宴会食材定制' placeholderClass='apply-placeholder' maxlength={500} onInput={(e) => setServices(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>公司产品</Text>
            <Textarea className='apply-textarea' value={productDesc} placeholder='主要经营的产品品类' placeholderClass='apply-placeholder' maxlength={500} onInput={(e) => setProductDesc(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <Text className='apply-label'>公司介绍</Text>
            <Textarea className='apply-textarea tall' value={introduction} placeholder='介绍公司的规模、实力、合作经验等' placeholderClass='apply-placeholder' maxlength={1000} onInput={(e) => setIntroduction(e.detail.value)} />
          </View>
        </View>

        {/* 产品发布（可选） */}
        <View className='apply-card'>
          <Text className='apply-card-title'>发布产品（可选）</Text>
          <Text className='apply-card-sub'>入驻时发布首个产品，之后可在「我的店铺」管理</Text>
          <View className='apply-field'>
            <Input className='apply-input' value={productName} placeholder='产品名称，如：岳阳小米椒' placeholderClass='apply-placeholder' onInput={(e) => setProductName(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <Input className='apply-input' value={productPrice} placeholder='价格，如：12元/斤' placeholderClass='apply-placeholder' onInput={(e) => setProductPrice(e.detail.value)} />
          </View>
          <View className='apply-field'>
            <View className='apply-img-row'>
              {productImages.map((img, idx) => (
                <View key={idx} className='apply-img-wrap'>
                  <Image src={getImageUrl(img) || img} className='apply-img' mode='aspectFill' />
                  <View className='apply-img-del' onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}>
                    <Text className='apply-img-del-text'>✕</Text>
                  </View>
                </View>
              ))}
              {productImages.length < 5 ? (
                <View className='apply-img-add' onClick={handleProductImageUpload}>
                  {productUploading ? (
                    <Text className='apply-img-add-text'>上传中</Text>
                  ) : (
                    <View className='apply-img-add-inner'>
                      <Text className='apply-img-add-plus'>+</Text>
                      <Text className='apply-img-add-label'>图片</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className={`apply-submit ${submitting ? 'apply-submit-disabled' : ''}`} onClick={() => !submitting && handleSubmit()}>
          <Text className='apply-submit-text'>{submitting ? '提交中...' : '提交入驻申请'}</Text>
        </View>
        <Text className='apply-footer-hint'>提交后由管理员审核，通过后店铺将展示在供应平台</Text>
      </View>
    </View>
  )
}
