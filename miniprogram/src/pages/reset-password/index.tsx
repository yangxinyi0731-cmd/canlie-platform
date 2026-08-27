import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import api from '../../api'
import NavBar from '../../components/NavBar'
import Icon from '../../components/Icon'
import './index.scss'

// 三步重置密码：验证码只在最终提交时由服务端验证并立即消费。
export default function ResetPassword() {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/send-code', { phone })
      setSuccess('如果该手机号已注册，验证码将通过短信发送')
      setStep(2)
    } catch (err: any) {
      setError(err?.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位验证码')
      return
    }
    setError('')
    setStep(3)
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('密码至少6位')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { phone, code, newPassword })
      setSuccess('密码已重置，请重新登录')
      setTimeout(() => Taro.reLaunch({ url: '/pages/login/index' }), 2000)
    } catch (err: any) {
      setError(err?.message || '重置密码失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='rp-page'>
      <NavBar title='重置密码' />

      {/* 错误/成功提示 */}
      {error ? (
        <View className='rp-msg rp-msg-error'>
          <Icon name='alert' size={32} color='#DC2626' />
          <Text className='rp-msg-text rp-msg-error-text'>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View className='rp-msg rp-msg-success'>
          <Icon name='check' size={32} color='#16A34A' />
          <Text className='rp-msg-text rp-msg-success-text'>{success}</Text>
        </View>
      ) : null}

      <View className='rp-body'>
        {/* Step 1: 手机号 */}
        {step === 1 && (
          <View>
            <Text className='rp-hint'>请输入注册时使用的手机号</Text>
            <View className='rp-field'>
              <View className='rp-prefix'>
                <Icon name='phone' size={32} color='#6B7280' />
                <Text className='rp-prefix-text'>+86</Text>
              </View>
              <Input
                className='rp-input'
                type='number'
                maxlength={11}
                value={phone}
                placeholder='手机号'
                placeholderClass='rp-placeholder'
                onInput={(e) => setPhone(e.detail.value.replace(/\D/g, '').slice(0, 11))}
              />
            </View>
            <View
              className={`rp-btn ${loading || phone.length !== 11 ? 'rp-btn-disabled' : ''}`}
              onClick={() => !(loading || phone.length !== 11) && handleSendCode()}
            >
              <Text className='rp-btn-text'>{loading ? '发送中...' : '获取验证码'}</Text>
            </View>
          </View>
        )}

        {/* Step 2: 验证码 */}
        {step === 2 && (
          <View>
            <Text className='rp-hint'>请输入短信收到的验证码</Text>
            <View className='rp-field'>
              <Input
                className='rp-input rp-code-input'
                type='number'
                maxlength={6}
                value={code}
                placeholder='验证码'
                placeholderClass='rp-placeholder'
                onInput={(e) => setCode(e.detail.value.replace(/\D/g, '').slice(0, 6))}
              />
            </View>
            <View
              className={`rp-btn ${code.length !== 6 ? 'rp-btn-disabled' : ''}`}
              onClick={() => code.length === 6 && handleContinue()}
            >
              <Text className='rp-btn-text'>下一步</Text>
            </View>
            <View className='rp-reget' onClick={() => setStep(1)}>
              <Text className='rp-reget-text'>重新获取验证码</Text>
            </View>
          </View>
        )}

        {/* Step 3: 新密码 */}
        {step === 3 && (
          <View>
            <Text className='rp-hint'>请设置新密码</Text>
            <View className='rp-field'>
              <View className='rp-prefix'>
                <Icon name='lock' size={32} color='#9CA3AF' />
              </View>
              <Input
                className='rp-input'
                password
                value={newPassword}
                placeholder='新密码（至少6位）'
                placeholderClass='rp-placeholder'
                onInput={(e) => setNewPassword(e.detail.value)}
              />
            </View>
            <View
              className={`rp-btn ${loading || newPassword.length < 6 ? 'rp-btn-disabled' : ''}`}
              onClick={() => !(loading || newPassword.length < 6) && handleResetPassword()}
            >
              <Text className='rp-btn-text'>{loading ? '重置中...' : '确认重置'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
