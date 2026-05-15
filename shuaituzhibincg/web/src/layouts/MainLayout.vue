<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled,
  User,
  Document,
  DataAnalysis,
  Search,
  Coin,
  Setting,
  Key,
  ArrowRight,
  Menu,
  Close,
  Histogram,
  Location,
  UserFilled,
  Trophy,
  Connection,
  Lock,
  MagicStick
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { ApiGetDatabases, ApiLogout } from '../api'
import ReportSidebar from '../components/ReportSidebar.vue'

const router = useRouter()
const userStore = useUserStore()

const collapsed = ref(false)
const activeKey = ref('home')
const isMobile = ref(false)
const drawerVisible = ref(false)
const reportSidebarVisible = ref(false)

const isAdmin = computed(() => userStore.isAdmin())

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    collapsed.value = true
  }
}

const menuItems = computed(() => {
  const items = [
    { index: '', title: '首页概览', icon: HomeFilled },
    { index: 'teamuser', title: '同盟成员', icon: User },
    { index: 'memberhistory', title: '离盟人员', icon: UserFilled },
    { index: 'landrecords', title: '翻地记录', icon: Location },
    { index: 'task', title: '攻城任务', icon: Document },
    { index: 'groupWu', title: '分组武勋', icon: DataAnalysis },
    { index: 'leaderboard', title: '排行榜看板', icon: Trophy },
    { index: 'packet-capture', title: '数据包捕获', icon: Connection },
    { index: 'team', title: '队伍查询', icon: Search, external: true },
    { index: 'database', title: '区服管理', icon: Coin },
    { index: 'api', title: 'API调试', icon: Setting }
  ]

  if (isAdmin.value) {
    items.push({ index: 'users', title: '用户管理', icon: Setting })
    items.push({ index: 'ip-whitelist', title: 'IP白名单', icon: Lock })
    items.push({ index: 'host-check', title: '访问控制', icon: Lock })
    items.push({ index: 'ai-key-manager', title: 'AI密钥管理', icon: MagicStick })
  }

  return items
})

const currentRouteName = computed(() => {
  const path = router.currentRoute.value.path
  const nameMap = {
    '': '首页概览',
    'teamuser': '同盟成员',
    'memberhistory': '离盟人员',
    'landrecords': '翻地记录',
    'task': '攻城任务',
    'groupWu': '分组武勋',
    'leaderboard': '排行榜看板',
    'packet-capture': '数据包捕获',
    'ip-whitelist': 'IP白名单',
    'host-check': '访问控制',
    'database': '区服管理',
    'users': '用户管理',
    'password': '修改密码',
    'api': 'API调试'
  }
  return nameMap[path.replace('/', '')] || '首页概览'
})

const handleMenuClick = (index) => {
  activeKey.value = index
  const item = menuItems.value.find(m => m.index === index)
  if (item?.external) {
    window.open('/data.html#/team', '_blank')
  } else {
    router.push('/' + index)
  }
  if (isMobile.value) {
    drawerVisible.value = false
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    try {
      await ApiLogout()
    } catch (e) {}
    userStore.logout()
    router.push('/login')
    ElMessage.success('已退出登录')
  } catch (e) {}
}

const updateActiveKey = () => {
  const path = router.currentRoute.value.path.replace('/', '')
  activeKey.value = path || ''
}

