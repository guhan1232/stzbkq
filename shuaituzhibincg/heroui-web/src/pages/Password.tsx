import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiChangePassword } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowLeft } from 'lucide-react'

export default function Password() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!form.old_password) return setErrorMsg('请输入旧密码')
    if (!form.new_password) return setErrorMsg('请输入新密码')
    if (form.new_password.length < 6) return setErrorMsg('新密码长度至少6个字符')
    if (form.new_password !== form.confirm_password) return setErrorMsg('两次输入的新密码不一致')

    setErrorMsg('')
    setLoading(true)
    try {
      const res = await ApiChangePassword({
        old_password: form.old_password,
        new_password: form.new_password
      })
      if (res.data.code === 200) {
        alert('密码修改成功')
        setForm({ old_password: '', new_password: '', confirm_password: '' })
      } else {
        setErrorMsg(res.data.message || '修改失败')
      }
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data
        setErrorMsg(data?.message || `服务器错误 (${error.response.status})`)
      } else {
        setErrorMsg('修改失败：' + (error.message || '未知错误'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">修改密码</h2>
            <p className="text-sm text-gray-500 mt-1">请输入当前密码并设置新密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 block">旧密码</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="请输入当前密码"
                  className="pl-9"
                  value={form.old_password}
                  onChange={v => setForm({ ...form, old_password: v.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">新密码</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="请输入新密码（至少6字符）"
                  className="pl-9"
                  value={form.new_password}
                  onChange={v => setForm({ ...form, new_password: v.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">确认密码</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="请再次输入新密码"
                  className="pl-9"
                  value={form.confirm_password}
                  onChange={v => setForm({ ...form, confirm_password: v.target.value })}
                />
              </div>
            </div>

            {errorMsg && <div className="text-red-500 text-sm">{errorMsg}</div>}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} />
                返回
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? '提交中...' : '确认修改'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
