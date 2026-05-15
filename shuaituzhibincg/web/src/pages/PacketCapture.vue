<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, Download, Refresh, Delete, View, Connection, Search } from '@element-plus/icons-vue'
import axios from 'axios'
import { useUserStore } from '../stores/user'

// ==================== 数据包捕获状态 ====================
const userStore = useUserStore()
const stats = ref({
  total_packets: 0,
  is_running: false,
  interfaces: 0,
  start_time: null
})
const packets = ref([])
const battlefieldPackets = ref([])
const duration = ref('00:00')
const starting = ref(false)
const stopping = ref(false)
const battlefieldStarting = ref(false)
const battlefieldStopping = ref(false)
const battlefieldClearing = ref(false)
let timerInterval = null
let refreshInterval = null

const startCapture = async () => {
  starting.value = true
  try {
    const response = await axios.post('/v1/packet-capture/start')
    if (response.data.code === 200) {
      ElMessage.success('开始捕获数据包')
      await loadStats()
      startTimer()
      startAutoRefresh()
    } else {
      ElMessage.error('启动失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('启动失败: ' + (error.response?.data?.message || error.message))
  } finally {
    starting.value = false
  }
}

const stopCapture = async () => {
  stopping.value = true
  try {
    const response = await axios.post('/v1/packet-capture/stop')
    if (response.data.code === 200) {
      ElMessage.success('已停止捕获')
      await loadStats()
      stopTimer()
      stopAutoRefresh()
    } else {
      ElMessage.error('停止失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('停止失败: ' + (error.message))
  } finally {
    stopping.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await axios.get('/v1/packet-capture/stats')
    if (response.data.code === 200) {
      stats.value = response.data.data
      if (stats.value.is_running && !timerInterval) {
        startTimer()
        startAutoRefresh()
      }
    }
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

const loadPackets = async () => {
  try {
    const response = await axios.get('/v1/packet-capture/packets?limit=100')
    if (response.data.code === 200) {
      packets.value = response.data.data
    }
  } catch (error) {
    console.error('加载数据包失败:', error)
  }
}

const loadBattlefieldPackets = async () => {
  try {
    const response = await axios.get('/v1/battlefield-realtime/packets?limit=100')
    if (response.data.code === 200) {
      battlefieldPackets.value = response.data.data?.packets || []
    }
  } catch (error) {
    console.error('加载战场实时监控包失败:', error)
  }
}

const refreshPackets = async () => {
  await Promise.all([loadPackets(), loadBattlefieldPackets()])
  ElMessage.success('已刷新')
}

const enableBattlefieldRealtime = async () => {
  battlefieldStarting.value = true
  try {
    const response = await axios.get('/v1/enable/getBattlefieldRealtime')
    if (response.data.code === 200) {
      ElMessage.success('已开启战场实时监控抓包')
      await loadStats()
      await loadBattlefieldPackets()
    } else {
      ElMessage.error('开启失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('开启失败: ' + (error.response?.data?.message || error.message))
  } finally {
    battlefieldStarting.value = false
  }
}

const disableBattlefieldRealtime = async () => {
  battlefieldStopping.value = true
  try {
    const response = await axios.get('/v1/disable/getBattlefieldRealtime')
    if (response.data.code === 200) {
      ElMessage.success('已关闭战场实时监控抓包')
      await loadStats()
    } else {
      ElMessage.error('关闭失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('关闭失败: ' + (error.response?.data?.message || error.message))
  } finally {
    battlefieldStopping.value = false
  }
}

const clearBattlefieldPackets = async () => {
  battlefieldClearing.value = true
  try {
    const response = await axios.delete('/v1/battlefield-realtime/packets')
    if (response.data.code === 200) {
      battlefieldPackets.value = []
      ElMessage.success(response.data.message || '已清空战场实时监控包')
    } else {
      ElMessage.error('清空失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    ElMessage.error('清空失败: ' + (error.response?.data?.message || error.message))
  } finally {
    battlefieldClearing.value = false
  }
}

const exportCSV = () => {
  window.open('/v1/packet-capture/export/csv', '_blank')
  ElMessage.success('开始下载CSV文件')
}

const exportJSON = () => {
  window.open('/v1/packet-capture/export/json', '_blank')
  ElMessage.success('开始下载JSON文件')
}

const formatParsedData = (data) => {
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return data
  }
}

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (stats.value.start_time) {
      const startTime = new Date(stats.value.start_time)
      const diff = Math.floor((new Date() - startTime) / 1000)
      const minutes = Math.floor(diff / 60).toString().padStart(2, '0')
      const seconds = (diff % 60).toString().padStart(2, '0')
      duration.value = `${minutes}:${seconds}`
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(() => {
    loadPackets()
    loadBattlefieldPackets()
    loadStats()
  }, 2000)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// ==================== 战场实时监控状态 ====================
const activeTab = ref('capture')
const monitorTeamSearchRows = ref([])
const monitorMainSearchKeyword = ref('')
const monitorTeamSearchLoading = ref(false)
const monitorNowTs = ref(Date.now())
const monitorWsStatus = ref('disconnected')

let monitorSocket = null
let monitorSocketReconnectTimer = null
let monitorSocketPingTimer = null
let monitorSocketManualClose = false
let monitorSearchRequestId = 0
let monitorExpiryTimer = null

const buildWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(`${protocol}//${window.location.host}/v1/ws/realtime-monitor`)
  if (userStore.sessionId) url.searchParams.set('session_id', userStore.sessionId)
  return url.toString()
}

const startMonitorSocket = () => {
  if (monitorSocket && (monitorSocket.readyState === WebSocket.OPEN || monitorSocket.readyState === WebSocket.CONNECTING)) {
    return
  }

  monitorWsStatus.value = 'connecting'
  try {
    monitorSocket = new WebSocket(buildWsUrl())
  } catch (e) {
    monitorWsStatus.value = 'error'
    scheduleReconnect()
    return
  }

  monitorSocket.onopen = () => {
    monitorWsStatus.value = 'connected'
    if (monitorSocketPingTimer) clearInterval(monitorSocketPingTimer)
    monitorSocketPingTimer = setInterval(() => {
      if (monitorSocket && monitorSocket.readyState === WebSocket.OPEN) {
        monitorSocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, 15000)
  }

  monitorSocket.onmessage = (event) => {
    let payload
    try {
      payload = JSON.parse(String(event?.data || '{}'))
    } catch {
      return
    }

    const payloadType = String(payload?.type || '').toLowerCase()

    if (payloadType === 'protocol_5028_search_result') {
      const results = payload?.results || []
      if (results.length > 0) {
        mergeTeamRows(results, { forceVisible: true })
      }
      return
    }

    if (payloadType !== 'protocol_5028') return

    if (Array.isArray(payload?.results) && payload.results.length > 0) {
      mergeTeamRows(payload.results, { forceVisible: true })
    } else {
      const pushedMainId = String(payload?.realtime_context?.main_id || '').trim()
      if (pushedMainId) {
        requestTeams({ mainId: pushedMainId })
      }
    }
  }

  monitorSocket.onclose = (event) => {
    monitorWsStatus.value = 'disconnected'
    console.warn('战场实时监控 WebSocket 已断开:', event.code, event.reason)
    if (!monitorSocketManualClose) scheduleReconnect()
  }

  monitorSocket.onerror = (event) => {
    monitorWsStatus.value = 'error'
    console.error('战场实时监控 WebSocket 连接失败:', event)
  }
}

const stopMonitorSocket = () => {
  monitorSocketManualClose = true
  if (monitorSocketPingTimer) { clearInterval(monitorSocketPingTimer); monitorSocketPingTimer = null }
  if (monitorSocketReconnectTimer) { clearTimeout(monitorSocketReconnectTimer); monitorSocketReconnectTimer = null }
  if (monitorSocket) { monitorSocket.close(); monitorSocket = null }
  monitorWsStatus.value = 'disconnected'
}

const scheduleReconnect = () => {
  if (monitorSocketReconnectTimer) return
  monitorSocketReconnectTimer = setTimeout(() => {
    monitorSocketReconnectTimer = null
    if (monitorSocketManualClose) return
    startMonitorSocket()
  }, 2000)
}

const buildTeamIdentityKey = (row) => {
  const allianceName = String(row?.attack_union_name || '').trim()
  const playerName = String(row?.player_name || row?.name || '').trim()
  const parts = ['front', 'middle', 'back'].map((pos) => {
    const slot = row?.formation?.[pos] || {}
    const mainHeroId = String(slot?.main_hero?.id || '').trim()
    const subHeroId = String(slot?.sub_hero?.id || '').trim()
    const skillIds = Array.isArray(slot?.skills) ? slot.skills.map((s) => String(s?.id || '').trim()).join('|') : ''
    return `${pos}:${mainHeroId}/${subHeroId}/${skillIds}`
  })
  return [allianceName, playerName, ...parts].join('||')
}

const shouldDisplayTeamRow = (row, nowTs) => {
  const arriveTime = Number(row?.arrive_time || 0)
  if (arriveTime > 0 && nowTs > 0) {
    if (arriveTime - Math.floor(nowTs / 1000) < -300) return false
  }
  return true
}

const mergeTeamRows = (rows, { reset = false, forceVisible = false } = {}) => {
  if (reset) monitorTeamSearchRows.value = []

  const incoming = rows.map(row => ({
    ...row,
    __force_visible: forceVisible || !!row?.__force_visible,
    __received_at: Date.now()
  })).filter(row => shouldDisplayTeamRow(row, monitorNowTs.value))

  const current = [...(reset ? [] : monitorTeamSearchRows.value)]
  const keyToIdx = new Map()
  current.forEach((row, i) => keyToIdx.set(buildTeamIdentityKey(row), i))

  incoming.forEach(row => {
    const key = buildTeamIdentityKey(row)
    if (keyToIdx.has(key)) {
      const idx = keyToIdx.get(key)
      if ((row.__received_at || 0) >= (current[idx].__received_at || 0)) current[idx] = row
    } else {
      current.push(row)
    }
  })

  current.sort((a, b) => {
    const at = Number(a?.arrive_time || 0), bt = Number(b?.arrive_time || 0)
    if (at && bt) return at - bt
    if (at) return -1
    if (bt) return 1
    return 0
  })

  monitorTeamSearchRows.value = current
}

const pruneExpiredTeamRows = () => {
  const next = monitorTeamSearchRows.value.filter(row => shouldDisplayTeamRow(row, monitorNowTs.value))
  if (next.length !== monitorTeamSearchRows.value.length) monitorTeamSearchRows.value = next
}

const requestTeams = async ({ mainId = '', playerName = '', preferHttp = false } = {}) => {
  if (!preferHttp && monitorSocket && monitorSocket.readyState === WebSocket.OPEN) {
    try {
      monitorSearchRequestId++
      monitorSocket.send(JSON.stringify({
        type: 'search_team', side: 'all', main_id: mainId, player_name: playerName, request_id: monitorSearchRequestId
      }))
      return
    } catch {}
  }

  monitorTeamSearchLoading.value = true
  try {
    const params = new URLSearchParams({ side: 'all' })
    if (mainId) params.set('main_id', mainId)
    if (playerName) params.set('player_name', playerName)
    const resp = await fetch(`/v1/battlefield-realtime/teams/search?${params.toString()}`)
    const data = await resp.json()
    if (data?.code === 200 && Array.isArray(data?.data?.results)) {
      mergeTeamRows(data.data.results, { forceVisible: true })
    }
  } catch (e) {
    console.error('HTTP team search failed:', e)
  } finally {
    monitorTeamSearchLoading.value = false
  }
}

const handleMonitorSearch = () => {
  const keyword = monitorMainSearchKeyword.value.trim()
  if (!keyword) return
  const isMainId = /^\d+/.test(keyword)
  requestTeams({ mainId: isMainId ? keyword : '', playerName: isMainId ? '' : keyword })
}

const handleClearTeamRows = () => {
  monitorTeamSearchRows.value = []
  ElMessage.success('已清空')
}

const formatArriveTime = (ts) => {
  if (!ts) return '--'
  const d = new Date(ts * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatRemainSeconds = (arriveTime) => {
  if (!arriveTime) return '--'
  const remain = arriveTime - Math.floor(Date.now() / 1000)
  if (remain < 0) return '已到达'
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return `${m}分${s}秒`
}

const isExpiring = (row) => {
  const arriveTime = Number(row?.arrive_time || 0)
  if (!arriveTime) return false
  const remain = arriveTime - Math.floor(Date.now() / 1000)
  return remain < 60 && remain > -300
}

const getWsStatusText = () => ({ connected: '已连接', connecting: '连接中...', disconnected: '未连接', error: '连接失败' }[monitorWsStatus.value] || '未知')
const getWsStatusType = () => ({ connected: 'success', connecting: 'warning', disconnected: 'info', error: 'danger' }[monitorWsStatus.value] || 'info')

// Tab 切换时处理 WebSocket
const handleTabChange = (tab) => {
  if (tab === 'monitor') {
    startMonitorSocket()
  }
}

onMounted(() => {
  loadStats()
  loadPackets()
  loadBattlefieldPackets()

  monitorNowTs.value = Date.now()
  monitorExpiryTimer = setInterval(() => {
    monitorNowTs.value = Date.now()
    pruneExpiredTeamRows()
  }, 1000)
})

onUnmounted(() => {
  stopTimer()
  stopAutoRefresh()
  stopMonitorSocket()
  if (monitorExpiryTimer) clearInterval(monitorExpiryTimer)
})
</script>

<template>
  <div class="packet-capture-page">
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">数据包捕获工具</h2>
        <span class="hint-badge">2200 / 5028 协议监控</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="main-tabs">
      <!-- ==================== Tab 1: 数据包捕获 ==================== -->
      <el-tab-pane label="数据包捕获" name="capture">

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon status-icon">
              <span :class="['status-indicator', stats.is_running ? 'running' : 'stopped']"></span>
            </div>
            <div class="stat-info">
              <div class="stat-label">捕获状态</div>
              <div class="stat-value">
                <span :class="['status-text', stats.is_running ? 'running' : 'stopped']">
                  {{ stats.is_running ? '运行中' : '已停止' }}
                </span>
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon packet-icon">P</div>
            <div class="stat-info">
              <div class="stat-label">数据包总数</div>
              <div class="stat-value">{{ stats.total_packets }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon interface-icon">I</div>
            <div class="stat-info">
              <div class="stat-label">监听接口数</div>
              <div class="stat-value">{{ stats.interfaces }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon time-icon">T</div>
            <div class="stat-info">
              <div class="stat-label">运行时长</div>
              <div class="stat-value">{{ duration }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon realtime-icon">5028</div>
            <div class="stat-info">
              <div class="stat-label">战场实时</div>
              <div class="stat-value">
                <span :class="['status-text', stats.battlefield_realtime_enabled ? 'running' : 'stopped']">
                  {{ stats.battlefield_realtime_enabled ? '已开启' : '已关闭' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-card">
          <div class="control-title">战场实时监控抓包（5028）</div>
          <div class="control-row">
            <el-button type="warning" @click="enableBattlefieldRealtime" :disabled="stats.battlefield_realtime_enabled" :loading="battlefieldStarting" :icon="View">开启5028</el-button>
            <el-button type="danger" @click="disableBattlefieldRealtime" :disabled="!stats.battlefield_realtime_enabled" :loading="battlefieldStopping" :icon="VideoPause" plain>关闭5028</el-button>
            <span class="hint-text">开启后切换到"战场实时监控"页签查看实时队伍</span>
          </div>
        </div>

        <div class="control-card">
          <div class="control-title">通用数据包捕获</div>
          <div class="control-row">
            <el-button type="primary" @click="startCapture" :disabled="stats.is_running" :loading="starting" :icon="VideoPlay">开始捕获</el-button>
            <el-button type="danger" @click="stopCapture" :disabled="!stats.is_running" :loading="stopping" :icon="VideoPause">停止捕获</el-button>
            <div class="control-divider"></div>
            <el-button type="success" @click="exportCSV" :disabled="stats.total_packets === 0" :icon="Download" plain>导出CSV</el-button>
            <el-button type="success" @click="exportJSON" :disabled="stats.total_packets === 0" :icon="Download" plain>导出JSON</el-button>
            <el-button @click="refreshPackets" :disabled="stats.total_packets === 0" :icon="Refresh">刷新列表</el-button>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <span class="table-title">实时数据包列表 (最近{{ packets.length }}条)</span>
            <span v-if="stats.is_running" class="live-badge"><span class="live-dot"></span>实时更新中</span>
          </div>
          <el-empty v-if="packets.length === 0" description="暂无数据包，点击开始捕获按钮开始监控" />
          <el-table v-else :data="packets" max-height="600" style="width: 100%"
            :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
            <el-table-column prop="timestamp" label="时间戳" width="180">
              <template #default="{ row }"><span class="time-text">{{ row.timestamp }}</span></template>
            </el-table-column>
            <el-table-column prop="cmd_id" label="协议号" width="100">
              <template #default="{ row }"><span class="cmd-tag">{{ row.cmd_id }}</span></template>
            </el-table-column>
            <el-table-column prop="src_ip" label="源IP" width="200">
              <template #default="{ row }"><span class="mono-text">{{ row.src_ip }}</span></template>
            </el-table-column>
            <el-table-column prop="dst_ip" label="目标IP" width="200">
              <template #default="{ row }"><span class="mono-text">{{ row.dst_ip }}</span></template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100" align="right">
              <template #default="{ row }"><span class="size-text">{{ row.size }} B</span></template>
            </el-table-column>
            <el-table-column label="解析内容" min-width="300">
              <template #default="{ row }">
                <div v-if="row.parsed" class="parsed-data"><pre>{{ formatParsedData(row.parsed) }}</pre></div>
                <span v-else class="no-data">无数据</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

      </el-tab-pane>

      <!-- ==================== Tab 2: 战场实时监控 ==================== -->
      <el-tab-pane label="战场实时监控" name="monitor">

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-label">WebSocket</div>
            <div class="stat-value">
              <el-tag :type="getWsStatusType()" size="small" effect="plain">
                <span class="ws-dot" :class="monitorWsStatus"></span>
                {{ getWsStatusText() }}
              </el-tag>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">实时队伍数</div>
            <div class="stat-value">{{ monitorTeamSearchRows.length }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">5028 抓包</div>
            <div class="stat-value">
              <span :class="['status-text', stats.battlefield_realtime_enabled ? 'running' : 'stopped']">
                {{ stats.battlefield_realtime_enabled ? '已开启' : '未开启' }}
              </span>
            </div>
          </div>
          <div class="stat-card" style="flex:2; min-width:280px">
            <div class="stat-label">操作</div>
            <div class="stat-value" style="display:flex; gap:8px; align-items:center">
              <el-button v-if="monitorWsStatus !== 'connected'" type="primary" size="small" @click="startMonitorSocket" :loading="monitorWsStatus === 'connecting'" :icon="Connection">连接WS</el-button>
              <el-button v-else type="danger" size="small" plain @click="stopMonitorSocket">断开</el-button>
              <el-button v-if="!stats.battlefield_realtime_enabled" type="warning" size="small" @click="enableBattlefieldRealtime" :loading="battlefieldStarting">开启5028</el-button>
              <el-button v-else type="danger" size="small" plain @click="disableBattlefieldRealtime" :loading="battlefieldStopping">关闭5028</el-button>
            </div>
          </div>
        </div>

        <div class="search-card">
          <el-input v-model="monitorMainSearchKeyword" placeholder="输入 main_id 或玩家名称搜索队伍" class="search-input" clearable @keyup.enter="handleMonitorSearch" />
          <el-button type="primary" @click="handleMonitorSearch" :loading="monitorTeamSearchLoading" :icon="Search">搜索</el-button>
          <el-button @click="handleClearTeamRows" :icon="Delete" :disabled="monitorTeamSearchRows.length === 0">清空</el-button>
        </div>

        <div class="table-card">
          <div class="table-header">
            <span class="table-title">实时队伍列表 ({{ monitorTeamSearchRows.length }})</span>
            <span v-if="monitorWsStatus === 'connected'" class="live-badge"><span class="live-dot"></span>实时更新中</span>
          </div>

          <el-empty v-if="monitorTeamSearchRows.length === 0" description="请先开启5028抓包并连接WebSocket，收到行军数据后将在此显示队伍信息" />

          <el-table v-else :data="monitorTeamSearchRows" max-height="600" style="width: 100%"
            :row-class-name="({ row }) => isExpiring(row) ? 'row-expiring' : ''"
            :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
            <el-table-column label="玩家" min-width="100">
              <template #default="{ row }"><span class="player-name">{{ row?.player_name || row?.name || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="攻方同盟" min-width="130">
              <template #default="{ row }"><span class="union-name">{{ row?.attack_union_name || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="出发" width="90">
              <template #default="{ row }"><span class="coord-text">{{ row?.wid || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="目标" width="90">
              <template #default="{ row }"><span class="coord-text target">{{ row?.target_wid || '--' }}</span></template>
            </el-table-column>
            <el-table-column label="到达时间" width="150">
              <template #default="{ row }"><span :class="{ 'time-expiring': isExpiring(row) }">{{ formatArriveTime(row?.arrive_time) }}</span></template>
            </el-table-column>
            <el-table-column label="剩余" width="90">
              <template #default="{ row }"><span :class="{ 'time-expiring': isExpiring(row) }">{{ formatRemainSeconds(row?.arrive_time) }}</span></template>
            </el-table-column>
            <el-table-column label="大营" width="150">
              <template #default="{ row }">
                <div v-if="row?.formation?.back" class="formation-cell">
                  <span>ID:{{ row.formation.back?.main_hero?.id || '--' }}</span>
                  <span class="hero-lv">Lv{{ row.formation.back?.level || '?' }}</span>
                  <span class="hero-star">{{ row.formation.back?.star || 0 }}红</span>
                </div>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="中军" width="150">
              <template #default="{ row }">
                <div v-if="row?.formation?.middle" class="formation-cell">
                  <span>ID:{{ row.formation.middle?.main_hero?.id || '--' }}</span>
                  <span class="hero-lv">Lv{{ row.formation.middle?.level || '?' }}</span>
                  <span class="hero-star">{{ row.formation.middle?.star || 0 }}红</span>
                </div>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="前锋" width="150">
              <template #default="{ row }">
                <div v-if="row?.formation?.front" class="formation-cell">
                  <span>ID:{{ row.formation.front?.main_hero?.id || '--' }}</span>
                  <span class="hero-lv">Lv{{ row.formation.front?.level || '?' }}</span>
                  <span class="hero-star">{{ row.formation.front?.star || 0 }}红</span>
                </div>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="技能" min-width="180">
              <template #default="{ row }">
                <div v-if="row?.formation" class="skills-cell">
                  <div v-for="(name, pos) in { back: '大', middle: '中', front: '前' }" :key="pos" class="skill-row">
                    <span class="skill-pos">{{ name }}:</span>
                    <span v-if="row.formation[pos]?.skills?.length">
                      <el-tag v-for="(skill, si) in row.formation[pos].skills" :key="si" size="small" class="skill-tag">{{ skill?.id || '--' }}</el-tag>
                    </span>
                    <span v-else class="no-skills">--</span>
                  </div>
                </div>
                <span v-else>--</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.packet-capture-page { max-width: 1400px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.page-title-area { display: flex; align-items: center; gap: 10px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.hint-badge { font-size: 13px; color: var(--text-tertiary); background: var(--bg-page); padding: 2px 10px; border-radius: 20px; }

.main-tabs { margin-top: -4px; }

.stats-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 120px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); padding: 14px 18px; }
.stat-label { font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 600; color: var(--text-primary); }

.stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.status-icon { background: var(--color-info-light); }
.packet-icon { background: var(--color-primary-lighter); color: var(--color-primary); }
.interface-icon { background: var(--color-success-light); color: #059669; }
.time-icon { background: var(--color-warning-light); color: #d97706; }
.realtime-icon { background: #fef3c7; color: #d97706; font-size: 11px; }
.status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.status-indicator.running { background: var(--color-success); box-shadow: 0 0 8px rgba(52, 211, 153, 0.5); animation: pulse 2s infinite; }
.status-indicator.stopped { background: var(--color-info); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.status-text.running { color: #059669; }
.status-text.stopped { color: var(--text-tertiary); }

.ws-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.ws-dot.connected { background: #22c55e; }
.ws-dot.connecting { background: #f59e0b; animation: pulse 1.5s infinite; }
.ws-dot.disconnected { background: #94a3b8; }
.ws-dot.error { background: #ef4444; }

.control-card { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); padding: 14px 20px; margin-bottom: 16px; }
.control-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
.control-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.control-divider { width: 1px; height: 28px; background: var(--border-color); margin: 0 8px; }
.hint-text { font-size: 12px; color: var(--text-tertiary); margin-left: 4px; }

.search-card { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); padding: 14px 20px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; }
.search-input { flex: 1; max-width: 460px; }

.table-card { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); padding: 20px; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.live-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #059669; font-weight: 500; }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); animation: pulse 2s infinite; }

.time-text { color: var(--text-secondary); font-size: 13px; }
.cmd-tag { display: inline-block; padding: 2px 10px; background: var(--color-primary-lighter); color: var(--color-primary); border-radius: 6px; font-size: 12px; font-weight: 500; font-family: var(--font-mono); }
.mono-text { font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); }
.size-text { font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.parsed-data { max-height: 150px; overflow-y: auto; background: var(--bg-page); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px; }
.parsed-data pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-family: var(--font-mono); color: var(--text-secondary); line-height: 1.5; }
.no-data { color: var(--text-tertiary); font-style: italic; font-size: 13px; }

.player-name { font-weight: 500; color: var(--text-primary); }
.union-name { color: var(--color-primary); }
.coord-text { font-family: var(--font-mono); font-size: 13px; }
.coord-text.target { color: #ef4444; font-weight: 500; }
.time-expiring { color: #ef4444; font-weight: 500; }
.formation-cell { display: flex; gap: 4px; align-items: center; font-size: 12px; }
.hero-lv { color: var(--text-tertiary); }
.hero-star { color: #f59e0b; font-weight: 500; }
.skills-cell { font-size: 12px; }
.skill-row { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
.skill-pos { color: var(--text-tertiary); min-width: 16px; }
.skill-tag { margin-right: 2px; }
.no-skills { color: var(--text-tertiary); }

:deep(.row-expiring) { background: rgba(239, 68, 68, 0.04) !important; }

@media (max-width: 768px) {
  .stats-row { flex-direction: column; }
  .search-card { flex-direction: column; align-items: stretch; }
  .search-input { max-width: none; }
  .control-row { flex-direction: column; align-items: stretch; }
  .control-divider { display: none; }
}
</style>
