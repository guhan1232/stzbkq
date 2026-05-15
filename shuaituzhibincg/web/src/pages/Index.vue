<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  Document,
  DataAnalysis,
  Search,
  Coin,
  Key,
  Setting,
  ArrowRight,
  Trophy
} from '@element-plus/icons-vue'
import { ApiEnableGetBattleReport, ApiDisableGetBattleReport, ApiGetDatabases, ApiCreateDatabase, ApiSelectDatabase, ApiEnableGetLeaderboard, ApiDisableGetLeaderboard } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const battleReportEnabled = ref(false)
const leaderboardEnabled = ref(false)
const stats = ref({
  databaseCount: 0,
  taskCount: 0
})
const dbInitialized = ref(false)

const isAdmin = computed(() => userStore.isAdmin())

const quickActions = [
  { icon: User, title: '同盟成员', desc: '查看和管理同盟成员信息', path: '/teamuser', color: '#4f6ef7' },
  { icon: Document, title: '攻城任务', desc: '创建和管理攻城任务', path: '/task', color: '#34d399' },
  { icon: DataAnalysis, title: '分组武勋', desc: '统计分组武勋数据', path: '/groupWu', color: '#a78bfa' },
  { icon: Trophy, title: '排行榜看板', desc: '查看同盟和个人排行榜', path: '/leaderboard', color: '#fbbf24' },
  { icon: Search, title: '队伍查询', desc: '查询玩家队伍配置', path: '/team', color: '#f472b6', external: true },
  { icon: Coin, title: '数据库管理', desc: '创建和管理游戏数据库', path: '/database', color: '#60a5fa' },
  { icon: Key, title: '修改密码', desc: '更新账户密码', path: '/password', color: '#fb923c' }
]

const EnableGetBattleReport = () => {
  loading.value = true
  ApiEnableGetBattleReport().then(v => {
    if (v.data.code == 200) {
      ElMessage.success('开启成功')
      battleReportEnabled.value = true
    } else {
      ElMessage.error(v.data.msg)
    }
  }).catch(e => {
    ElMessage.error('开启失败: ' + e)
  }).finally(() => {
    loading.value = false
  })
}

const DisableGetBattleReport = () => {
  loading.value = true
  ApiDisableGetBattleReport().then(v => {
    if (v.data.code == 200) {
      ElMessage.success('关闭成功')
      battleReportEnabled.value = false
    } else {
      ElMessage.error(v.data.msg)
    }
  }).catch(e => {
    ElMessage.error('关闭失败: ' + e)
  }).finally(() => {
    loading.value = false
  })
}

const EnableGetLeaderboard = () => {
  loading.value = true
  ApiEnableGetLeaderboard().then(v => {
    if (v.data.code == 200) {
      ElMessage.success('排行榜抓取已开启')
      leaderboardEnabled.value = true
    } else {
      ElMessage.error(v.data.msg)
    }
  }).catch(e => {
    ElMessage.error('开启失败: ' + e)
  }).finally(() => {
    loading.value = false
  })
}

const DisableGetLeaderboard = () => {
  loading.value = true
  ApiDisableGetLeaderboard().then(v => {
    if (v.data.code == 200) {
      ElMessage.success('排行榜抓取已关闭')
      leaderboardEnabled.value = false
    } else {
      ElMessage.error(v.data.msg)
    }
  }).catch(e => {
    ElMessage.error('关闭失败: ' + e)
  }).finally(() => {
    loading.value = false
  })
}

const handleAction = (action) => {
  if (action.external) {
    window.open('/data.html#/team', '_blank')
  } else {
    router.push(action.path)
  }
}

