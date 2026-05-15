import { useState, useEffect } from 'react'
import { ApiGetHostCheckConfig, ApiSaveHostCheckConfig } from '../api'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Info } from 'lucide-react'

export default function HostCheck() {
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await ApiGetHostCheckConfig()
      if (res.data.code === 200) {
        setEnabled(res.data.data.enabled)
      }
    } catch (error: any) {
      alert('加载配置失败: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (val: boolean) => {
    setEnabled(val)
  }

  const handleSave = async () => {
    if (enabled) {
      const confirmed = confirm(
        '启用后将禁止通过 IP 地址访问，请确保：\n\n1. 已通过域名配置好访问\n2. DNS 解析正常\n3. 小程序使用域名访问\n\n确定要启用吗？'
      )
      if (!confirmed) {
        setEnabled(!enabled)
        return
      }
    }

    setSaving(true)
    try {
      await ApiSaveHostCheckConfig(enabled)

      alert(
        '配置已保存！\n\n请按以下步骤完成配置：\n' +
        '1. 编辑服务器上的 .env 文件\n' +
        '2. 设置 ENABLE_HOST_CHECK=' + (enabled ? 'true' : 'false') + '\n' +
        '3. 重启服务：systemctl restart stzbhelper\n\n' +
        '注意：配置修改后需要重启服务才能生效。'
      )
    } catch (error: any) {
      alert('保存失败: ' + (error.response?.data?.message || error.message))
      setEnabled(!enabled)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">主机名访问控制</h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? '已启用' : '已禁用'}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
          <Info size={20} className="flex-shrink-0 mt-0.5 text-blue-600" />
          <div className="text-sm space-y-1">
            <p>启用后，系统将禁止通过 IP 地址直接访问，只允许通过域名访问。</p>
            <p className="text-blue-600">优点：提高安全性，防止恶意扫描和攻击</p>
            <p className="text-blue-600">注意：启用前请确保已通过域名配置好访问方式</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">启用主机名检查</Label>
              <p className="text-xs text-gray-500 mt-1">当前状态：{enabled ? '禁止通过 IP 地址访问' : '允许通过 IP 地址访问'}</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
          <Button variant="outline" onClick={loadConfig} disabled={loading}>
            {loading ? '加载中...' : '重新加载'}
          </Button>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-4">访问测试</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">通过域名访问</div>
                <div className="font-mono text-sm text-gray-700">http://your-domain.com:9527</div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">允许</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">通过 IP 访问</div>
                <div className="font-mono text-sm text-gray-700">http://192.168.1.100:9527</div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${enabled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {enabled ? '禁止' : '允许'}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">localhost 访问</div>
                <div className="font-mono text-sm text-gray-700">http://localhost:9527</div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">允许</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-4">重要提示</h3>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="text-sm font-bold text-amber-800 mb-2">启用前请确认</div>
              <ul className="list-disc pl-5 text-sm text-amber-700 space-y-1">
                <li>确保已通过域名可以正常访问系统</li>
                <li>确认 DNS 解析已正确配置</li>
                <li>小程序 API 地址应使用域名而非 IP</li>
                <li>建议先在测试环境验证后再在生产环境启用</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="text-sm font-bold text-red-800 mb-2">如果启用后无法访问</div>
              <ol className="list-decimal pl-5 text-sm text-red-700 space-y-1">
                <li>联系管理员修改配置文件 <code className="bg-red-100 px-1 rounded">.env</code></li>
                <li>设置 <code className="bg-red-100 px-1 rounded">ENABLE_HOST_CHECK=false</code></li>
                <li>重启服务：<code className="bg-red-100 px-1 rounded">systemctl restart stzbhelper</code></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
