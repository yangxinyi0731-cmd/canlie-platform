import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { useAuthStore } from '../../stores/authStore'
import Icon from '../../components/Icon'
import { STATUS_BAR_HEIGHT } from '../../components/NavBar'
import './index.scss'

export default function Login() {
  const { login, register } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'TALENT' | 'ENTERPRISE'>('TALENT')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberAccount, setRememberAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 启动时只读取记住的账号；旧版明文密码由 authStore 在模块加载时清除。
  useEffect(() => {
    const t = Taro.getStorageSync('token')
    if (t && t !== 'null' && t !== 'undefined') {
      Taro.reLaunch({ url: '/pages/jobs/index' })
      return
    }
    const savedPhone = Taro.getStorageSync('remembered_phone')
    if (savedPhone) {
      setPhone(String(savedPhone))
      setRememberAccount(true)
    }
  }, [])

  const switchMode = () => {
    if (submitting) return
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const handleSubmit = async () => {
    if (submitting) return // 防重复提交

    // 表单校验（还原网页版：内联错误条而非 toast）
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    if (password.length < 6) {
      setError('密码至少6位')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    if (mode === 'register' && !name.trim()) {
      setError('请输入姓名/企业名称')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await register(phone, password, role, name.trim())
      } else {
        await login(phone, password)
        // 只记住非敏感账号标识，绝不持久化密码。
        if (rememberAccount) {
          Taro.setStorageSync('remembered_phone', phone)
        } else {
          Taro.removeStorageSync('remembered_phone')
        }
      }
      // 按角色跳转（还原网页版：人才/企业进首页，管理员进后台）
      const user = useAuthStore.getState().user
      if (user?.role === 'ADMIN') {
        Taro.reLaunch({ url: '/pages/admin/index' })
      } else {
        Taro.reLaunch({ url: '/pages/jobs/index' })
      }
    } catch (err: any) {
      setError(err?.message || '操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='login-page'>
      {/* 品牌渐变头（还原网页版 .header-gradient pt-16 pb-12 rounded-b-[32px] + 装饰圆） */}
      <View className='brand-header' style={{ paddingTop: `${STATUS_BAR_HEIGHT + 64}px` }}>
        <View className='brand-center'>
          <Text className='brand-title'>餐猎</Text>
          <Text className='brand-sub'>餐饮酒店高端人才专属平台</Text>
        </View>
        <View className='brand-deco'>
          <View className='deco-circle-lg' />
          <View className='deco-circle-sm' />
        </View>
      </View>

      {/* 上浮表单卡（还原网页版 -mt-6 rounded-2xl 上投影） */}
      <View className='form-wrap'>
        <View className='form-card'>
          <Text className='form-title'>{mode === 'register' ? '创建账号' : '欢迎回来'}</Text>

          {/* 手机号：左侧 +86 前缀图标区 */}
          <View className='field-row'>
            <View className='field-prefix'>
              <Icon name='phone' size={32} color='#6B7280' />
              <Text className='field-prefix-text'>+86</Text>
            </View>
            <Input
              className='field-input'
              type='number'
              maxlength={11}
              value={phone}
              placeholder='手机号'
              placeholderClass='field-placeholder'
              onInput={(e) => setPhone(e.detail.value.replace(/\D/g, '').slice(0, 11))}
            />
          </View>

          {/* 密码：左侧锁图标 + 右侧眼睛切换 */}
          <View className='field-row'>
            <View className='field-prefix'>
              <Icon name='lock' size={32} color='#9CA3AF' />
            </View>
            <Input
              className='field-input'
              password={!showPassword}
              value={password}
              placeholder='密码'
              placeholderClass='field-placeholder'
              onInput={(e) => setPassword(e.detail.value)}
            />
            <View className='field-suffix' onClick={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={40} color='#9CA3AF' />
            </View>
          </View>

          {mode === 'register' && (
            <View>
              {/* 确认密码 */}
              <View className='field-row'>
                <View className='field-prefix'>
                  <Icon name='lock' size={32} color='#9CA3AF' />
                </View>
                <Input
                  className='field-input'
                  password={!showConfirmPassword}
                  value={confirmPassword}
                  placeholder='确认密码'
                  placeholderClass='field-placeholder'
                  onInput={(e) => setConfirmPassword(e.detail.value)}
                />
                <View className='field-suffix' onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={40} color='#9CA3AF' />
                </View>
              </View>

              {/* 姓名 */}
              <View className='field-row'>
                <View className='field-prefix'>
                  <Icon name='user' size={32} color='#9CA3AF' />
                </View>
                <Input
                  className='field-input'
                  value={name}
                  placeholder={role === 'TALENT' ? '您的姓名' : '企业名称'}
                  placeholderClass='field-placeholder'
                  onInput={(e) => setName(e.detail.value)}
                />
              </View>
            </View>
          )}

          {/* 记住账号（仅登录，不保存密码） */}
          {mode === 'login' && (
            <View className='remember-row' onClick={() => setRememberAccount(!rememberAccount)}>
              <View className={`checkbox ${rememberAccount ? 'checked' : ''}`}>
                {rememberAccount && <Icon name='check' size={24} color='#ffffff' strokeWidth={3} />}
              </View>
              <Text className='remember-text'>记住账号</Text>
            </View>
          )}

          {/* 注册身份（还原网页版双卡单选：选中橙边+橙底） */}
          {mode === 'register' && (
            <View className='role-section'>
              <Text className='role-label'>注册身份</Text>
              <View className='grid-2 role-group'>
                <View className={`g2 role-card ${role === 'TALENT' ? 'active' : ''}`} onClick={() => setRole('TALENT')}>
                  <Icon name='user' size={40} color={role === 'TALENT' ? '#C2410C' : '#5F6B7A'} />
                  <Text className='role-name'>求职者</Text>
                </View>
                <View className={`g2 role-card ${role === 'ENTERPRISE' ? 'active' : ''}`} onClick={() => setRole('ENTERPRISE')}>
                  <Icon name='briefcase' size={40} color={role === 'ENTERPRISE' ? '#C2410C' : '#5F6B7A'} />
                  <Text className='role-name'>招聘方</Text>
                </View>
              </View>
            </View>
          )}

          {/* 错误条（还原网页版红底内联错误） */}
          {error ? (
            <View className='error-box'>
              <Icon name='alert' size={32} color='#DC2626' />
              <Text className='error-text'>{error}</Text>
            </View>
          ) : null}

          {/* 提交按钮（还原网页版渐变按钮 + 橙色投影） */}
          <View
            className={`submit-btn ${submitting ? 'submitting' : ''}`}
            onClick={submitting ? undefined : handleSubmit}
          >
            {submitting ? (
              <View className='submit-loading'>
                <View className='submit-spinner' />
                <Text className='submit-text'>{mode === 'register' ? '注册中...' : '登录中...'}</Text>
              </View>
            ) : (
              <Text className='submit-text'>{mode === 'register' ? '注册' : '登录'}</Text>
            )}
          </View>

          {/* 模式切换 + 忘记密码（还原网页版底部文字链接） */}
          <View className='switch-row'>
            <Text className='switch-link' onClick={switchMode}>
              {mode === 'register' ? '已有账号？去登录' : '没有账号？去注册'}
            </Text>
            {mode === 'login' && (
              <Text className='forgot-link' onClick={() => Taro.navigateTo({ url: '/pages/reset-password/index' })}>
                忘记密码？
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 底部协议（还原网页版） */}
      <View className='login-footer'>
        <Text className='footer-text'>登录即代表同意《服务协议》和《隐私政策》</Text>
      </View>
    </View>
  )
}
