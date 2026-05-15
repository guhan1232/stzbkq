<template>
  <div class="layout">
    <div class="header">
      <div class="header-left">
        <el-icon v-if="!isHome" @click="goBack" class="back-btn"><ArrowLeft /></el-icon>
        <span class="title">{{ title }}</span>
      </div>
      <div class="header-right">
        <el-icon @click="goProfile" class="profile-btn"><User /></el-icon>
      </div>
    </div>

    <div class="content">
      <router-view />
    </div>

    <div class="tabbar" v-if="showTabbar">
      <div
        v-for="item in tabs"
        :key="item.path"
        class="tab-item"
        :class="{ active: isActive(item.path) }"
        @click="navigateTo(item.path)"
      >
        <el-icon :size="22"><component :is="item.icon" /></el-icon>
        <span>{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, User, List, UserFilled, ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: '首页', path: '/home', icon: 'HomeFilled' },
  { name: '任务', path: '/task', icon: 'List' },
  { name: '成员', path: '/teamuser', icon: 'User' },
  { name: '我的', path: '/profile', icon: 'UserFilled' }
]

const title = computed(() => route.meta.title || '率土助手')
const isHome = computed(() => route.path === '/home')
const showTabbar = computed(() => route.meta.showTab !== false)

const isActive = (path) => route.path === path

const navigateTo = (path) => {
  router.push(path)
}

const goBack = () => {
  router.back()
}

const goProfile = () => {
  router.push('/profile')
}
</script>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 60px;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;

  .back-btn {
    font-size: 20px;
    cursor: pointer;
    color: #1e293b;
    transition: color 0.15s ease;

    &:active {
      color: #4f6ef7;
    }
  }

  .title {
    font-size: 17px;
    font-weight: 600;
    color: #1e293b;
  }
}

.header-right {
  .profile-btn {
    font-size: 22px;
    cursor: pointer;
    color: #64748b;
    transition: color 0.15s ease;

    &:active {
      color: #4f6ef7;
    }
  }
}

.content {
  padding-top: 52px;
}

.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #ffffff;
  display: flex;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.04);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s ease;

  span {
    font-size: 11px;
    font-weight: 500;
  }

  &.active {
    color: #4f6ef7;

    span {
      font-weight: 600;
    }
  }
}
</style>
