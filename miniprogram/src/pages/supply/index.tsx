import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { supplyApi, safeArray } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import NavBar, { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import Loading from '../../components/Loading'
import type { SupplyCategory } from '../../types'
import './index.scss'

// 分类图标（还原网页版 CATEGORY_ICONS）
const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🥬', TABLEWARE: '🍽️', KITCHENWARE: '🍳', FURNITURE: '🪑',
  BRAND_PLANNING: '📣', DESIGN: '🎨', TRAINING: '🎓', RENT_TRANSFER: '🔑',
  SECOND_HAND: '🔄', INVESTMENT: '💰',
}

export default function SupplyHome() {
  useRequireAuth()
  const [categories, setCategories] = useState<SupplyCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supplyApi.getCategories()
      .then(res => setCategories(safeArray(res.data)))
      .catch(() => setError('加载分类失败'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <View className='supply-page'>
      {/* 渐变头部（还原网页版：pt-8 pb-16 + 半透明返回钮 + 居中标题） */}
      <View className='supply-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT + 32}px` }}>
        <View className='supply-header-row'>
          <View className='supply-back' onClick={() => Taro.navigateBack()}>
            <View className='supply-back-arrow' />
          </View>
          <Text className='supply-title'>供应平台</Text>
          <View className='supply-back-placeholder' />
        </View>
        <Text className='supply-desc'>
          餐饮行业一站式供应链平台{'\n'}食材 · 设备 · 品牌 · 培训 · 转让 · 投资
        </Text>
      </View>

      {/* 上浮操作入口（还原网页版 -mt-10） */}
      <View className='supply-actions'>
        <View className='supply-actions-card'>
          <View className='supply-apply-btn' onClick={() => Taro.navigateTo({ url: '/pages/supply/apply/index' })}>
            <Text className='supply-apply-text'>商家入驻</Text>
          </View>
          <View className='supply-my-btn' onClick={() => Taro.navigateTo({ url: '/pages/supply/my/index' })}>
            <Text className='supply-my-text'>我的店铺</Text>
          </View>
        </View>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View className='supply-error'><Text className='supply-error-text'>{error}</Text></View>
      ) : null}

      {/* 分类宫格（还原网页版 grid-cols-4） */}
      <View className='supply-categories'>
        <Text className='supply-section-title'>全部分类</Text>
        {loading ? (
          <Loading />
        ) : (
          <View className='supply-grid'>
            {categories.map(cat => (
              <View
                key={cat.id}
                className='supply-cat-item'
                hoverClass='hover-bg'
                onClick={() => Taro.navigateTo({ url: `/pages/supply/category/index?id=${cat.id}` })}
              >
                <View className='supply-cat-icon'>
                  <Text className='supply-cat-emoji'>{CATEGORY_ICONS[cat.code] || '🏪'}</Text>
                </View>
                <Text className='supply-cat-name'>{cat.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 入驻说明（还原网页版橙底说明卡） */}
      <View className='supply-intro'>
        <View className='supply-intro-card'>
          <Text className='supply-intro-title'>如何入驻？</Text>
          <Text className='supply-intro-text'>
            1. 点击「商家入驻」填写公司信息并上传营业执照{'\n'}2. 食材公司可勾选八大菜系、发布产品图片和价格{'\n'}3. 管理员审核通过后，您的店铺将展示在对应分类下
          </Text>
        </View>
      </View>
    </View>
  )
}
