import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Picker, Image } from '@tarojs/components'
import { supplyApi, uploadApi, refApi, getImageUrl, safeArray } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import Loading from '../../../components/Loading'
import NavBar from '../../../components/NavBar'
import Icon from '../../../components/Icon'
import type { SupplyCompany, SupplyProduct } from '../../../types'
import './index.scss'

function parseImages(json?: string): string[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// 状态映射（还原网页版 STATUS_CONFIG）
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '审核中', cls: 'st-yellow-strong' },
  APPROVED: { label: '已通过', cls: 'st-green-strong' },
  REJECTED: { label: '未通过', cls: 'st-red-strong' },
}

export default function MySupplyStore() {
  useRequireAuth()
  const [company, setCompany] = useState<SupplyCompany | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [cuisines, setCuisines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 编辑字段
  const [categoryId, setCategoryId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [services, setServices] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])

  // 产品管理
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productImages, setProductImages] = useState<string[]>([])
  const [editingProduct, setEditingProduct] = useState<SupplyProduct | null>(null)

  const load = () => {
    setLoading(true)
    supplyApi.getMyCompany()
      .then(res => {
        const data = res.data as any
        if (!data) {
          setCompany(null)
          return
        }
        setCompany(data)
        setCategoryId(data.categoryId)
        setCompanyName(data.companyName)
        setLicenseUrl(data.businessLicense || '')
        setServices(data.services || '')
        setProductDesc(data.productDesc || '')
        setIntroduction(data.introduction || '')
        setContactName(data.contactName || '')
        setContactPhone(data.contactPhone || '')
        setSelectedCuisines(data.cuisineIds ? data.cuisineIds.split(',') : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    supplyApi.getCategories().then(res => setCategories(safeArray(res.data))).catch(() => {})
    refApi.getCuisinesGrouped().then(res => {
      const data: any = res.data
      setCuisines(safeArray(data?.level1))
    }).catch(() => {})
    load()
  }, [])

  const isFood = categories.find(c => c.id === categoryId)?.code === 'FOOD'
  const statusCfg = company ? (STATUS_CONFIG[company.status] || STATUS_CONFIG.PENDING) : null

  const handleLicenseUpload = async () => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      const res = await uploadApi.upload(filePath, 'SUPPLY_LICENSE')
      setLicenseUrl((res.data as any)?.url || '')
    } catch {
      setError('营业执照上传失败')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
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
      })
      setEditing(false)
      load()
    } catch (err: any) {
      setError(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = async () => {
    if (!productName.trim()) {
      setError('请填写产品名称')
      return
    }
    setError('')
    try {
      if (editingProduct) {
        await supplyApi.updateProduct(editingProduct.id, {
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
        })
      } else {
        await supplyApi.addProduct({
          name: productName.trim(),
          price: productPrice.trim() || undefined,
          images: productImages,
          cuisineIds: isFood ? selectedCuisines.join(',') || undefined : undefined,
        })
      }
      setShowAddProduct(false)
      setEditingProduct(null)
      setProductName('')
      setProductPrice('')
      setProductImages([])
      load()
    } catch (err: any) {
      setError(err?.message || '保存产品失败')
    }
  }

  const handleDeleteProduct = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定删除该产品吗？',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await supplyApi.deleteProduct(id)
          load()
        } catch {
          setError('删除产品失败')
        }
      },
    })
  }

  const handleEditProduct = (p: SupplyProduct) => {
    setEditingProduct(p)
    setProductName(p.name)
    setProductPrice(p.price || '')
    setProductImages(parseImages(p.images))
    setShowAddProduct(true)
  }

  const handleProductImageUpload = async () => {
    try {
      const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const filePath = choose.tempFilePaths?.[0]
      if (!filePath) return
      const res = await uploadApi.upload(filePath, 'SUPPLY_PRODUCT_IMAGE')
      setProductImages(prev => [...prev, (res.data as any)?.url || ''])
    } catch {
      setError('图片上传失败')
    }
  }

  if (loading) {
    return (
      <View className='mystore-page'>
        <Loading />
      </View>
    )
  }

  if (!company) {
    return (
      <View className='mystore-empty'>
        <Text className='mystore-empty-icon'>🏪</Text>
        <Text className='mystore-empty-text'>您还没有店铺</Text>
        <View className='mystore-empty-btn' onClick={() => Taro.redirectTo({ url: '/pages/supply/apply/index' })}>
          <Text className='mystore-empty-btn-text'>立即入驻</Text>
        </View>
      </View>
    )
  }

  const categoryLabel = categories.find(c => c.id === categoryId)?.name || '请选择分类'

  return (
    <View className='mystore-page'>
      {/* 头部（还原网页版：白底 sticky + 状态徽标） */}
      <NavBar
        title='我的店铺'
        right={
          statusCfg ? (
            <Text className={`mystore-status ${statusCfg.cls}`}>{statusCfg.label}</Text>
          ) : null
        }
      />

      <View className='mystore-body'>
        {error ? (
          <View className='mystore-error'><Text className='mystore-error-text'>{error}</Text></View>
        ) : null}

        {/* 审核状态提示 */}
        {company.status === 'REJECTED' && company.reason ? (
          <View className='mystore-alert mystore-alert-rejected'>
            <Text className='mystore-alert-title mystore-alert-rejected-title'>审核未通过</Text>
            <Text className='mystore-alert-text mystore-alert-rejected-text'>{company.reason}</Text>
            <Text className='mystore-alert-link' onClick={() => setEditing(true)}>修改后重新提交</Text>
          </View>
        ) : null}
        {company.status === 'PENDING' ? (
          <View className='mystore-alert mystore-alert-pending'>
            <Text className='mystore-alert-title mystore-alert-pending-title'>审核中</Text>
            <Text className='mystore-alert-text mystore-alert-pending-text'>管理员正在审核您的入驻申请，请耐心等待</Text>
          </View>
        ) : null}

        {/* 店铺信息 */}
        <View className='mystore-card'>
          <View className='mystore-card-header'>
            <Text className='mystore-card-title'>店铺信息</Text>
            {!editing ? (
              <Text className='mystore-edit-link' onClick={() => setEditing(true)}>编辑</Text>
            ) : null}
          </View>

          {!editing ? (
            <View>
              <View className='mystore-info-head'>
                <View className='mystore-logo'>
                  <Text className='mystore-logo-text'>{company.companyName.charAt(0)}</Text>
                </View>
                <View className='mystore-info-basic'>
                  <Text className='mystore-info-name'>{company.companyName}</Text>
                  <Text className='mystore-info-cat'>{company.category?.name || ''}</Text>
                </View>
              </View>
              {company.services ? <Text className='mystore-info-line'>服务：{company.services}</Text> : null}
              {company.introduction ? <Text className='mystore-info-line clamp2'>介绍：{company.introduction}</Text> : null}
              {company.contactName ? <Text className='mystore-info-line'>联系人：{company.contactName}</Text> : null}
              {company.contactPhone ? <Text className='mystore-info-line'>电话：{company.contactPhone}</Text> : null}
            </View>
          ) : (
            <View>
              <Picker mode='selector' range={categories.map(c => c.name)} onChange={(e) => setCategoryId(categories[Number(e.detail.value)]?.id || '')}>
                <View className='mystore-select'>
                  <Text className='mystore-select-text'>{categoryLabel}</Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' />
                </View>
              </Picker>
              <Input className='mystore-input' value={companyName} placeholder='公司名称' placeholderClass='mystore-placeholder' onInput={(e) => setCompanyName(e.detail.value)} />
              <View className='mystore-license-row'>
                {licenseUrl ? <Image src={getImageUrl(licenseUrl) || licenseUrl} className='mystore-license-img' mode='aspectFill' /> : null}
                <View className='mystore-upload-btn' onClick={handleLicenseUpload}>
                  <Text className='mystore-upload-text'>上传/更换营业执照</Text>
                </View>
              </View>
              {isFood ? (
                <View className='mystore-cuisine-section'>
                  <Text className='mystore-label'>服务菜系</Text>
                  <View className='mystore-chips'>
                    {cuisines.map(c => (
                      <Text
                        key={c.id}
                        className={`mystore-chip ${selectedCuisines.includes(c.id) ? 'mystore-chip-active' : ''}`}
                        onClick={() => setSelectedCuisines(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                      >
                        {c.name}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
              <Textarea className='mystore-textarea resize-none' value={services} placeholder='公司服务' placeholderClass='mystore-placeholder' maxlength={500} onInput={(e) => setServices(e.detail.value)} />
              <Textarea className='mystore-textarea resize-none' value={productDesc} placeholder='公司产品' placeholderClass='mystore-placeholder' maxlength={500} onInput={(e) => setProductDesc(e.detail.value)} />
              <Textarea className='mystore-textarea tall resize-none' value={introduction} placeholder='公司介绍' placeholderClass='mystore-placeholder' maxlength={1000} onInput={(e) => setIntroduction(e.detail.value)} />
              <View className='mystore-contact-row'>
                <Input className='mystore-input half' value={contactName} placeholder='联系人' placeholderClass='mystore-placeholder' onInput={(e) => setContactName(e.detail.value)} />
                <Input className='mystore-input half' type='number' value={contactPhone} placeholder='联系电话' placeholderClass='mystore-placeholder' onInput={(e) => setContactPhone(e.detail.value)} />
              </View>
              <View className='mystore-save-row'>
                <View className={`mystore-save-btn ${saving ? 'mystore-btn-disabled' : ''}`} onClick={() => !saving && handleSave()}>
                  <Text className='mystore-save-text'>{saving ? '保存中...' : '保存'}</Text>
                </View>
                <View className='mystore-cancel-btn' onClick={() => { setEditing(false); load() }}>
                  <Text className='mystore-cancel-text'>取消</Text>
                </View>
              </View>
              {company.status === 'APPROVED' ? (
                <Text className='mystore-resubmit-hint'>修改信息后将重新进入审核</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* 产品管理 */}
        <View className='mystore-card'>
          <View className='mystore-card-header'>
            <Text className='mystore-card-title'>产品管理（{company.products?.length || 0}）</Text>
            <Text
              className='mystore-edit-link'
              onClick={() => {
                setShowAddProduct(true)
                setEditingProduct(null)
                setProductName('')
                setProductPrice('')
                setProductImages([])
              }}
            >
              + 添加产品
            </Text>
          </View>

          {showAddProduct ? (
            <View className='mystore-product-form'>
              <Input className='mystore-input' value={productName} placeholder='产品名称 *' placeholderClass='mystore-placeholder' onInput={(e) => setProductName(e.detail.value)} />
              <Input className='mystore-input' value={productPrice} placeholder='价格，如：12元/斤' placeholderClass='mystore-placeholder' onInput={(e) => setProductPrice(e.detail.value)} />
              <View className='mystore-product-imgs'>
                {productImages.map((img, idx) => (
                  <View key={idx} className='mystore-img-wrap'>
                    <Image src={getImageUrl(img) || img} className='mystore-img' mode='aspectFill' />
                    <View className='mystore-img-del' onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}>
                      <Text className='mystore-img-del-text'>✕</Text>
                    </View>
                  </View>
                ))}
                {productImages.length < 5 ? (
                  <View className='mystore-img-add' onClick={handleProductImageUpload}>
                    <Text className='mystore-img-add-plus'>+</Text>
                    <Text className='mystore-img-add-label'>图片</Text>
                  </View>
                ) : null}
              </View>
              <View className='mystore-product-actions'>
                <View className='mystore-product-save' onClick={handleAddProduct}>
                  <Text className='mystore-product-save-text'>{editingProduct ? '保存修改' : '添加产品'}</Text>
                </View>
                <View className='mystore-product-cancel' onClick={() => { setShowAddProduct(false); setEditingProduct(null) }}>
                  <Text className='mystore-product-cancel-text'>取消</Text>
                </View>
              </View>
            </View>
          ) : null}

          {!company.products || company.products.length === 0 ? (
            <Text className='mystore-product-empty'>暂无产品，点击「添加产品」发布</Text>
          ) : (
            <View>
              {company.products.map(p => {
                const images = parseImages(p.images)
                return (
                  <View key={p.id} className='mystore-product-row'>
                    {images.length > 0 ? (
                      <Image src={getImageUrl(images[0]) || images[0]} className='mystore-product-img' mode='aspectFill' />
                    ) : (
                      <View className='mystore-product-img-placeholder'>
                        <Text>📦</Text>
                      </View>
                    )}
                    <View className='mystore-product-info'>
                      <Text className='mystore-product-name'>{p.name}</Text>
                      {p.price ? <Text className='mystore-product-price'>{p.price}</Text> : null}
                    </View>
                    <View className='mystore-product-ops'>
                      <Text className='mystore-product-op' onClick={() => handleEditProduct(p)}>编辑</Text>
                      <Text className='mystore-product-op danger' onClick={() => handleDeleteProduct(p.id)}>删除</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
