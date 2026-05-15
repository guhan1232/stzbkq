import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiLogin, ApiRegister } from '../api'
import { useUserStore } from '../store/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function Login() {
  const navigate = useNavigate()
  const setUserInfo = useUserStore(state => state.setUserInfo)
  
  const [selected, setSelected] = useState<string>("login")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '', nickname: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginForm.username || !loginForm.password) {
      setErrorMsg('请输入用户名和密码')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await ApiLogin(loginForm)
      if (res.data.code === 200) {
        if (res.data.data && res.data.data.user) {
          setUserInfo(res.data.data.user)
          navigate('/')
        } else {
          setErrorMsg('登录响应数据异常')
        }
      } else {
        setErrorMsg(res.data.message || '登录失败')
      }
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data
        setErrorMsg(data?.message || `服务器错误 (${error.response.status})`)
      } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        setErrorMsg('网络连接失败，请检查后端服务是否启动')
      } else {
        setErrorMsg('登录失败：' + (error.message || '未知错误'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerForm.username || !registerForm.password) {
      setErrorMsg('请输入用户名和密码')
      return
    }
    if (registerForm.password.length < 6) {
      setErrorMsg('密码长度至少6个字符')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMsg('两次输入的密码不一致')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await ApiRegister({
        username: registerForm.username,
        password: registerForm.password,
        nickname: registerForm.nickname || registerForm.username
      })
      if (res.data.code === 200) {
        if (res.data.data && res.data.data.user) {
          setUserInfo(res.data.data.user)
          navigate('/')
        } else {
          setErrorMsg('注册响应数据异常')
        }
      } else {
        setErrorMsg(res.data.message || '注册失败')
      }
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data
        setErrorMsg(data?.message || `服务器错误 (${error.response.status})`)
      } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        setErrorMsg('网络连接失败，请检查后端服务是否启动')
      } else {
        setErrorMsg('注册失败：' + (error.message || '未知错误'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center pb-0 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-500 mb-4">
              <span className="text-2xl">⚔</span>
            </div>
            <h1 className="text-xl font-bold">同盟管理 · 攻城考勤 · 数据分析</h1>
          </div>
          <div className="px-8 py-6">
            <div className="flex border-b mb-4">
              <button 
                className={`flex-1 py-2 text-center font-medium transition-colors ${selected === 'login' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setSelected('login')}
              >
                登录
              </button>
              <button 
                className={`flex-1 py-2 text-center font-medium transition-colors ${selected === 'register' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setSelected('register')}
              >
                注册
              </button>
            </div>

            {selected === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    required
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input
                    required
                    type="password"
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                {errorMsg && <div className="text-destructive text-sm">{errorMsg}</div>}
                <Button type="submit" isLoading={loading} className="mt-2 w-full">
                  登录
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    required
                    placeholder="请输入用户名"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>昵称 (选填)</Label>
                  <Input
                    placeholder="请输入游戏内昵称"
                    value={registerForm.nickname}
                    onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input
                    required
                    type="password"
                    placeholder="请输入密码"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>确认密码</Label>
                  <Input
                    required
                    type="password"
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  />
                </div>
                {errorMsg && <div className="text-destructive text-sm">{errorMsg}</div>}
                <Button type="submit" isLoading={loading} className="mt-2 w-full">
                  注册
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
