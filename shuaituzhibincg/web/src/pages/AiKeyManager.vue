<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheckFilled, Key, Plus, CopyDocument, Download, Delete } from '@element-plus/icons-vue'

const apiBaseUrl = 'https://stzb.kaoqin.txy.hanyuxin.cn/v1'

const newKeyForm = ref({
  serviceName: '',
  serviceId: '',
  description: '',
  expireDays: 90
})

const generating = ref(false)
const generatedKey = ref(null)
const keys = ref([])

function generateServiceId() {
  newKeyForm.value.serviceId = 'svc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function generateApiKey() {
  return 'sk_' + Array.from({ length: 48 }, () => 
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
  ).join('')
}

function generateUniqueId() {
  return 'svc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

async function generateKey() {
  if (!newKeyForm.value.serviceName) {
    ElMessage.warning('请输入服务名称')
    return
  }
  generating.value = true
  try {
    const keyData = {
      id: Date.now().toString(),
      serviceName: newKeyForm.value.serviceName,
      serviceId: newKeyForm.value.serviceId || generateUniqueId(),
      apiKey: generateApiKey(),
      description: newKeyForm.value.description,
      createdAt: new Date().toISOString(),
      isActive: true
    }
    if (newKeyForm.value.expireDays !== 0) {
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + newKeyForm.value.expireDays)
      keyData.expiresAt = expireDate.toISOString()
    }
    const savedKeys = JSON.parse(localStorage.getItem('ai_keys') || '[]')
    savedKeys.push(keyData)
    localStorage.setItem('ai_keys', JSON.stringify(savedKeys))
    generatedKey.value = keyData
    loadKeys()
    newKeyForm.value = { serviceName: '', serviceId: '', description: '', expireDays: 90 }
    ElMessage.success('密钥生成成功！')
  } catch (error) {
    ElMessage.error('生成密钥失败: ' + error.message)
  } finally {
    generating.value = false
  }
}

function loadKeys() {
  const savedKeys = JSON.parse(localStorage.getItem('ai_keys') || '[]')
  keys.value = savedKeys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function maskKey(key) {
  if (!key) return ''
  return key.substring(0, 8) + '...' + key.substring(key.length - 4)
}

function showFullKey(key) {
  ElMessageBox.confirm('确定要查看完整密钥吗？请确保周围环境安全。', '安全提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessageBox.alert('API密钥: ' + key.apiKey + '\n\n请妥善保管，不要泄露给他人！', '完整密钥', {
      confirmButtonText: '复制并关闭',
      callback: () => copyToClipboard(key.apiKey)
    })
  }).catch(() => {})
}

function toggleKeyStatus(key) {
  key.isActive = !key.isActive
  saveKeys()
  ElMessage.success(key.isActive ? '密钥已启用' : '密钥已禁用')
}

function regenerateKey(key) {
  ElMessageBox.confirm('确定要重新生成密钥吗？旧密钥将立即失效。', '重新生成', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    key.apiKey = generateApiKey()
    key.regeneratedAt = new Date().toISOString()
    saveKeys()
    ElMessage.success('密钥已重新生成，请妥善保管新密钥！')
  }).catch(() => {})
}

function deleteKey(key) {
  ElMessageBox.confirm('确定要删除密钥 "' + key.serviceName + '" 吗？此操作不可恢复！', '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(() => {
    const index = keys.value.findIndex(k => k.id === key.id)
    if (index > -1) {
      keys.value.splice(index, 1)
      saveKeys()
      ElMessage.success('密钥已删除')
    }
  }).catch(() => {})
}

