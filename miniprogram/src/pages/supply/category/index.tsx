import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { supplyApi, safeArray } from '../../../api'
import { useRequireAuth } from '../../../hooks/useAuth'
import Loading from '../../../components/Loading'
import NavBar from '../../../components/NavBar'
import Icon from '../../../components/Icon'
import type { SupplyCategory, SupplyCompany } from '../../../types'
import './index.scss'

export default function SupplyCategoryList() {
  useRequireAuth()
  const router = useRouter()
  const { id: categoryId } = router.params

  const [category, setCategory] = useState<SupplyCategory | null>(null)
  const [companies, setCompanies] = useState<SupplyCompany[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    supplyApi.getCategories().then(res => {
      const found = safeArray<any>(res.data).find(c => c.id === categoryId)
      if (found) setCategory(found as SupplyCategory)
    }).catch(() => {})
  }, [categoryId])

  useEffect(() => {
    setLoading(true)
    setError('')
    supplyApi.listCompanies({ categoryId, page, pageSize })
      .then(res => {
        const data: any = res.data
        setCompanies(safeArray(data?.companies))
        setTotal(data?.total || 0)
      })
      .catch(() => setError('加载商家列表失败'))
      .finally(() => setLoading(false))
  }, [categoryId, page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <View className='scl-page'>
      {/* 头部（还原网页版：白底 sticky + 分类名 + N家） */}
      <NavBar
        title={category?.name || '供应商家'}
        right={<Text className='scl-count'>{total} 家</Text>}
      />

      <View className='scl-body'>
        {error ? (
          <View className='scl-error'><Text className='scl-error-text'>{error}</Text></View>
        ) : null}

        {loading ? (
          <Loading />
        ) : companies.length === 0 ? (
          <View className='scl-empty'>
            <Text className='scl-empty-icon'>🏪</Text>
            <Text className='scl-empty-text'>该分类下暂无商家</Text>
            <Text className='scl-empty-link' onClick={() => Taro.navigateTo({ url: '/pages/supply/apply/index' })}>
              立即入驻 →
            </Text>
          </View>
        ) : (
          <View>
            {companies.map(c => (
              <View
                key={c.id}
                className='scl-company-card'
                hoverClass='hover-bg'
                onClick={() => Taro.navigateTo({ url: `/pages/supply/company-detail/index?id=${c.id}` })}
              >
                <View className='scl-company-logo'>
                  <Text className='scl-company-logo-text'>{c.companyName.charAt(0)}</Text>
                </View>
                <View className='scl-company-info'>
                  <Text className='scl-company-name'>{c.companyName}</Text>
                  {c.services ? <Text className='scl-company-services'>{c.services}</Text> : null}
                  <View className='scl-company-meta'>
                    <Text className='scl-product-count'>{c._count?.products ?? 0} 款产品</Text>
                    {c.contactName ? <Text className='scl-contact'>{c.contactName}</Text> : null}
                  </View>
                </View>
                <Icon name='chevron-right' size={32} color='#D1D5DB' />
              </View>
            ))}
          </View>
        )}

        {totalPages > 1 && (
          <View className='scl-pagination'>
            <Text className={`scl-page-btn ${page <= 1 ? 'scl-page-disabled' : ''}`} onClick={() => page > 1 && setPage(page - 1)}>
              上一页
            </Text>
            <Text className='scl-page-info'>{page} / {totalPages}</Text>
            <Text className={`scl-page-btn ${page >= totalPages ? 'scl-page-disabled' : ''}`} onClick={() => page < totalPages && setPage(page + 1)}>
              下一页
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
