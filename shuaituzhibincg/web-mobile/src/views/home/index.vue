<template>
  <div class="home-page">
    <div class="user-card">
      <div class="user-info">
        <div class="avatar">{{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}</div>
        <div class="info">
          <div class="welcome">欢迎回来</div>
          <div class="name">{{ userStore.userInfo?.username || '用户' }}</div>
        </div>
      </div>
      <div class="role-badge" :class="{ admin: userStore.isAdmin }">
        {{ userStore.isAdmin ? '管理员' : '成员' }}
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">功能入口</div>
      <div class="feature-grid">
        <div
          class="feature-item"
          v-for="item in features"
          :key="item.path"
          @click="navigateTo(item.path)"
        >
          <div class="feature-icon" :style="{ background: item.bg, color: item.iconColor }">
            <el-icon :size="22"><component :is="item.icon" /></el-icon>
          </div>
          <div class="feature-name">{{ item.name }}</div>
        </div>
      </div>
    </div>

    <div class="section-card" v-if="userStore.isAdmin">
      <div class="section-title">管理员功能</div>
      <div class="menu-list">
        <div class="menu-item" v-for="item in adminMenus" :key="item.path" @click="navigateTo(item.path)">
          <div class="menu-icon" :style="{ background: item.bg, color: item.iconColor }">
            <el-icon :size="18"><component :is="item.icon" /></el-icon>
          </div>
          <span class="menu-name">{{ item.name }}</span>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <div class="version">率土之滨助手 v1.0.0</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, User, List, DataLine, Coin, SetUp, Lock, Monitor, DataAnalysis } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const stats = ref([
  { label: '同盟成员', value: '128', color: '#4f6ef7' },
  { label: '任务总数', value: '12', color: '#34d399' },
  { label: '今日武勋', value: '52.8K', color: '#8b5cf6' },
  { label: '数据库', value: '5', color: '#f59e0b' }
])

const features = [
  { name: '同盟成员', icon: 'User', path: '/teamuser', bg: '#eef1fe', iconColor: '#4f6ef7' },
  { name: '攻城任务', icon: 'List', path: '/task', bg: '#d1fae5', iconColor: '#059669' },
  { name: '战场监控', icon: 'Monitor', path: '/battlefield', bg: '#fef3c7', iconColor: '#d97706' },
  { name: '战场统计', icon: 'DataAnalysis', path: '/battlefieldStats', bg: '#fee2e2', iconColor: '#dc2626' },
  { name: '分组武勋', icon: 'DataLine', path: '/groupWu', bg: '#f3e8ff', iconColor: '#7c3aed' },
  { name: '数据库', icon: 'Coin', path: '/database', bg: '#e0f2fe', iconColor: '#0284c7' }
]

const adminMenus = [
  { name: '用户管理', icon: 'User', path: '/users', bg: '#eef1fe', iconColor: '#4f6ef7' }
]

const navigateTo = (path) => {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.home-page {
  padding: 16px;
  padding-bottom: 80px;
}

.user-card {
  background: linear-gradient(135deg, #4f6ef7 0%, #3a54c4 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.25);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.info {
  .welcome {
    font-size: 12px;
    opacity: 0.8;
  }
  .name {
    font-size: 18px;
    font-weight: 600;
  }
}

.role-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;

  &.admin {
    background: rgba(255, 215, 0, 0.9);
    color: #1e293b;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
}

.stat-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.section-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.96);
  }
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:active {
    background: #eef1fe;
  }

  .arrow {
    margin-left: auto;
    color: #cbd5e1;
  }
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-name {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
}

.version {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 20px;
}
</style>
