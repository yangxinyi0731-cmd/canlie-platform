import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import { supplyApi, getImageUrl } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import Loading from '../../../components/Loading'
import { STATUS_BAR_HEIGHT } from '../../../components/NavBar'
import type { SupplyCompany } from '../../../types'
import './index.scss'

function parseImages(json?: string): string[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export default function SupplyCompanyDetail() {
  useRequireAuth()
  const router = useRouter()
  const { id } = router.params

  const [company, setCompany] = useState<SupplyCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supplyApi.getCompany(id)
      .then(res => setCompany(res.data as any))
      .catch(() => setError('商家不存在或未通过审核'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <View className='scd-page'>
        <Loading />
      </View>
    )
  }

  if (error || !company) {
    return (
      <View className='scd-error-page'>
        <Text className='scd-error-text'>{error || '数据加载失败'}</Text>
        <View className='scd-error-btn' onClick={() => Taro.reLaunch({ url: '/pages/jobs/index' })}>
          <Text className='scd-error-btn-text'>返回首页</Text>
        </View>
      </View>
    )
  }

  const products = company.products || []

  const previewImage = (urls: string[], current: string) => {
    Taro.previewImage({ urls, current })
  }

  return (
    <View className='scd-page'>
      {/* 渐变头部（还原网页版：pt-8 pb-20 + 64 logo + 分类名） */}
      <View className='scd-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT + 32}px` }}>
        <View className='scd-header-row'>
          <View className='scd-back' onClick={() => Taro.navigateBack()}>
            <View className='scd-back-arrow' />
          </View>
          <Text className='scd-category'>{company.category?.name || ''}</Text>
          <View className='scd-back-placeholder' />
        </View>
        <View className='scd-company-row'>
          <View className='scd-logo'>
            <Text className='scd-logo-text'>{company.companyName.charAt(0)}</Text>
          </View>
          <View className='scd-company-info'>
            <Text className='scd-company-name'>{company.companyName}</Text>
            {company.businessLicense ? <Text className='scd-license'>✓ 已上传营业执照</Text> : null}
          </View>
        </View>
      </View>

      {/* 内容卡（-mt-12 上浮） */}
      <View className='scd-body'>
        {/* 公司介绍 */}
        <View className='scd-card'>
          <Text className='scd-card-title'>公司介绍</Text>
          <Text className='scd-card-text'>{company.introduction || '暂无公司介绍'}</Text>
          {company.services ? (
            <View>
              <Text className='scd-card-subtitle'>服务内容</Text>
              <Text className='scd-card-text'>{company.services}</Text>
            </View>
          ) : null}
          {company.productDesc ? (
            <View>
              <Text className='scd-card-subtitle'>公司产品</Text>
              <Text className='scd-card-text'>{company.productDesc}</Text>
            </View>
          ) : null}
        </View>

        {/* 产品列表 */}
        {products.length > 0 ? (
          <View className='scd-card'>
            <Text className='scd-card-title'>在售产品（{products.length}）</Text>
            {products.map(p => {
              const images = parseImages(p.images).map(u => getImageUrl(u) || u)
              return (
                <View key={p.id} className='scd-product'>
                  {images.length > 0 ? (
                    <ScrollView className='scd-product-imgs' scrollX enhanced showScrollbar={false}>
                      <View className='scd-product-imgs-inner'>
                        {images.map((img, idx) => (
                          <Image
                            key={idx}
                            src={img}
                            className='scd-product-img'
                            mode='aspectFill'
                            onClick={() => previewImage(images, img)}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  ) : null}
                  <View className='scd-product-info'>
                    <View className='scd-product-text'>
                      <Text className='scd-product-name'>{p.name}</Text>
                      {p.description ? <Text className='scd-product-desc'>{p.description}</Text> : null}
                    </View>
                    {p.price ? <Text className='scd-product-price'>{p.price}</Text> : null}
                  </View>
                </View>
              )
            })}
          </View>
        ) : null}

        {/* 联系方式 */}
        <View className='scd-card'>
          <Text className='scd-card-title'>联系方式</Text>
          {company.contactName ? (
            <View className='scd-contact-row'>
              <Text className='scd-contact-label'>联系人</Text>
              <Text className='scd-contact-value'>{company.contactName}</Text>
            </View>
          ) : null}
          {company.contactPhone ? (
            <View className='scd-contact-row'>
              <Text className='scd-contact-label'>联系电话</Text>
              <Text
                className='scd-contact-phone'
                onClick={() => Taro.makePhoneCall({ phoneNumber: company.contactPhone! })}
              >
                {company.contactPhone}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
