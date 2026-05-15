<template>
  <div class="profile-page">
    <div class="user-section">
      <div class="avatar">{{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}</div>
      <div class="username">{{ userStore.userInfo?.username || '用户' }}</div>
      <div class="role-tag" :class="{ admin: userStore.isAdmin }">
        {{ userStore.isAdmin ? '管理员' : '普通成员' }}
      </div>
    </div>

    <div class="menu-section">
      <div class="menu-item" @click="navigateTo('/password')">
        <div class="menu-icon-wrap lock">
          <el-icon :size="18"><Lock /></el-icon>
        </div>
        <span>修改密码</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" v-if="userStore.isAdmin" @click="navigateTo('/users')">
        <div class="menu-icon-wrap setting">
          <el-icon :size="18"><Setting /></el-icon>
        </div>
        <span>用户管理</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <div class="logout-section">
      <el-button type="danger" size="large" @click="handleLogout" class="logout-btn" plain>
        退出登录
      </el-button>
    </div>

    <div class="version">v1.0.0</div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Lock, Setting, ArrowRight } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const navigateTo = (path) => {
  router.push(path)
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await userStore.handleLogout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (e) {
    // 取消退出
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 16px;
  padding-bottom: 80px;
}

.user-section {
  background: linear-gradient(135deg, #4f6ef7 0%, #3a54c4 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: #fff;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.25);
}

.avatar {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  margin: 0 auto 12px;
}

.username {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.role-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;

  &.admin {
    background: rgba(255, 215, 0, 0.9);
    color: #1e293b;
  }
}

.menu-section {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f8fafc;
  }

  span {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: #1e293b;
  }

  .arrow {
    color: #cbd5e1;
  }
}

.menu-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.lock {
    background: #fee2e2;
    color: #dc2626;
  }

  &.setting {
    background: #eef1fe;
    color: #4f6ef7;
  }
}

.logout-section {
  padding: 20px 0;
}

.logout-btn {
  width: 100%;
  height: 46px;
  font-size: 15px;
  border-radius: 12px;
}

.version {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}
</style>
