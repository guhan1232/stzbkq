<template>
  <div class="login-page">
    <div class="bg-layer"></div>
    <div class="bg-overlay"></div>

    <div class="login-content">
      <div class="login-header">
        <div class="logo-icon">S</div>
        <h1>率土之滨助手</h1>
        <p>移动端管理系统</p>
      </div>

      <div class="login-card">
        <el-form :model="form" :rules="rules" ref="formRef">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-btn"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="login-footer">
        <div class="footer-features">
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span>实时同步</span>
          </div>
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span>攻城考勤</span>
          </div>
          <div class="feature-item">
            <span class="feature-dot"></span>
            <span>数据分析</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const result = await userStore.handleLogin(form.username, form.password)
    if (result.success) {
      ElMessage.success('登录成功')
      router.push('/home')
    } else {
      ElMessage.error(result.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-layer {
  position: fixed;
  inset: 0;
  background-image: url('/login-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.bg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1;
}

.login-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 380px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.login-header {
  text-align: center;
  color: #1e293b;

  .logo-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #4f6ef7 0%, #3a54c4 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 0 auto 16px;
    box-shadow: 0 8px 24px rgba(79, 110, 247, 0.3);
  }

  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: #1e293b;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    letter-spacing: 1px;
  }
}

.login-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 28px 20px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border-radius: 12px;
  background: #4f6ef7;
  border-color: #4f6ef7;
  font-weight: 600;
  letter-spacing: 2px;

  &:hover {
    background: #7b93fa;
    border-color: #7b93fa;
  }

  &:active {
    background: #3a54c4;
    border-color: #3a54c4;
  }
}

.login-footer {
  width: 100%;
}

.footer-features {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.feature-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4f6ef7;
  flex-shrink: 0;
}
</style>
