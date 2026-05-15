import { useState, useEffect } from 'react'
import { ApiGetIpWhitelist, ApiSaveIpWhitelist } from '../api'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import axios from 'axios'

export default function IPWhitelist() {
  const [enabled, setEnabled] = useState(false)
  const [whitelistText, setWhitelistText] = useState('')
  const [currentIP, setCurrentIP] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await ApiGetIpWhitelist()
      if (res.data.code === 200) {
        setEnabled(res.data.data.enabled)
        const ips = res.data.data.whitelist || []
        setWhitelistText(ips.join(',\n'))
      }
      try {
        const ipRes = await axios.get('https://api.ipify.org?format=json')
        setCurrentIP(ipRes.data.ip)
      } catch (e) {
        setCurrentIP('无法获取（可能使用了代理）')
      }
    } catch (error: any) {
      alert('加载配置失败: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEnabled = async (val: boolean) => {
    setEnabled(val)
    try {
      await saveConfig(val, whitelistText)
      alert(val ? '已启用 IP 白名单' : '已禁用 IP 白名单')
    } catch (error) {
      setEnabled(!val)
      alert('操作失败')
    }
  }

  const handleSave = async () => {
    if (!confirm('保存后将立即生效，确定要保存吗？')) return
    try {
      await saveConfig(enabled, whitelistText)
      alert('保存成功')
    } catch (error) {}
  }

  const saveConfig = async (isEnabled: boolean, text: string) => {
    setSaving(true)
    try {
      const ips = text
        .split(/[,\n]/)
        .map(ip => ip.trim())
        .filter(ip => ip !== '')
      await ApiSaveIpWhitelist(isEnabled, ips.join(','))
    } catch (error) {
      throw error
    } finally {
      setSaving(false)
    }
  }

  const addCurrentIP = () => {
    if (!currentIP || currentIP.includes('无法获取')) {
      alert('无法获取当前 IP 地址')
      return
    }

    const ips = whitelistText
      .split(/[,\n]/)
      .map(ip => ip.trim())
      .filter(ip => ip !== '')

    if (ips.includes(currentIP)) {
      alert('当前 IP 已在白名单中')
      return
    }

    ips.push(currentIP)
    setWhitelistText(ips.join(',\n'))
    alert('已添加当前 IP 到输入框，请点击保存')
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">IP 白名单管理</h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? '已启用' : '已禁用'}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">启用白名单</Label>
              <p className="text-xs text-gray-500 mt-1">启用后，只有白名单中的 IP 地址可以登录系统</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">白名单 IP</Label>
          <Textarea
            value={whitelistText}
            onChange={e => setWhitelistText(e.target.value)}
            rows={10}
            placeholder={`请输入 IP 地址，每行一个或使用逗号分隔\nIPv4: 192.168.1.100\nIPv6: 2001:db8::1\nIPv4 CIDR: 192.168.1.0/24\nIPv6 CIDR: 2001::/16, 2001:db8::/32`}
            className="mb-2"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-400 rounded-full"></span>支持 IPv4 和 IPv6 地址</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-400 rounded-full"></span>支持 IPv4 CIDR（如 192.168.1.0/24）</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-400 rounded-full"></span>支持 IPv6 CIDR（如 2001::/16、2001:db8::/32）</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-400 rounded-full"></span>多个 IP 用逗号或换行分隔</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
          <Button variant="outline" onClick={loadConfig} disabled={loading}>
            {loading ? '加载中...' : '重新加载'}
          </Button>
          <Button variant="outline" onClick={addCurrentIP}>添加当前 IP</Button>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">您当前的 IP 地址</Label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm text-gray-800">
            {currentIP || '加载中...'}
          </div>
        </div>
      </div>
    </div>
  )
}
