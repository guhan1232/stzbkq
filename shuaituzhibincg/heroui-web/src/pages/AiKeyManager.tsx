import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Key, Copy, Download } from 'lucide-react'

export default function AiKeyManager() {
  const apiBaseUrl = 'https://stzb.kaoqin.txy.hanyuxin.cn/v1'

  const [newKeyForm, setNewKeyForm] = useState({
    serviceName: '',
    serviceId: '',
    description: '',
    expireDays: '90'
  })

  const [generating, setGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<any>(null)
  const [keys, setKeys] = useState<any[]>([])

  const loadKeys = () => {
    const savedKeys = JSON.parse(localStorage.getItem('ai_keys') || '[]')
    setKeys(savedKeys.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const saveKeys = (newKeys: any[]) => {
    localStorage.setItem('ai_keys', JSON.stringify(newKeys))
    setKeys(newKeys)
  }

  const generateUniqueId = () => {
    return 'svc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  const generateApiKey = () => {
    return 'sk_' + Array.from({ length: 48 }, () =>
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
    ).join('')
  }

  const handleGenerateServiceId = () => {
    setNewKeyForm({ ...newKeyForm, serviceId: generateUniqueId() })
  }

  const handleGenerateKey = () => {
    if (!newKeyForm.serviceName) {
      alert('请输入服务名称')
      return
    }
    setGenerating(true)
    setTimeout(() => {
      try {
        const keyData: any = {
          id: Date.now().toString(),
          serviceName: newKeyForm.serviceName,
          serviceId: newKeyForm.serviceId || generateUniqueId(),
          apiKey: generateApiKey(),
          description: newKeyForm.description,
          createdAt: new Date().toISOString(),
          isActive: true
        }
        if (Number(newKeyForm.expireDays) !== 0) {
          const expireDate = new Date()
          expireDate.setDate(expireDate.getDate() + Number(newKeyForm.expireDays))
          keyData.expiresAt = expireDate.toISOString()
        }

        const newKeys = [keyData, ...keys]
        saveKeys(newKeys)
        setGeneratedKey(keyData)
        setNewKeyForm({ serviceName: '', serviceId: '', description: '', expireDays: '90' })
        alert('密钥生成成功！')
      } catch (error: any) {
        alert('生成密钥失败: ' + error.message)
      } finally {
        setGenerating(false)
      }
    }, 500)
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    return key.substring(0, 8) + '...' + key.substring(key.length - 4)
  }

  const showFullKey = (key: any) => {
    if (confirm('确定要查看完整密钥吗？请确保周围环境安全。')) {
      prompt('API密钥: \n请妥善保管，不要泄露给他人！', key.apiKey)
    }
  }

  const toggleKeyStatus = (key: any) => {
    const newKeys = keys.map(k => k.id === key.id ? { ...k, isActive: !k.isActive } : k)
    saveKeys(newKeys)
    alert(key.isActive ? '密钥已禁用' : '密钥已启用')
  }

  const regenerateKey = (key: any) => {
    if (confirm('确定要重新生成密钥吗？旧密钥将立即失效。')) {
      const newKeys = keys.map(k => {
        if (k.id === key.id) {
          return {
            ...k,
            apiKey: generateApiKey(),
            regeneratedAt: new Date().toISOString()
          }
        }
        return k
      })
      saveKeys(newKeys)
      alert('密钥已重新生成，请妥善保管新密钥！')
    }
  }

  const deleteKey = (key: any) => {
    if (confirm('确定要删除密钥 "' + key.serviceName + '" 吗？此操作不可恢复！')) {
      const newKeys = keys.filter(k => k.id !== key.id)
      saveKeys(newKeys)
      alert('密钥已删除')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板')
    }).catch(() => {
      alert('复制失败')
    })
  }

  const downloadKeyConfig = () => {
    if (!generatedKey) return
    const config = {
      apiUrl: apiBaseUrl,
      serviceId: generatedKey.serviceId,
      apiKey: generatedKey.apiKey,
      serviceName: generatedKey.serviceName,
      createdAt: generatedKey.createdAt
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai-key-config-' + Date.now() + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const isExpiringSoon = (expiresAt: string) => {
    if (!expiresAt) return false
    const daysUntilExpire = (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpire <= 7 && daysUntilExpire > 0
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">AI密钥管理</h2>
          <Badge variant="secondary">生成和管理API密钥</Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">生成新密钥</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">服务名称</Label>
            <Input
              placeholder="例如：我的AI训练服务"
              value={newKeyForm.serviceName}
              onChange={e => setNewKeyForm({...newKeyForm, serviceName: e.target.value})}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">服务ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="留空则自动生成"
                value={newKeyForm.serviceId}
                onChange={e => setNewKeyForm({...newKeyForm, serviceId: e.target.value})}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleGenerateServiceId}>生成</Button>
            </div>
            <div className="text-xs text-gray-500 mt-1">如果不填写，系统将自动生成唯一ID</div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">描述</Label>
            <Input
              placeholder="此密钥的用途说明"
              value={newKeyForm.description}
              onChange={e => setNewKeyForm({...newKeyForm, description: e.target.value})}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">有效期</Label>
            <Select value={newKeyForm.expireDays} onValueChange={(val) => setNewKeyForm({...newKeyForm, expireDays: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30天</SelectItem>
                <SelectItem value="90">90天</SelectItem>
                <SelectItem value="180">180天</SelectItem>
                <SelectItem value="365">1年</SelectItem>
                <SelectItem value="0">永久有效</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleGenerateKey} disabled={generating}>
              {!generating && <Key size={16}/>}
              {generating ? '生成中...' : '生成密钥'}
            </Button>
          </div>
        </div>
      </div>

      {generatedKey && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-lg">
            <Key size={20} />
            密钥生成成功
          </div>
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200">
            请妥善保管以下密钥信息，关闭后将无法再次查看完整密钥！
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-100">
              <div className="text-sm text-gray-500 w-16">API地址</div>
              <code className="flex-1 font-mono text-sm bg-gray-50 px-2 py-1 rounded text-gray-700 break-all">{apiBaseUrl}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(apiBaseUrl)}><Copy size={14}/></Button>
            </div>
            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-100">
              <div className="text-sm text-gray-500 w-16">服务ID</div>
              <code className="flex-1 font-mono text-sm bg-gray-50 px-2 py-1 rounded text-gray-700 break-all">{generatedKey.serviceId}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedKey.serviceId)}><Copy size={14}/></Button>
            </div>
            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-100">
              <div className="text-sm text-gray-500 w-16">API密钥</div>
              <code className="flex-1 font-mono text-sm bg-red-50 text-red-600 px-2 py-1 rounded break-all">{generatedKey.apiKey}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedKey.apiKey)}><Copy size={14}/></Button>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={downloadKeyConfig}>
              <Download size={16}/>下载配置文件
            </Button>
            <Button variant="secondary" onClick={() => setGeneratedKey(null)}>我已保存</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">已生成的密钥</h3>
        {keys.length === 0 ? (
          <div className="py-8 text-center text-gray-500">暂无密钥，请先生成</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {keys.map(key => (
              <div key={key.id} className="border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-gray-800">{key.serviceName}</h4>
                  <Badge className={key.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-50' : 'bg-red-50 text-red-600 hover:bg-red-50'}>
                    {key.isActive ? '启用' : '禁用'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16">服务ID</span>
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded font-mono text-xs text-gray-700">{key.serviceId}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16">API密钥</span>
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded font-mono text-xs text-gray-700">{maskKey(key.apiKey)}</code>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => showFullKey(key)}>查看</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16">创建时间</span>
                    <span className="text-gray-700">{formatDate(key.createdAt)}</span>
                  </div>
                  {key.expiresAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">过期时间</span>
                      <span className={`${isExpiringSoon(key.expiresAt) ? 'text-amber-600 font-medium' : 'text-gray-700'}`}>
                        {formatDate(key.expiresAt)}
                      </span>
                    </div>
                  )}
                  {key.description && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-16 shrink-0">描述</span>
                      <span className="text-gray-700">{key.description}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button size="sm" variant={key.isActive ? 'outline' : 'default'} onClick={() => toggleKeyStatus(key)}>
                    {key.isActive ? '禁用' : '启用'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => regenerateKey(key)}>重新生成</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteKey(key)}>删除</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">使用示例</h3>
        <Tabs defaultValue="js">
          <TabsList>
            <TabsTrigger value="js">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          <TabsContent value="js">
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto text-sm font-mono mt-2">
{`const response = await fetch('${apiBaseUrl}/api/ai-data/teams/all', {
  headers: {
    'X-AI-ID': 'your-service-id',
    'X-AI-Key': 'your-api-key',
    'Authorization': 'Bearer your-api-key'
  }
})
const data = await response.json()
console.log(data)`}
            </pre>
          </TabsContent>
          <TabsContent value="python">
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto text-sm font-mono mt-2">
{`import requests
url = '${apiBaseUrl}/api/ai-data/teams/all'
headers = {
    'X-AI-ID': 'your-service-id',
    'X-AI-Key': 'your-api-key',
    'Authorization': 'Bearer your-api-key'
}
response = requests.get(url, headers=headers)
data = response.json()
print(data)`}
            </pre>
          </TabsContent>
          <TabsContent value="curl">
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto text-sm font-mono mt-2">
{`curl -X GET "${apiBaseUrl}/api/ai-data/teams/all" \\
  -H "X-AI-ID: your-service-id" \\
  -H "X-AI-Key: your-api-key" \\
  -H "Authorization: Bearer your-api-key"`}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
