<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { ApiLogin, ApiRegister } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLogin = ref(true)
const loading = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const res = await ApiLogin(loginForm.value)
    if (res.data.code === 200) {
      userStore.setSessionId(res.data.data.session_id || '')
      userStore.setUserInfo(res.data.data.user)
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (error) {
    ElMessage.error('登录失败：' + (error.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.value.username || !registerForm.value.password) {
    ElMessage.error('请输入用户名和密码')
    return
  }
  if (registerForm.value.password.length < 6) {
    ElMessage.error('密码长度至少6个字符')
    return
  }
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    const res = await ApiRegister({
      username: registerForm.value.username,
      password: registerForm.value.password,
      nickname: registerForm.value.nickname || registerForm.value.username
    })
    if (res.data.code === 200) {
      userStore.setSessionId(res.data.data.session_id || '')
      userStore.setUserInfo(res.data.data.user)
      ElMessage.success('注册成功')
      router.push('/')
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (error) {
    ElMessage.error('注册失败：' + (error.message || '网络错误'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-layer"></div>
    <div class="bg-overlay"></div>

    <div class="login-container">
      <div class="login-card">
        <div class="brand-header">
          <div class="brand-icon">⚔</div>
          <h1 class="brand-title">人道洛阳花似锦，偏我来时不逢春</h1>
          <p class="brand-desc">同盟管理 · 攻城考勤 · 数据分析</p>
        </div>

        <div class="login-tabs">
          <button :class="['tab-btn', { active: isLogin }]" @click="isLogin = true">登录</button>
          <button :class="['tab-btn', { active: !isLogin }]" @click="isLogin = false">注册</button>
        </div>

        <div v-if="isLogin" class="login-form">
          <el-form @submit.prevent="handleLogin">
            <el-form-item>
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="loginForm.password"
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
                class="submit-btn"
              >
                登 录
              </el-button>
            </el-form-item>
          </el-form>
          <p class="switch-text">
            还没有账户？<a @click="isLogin = false">立即注册</a>
          </p>
        </div>

        <div v-else class="login-form">
          <el-form @submit.prevent="handleRegister">
            <el-form-item>
              <el-input
                v-model="registerForm.username"
                placeholder="请输入用户名（3-50字符）"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="registerForm.nickname"
                placeholder="请输入昵称（可选）"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（至少6字符）"
                :prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                :prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleRegister"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                @click="handleRegister"
                class="submit-btn"
              >
                注 册
              </el-button>
            </el-form-item>
          </el-form>
          <p class="switch-text">
            已有账户？<a @click="isLogin = true">立即登录</a>
          </p>
        </div>
      </div>

      <div class="login-footer">
        <div class="footer-features">
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <span>实时同步同盟成员数据</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🏰</div>
            <span>攻城任务考勤自动统计</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🏆</div>
            <span>分组武勋与排行榜看板</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.bg-layer {
  position: fixed;
  inset: 0;
  background-image: url('https://api.guangyapan.com/nd.bizuserres.s/v1/thumbnail/v0/thumbnails/8C5B0C0FBFA875A55B1F10FEBAD418C15CFC0331/128/128?auth_key=t1eyspMBUNe9WZCK5I00PWm-O7MYXyZ2uiyi7owggPnmTcuqTk6HKQ0mW_h7N07Sdw9hRi2odZRXPXcZNYI1mPl1PYjCSvR5gpIbYUxPCwE90LUzxBeVV3nFJMnkI-0J&pt=914&w=1280&h=720');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.bg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(2px);
  z-index: 1;
}

.login-container {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 40px 24px;
  width: 100%;
  max-width: 480px;
}

.login-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 36px 32px 32px;
}

.brand-header {
  text-align: center;
  margin-bottom: 28px;
}

.brand-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.3);
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}

.brand-desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0;
  letter-spacing: 1px;
}

.login-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--border-light);
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-family: var(--font-family);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-btn:hover:not(.active) {
  color: var(--text-secondary);
}

.login-form {
  padding-top: 4px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 2px;
}

.switch-text {
  text-align: center;
  margin-top: 16px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.switch-text a {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 500;
}

.switch-text a:hover {
  text-decoration: underline;
}

.login-footer {
  width: 100%;
}

.footer-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.feature-icon {
  font-size: 16px;
}

@media (max-width: 640px) {
  .login-container {
    padding: 24px 16px;
    gap: 20px;
  }

  .login-card {
    padding: 24px 20px 20px;
    border-radius: var(--radius-lg);
  }

  .brand-title {
    font-size: 20px;
  }

  .footer-features {
    gap: 8px;
  }

  .feature-item {
    font-size: 12px;
    padding: 6px 10px;
  }
}
</style>