onMounted(() => {
  updateActiveKey()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <el-container class="main-layout">
    <el-aside v-if="!isMobile" :width="collapsed ? '68px' : '240px'" class="layout-aside">
      <div class="sidebar-logo" :class="{ collapsed }">
        <div class="logo-icon">⚔</div>
        <transition name="fade">
          <div v-if="!collapsed" class="logo-text">
            <span class="logo-title">人道洛阳花似锦，偏我来时不逢春</span>
            <span class="logo-version">v1.0</span>
          </div>
        </transition>
      </div>

      <el-menu
        :default-active="activeKey"
        :collapse="collapsed"
        :collapse-transition="false"
        @select="handleMenuClick"
        class="sidebar-menu"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.index"
          :index="item.index"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer" v-if="!collapsed">
        <span>© 2024 人道洛阳花似锦，偏我来时不逢春</span>
      </div>
    </el-aside>

    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      :size="260"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="drawer-inner">
        <div class="sidebar-logo mobile-logo">
          <div class="logo-icon">⚔</div>
          <div class="logo-text">
            <span class="logo-title">人道洛阳花似锦，偏我来时不逢春</span>
            <span class="logo-version">v1.0</span>
          </div>
          <el-button link class="drawer-close" @click="drawerVisible = false">
            <el-icon :size="18"><Close /></el-icon>
          </el-button>
        </div>
        <el-menu
          :default-active="activeKey"
          @select="handleMenuClick"
          class="sidebar-menu"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.index"
            :index="item.index"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
        <div class="drawer-bottom">
          <div class="drawer-user">
            <div class="drawer-avatar">
              {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="drawer-user-info">
              <div class="drawer-user-name">{{ userStore.userInfo?.username }}</div>
              <el-tag v-if="isAdmin" size="small" effect="plain">管理员</el-tag>
            </div>
          </div>
          <el-button type="danger" plain size="small" @click="handleLogout" style="width: 100%">
            退出登录
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-container>
      <el-header class="layout-header" :class="{ 'mobile-header': isMobile }">
        <div class="header-left">
          <el-button
            v-if="isMobile"
            link
            @click="drawerVisible = true"
            class="header-btn"
          >
            <el-icon :size="20"><Menu /></el-icon>
          </el-button>
          <el-button
            v-else
            link
            @click="collapsed = !collapsed"
            class="header-btn"
          >
            <el-icon :size="18"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
          </el-button>

          <el-breadcrumb separator="/" v-if="!isMobile">
            <el-breadcrumb-item>首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteName }}</el-breadcrumb-item>
          </el-breadcrumb>
          <span v-else class="mobile-title">{{ currentRouteName }}</span>
        </div>

        <div class="header-right">
          <el-tag v-if="isAdmin && !isMobile" effect="plain" size="small">管理员</el-tag>

          <el-button
            v-if="!isMobile"
            link
            class="report-btn"
            @click="reportSidebarVisible = !reportSidebarVisible"
            :class="{ active: reportSidebarVisible }"
          >
            <el-icon :size="18"><Document /></el-icon>
            <span>报告</span>
          </el-button>

          <el-dropdown v-if="!isMobile">
            <div class="user-dropdown">
              <div class="header-avatar">
                {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <span class="header-username">{{ userStore.userInfo?.username }}</span>
              <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/password')">
                  <el-icon><Key /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div v-if="isMobile" class="header-avatar" @click="router.push('/password')">
            {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
        </div>
      </el-header>

      <el-main class="layout-main" :class="{ 'mobile-main': isMobile }">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <ReportSidebar v-if="!isMobile" v-model:visible="reportSidebarVisible" />
  </el-container>
</template>

<style scoped>
.main-layout {
  height: 100vh;
  background: var(--bg-page);
}

.layout-aside {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
}

.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-light);
  transition: all var(--transition-normal);
  gap: 12px;
}

.sidebar-logo.collapsed {
  justify-content: center;
  padding: 0;
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  white-space: nowrap;
}

.logo-version {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 8px;
}

.sidebar-menu :deep(.el-menu-item) {
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  height: 42px;
  line-height: 42px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--color-primary-lighter);
  color: var(--color-primary);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: var(--bg-hover);
}

.sidebar-footer {
  padding: 14px;
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-light);
}

.drawer-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
}

.mobile-logo {
  flex-shrink: 0;
  position: relative;
}

.drawer-close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
}

.drawer-bottom {
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
}

.drawer-avatar {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.drawer-user-info {
  flex: 1;
  min-width: 0;
}

.drawer-user-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.layout-header {
  height: var(--header-height);
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.mobile-header {
  padding: 0 14px;
}

.mobile-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-btn {
  color: var(--text-secondary);
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-xl);
  transition: background var(--transition-fast);
}

.user-dropdown:hover {
  background: var(--bg-hover);
}

.header-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.header-username {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.dropdown-arrow {
  color: var(--text-tertiary);
  font-size: 12px;
}

.report-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.report-btn:hover,
.report-btn.active {
  background: var(--color-primary-lighter);
  color: var(--color-primary);
}

.layout-main {
  padding: 24px;
  background: var(--bg-page);
  min-height: calc(100vh - var(--header-height));
  overflow-y: auto;
}

.mobile-main {
  padding: 14px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
