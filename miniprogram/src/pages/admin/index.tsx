import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Picker, ScrollView, Input } from '@tarojs/components'
import { adminApi, refApi, supplyApi, sharesApi, getImageUrl, safeArray } from '../../api'
import api from '../../api/request'
import { useAuthStore } from '../../stores/authStore'
import { useRequireAuth } from '../../hooks/useAuth'
import Loading from '../../components/Loading'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import './index.scss'

type TabKey = 'users' | 'enterprises' | 'talents' | 'verifications' | 'supply' | 'shares'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'enterprises', label: '企业审核' },
  { key: 'talents', label: '人才星级' },
  { key: 'verifications', label: '认证审核' },
  { key: 'supply', label: '供应审核' },
  { key: 'shares', label: '分享审核' },
]

const STAR_OPTIONS = ['普通', '三星', '四星', '五星', '金牌']
const STAR_VALUES = [0, 3, 4, 5, 6]

function getStarLabel(level: number): string {
  const idx = STAR_VALUES.indexOf(level)
  return idx >= 0 ? STAR_OPTIONS[idx] : '普通'
}

const VERIFY_TYPE_LABEL: Record<string, string> = {
  REFERENCE: '推荐人背调',
  CERTIFICATE: '离职证明',
  SALARY_FLOW: '工资流水',
}

const SUPPLY_TABS = [
  { key: 'PENDING', label: '待审核' },
  { key: 'APPROVED', label: '已通过' },
  { key: 'REJECTED', label: '已驳回' },
]

const SHARE_TABS = [
  { key: 'VISIBLE', label: '已发布' },
  { key: 'HIDDEN', label: '已隐藏' },
]