function saveKeys() {
  localStorage.setItem('ai_keys', JSON.stringify(keys.value))
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function downloadKeyConfig() {
  if (!generatedKey.value) return
  const config = {
    apiUrl: apiBaseUrl,
    serviceId: generatedKey.value.serviceId,
    apiKey: generatedKey.value.apiKey,
    serviceName: generatedKey.value.serviceName,
    createdAt: generatedKey.value.createdAt
  }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai-key-config-' + Date.now() + '.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置文件已下载')
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

function isExpiringSoon(expiresAt) {
  if (!expiresAt) return false
  const daysUntilExpire = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
  return daysUntilExpire <= 7 && daysUntilExpire > 0
}

onMounted(() => {
  loadKeys()
})
</script>

<template>
  <div class="ai-key-page">
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">AI密钥管理</h2>
        <span class="hint-badge">生成和管理API密钥</span>
      </div>
    </div>

    <div class="generate-card">
      <div class="section-title">生成新密钥</div>
      <el-form :model="newKeyForm" label-position="top" class="generate-form">
        <div class="form-grid">
          <el-form-item label="服务名称">
            <el-input v-model="newKeyForm.serviceName" placeholder="例如：我的AI训练服务" />
          </el-form-item>
          <el-form-item label="服务ID">
            <el-input v-model="newKeyForm.serviceId" placeholder="留空则自动生成">
              <template #append>
                <el-button @click="generateServiceId">生成</el-button>
              </template>
            </el-input>
            <div class="form-tip">如果不填写，系统将自动生成唯一ID</div>
          </el-form-item>
        </div>
        <el-form-item label="描述">
          <el-input v-model="newKeyForm.description" type="textarea" :rows="2" placeholder="此密钥的用途说明" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="有效期">
            <el-select v-model="newKeyForm.expireDays">
              <el-option label="30天" :value="30" />
              <el-option label="90天" :value="90" />
              <el-option label="180天" :value="180" />
              <el-option label="1年" :value="365" />
              <el-option label="永久有效" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="generateKey" :loading="generating" :icon="Key">生成密钥</el-button>
          </el-form-item>
        </div>
      </el-form>
    </div>

    <div v-if="generatedKey" class="success-card">
      <div class="success-header">
        <el-icon :size="20" color="#059669"><CircleCheckFilled /></el-icon>
        <span class="success-title">密钥生成成功</span>
      </div>
      <div class="warning-banner">
        请妥善保管以下密钥信息，关闭后将无法再次查看完整密钥！
      </div>
      <div class="key-info-grid">
        <div class="key-info-item">
          <div class="key-info-label">API地址</div>
          <div class="key-info-value">
            <code>{{ apiBaseUrl }}</code>
            <el-button size="small" text @click="copyToClipboard(apiBaseUrl)" :icon="CopyDocument" />
          </div>
        </div>
        <div class="key-info-item">
          <div class="key-info-label">服务ID</div>
          <div class="key-info-value">
            <code>{{ generatedKey.serviceId }}</code>
            <el-button size="small" text @click="copyToClipboard(generatedKey.serviceId)" :icon="CopyDocument" />
          </div>
        </div>
        <div class="key-info-item">
          <div class="key-info-label">API密钥</div>
          <div class="key-info-value">
            <code class="secret-key">{{ generatedKey.apiKey }}</code>
            <el-button size="small" text @click="copyToClipboard(generatedKey.apiKey)" :icon="CopyDocument" />
          </div>
        </div>
      </div>
      <div class="key-actions">
        <el-button type="primary" plain @click="downloadKeyConfig" :icon="Download">下载配置文件</el-button>
        <el-button @click="generatedKey = null">我已保存</el-button>
      </div>
    </div>

    <div class="keys-list-card">
      <div class="section-title">已生成的密钥</div>
      <el-empty v-if="keys.length === 0" description="暂无密钥，请先生成" />
      <div v-else class="keys-grid">
        <div v-for="key in keys" :key="key.id" class="key-card">
          <div class="key-card-header">
            <h4 class="key-name">{{ key.serviceName }}</h4>
            <span :class="['key-status', key.isActive ? 'active' : 'inactive']">
              {{ key.isActive ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="key-card-info">
            <div class="info-row">
              <span class="info-label">服务ID</span>
              <code>{{ key.serviceId }}</code>
            </div>
            <div class="info-row">
              <span class="info-label">API密钥</span>
              <code>{{ maskKey(key.apiKey) }}</code>
              <el-button link type="primary" size="small" @click="showFullKey(key)">查看</el-button>
            </div>
            <div class="info-row">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(key.createdAt) }}</span>
            </div>
            <div class="info-row" v-if="key.expiresAt">
              <span class="info-label">过期时间</span>
              <span :class="['info-value', { 'expiring': isExpiringSoon(key.expiresAt) }]">
                {{ formatDate(key.expiresAt) }}
              </span>
            </div>
            <div class="info-row" v-if="key.description">
              <span class="info-label">描述</span>
              <span class="info-value">{{ key.description }}</span>
            </div>
          </div>
          <div class="key-card-actions">
            <el-button size="small" :type="key.isActive ? 'warning' : 'success'" @click="toggleKeyStatus(key)">
              {{ key.isActive ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" @click="regenerateKey(key)">重新生成</el-button>
            <el-button size="small" type="danger" @click="deleteKey(key)" plain>删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="guide-card">
      <div class="section-title">使用示例</div>
      <el-tabs>
        <el-tab-pane label="JavaScript">
          <pre class="code-block"><code>const response = await fetch('https://stzb.kaoqin.txy.hanyuxin.cn/v1/api/ai-data/teams/all', {
  headers: {
    'X-AI-ID': 'your-service-id',
    'X-AI-Key': 'your-api-key',
    'Authorization': 'Bearer your-api-key'
  }
})
const data = await response.json()
console.log(data)</code></pre>
        </el-tab-pane>
        <el-tab-pane label="Python">
          <pre class="code-block"><code>import requests
url = 'https://stzb.kaoqin.txy.hanyuxin.cn/v1/api/ai-data/teams/all'
headers = {
    'X-AI-ID': 'your-service-id',
    'X-AI-Key': 'your-api-key',
    'Authorization': 'Bearer your-api-key'
}
response = requests.get(url, headers=headers)
data = response.json()
print(data)</code></pre>
        </el-tab-pane>
        <el-tab-pane label="cURL">
          <pre class="code-block"><code>curl -X GET "https://stzb.kaoqin.txy.hanyuxin.cn/v1/api/ai-data/teams/all" \
  -H "X-AI-ID: your-service-id" \
  -H "X-AI-Key: your-api-key" \
  -H "Authorization: Bearer your-api-key"</code></pre>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.ai-key-page {
  max-width: 1280px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.hint-badge {
  font-size: 13px;
  color: var(--text-tertiary);
  background: var(--bg-page);
  padding: 2px 10px;
  border-radius: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.generate-card,
.success-card,
.keys-list-card,
.guide-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 16px;
}

.generate-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.success-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.success-title {
  font-size: 16px;
  font-weight: 600;
  color: #059669;
}

.warning-banner {
  padding: 10px 14px;
  background: var(--color-warning-light);
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: #92400e;
  margin-bottom: 16px;
}

.key-info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.key-info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.key-info-label {
  font-size: 13px;
  color: var(--text-tertiary);
  min-width: 70px;
  flex-shrink: 0;
}

.key-info-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.key-info-value code {
  flex: 1;
  background: var(--bg-card);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  word-break: break-all;
  color: var(--text-primary);
}

.secret-key {
  color: #dc2626 !important;
  background: var(--color-danger-light) !important;
}

.key-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.key-card {
  background: var(--bg-page);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  padding: 16px;
  transition: box-shadow 0.2s;
}

.key-card:hover {
  box-shadow: var(--shadow-md);
}

.key-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.key-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.key-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;
}

.key-status.active {
  background: var(--color-success-light);
  color: #059669;
}

.key-status.inactive {
  background: var(--color-danger-light);
  color: #dc2626;
}

.key-card-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.info-label {
  min-width: 60px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.info-row code {
  background: var(--bg-card);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-secondary);
}

.expiring {
  color: #d97706;
  font-weight: 500;
}

.key-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.code-block {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0;
}

.code-block code {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .keys-grid {
    grid-template-columns: 1fr;
  }
}
</style>
