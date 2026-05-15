<template>
  <div class="apiTest-page">
    <div class="form-card">
      <div class="card-header">
        <div class="header-icon">
          <el-icon :size="20" color="#0284c7"><SetUp /></el-icon>
        </div>
        <div class="header-text">
          <h3>API 调试工具</h3>
          <p>发送自定义请求测试接口</p>
        </div>
      </div>

      <el-form :model="form" label-position="top">
        <el-form-item label="请求方法">
          <el-select v-model="form.method" style="width: 100%">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>

        <el-form-item label="API路径">
          <el-input v-model="form.path" placeholder="/v1/xxx" />
        </el-form-item>

        <el-form-item label="请求体 (JSON)">
          <el-input
            v-model="form.body"
            type="textarea"
            :rows="6"
            placeholder='{"key": "value"}'
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="sendRequest"
            class="send-btn"
          >
            发送请求
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="response-card" v-if="response">
      <div class="response-header">
        <span>响应结果</span>
        <el-button size="small" text @click="response = ''">清除</el-button>
      </div>
      <pre class="response-body">{{ response }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { SetUp } from '@element-plus/icons-vue'

const loading = ref(false)
const response = ref('')

const form = reactive({
  method: 'GET',
  path: '',
  body: ''
})

const sendRequest = async () => {
  if (!form.path) return

  loading.value = true
  try {
    const sessionId = localStorage.getItem('session_id')
    const config = {
      method: form.method,
      url: form.path,
      headers: sessionId ? { 'X-Session-ID': sessionId } : {}
    }

    if (['POST', 'PUT'].includes(form.method) && form.body) {
      config.data = JSON.parse(form.body)
    }

    const res = await axios(config)
    response.value = JSON.stringify(res.data, null, 2)
  } catch (e) {
    response.value = JSON.stringify(e.response?.data || { error: e.message }, null, 2)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.apiTest-page {
  padding: 16px;
  padding-bottom: 80px;
}

.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.header-icon {
  width: 40px;
  height: 40px;
  background: #e0f2fe;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 2px;
  }

  p {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
}

.send-btn {
  width: 100%;
  height: 46px;
  font-size: 15px;
  border-radius: 12px;
}

.response-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 12px;
}

.response-body {
  background: #f8fafc;
  padding: 14px;
  border-radius: 10px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
</style>