const loadStats = async () => {
  try {
    const res = await ApiGetDatabases({ page: 1, page_size: 1 })
    if (res.data.code === 200) {
      stats.value.databaseCount = res.data.data.total
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const initDatabase = async () => {
  try {
    const res = await ApiGetDatabases({ page: 1, page_size: 10 })
    if (res.data.code === 200) {
      const list = res.data.data.list || []
      stats.value.databaseCount = res.data.data.total

      if (list.length > 0) {
        const userInfo = userStore.userInfo
        if (userInfo && !userInfo.database_id) {
          await ApiSelectDatabase({ database_id: list[0].id })
          userStore.setUserInfo({ ...userInfo, database_id: list[0].id })
          ElMessage.success('已自动选择数据库：' + (list[0].display_name || list[0].name))
        }
      }
    }
  } catch (error) {
    console.error('初始化数据库失败:', error)
  } finally {
    dbInitialized.value = true
  }
}

onMounted(() => {
  initDatabase()
})
</script>

<template>
  <div class="index-page">
    <div class="welcome-banner">
      <div class="welcome-left">
        <div class="welcome-avatar">
          {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div class="welcome-text">
          <div class="welcome-greeting">欢迎回来，{{ userStore.userInfo?.username }}</div>
          <div class="welcome-sub">管理你的同盟数据，一切尽在掌握</div>
        </div>
      </div>
      <div class="welcome-stats">
        <div class="stat-item">
          <div class="stat-value">{{ stats.databaseCount }}</div>
          <div class="stat-label">数据库</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.taskCount }}</div>
          <div class="stat-label">任务</div>
        </div>
      </div>
    </div>

    <div class="control-section">
      <div class="section-label">控制面板</div>
      <div class="control-grid">
        <div class="control-card">
          <div class="control-info">
            <div class="control-name">获取详细战报</div>
            <div class="control-desc">用于队伍查询功能拉取战报，开启时无法获取攻城战报</div>
          </div>
          <div class="control-actions">
            <el-button
              :type="battleReportEnabled ? 'primary' : 'default'"
              :loading="loading"
              @click="EnableGetBattleReport"
              size="small"
            >
              开启
            </el-button>
            <el-button
              :type="!battleReportEnabled ? 'danger' : 'default'"
              :loading="loading"
              @click="DisableGetBattleReport"
              size="small"
              plain
            >
              关闭
            </el-button>
          </div>
        </div>
        <div class="control-card">
          <div class="control-info">
            <div class="control-name">排行榜数据抓取</div>
            <div class="control-desc">抓取同盟排行(cmd 700)、个人积分(cmd 514/6314)实时数据</div>
          </div>
          <div class="control-actions">
            <el-button
              :type="leaderboardEnabled ? 'primary' : 'default'"
              :loading="loading"
              @click="EnableGetLeaderboard"
              size="small"
            >
              开启
            </el-button>
            <el-button
              :type="!leaderboardEnabled ? 'danger' : 'default'"
              :loading="loading"
              @click="DisableGetLeaderboard"
              size="small"
              plain
            >
              关闭
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="actions-section">
      <div class="section-label">快捷入口</div>
      <div class="action-grid">
        <div
          v-for="action in quickActions"
          :key="action.path"
          class="action-card"
          @click="handleAction(action)"
        >
          <div class="action-icon" :style="{ background: action.color }">
            <el-icon :size="20"><component :is="action.icon" /></el-icon>
          </div>
          <div class="action-body">
            <div class="action-title">{{ action.title }}</div>
            <div class="action-desc">{{ action.desc }}</div>
          </div>
          <el-icon class="action-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.index-page {
  max-width: 960px;
  margin: 0 auto;
}

.welcome-banner {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}

.welcome-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}

.welcome-greeting {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.welcome-sub {
  font-size: 13px;
  color: var(--text-tertiary);
}

.welcome-stats {
  display: flex;
  align-items: center;
  gap: 28px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border-color);
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-section {
  margin-bottom: 28px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.control-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.control-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.control-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.control-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.actions-section {
  margin-bottom: 28px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 10px;
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.action-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-md);
}

.action-card:hover .action-arrow {
  color: var(--color-primary);
  transform: translateX(3px);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.action-body {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.action-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.action-arrow {
  color: var(--border-color);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .welcome-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .welcome-stats {
    display: none;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }

  .control-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .control-actions {
    width: 100%;
  }

  .control-actions .el-button {
    flex: 1;
  }
}
</style>
