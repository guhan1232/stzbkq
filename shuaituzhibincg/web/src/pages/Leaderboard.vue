<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  ApiGetUnionLeaderboard,
  ApiGetPersonalLeaderboard,
  ApiGetTerritoryLeaderboard
} from '../api'

const loading = ref(false)
const activeTab = ref('union')
const keyword = ref('')
const eventId = ref('')
const unionRows = ref([])
const personalRows = ref([])
const territoryRows = ref([])
let autoRefreshTimer = null

const unionColumns = [
  { prop: 'rank', label: '排名', width: 70 },
  { prop: 'name', label: '同盟名称', minWidth: 180 },
  { prop: 'power', label: '势力值', minWidth: 120 },
  { prop: 'total_member', label: '成员数', width: 90 },
  { prop: 'total_npc_city', label: '城池数', width: 90 },
  { prop: 'region', label: '区域', width: 80 }
]

const personalColumns = [
  { prop: 'player_name', label: '玩家名', minWidth: 130 },
  { prop: 'event_id', label: '事件类型ID', width: 100 },
  { prop: 'object_id', label: '对象ID(坐标)', width: 120 },
  { prop: 'param_a', label: '积分/分值', minWidth: 110 },
  { prop: 'param_b', label: '附加参数', minWidth: 100 },
  { prop: 'capture_time', label: '抓取时间', minWidth: 160 }
]

const territoryColumns = [
  { prop: 'rank', label: '排名', width: 70 },
  { prop: 'player_name', label: '玩家名', minWidth: 140 },
  { prop: 'player_pos', label: '坐标位置', width: 110 },
  { prop: 'alliance_id', label: '同盟ID', width: 90 },
  { prop: 'territory_count', label: '领地数', width: 80 },
  { prop: 'capture_time', label: '抓取时间', minWidth: 160 }
]

const unionCount = computed(() => unionRows.value.length)
const personalCount = computed(() => personalRows.value.length)
const territoryCount = computed(() => territoryRows.value.length)

const eventGroups = computed(() => {
  const m = {}
  for (const r of personalRows.value) {
    const eid = r.event_id
    if (!m[eid]) m[eid] = { event_id: eid, count: 0, max_score: 0 }
    m[eid].count++
    const score = Number(r.param_a) || 0
    if (score > m[eid].max_score) m[eid].max_score = score
  }
  return Object.values(m).sort((a, b) => b.count - a.count)
})

function fmtTs(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts) * 1000)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function formatRow(row, column) {
  const prop = column.property
  if (prop === 'capture_time' || prop === 'refresh_time') {
    return fmtTs(row[prop])
  }
  if (prop === 'player_name') {
    return row[prop] || '(未知)'
  }
  return row[prop]
}

async function loadUnion() {
  try {
    const res = await ApiGetUnionLeaderboard({ limit: 200, name: keyword.value })
    const items = res?.data?.data?.items || []
    if (Array.isArray(items)) {
      unionRows.value = items.map(x => ({
        ...x,
        refresh_time_text: fmtTs(x.refresh_time)
      }))
    } else {
      unionRows.value = []
    }
  } catch (err) {
    unionRows.value = []
    if (err?.response?.data?.msg === '请先选择数据库') {
      ElMessage.warning('请先在首页选择数据库')
      stopAutoRefresh()
    }
  }
}

async function loadPersonal() {
  try {
    const params = { limit: 500 }
    if (eventId.value) params.event_id = eventId.value
    const res = await ApiGetPersonalLeaderboard(params)
    const items = res?.data?.data?.items || []
    if (Array.isArray(items)) {
      personalRows.value = items.map(x => ({
        ...x,
        capture_time_text: fmtTs(x.capture_time),
        extra_raw_text: x.extra_raw || '-'
      }))
    } else {
      personalRows.value = []
    }
  } catch (err) {
    personalRows.value = []
    if (err?.response?.data?.msg === '请先选择数据库') {
      ElMessage.warning('请先在首页选择数据库')
      stopAutoRefresh()
    }
  }
}

async function loadTerritory() {
  try {
    const res = await ApiGetTerritoryLeaderboard({ limit: 200 })
    const backendData = res?.data || {}
    let items = []
    if (backendData.code === 200 && backendData.data) {
      const dataObj = backendData.data
      if (dataObj && typeof dataObj === 'object' && Array.isArray(dataObj.items)) {
        items = dataObj.items
      } else if (Array.isArray(dataObj)) {
        items = dataObj
      }
    } else if (Array.isArray(backendData.data)) {
      items = backendData.data
    } else if (Array.isArray(backendData)) {
      items = backendData
    }
    if (!Array.isArray(items)) {
      ElMessage.warning('领地排行数据格式异常')
      territoryRows.value = []
      return
    }
    const mappedItems = items.map(x => ({
      ...x,
      capture_time_text: fmtTs(x.capture_time)
    }))
    if (Array.isArray(mappedItems)) {
      territoryRows.value = mappedItems
    } else {
      territoryRows.value = []
    }
  } catch (err) {
    territoryRows.value = []
    const errMsg = err?.response?.data?.msg || err?.message || ''
    if (errMsg.includes('请先选择数据库')) {
      ElMessage.warning('请先在首页选择数据库')
      stopAutoRefresh()
    } else {
      ElMessage.error('加载领地排行失败')
    }
  }
}

async function loadData() {
  loading.value = true
  try {
    const results = await Promise.allSettled([
      loadUnion(),
      loadPersonal(),
      loadTerritory()
    ])
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`加载第${index + 1}个数据失败:`, result.reason)
      }
    })
  } finally {
    loading.value = false
  }
}

function handleEventFilter(eid) {
  if (eventId.value == String(eid)) {
    eventId.value = ''
  } else {
    eventId.value = String(eid)
  }
  loadPersonal()
}

