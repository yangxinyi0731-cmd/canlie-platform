import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { useAuthStore } from '../../stores/authStore'
import { enterpriseApi, talentsApi, getImageUrl } from '../../api'
import { useRequireAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'
import SectionRow from '../../components/SectionRow'
import StarRating from '../../components/StarRating'
import Icon from '../../components/Icon'
import { NAV_SAFE_TOP } from '../../components/NavBar'
import type { Talent, Enterprise } from '../../types'
import './index.scss'

// 学历映射（还原网页版 Profile educationMap）
const EDUCATION_MAP: Record<string, string> = {
  '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中',
  '5': '大专', '6': '本科', '7': '硕士', '8': '博士',
}

export default function Profile() {
  const { user } = useRequireAuth()
  const { updateUser: updateStoreUser } = useAuthStore()
  const [profileData, setProfileData] = useState<Talent | Enterprise | null>(null)
  const [loading, setLoading] = useState(false)

  // 无 profile 时拉取（还原网页版逻辑，失败可重试）
  const fetchProfile = useCallback(async () => {
    if (!user || user.profile) return
    setLoading(true)
    try {
      if (user.role === 'TALENT') {
        const res = await talentsApi.getProfile()
        if (res.data && (res.data as any).id) {
          setProfileData(res.data as Talent)
          updateStoreUser({ ...user, profile: res.data as Talent })
        }
      } else if (user.role === 'ENTERPRISE') {
        const res = await enterpriseApi.getProfile()
        if (res.data && (res.data as any).id) {
          setProfileData(res.data as Enterprise)
          updateStoreUser({ ...user, profile: res.data as Enterprise })
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user, updateStoreUser])

  useEffect(() => {
    if (!user) return
    if (user.profile) {
      setProfileData(user.profile as Talent | Enterprise)
      return
    }
    fetchProfile()
  }, [user])

  if (loading || (!user)) {
    return (
      <Layout active='/pages/profile/index'>
        <View style={{ height: `${NAV_SAFE_TOP}px` }} />
        <ProfileSkeleton />
      </Layout>
    )
  }

  // 管理员无 profile 数据，直接渲染管理卡片（修复网页版 AdminProfile 死代码问题）
  if (user.role === 'ADMIN') {
    return (
      <Layout active='/pages/profile/index'>
        <View style={{ height: `${NAV_SAFE_TOP}px` }} />
        <AdminProfile />
      </Layout>
    )
  }

  if (!profileData) {
    return (
      <Layout active='/pages/profile/index'>
        <View style={{ height: `${NAV_SAFE_TOP}px` }} />
        <View className='pf-empty'>
          <Icon name='user' size={128} color='#E5E7EB' />
          <Text className='pf-empty-text'>加载失败，请重试</Text>
          <View className='btn-primary pf-empty-retry' onClick={() => fetchProfile()}>
            <Text className='pf-empty-retry-text'>刷新页面</Text>
          </View>
        </View>
      </Layout>
    )
  }

  return (
    <Layout active='/pages/profile/index'>
      <View style={{ height: `${NAV_SAFE_TOP}px` }} />
      {user.role === 'TALENT' && <TalentProfile profile={profileData as Talent} />}
      {user.role === 'ENTERPRISE' && <EnterpriseProfile profile={profileData as Enterprise} />}
    </Layout>
  )
}

// ========== 人才端 Profile（还原网页版 TalentProfile）==========
function TalentProfile({ profile }: { profile: Talent }) {
  const logout = useAuthStore(s => s.logout)

  const displayName = profile.realName || '未设置姓名'
  const title = profile.title || '未设置职位'
  const city = profile.city || ''
  const salary = profile.minSalary != null && profile.maxSalary != null
    ? `${profile.minSalary / 1000}k-${profile.maxSalary / 1000}k`
    : profile.minSalary != null
      ? `${profile.minSalary / 1000}k以上`
      : profile.maxSalary != null
        ? `${profile.maxSalary / 1000}k以下`
        : '面议'
  const educationLabel = profile.education ? (EDUCATION_MAP[profile.education] || profile.education) : null
  const workYearsLabel = profile.workYears != null ? `${profile.workYears}年经验` : null

  return (
    <View className='pf-page'>
      {/* 个人卡（还原网页版：居中渐变头像 + 星级 + 期望薪资） */}
      <View className='card pf-card'>
        <View className='pf-talent-center'>
          <View className='pf-avatar'>
            <Text className='pf-avatar-text'>{displayName.charAt(0)}</Text>
          </View>
          <Text className='pf-name'>{displayName}</Text>
          {profile.starLevel > 0 && (
            <View className='pf-star-row'>
              <StarRating value={profile.starLevel} />
              {profile.starLevelStr ? <Text className='pf-star-label'>({profile.starLevelStr})</Text> : null}
            </View>
          )}
          <Text className='pf-title'>{title}</Text>
          <View className='pf-tags'>
            {city ? (
              <View className='pf-tag-city'>
                <Icon name='map-pin' size={24} color='#4B5563' />
                <Text className='tag tag-gray pf-city-tag'>{city}</Text>
              </View>
            ) : null}
            {educationLabel ? <Text className='tag tag-gray'>{educationLabel}</Text> : null}
            {workYearsLabel ? <Text className='tag tag-gray'>{workYearsLabel}</Text> : null}
          </View>
          <View className='pf-salary-block'>
            <Text className='pf-salary-label'>期望薪资</Text>
            <Text className='pf-salary'>{salary}</Text>
          </View>
        </View>
      </View>

      {/* 操作列表（还原网页版 9 行） */}
      <View className='card pf-actions'>
        <SectionRow icon='file-text' tint='blue' label='编辑简历' onClick={() => Taro.navigateTo({ url: '/pages/edit-talent-profile/index' })} />
        <SectionRow icon='sparkles' tint='orange' label='我的匹配' onClick={() => Taro.navigateTo({ url: '/pages/my-matches/index' })} />
        <SectionRow icon='briefcase' tint='green' label='投递记录' onClick={() => Taro.navigateTo({ url: '/pages/applications/index' })} />
        <SectionRow icon='heart' tint='red' label='我的收藏' onClick={() => Taro.navigateTo({ url: '/pages/my-favorites/index' })} />
        <SectionRow emoji='🏪' tint='orange' label='供应平台' onClick={() => Taro.navigateTo({ url: '/pages/supply/index' })} />
        <SectionRow emoji='🎬' tint='purple' label='创业分享' onClick={() => Taro.navigateTo({ url: '/pages/share/index' })} />
        <SectionRow icon='shield-check' tint='green' label='认证材料' onClick={() => Taro.navigateTo({ url: '/pages/edit-talent-profile/index?section=verification' })} />
        <SectionRow icon='lock' tint='gray' label='隐私设置' onClick={() => Taro.navigateTo({ url: '/pages/edit-talent-profile/index?section=privacy' })} />
        <SectionRow icon='log-out' label='退出登录' danger onClick={logout} />
      </View>

      <Text className='pf-version'>餐猎 v1.0.0</Text>
    </View>
  )
}

// ========== 企业端 Profile（还原网页版 EnterpriseProfile）==========
function EnterpriseProfile({ profile }: { profile: Enterprise }) {
  const logout = useAuthStore(s => s.logout)
  const jobCount = profile._count?.jobs ?? 0
  const logo = getImageUrl(profile.companyLogo)

  return (
    <View className='pf-page'>
      <View className='card pf-card'>
        <View className='pf-ent-header'>
          {logo ? (
            <Image src={logo} className='pf-ent-logo-img' mode='aspectFill' />
          ) : (
            <View className='pf-ent-logo'>
              <Text className='pf-ent-logo-text'>{profile.companyName ? profile.companyName.charAt(0) : '企'}</Text>
            </View>
          )}
          <View className='pf-ent-info'>
            <Text className='pf-name'>{profile.companyName || '未设置企业名称'}</Text>
            {profile.city ? (
              <View className='pf-ent-city'>
                <Icon name='map-pin' size={24} color='#6B7280' />
                <Text className='pf-ent-city-text'>{profile.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 统计行（还原网页版 grid-cols-3） */}
        <View className='pf-stats'>
          <View className='pf-stat'>
            <Text className='pf-stat-num'>{jobCount}</Text>
            <Text className='pf-stat-label'>在招职位</Text>
          </View>
          <View className='pf-stat'>
            <Text className='pf-stat-num'>{profile.licenseVerified ? '已认证' : '未认证'}</Text>
            <Text className='pf-stat-label'>企业认证</Text>
          </View>
          <View className='pf-stat'>
            <Text className='pf-stat-num'>{profile.companySize || '-'}</Text>
            <Text className='pf-stat-label'>公司规模</Text>
          </View>
        </View>

        {profile.description ? (
          <Text className='pf-ent-desc'>{profile.description}</Text>
        ) : null}
      </View>

      <View className='card pf-actions'>
        <SectionRow icon='building' tint='blue' label='企业信息' onClick={() => Taro.navigateTo({ url: '/pages/edit-enterprise-profile/index' })} />
        <SectionRow icon='plus' tint='orange' label='发布职位' onClick={() => Taro.navigateTo({ url: '/pages/post-job/index' })} />
        <SectionRow icon='search' tint='green' label='人才搜索' onClick={() => Taro.reLaunch({ url: '/pages/talent-search/index' })} />
        <SectionRow emoji='🏪' tint='orange' label='供应平台' onClick={() => Taro.navigateTo({ url: '/pages/supply/index' })} />
        <SectionRow emoji='🎬' tint='purple' label='创业分享' onClick={() => Taro.navigateTo({ url: '/pages/share/index' })} />
        <SectionRow icon='log-out' label='退出登录' danger onClick={logout} />
      </View>

      <Text className='pf-version'>餐猎 v1.0.0</Text>
    </View>
  )
}

// ========== 管理员 Profile（还原网页版 AdminProfile）==========
function AdminProfile() {
  const logout = useAuthStore(s => s.logout)

  return (
    <View className='pf-page'>
      <View className='card pf-card'>
        <View className='pf-talent-center'>
          <View className='pf-avatar pf-avatar-admin'>
            <Text className='pf-avatar-text'>A</Text>
          </View>
          <Text className='pf-name'>管理员</Text>
          <Text className='pf-title'>平台管理权限</Text>
        </View>
      </View>

      <View className='card pf-actions'>
        <SectionRow icon='shield-check' tint='purple' label='管理后台' onClick={() => Taro.navigateTo({ url: '/pages/admin/index' })} />
        <SectionRow icon='log-out' label='退出登录' danger onClick={logout} />
      </View>

      <Text className='pf-version'>餐猎 v1.0.0</Text>
    </View>
  )
}

// ========== 骨架屏（还原网页版 ProfileSkeleton）==========
function ProfileSkeleton() {
  return (
    <View className='pf-page'>
      <View className='card pf-card'>
        <View className='pf-skeleton-center'>
          <View className='skeleton pf-sk-avatar' />
          <View className='skeleton pf-sk-name' />
          <View className='skeleton pf-sk-line w64' />
        </View>
      </View>
      <View className='card pf-actions'>
        {[1, 2, 3, 4].map(i => (
          <View key={i} className='pf-sk-row'>
            <View className='skeleton pf-sk-icon' />
            <View className='skeleton pf-sk-row-line' />
          </View>
        ))}
      </View>
    </View>
  )
}
