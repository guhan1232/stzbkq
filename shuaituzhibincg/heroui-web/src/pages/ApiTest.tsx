import { useState } from 'react'
import axios from 'axios'
import qs from 'qs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Copy, Trash2, Monitor } from 'lucide-react'

export default function ApiTest() {
  const [method, setMethod] = useState('GET')
  const [endpoint, setEndpoint] = useState('')
  const [requestBody, setRequestBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [requestTime, setRequestTime] = useState(0)
  const [history, setHistory] = useState<any[]>([])
  const [currentPreset, setCurrentPreset] = useState<string | null>(null)

  const methodOptions = ['GET', 'POST', 'PUT', 'DELETE']

  const presetApis = [
    { label: '获取用户信息', method: 'GET', endpoint: '/v1/user/info' },
    { label: '获取数据库列表', method: 'GET', endpoint: '/v1/databases' },
    { label: '获取同盟成员', method: 'GET', endpoint: '/v1/getTeamUser' },
    { label: '获取任务列表', method: 'GET', endpoint: '/v1/getTaskList' },
    { label: '获取分组', method: 'GET', endpoint: '/v1/getTeamGroup' },
    { label: '获取分组武勋', method: 'GET', endpoint: '/v1/getGroupWu' },
    { label: '登录', method: 'POST', endpoint: '/v1/auth/login', body: 'username=&password=' },
    { label: '注册', method: 'POST', endpoint: '/v1/auth/register', body: 'username=&password=&nickname=' },
    { label: '修改密码', method: 'POST', endpoint: '/v1/user/changePassword', body: 'old_password=&new_password=' },
    { label: '创建数据库', method: 'POST', endpoint: '/v1/databases/create', body: 'name=&display_name=' },
    { label: '认领数据库', method: 'POST', endpoint: '/v1/databases/1/claim' },
    { label: '获取用户列表(管理员)', method: 'GET', endpoint: '/v1/admin/users' }
  ]

  const selectPreset = (preset: any) => {
    setMethod(preset.method)
    setEndpoint(preset.endpoint)
    setRequestBody(preset.body || '')
    setCurrentPreset(preset.label)
  }

  const sendRequest = async () => {
    if (!endpoint) {
      alert('请输入API端点')
      return
    }

    setLoading(true)
    const startTime = Date.now()

    try {
      const config: any = {
        method: method.toLowerCase(),
        url: endpoint,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      if (method !== 'GET' && requestBody) {
        config.data = qs.stringify(Object.fromEntries(new URLSearchParams(requestBody)))
      }

      const res = await axios(config)

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data
      })

      setHistory(prev => {
        const newHistory = [{
          method,
          endpoint,
          time: new Date().toLocaleString(),
          status: res.status
        }, ...prev]
        return newHistory.slice(0, 20)
      })
    } catch (error: any) {
      setResponse({
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Error',
        headers: error.response?.headers || {},
        data: error.response?.data || { error: error.message }
      })
    } finally {
      setRequestTime(Date.now() - startTime)
      setLoading(false)
    }
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))
      alert('已复制到剪贴板')
    }
  }

  const clearAll = () => {
    setEndpoint('')
    setRequestBody('')
    setResponse(null)
    setCurrentPreset(null)
  }

  const formattedResponse = () => {
    if (!response?.data) return ''
    try {
      return JSON.stringify(response.data, null, 2)
    } catch {
      return String(response.data)
    }
  }

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
    if (status >= 400 && status < 500) return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
    if (status >= 500) return 'bg-red-100 text-red-700 hover:bg-red-100'
    return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4 h-full overflow-y-auto pr-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">预设 API</h3>
          </div>
          <div className="p-2 space-y-1">
            {presetApis.map(preset => (
              <div
                key={preset.label}
                onClick={() => selectPreset(preset)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  currentPreset === preset.label
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                }`}
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  preset.method === 'GET' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {preset.method}
                </span>
                <span className="truncate">{preset.label}</span>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-700 text-sm">请求历史</h3>
            </div>
            <div className="p-2 space-y-1">
              {history.map((item, index) => (
                <div key={`${item.method}-${item.endpoint}-${index}`} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.method === 'GET' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.method}
                  </span>
                  <span className="truncate flex-1 text-gray-600" title={item.endpoint}>{item.endpoint}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.status < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 h-full overflow-y-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">请求配置</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder="输入API端点，如: /v1/user/info"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                onKeyDown={(e: any) => e.key === 'Enter' && sendRequest()}
              />
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={sendRequest} disabled={loading}>
                {!loading && <Send size={16}/>}
                {loading ? '发送中...' : '发送'}
              </Button>
            </div>

            {method !== 'GET' && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">请求体 (application/x-www-form-urlencoded)</div>
                <Textarea
                  value={requestBody}
                  onChange={e => setRequestBody(e.target.value)}
                  placeholder="输入请求参数，如: username=admin&password=123456"
                  rows={4}
                />
              </div>
            )}

            <div>
              <Button variant="outline" onClick={clearAll}>
                <Trash2 size={16}/>清空
              </Button>
            </div>
          </div>
        </div>

        {response ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[300px]">
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 text-sm">响应结果</h3>
              <div className="flex items-center gap-2">
                <Badge className={statusColor(response.status)}>
                  {response.status} {response.statusText}
                </Badge>
                <Badge variant="secondary">{requestTime}ms</Badge>
                <Button size="sm" variant="ghost" onClick={copyResponse}>
                  <Copy size={14}/>复制
                </Button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-600 mb-2">响应数据</div>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-auto text-sm font-mono flex-1">
                {formattedResponse()}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-gray-400 space-y-3">
              <Monitor size={48} className="mx-auto opacity-50" />
              <p>选择预设API或输入端点后发送请求</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