function startAutoRefresh() {
  autoRefreshTimer = setInterval(() => {
    loadTerritory()
  }, 5000)
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

onMounted(() => {
  if (!Array.isArray(unionRows.value)) unionRows.value = []
  if (!Array.isArray(personalRows.value)) personalRows.value = []
  if (!Array.isArray(territoryRows.value)) territoryRows.value = []
  loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">排行榜看板</h2>
        <span class="hint-badge">实时抓包数据</span>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData" :icon="Refresh">
        {{ loading ? '加载中...' : '刷新数据' }}
      </el-button>
    </div>

    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-icon union-icon">U</div>
        <div class="summary-info">
          <div class="summary-label">同盟排行 (cmd 700)</div>
          <div class="summary-value">{{ unionCount }}</div>
          <div class="summary-hint">{{ unionCount === 0 ? '请在游戏内打开同盟排行榜' : '条记录' }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon territory-icon">T</div>
        <div class="summary-info">
          <div class="summary-label">个人领地排行 (cmd 6314)</div>
          <div class="summary-value">{{ territoryCount }}</div>
          <div class="summary-hint">{{ territoryCount === 0 ? '请在游戏内打开个人排行榜' : '条排名记录' }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon personal-icon">P</div>
        <div class="summary-info">
          <div class="summary-label">个人积分事件 (cmd 514)</div>
          <div class="summary-value">{{ personalCount }}</div>
          <div class="summary-hint">{{ personalCount === 0 ? '请在游戏内打开个人排行榜' : '条事件记录' }}</div>
        </div>
      </div>
    </div>

    <div class="tip-banner">
      <span class="tip-icon">i</span>
      <span>需要在游戏内打开对应排行榜界面才能触发抓包。</span>
    </div>

    <div class="tabs-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane name="union">
          <template #label>
            <span>同盟排行榜 (700)</span>
          </template>
          <div class="tab-toolbar">
            <el-input v-model="keyword" placeholder="按同盟名过滤" clearable style="width: 260px;" @keyup.enter="loadUnion" />
            <el-button @click="loadUnion">查询</el-button>
          </div>
          <el-table :data="unionRows" v-loading="loading" style="width: 100%" size="default"
            :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }"
            :default-sort="{ prop: 'rank', order: 'ascending' }"
            empty-text="暂无数据，请在游戏内打开【同盟排行榜】触发 cmd 700 抓包后刷新">
            <el-table-column v-for="col in unionColumns" :key="col.prop" :prop="col.prop" :label="col.label"
              :width="col.width" :min-width="col.minWidth" sortable :formatter="formatRow" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="territory">
          <template #label>
            <span>个人领地排行 (6314)</span>
          </template>
          <div class="info-box">
            cmd 6314 是打开个人排行榜时服务端下发的领地数据。每条记录包含：玩家坐标位置 + 同盟ID + 领地ID列表。
          </div>
          <el-table :data="territoryRows" v-loading="loading" style="width: 100%;" size="default"
            :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }"
            :default-sort="{ prop: 'rank', order: 'ascending' }"
            empty-text="暂无数据，请在游戏内打开【个人排行榜】触发 cmd 6314 后刷新">
            <el-table-column v-for="col in territoryColumns" :key="col.prop" :prop="col.prop" :label="col.label"
              :width="col.width" :min-width="col.minWidth" sortable :formatter="formatRow" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="personal">
          <template #label>
            <span>个人积分事件 (514)</span>
          </template>
          <div class="info-box">
            cmd 514 数据结构：[事件类型ID, [对象ID, "积分,附加", flag, 扩展]] 循环。可按事件类型ID筛选查看各事件的积分分布。
          </div>

          <div v-if="eventGroups.length > 0" class="event-summary">
            <div class="event-summary-title">事件类型分布</div>
            <div class="event-chips">
              <span
                v-for="g in eventGroups"
                :key="g.event_id"
                :class="['event-chip', eventId == String(g.event_id) ? 'event-chip-active' : '']"
                @click="handleEventFilter(g.event_id)"
              >
                {{ g.event_id }} ({{ g.count }}条, 最高{{ g.max_score }})
              </span>
            </div>
          </div>

          <div class="tab-toolbar">
            <el-input v-model="eventId" placeholder="按事件类型ID过滤，如 14605" clearable style="width: 260px;"
              @keyup.enter="loadPersonal" />
            <el-button @click="loadPersonal">查询</el-button>
            <el-button v-if="eventId" @click="eventId = ''; loadPersonal()">清除</el-button>
          </div>

          <el-table :data="personalRows" v-loading="loading" style="width: 100%;"
            :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }"
            :default-sort="{ prop: 'capture_time', order: 'descending' }" size="default"
            empty-text="暂无数据，请在游戏内打开【个人排行榜】触发 cmd 514 抓包后刷新">
            <el-table-column v-for="col in personalColumns" :key="col.prop" :prop="col.prop" :label="col.label"
              :width="col.width" :min-width="col.minWidth" sortable :formatter="formatRow" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
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

.summary-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.union-icon {
  background: var(--color-primary-lighter);
  color: var(--color-primary);
}

.territory-icon {
  background: var(--color-success-light);
  color: #059669;
}

.personal-icon {
  background: var(--color-warning-light);
  color: #d97706;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.summary-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.tip-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-info-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.tip-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.tabs-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

.tab-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}

.info-box {
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--color-info-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.event-summary {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-success-light);
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
}

.event-summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #059669;
  margin-bottom: 10px;
}

.event-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.event-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.event-chip-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

@media (max-width: 768px) {
  .summary-row {
    flex-direction: column;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tab-toolbar {
    flex-wrap: wrap;
  }
}
</style>