export default function AdminDashboard() {
  useRequireAuth('ADMIN')
  const logout = useAuthStore(s => s.logout)
  const [activeTab, setActiveTab] = useState<TabKey>('users')
  const [stats, setStats] = useState<any>(null)

  const [users, setUsers] = useState<any[]>([])
  const [enterprises, setEnterprises] = useState<any[]>([])
  const [talents, setTalents] = useState<any[]>([])
  const [verifications, setVerifications] = useState<any[]>([])
  const [supplyCompanies, setSupplyCompanies] = useState<any[]>([])
  const [supplyTab, setSupplyTab] = useState('PENDING')
  const [sharePosts, setSharePosts] = useState<any[]>([])
  const [shareTab, setShareTab] = useState('VISIBLE')
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState<string | false>(false)

  // 人才背调展开
  const [expandedTalentId, setExpandedTalentId] = useState<string | null>(null)
  const [talentDetail, setTalentDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  // 星级标准弹层
  const [showStarCriteria, setShowStarCriteria] = useState(false)
  const [starCriteria, setStarCriteria] = useState<any[]>([])

  const extractList = (res: any): any[] => {
    const data = res.data
    if (Array.isArray(data)) return data
    if (data?.users) return data.users
    if (data?.items) return data.items
    if (Array.isArray(data?.data)) return data.data
    return []
  }

  const fetchStats = useCallback(async () => {
    adminApi.getStats().then(res => setStats(res.data)).catch(() => {})
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    adminApi.getUsers().then(res => setUsers(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchEnterprises = useCallback(async () => {
    setLoading(true)
    adminApi.getUsers({ role: 'ENTERPRISE' }).then(res => setEnterprises(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchTalents = useCallback(async () => {
    setLoading(true)
    adminApi.getUsers({ role: 'TALENT' }).then(res => setTalents(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchVerifications = useCallback(async () => {
    setLoading(true)
    adminApi.getVerifications().then(res => setVerifications(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchSupplyCompanies = useCallback(async (status: string) => {
    setLoading(true)
    supplyApi.adminListCompanies({ status }).then(res => setSupplyCompanies(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchSharePosts = useCallback(async (status: string) => {
    setLoading(true)
    sharesApi.adminList({ status }).then(res => setSharePosts(extractList(res))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStats()
    refApi.getStarCriteria().then(res => setStarCriteria(safeArray(res.data))).catch(() => {})
  }, [])

  useEffect(() => {
    switch (activeTab) {
      case 'users': fetchUsers(); break
      case 'enterprises': fetchEnterprises(); break
      case 'talents': fetchTalents(); break
      case 'verifications': fetchVerifications(); break
      case 'supply': fetchSupplyCompanies(supplyTab); break
      case 'shares': fetchSharePosts(shareTab); break
    }
  }, [activeTab, supplyTab, shareTab])

  const handleToggleUser = async (userId: string) => {
    setActionId(userId)
    try {
      await adminApi.toggleUser(userId)
      await fetchUsers()
    } catch {
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleVerifyEnterprise = async (entId: string, status: string, userId: string) => {
    setActionId(userId)
    try {
      await adminApi.verifyEnterprise(entId, status)
      await fetchEnterprises()
    } catch {
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleUpdateStar = async (talentId: string, starLevel: number, userId: string) => {
    setActionId(userId)
    try {
      await adminApi.updateTalentStar(talentId, starLevel)
      await fetchTalents()
    } catch {
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleVerifyMaterial = async (verId: string, status: string) => {
    setActionId(verId)
    try {
      await adminApi.updateVerification(verId, status)
      await fetchVerifications()
    } catch {
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleViewBgCheck = async (talentId: string) => {
    if (expandedTalentId === talentId) {
      setExpandedTalentId(null)
      setTalentDetail(null)
      return
    }
    setExpandedTalentId(talentId)
    setLoadingDetail(true)
    try {
      const res = await adminApi.getTalentDetail(talentId)
      setTalentDetail(res.data)
    } catch {
      setTalentDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleVerifySupply = async (id: string, status: string, reason: string) => {
    setActionId(id)
    try {
      await supplyApi.adminVerifyCompany(id, status, reason)
      await fetchSupplyCompanies(supplyTab)
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleToggleShare = async (id: string, status: string) => {
    setActionId(id)
    try {
      await sharesApi.adminSetStatus(id, status)
      await fetchSharePosts(shareTab)
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      setActionId(null)
    }
  }

  const handleAutoEvaluate = async (type: 'talents' | 'enterprises') => {
    setEvaluating(type)
    try {
      const res = await api.post(`/matches/evaluate-all-${type}`)
      const data: any = res.data
      Taro.showModal({
        title: 'AI评估完成',
        content: `${data.count} ${type === 'talents' ? '位人才' : '家企业'}已重新评定星级`,
        showCancel: false,
      })
      if (type === 'talents') await fetchTalents()
      else await fetchEnterprises()
      await fetchStats()
    } catch {
      Taro.showToast({ title: 'AI评估失败，请重试', icon: 'none' })
    } finally {
      setEvaluating(false)
    }
  }

  const previewImage = (url: string) => {
    const full = getImageUrl(url) || url
    Taro.previewImage({ urls: [full], current: full })
  }

  return (
    <View className='admin-page'>
      {/* 头部（还原网页版：橙色标题 + 退出） */}
      <View className='admin-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT}px` }}>
        <View className='admin-header-row'>
          <Text className='admin-title'>管理后台</Text>
          <Text className='admin-logout' onClick={logout}>退出</Text>
        </View>
      </View>

      <View className='admin-body'>
        {/* 统计（还原网页版 grid-cols-5） */}
        {stats ? (
          <View className='admin-stats'>
            {[
              { label: '总用户', value: stats.userCount },
              { label: '企业', value: stats.enterpriseCount },
              { label: '人才', value: stats.talentCount },
              { label: '职位', value: stats.jobCount },
              { label: '匹配', value: stats.matchCount },
            ].map(item => (
              <View key={item.label} className='admin-stat-card'>
                <Text className='admin-stat-num'>{item.value}</Text>
                <Text className='admin-stat-label'>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* AI 评估按钮（还原网页版蓝/紫渐变） */}
        <View className='admin-eval-row'>
          <View
            className={`admin-eval-btn admin-eval-blue ${evaluating ? 'admin-btn-disabled' : ''}`}
            onClick={() => !evaluating && handleAutoEvaluate('talents')}
          >
            <Text className='admin-eval-text'>{evaluating === 'talents' ? '🤖 AI评估中...' : '🤖 AI评估所有人才星级'}</Text>
          </View>
          <View
            className={`admin-eval-btn admin-eval-purple ${evaluating ? 'admin-btn-disabled' : ''}`}
            onClick={() => !evaluating && handleAutoEvaluate('enterprises')}
          >
            <Text className='admin-eval-text'>{evaluating === 'enterprises' ? '🤖 AI评估中...' : '🏢 AI评估所有企业星级'}</Text>
          </View>
        </View>

        {/* Tab 导航（还原网页版横滑胶囊） */}
        <ScrollView className='admin-tabs' scrollX enhanced showScrollbar={false}>
          <View className='admin-tabs-inner'>
            {TABS.map(tab => (
              <Text
                key={tab.key}
                className={`admin-tab ${activeTab === tab.key ? 'admin-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Text>
            ))}
          </View>
        </ScrollView>

        {/* 内容 */}
        {loading ? (
          <Loading />
        ) : (
          <View>
            {/* ===== 用户管理 ===== */}
            {activeTab === 'users' && (
              <View>
                {users.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无用户数据</Text></View>
                ) : (
                  users.map(u => (
                    <View key={u.id} className='admin-card'>
                      <View className='admin-row-between'>
                        <View className='admin-user-info'>
                          <View className='admin-user-name-row'>
                            <Text className='admin-user-name'>{u.name || u.phone}</Text>
                            <Text className={`admin-role-pill ${u.role === 'ADMIN' ? 'rp-purple' : u.role === 'ENTERPRISE' ? 'rp-blue' : 'rp-orange'}`}>
                              {u.role === 'ADMIN' ? '管理员' : u.role === 'ENTERPRISE' ? '企业' : '人才'}
                            </Text>
                          </View>
                          <Text className='admin-user-phone'>{u.phone}</Text>
                        </View>
                        <Text
                          className={`admin-op-pill ${u.status === 'ACTIVE' ? 'op-red' : 'op-green'}`}
                          onClick={() => handleToggleUser(u.id)}
                        >
                          {u.status === 'ACTIVE' ? '禁用' : '启用'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ===== 企业审核 ===== */}
            {activeTab === 'enterprises' && (
              <View>
                {enterprises.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无企业数据</Text></View>
                ) : (
                  enterprises.map((u: any) => {
                    const p = u.enterprise
                    return (
                      <View key={u.id} className='admin-card'>
                        <View className='admin-ent-head'>
                          <View className='admin-ent-logo'>
                            <Text className='admin-ent-logo-text'>{(p?.companyName || '企').charAt(0)}</Text>
                          </View>
                          <View className='admin-user-info'>
                            <Text className='admin-user-name'>{p?.companyName || '未填写'}</Text>
                            <Text className='admin-user-phone'>{p?.contactName} · {p?.contactPhone || u.phone}</Text>
                            <Text className={`admin-status-pill ${p?.status === 'PENDING' ? 'sp-yellow' : p?.status === 'APPROVED' ? 'sp-green' : 'sp-red'}`}>
                              {p?.status === 'PENDING' ? '待审核' : p?.status === 'APPROVED' ? '已通过' : '已拒绝'}
                            </Text>
                          </View>
                        </View>

                        {p?.businessLicense ? (
                          <View className='admin-license-section'>
                            <Text className='admin-license-label'>营业执照：</Text>
                            <Image
                              src={getImageUrl(p.businessLicense) || p.businessLicense}
                              className='admin-license-img'
                              mode='widthFix'
                              onClick={() => previewImage(p.businessLicense)}
                            />
                          </View>
                        ) : null}

                        {p?.status === 'PENDING' ? (
                          <View className='admin-actions'>
                            <Text className='admin-verify-btn vb-green' onClick={() => handleVerifyEnterprise(p.id, 'APPROVED', u.id)}>通过</Text>
                            <Text className='admin-verify-btn vb-red' onClick={() => handleVerifyEnterprise(p.id, 'REJECTED', u.id)}>拒绝</Text>
                          </View>
                        ) : null}
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* ===== 人才星级 ===== */}
            {activeTab === 'talents' && (
              <View>
                <View className='admin-criteria-row'>
                  <Text className='admin-criteria-link' onClick={() => setShowStarCriteria(true)}>查看星级评定标准</Text>
                </View>
                {talents.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无人才数据</Text></View>
                ) : (
                  talents.map((u: any) => {
                    const p = u.talent
                    return (
                      <View key={u.id} className='admin-card'>
                        <View className='admin-row-between'>
                          <View className='admin-user-info'>
                            <Text className='admin-user-name'>{p?.realName || u.name || '未填写'}</Text>
                            <Text className='admin-user-phone'>{p?.title} · {p?.currentCompany || '无公司'} · {p?.city || '未知城市'}</Text>
                          </View>
                          <Text className='admin-star-label'>{getStarLabel(p?.starLevel ?? 0)}</Text>
                        </View>
                        <View className='admin-talent-ops'>
                          <View className='admin-star-select-row'>
                            <Text className='admin-star-select-label'>星级：</Text>
                            <Picker
                              mode='selector'
                              range={STAR_OPTIONS}
                              onChange={(e) => handleUpdateStar(p?.id, STAR_VALUES[Number(e.detail.value)], u.id)}
                            >
                              <View className='admin-star-select'>
                                <Text className='admin-star-select-text'>{getStarLabel(p?.starLevel ?? 0)}</Text>
                              </View>
                            </Picker>
                          </View>
                          <Text className='admin-bgcheck-link' onClick={() => handleViewBgCheck(p?.id)}>
                            {expandedTalentId === p?.id ? '收起背调' : '查看背调'}
                          </Text>
                        </View>

                        {/* 背调详情 */}
                        {expandedTalentId === p?.id ? (
                          <View className='admin-bgcheck'>
                            {loadingDetail ? (
                              <Loading />
                            ) : safeArray(talentDetail?.workExperiences).length > 0 ? (
                              <View>
                                <Text className='admin-bgcheck-title'>工作经历 & 背景调查信息：</Text>
                                {safeArray(talentDetail.workExperiences).map((exp: any, idx: number) => (
                                  <View key={idx} className='admin-bgcheck-item'>
                                    <View className='admin-row-between'>
                                      <Text className='admin-bgcheck-position'>{exp.position}</Text>
                                      <Text className='admin-bgcheck-date'>
                                        {exp.startYear}.{exp.startMonth} - {exp.isCurrent ? '至今' : `${exp.endYear}.${exp.endMonth}`}
                                      </Text>
                                    </View>
                                    <Text className='admin-bgcheck-company'>{exp.companyName}</Text>
                                    {exp.description ? <Text className='admin-bgcheck-desc'>{exp.description}</Text> : null}
                                    {exp.bgRefName || exp.bgRefTitle || exp.bgRefPhone ? (
                                      <View className='admin-bgcheck-ref'>
                                        <Text className='admin-bgcheck-ref-title'>🔒 背景调查信息：</Text>
                                        <Text className='admin-bgcheck-ref-text'>
                                          调查人：{exp.bgRefName || '-'}  职位：{exp.bgRefTitle || '-'}  电话：{exp.bgRefPhone || '-'}
                                        </Text>
                                      </View>
                                    ) : (
                                      <Text className='admin-bgcheck-none'>无背景调查信息</Text>
                                    )}
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <Text className='admin-bgcheck-none'>暂无工作经历数据</Text>
                            )}
                          </View>
                        ) : null}
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* ===== 认证审核 ===== */}
            {activeTab === 'verifications' && (
              <View>
                {verifications.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无认证审核数据</Text></View>
                ) : (
                  verifications.map((v: any) => (
                    <View key={v.id} className='admin-card'>
                      <View className='admin-user-info'>
                        <View className='admin-user-name-row'>
                          <Text className='admin-user-name'>{v.talent?.realName || '未知'}</Text>
                          <Text className='admin-role-pill rp-blue'>{VERIFY_TYPE_LABEL[v.type] || v.type}</Text>
                        </View>
                        <Text className={`admin-status-pill ${v.status === 'PENDING' ? 'sp-yellow' : v.status === 'VERIFIED' ? 'sp-green' : 'sp-red'}`}>
                          {v.status === 'PENDING' ? '待审核' : v.status === 'VERIFIED' ? '已通过' : '已拒绝'}
                        </Text>
                      </View>

                      {v.type === 'REFERENCE' ? (
                        <View className='admin-verify-detail'>
                          <Text className='admin-verify-detail-text'>推荐人：{v.refName} ({v.refTitle})</Text>
                          <Text className='admin-verify-detail-text'>电话：{v.refPhone}</Text>
                        </View>
                      ) : null}
                      {v.type === 'CERTIFICATE' && v.certFileUrl ? (
                        <View className='admin-license-section'>
                          <Text className='admin-license-label'>离职证明：</Text>
                          <Image
                            src={getImageUrl(v.certFileUrl) || v.certFileUrl}
                            className='admin-license-img'
                            mode='widthFix'
                            onClick={() => previewImage(v.certFileUrl)}
                          />
                        </View>
                      ) : null}
                      {v.type === 'SALARY_FLOW' && v.salaryFileUrl ? (
                        <View className='admin-license-section'>
                          <Text className='admin-license-label'>工资流水：</Text>
                          <Image
                            src={getImageUrl(v.salaryFileUrl) || v.salaryFileUrl}
                            className='admin-license-img'
                            mode='widthFix'
                            onClick={() => previewImage(v.salaryFileUrl)}
                          />
                        </View>
                      ) : null}

                      {v.status === 'PENDING' ? (
                        <View className='admin-actions'>
                          <Text className='admin-verify-btn vb-green' onClick={() => handleVerifyMaterial(v.id, 'VERIFIED')}>通过</Text>
                          <Text className='admin-verify-btn vb-red' onClick={() => handleVerifyMaterial(v.id, 'REJECTED')}>拒绝</Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ===== 供应审核 ===== */}
            {activeTab === 'supply' && (
              <View>
                <View className='admin-sub-tabs'>
                  {SUPPLY_TABS.map(t => (
                    <Text
                      key={t.key}
                      className={`admin-sub-tab ${supplyTab === t.key ? 'admin-sub-tab-active' : ''}`}
                      onClick={() => setSupplyTab(t.key)}
                    >
                      {t.label}
                    </Text>
                  ))}
                </View>
                {supplyCompanies.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无数据</Text></View>
                ) : (
                  supplyCompanies.map(c => (
                    <View key={c.id} className='admin-card'>
                      <View className='admin-row-between'>
                        <View className='admin-ent-head'>
                          <View className='admin-ent-logo sm'>
                            <Text className='admin-ent-logo-text'>{c.companyName?.charAt(0) || '供'}</Text>
                          </View>
                          <View className='admin-user-info'>
                            <Text className='admin-user-name'>{c.companyName}</Text>
                            <Text className='admin-user-phone'>{c.category?.name || ''} · {c.user?.phone || ''}</Text>
                            <Text className='admin-user-phone'>{c._count?.products ?? 0} 款产品</Text>
                          </View>
                        </View>
                        <Text className={`admin-status-pill ${c.status === 'PENDING' ? 'sp-yellow' : c.status === 'APPROVED' ? 'sp-green' : 'sp-red'}`}>
                          {c.status === 'PENDING' ? '待审核' : c.status === 'APPROVED' ? '已通过' : '已驳回'}
                        </Text>
                      </View>

                      {c.services || c.introduction || c.contactName || c.cuisineIds ? (
                        <View className='admin-verify-detail'>
                          {c.services ? <Text className='admin-verify-detail-text'>服务：{c.services}</Text> : null}
                          {c.introduction ? <Text className='admin-verify-detail-text clamp2'>介绍：{c.introduction}</Text> : null}
                          {c.contactName ? <Text className='admin-verify-detail-text'>联系人：{c.contactName} {c.contactPhone}</Text> : null}
                          {c.cuisineIds ? <Text className='admin-verify-detail-text'>菜系：{c.cuisineIds}</Text> : null}
                          {c.status === 'REJECTED' && c.reason ? (
                            <Text className='admin-verify-detail-text danger'>驳回原因：{c.reason}</Text>
                          ) : null}
                        </View>
                      ) : null}

                      {c.businessLicense ? (
                        <View className='admin-license-section'>
                          <Text className='admin-license-label'>营业执照：</Text>
                          <Image
                            src={getImageUrl(c.businessLicense) || c.businessLicense}
                            className='admin-license-img'
                            mode='widthFix'
                            onClick={() => previewImage(c.businessLicense)}
                          />
                        </View>
                      ) : null}

                      {c.status === 'PENDING' ? (
                        <View className='admin-actions'>
                          <Text className='admin-verify-btn vb-green' onClick={() => handleVerifySupply(c.id, 'APPROVED', '')}>通过</Text>
                          <Text className='admin-verify-btn vb-red' onClick={() => handleVerifySupply(c.id, 'REJECTED', rejectReason[c.id] || '资料不完整，请补充后重新提交')}>驳回</Text>
                          <Input
                            className='admin-reject-input'
                            value={rejectReason[c.id] || ''}
                            placeholder='驳回原因（可选）'
                            placeholderClass='admin-placeholder'
                            onInput={(e) => setRejectReason(prev => ({ ...prev, [c.id]: e.detail.value }))}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ===== 分享审核 ===== */}
            {activeTab === 'shares' && (
              <View>
                <View className='admin-sub-tabs'>
                  {SHARE_TABS.map(t => (
                    <Text
                      key={t.key}
                      className={`admin-sub-tab ${shareTab === t.key ? 'admin-sub-tab-active' : ''}`}
                      onClick={() => setShareTab(t.key)}
                    >
                      {t.label}
                    </Text>
                  ))}
                </View>
                {sharePosts.length === 0 ? (
                  <View className='admin-empty'><Text className='admin-empty-text'>暂无数据</Text></View>
                ) : (
                  sharePosts.map(p => {
                    let images: string[] = []
                    try { images = JSON.parse(p.images || '[]') } catch { images = [] }
                    return (
                      <View key={p.id} className='admin-card'>
                        <View className='admin-row-between'>
                          <View className='admin-user-name-row'>
                            <Text className='admin-role-pill rp-purple'>{p.category === 'STARTUP' ? '创业分享' : '学习分享'}</Text>
                            <Text className='admin-user-phone'>{p.user?.name || p.user?.phone || ''}</Text>
                          </View>
                          <Text className='admin-user-phone'>👍 {p.likeCount} · 💬 {p.commentCount}</Text>
                        </View>
                        <Text className='admin-share-title'>{p.title}</Text>
                        {p.content ? <Text className='admin-share-content'>{p.content}</Text> : null}
                        {images.length > 0 ? (
                          <Image
                            src={getImageUrl(images[0]) || images[0]}
                            className='admin-share-img'
                            mode='aspectFill'
                            onClick={() => previewImage(images[0])}
                          />
                        ) : null}
                        {p.videoUrl ? <Text className='admin-user-phone'>🎬 含视频内容</Text> : null}
                        <View className='admin-share-footer'>
                          <Text className='admin-share-date'>{new Date(p.createdAt).toLocaleString('zh-CN')}</Text>
                          <Text
                            className={`admin-op-pill ${p.status === 'VISIBLE' ? 'op-red' : 'op-green'}`}
                            onClick={() => handleToggleShare(p.id, p.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}
                          >
                            {p.status === 'VISIBLE' ? '隐藏' : '恢复'}
                          </Text>
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* 星级评定标准弹层（还原网页版底部弹层） */}
      {showStarCriteria ? (
        <View className='admin-modal-mask' onClick={() => setShowStarCriteria(false)}>
          <View className='admin-modal' onClick={(e) => e.stopPropagation()}>
            <View className='admin-modal-header'>
              <Text className='admin-modal-title'>⭐ 人才星级评定标准</Text>
              <Text className='admin-modal-close' onClick={() => setShowStarCriteria(false)}>✕</Text>
            </View>
            <Text className='admin-modal-desc'>星级评定由平台管理员根据人才的综合素质、工作经验、行业影响力等因素综合评定。</Text>
            <ScrollView className='admin-modal-scroll' scrollY>
              {starCriteria.length === 0 ? (
                <Text className='admin-modal-loading'>加载中...</Text>
              ) : (
                starCriteria.map(criteria => {
                  const starEmoji = criteria.starLevel === 0 ? '👤' : criteria.starLevel === 3 ? '⭐⭐⭐' : criteria.starLevel === 4 ? '⭐⭐⭐⭐' : criteria.starLevel === 5 ? '⭐⭐⭐⭐⭐' : '🏅'
                  const bgCls = criteria.starLevel === 0 ? 'crit-gray' : criteria.starLevel === 3 ? 'crit-yellow' : criteria.starLevel === 4 ? 'crit-blue' : criteria.starLevel === 5 ? 'crit-purple' : 'crit-orange'
                  let requirements: string[] = []
                  try { requirements = JSON.parse(criteria.requirements || '[]') } catch { requirements = [criteria.requirements] }
                  return (
                    <View key={criteria.starLevel} className={`admin-criteria-card ${bgCls}`}>
                      <View className='admin-criteria-head'>
                        <Text className='admin-criteria-emoji'>{starEmoji}</Text>
                        <Text className='admin-criteria-name'>{criteria.starName}</Text>
                        {criteria.minWorkYears > 0 ? (
                          <Text className='admin-criteria-years'>最低 {criteria.minWorkYears} 年经验</Text>
                        ) : null}
                      </View>
                      <Text className='admin-criteria-desc'>{criteria.description}</Text>
                      {requirements.map((req: string, idx: number) => (
                        <View key={idx} className='admin-criteria-req'>
                          <Text className='admin-criteria-req-dot'>•</Text>
                          <Text className='admin-criteria-req-text'>{req}</Text>
                        </View>
                      ))}
                    </View>
                  )
                })
              )}
            </ScrollView>
            <Text className='admin-modal-tip'>💡 提示：星级评定需综合考量人才的工作经历、品牌背书、项目经验、背调结果等多维度信息。建议每季度复审一次。</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
