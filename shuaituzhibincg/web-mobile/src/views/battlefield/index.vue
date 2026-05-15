<template>
  <div class="battlefield-page">
    <div class="status-cards">
      <div class="status-card">
        <div class="status-icon" :class="wsStatusClass">
          <el-icon :size="18"><component :is="wsStatus === 'connected' ? 'Connection' : 'Warning'" /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">WebSocket</div>
          <div class="status-value" :class="wsStatusClass">{{ wsStatusText }}</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon teams">
          <el-icon :size="18"><User /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">实时队伍</div>
          <div class="status-value">{{ teamRows.length }}</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon" :class="stats.battlefield_realtime_enabled ? 'enabled' : 'disabled'">
          <el-icon :size="18"><VideoCamera /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">5028抓包</div>
          <div class="status-value">{{ stats.battlefield_realtime_enabled ? '已开启' : '未开启' }}</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon packets">
          <el-icon :size="18"><Document /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">数据包</div>
          <div class="status-value">{{ stats.total_packets || packets.length }}</div>
        </div>
      </div>
    </div>

    <div class="control-card">
      <div class="control-row">
        <el-button v-if="wsStatus !== 'connected'" type="primary" size="small" :loading="wsStatus === 'connecting'" @click="startWebSocket">连接WS</el-button>
        <el-button v-else type="danger" size="small" @click="stopWebSocket">断开WS</el-button>
        <el-button v-if="!stats.battlefield_realtime_enabled" type="warning" size="small" :loading="starting" @click="handleEnable">开启抓包</el-button>
        <el-button v-else type="danger" size="small" :loading="stopping" @click="handleDisable">关闭抓包</el-button>
        <el-button size="small" :disabled="packets.length === 0" :loading="clearing" @click="handleClear">清空包</el-button>
      </div>
    </div>

    <div class="search-card">
      <el-input v-model="searchKeyword" placeholder="输入main_id或玩家名搜索" clearable size="small" @keyup.enter="handleSearch">
        <template #append>
          <el-button :loading="searchLoading" @click="handleSearch"><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>
      <el-button size="small" text type="danger" :disabled="teamRows.length === 0" @click="teamRows = []">清空队伍</el-button>
    </div>

<!-- PLACEHOLDER_TEAMS -->

    <div class="section-card">
      <div class="section-header">
        <span class="section-title">实时队伍 ({{ teamRows.length }})</span>
        <span v-if="wsStatus === 'connected'" class="live-dot">实时更新中</span>
      </div>
      <div v-if="teamRows.length === 0" class="empty-tip">暂无队伍数据，开启抓包后将自动显示</div>
      <div v-else class="team-list">
        <div class="team-card" v-for="team in teamRows" :key="team.identity_key || team.id">
          <div class="team-header">
            <div class="team-player">{{ team.player_name }}</div>
            <el-tag size="small" type="warning" effect="plain">{{ team.alliance_name || '--' }}</el-tag>
          </div>
          <div class="team-coords">
            <span>{{ team.start_coord || '--' }}</span>
            <span class="arrow">→</span>
            <span class="target">{{ team.target_coord || '--' }}</span>
          </div>
          <div class="team-time">
            <span class="time-label">到达:</span>
            <span class="time-value">{{ team.arrive_time }}</span>
            <span class="remain" :class="{ arrived: team.remain_time === '已到达' }">{{ team.remain_time }}</span>
          </div>
          <div class="team-formation">
            <div class="formation-slot"><span class="slot-label">大营</span><span class="slot-value">{{ heroName(team.main_camp) }}</span></div>
            <div class="formation-slot"><span class="slot-label">中军</span><span class="slot-value">{{ heroName(team.middle_army) }}</span></div>
            <div class="formation-slot"><span class="slot-label">前锋</span><span class="slot-value">{{ heroName(team.vanguard) }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="showPackets = !showPackets">
        <span class="section-title">原始数据包 ({{ packets.length }})</span>
        <el-icon :size="16"><component :is="showPackets ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
      </div>
      <div v-if="showPackets" class="packet-list">
        <div v-if="packets.length === 0" class="empty-tip">暂无数据包</div>
        <div v-else class="packet-item" v-for="(pkt, idx) in packets.slice(0, 20)" :key="idx">
          <div class="packet-meta">
            <span class="packet-time">{{ pkt.timestamp }}</span>
            <el-tag size="small" effect="plain">{{ pkt.cmd_id }}</el-tag>
            <span class="packet-size">{{ pkt.size }}B</span>
          </div>
          <div v-if="pkt.parsed" class="packet-content">{{ typeof pkt.parsed === 'string' ? pkt.parsed : JSON.stringify(pkt.parsed) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Search, VideoCamera, Document, Connection, Warning, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import {
  getBattlefieldRealtimeStats,
  enableBattlefieldRealtime,
  disableBattlefieldRealtime,
  getBattlefieldRealtimePackets,
  clearBattlefieldRealtimePackets,
  searchRealtimeMonitorTeams
} from '@/api/battlefield'
import { getHeroName } from '@/utils/heroMap'

const stats = ref({ battlefield_realtime_enabled: false, total_packets: 0 })
const packets = ref([])
const teamRows = ref([])
const searchKeyword = ref('')
const searchLoading = ref(false)
const starting = ref(false)
const stopping = ref(false)
const clearing = ref(false)
const wsStatus = ref('disconnected')
const showPackets = ref(true)

let ws = null
let reconnectTimer = null
let pingTimer = null
let refreshTimer = null
let wsManualClose = false
const fetchedMainIds = new Set()
const pendingSearches = new Set()

const wsStatusClass = computed(() => ({ connected: 'enabled', connecting: 'connecting', error: 'error', disconnected: 'disabled' })[wsStatus.value] || 'disabled')
const wsStatusText = computed(() => ({ connected: '已连接', connecting: '连接中...', error: '错误', disconnected: '未连接' })[wsStatus.value] || '未连接')
const getSessionId = () => localStorage.getItem('session_id') || ''

const formatArriveTime = (value) => {
  if (!value) return '--'
  const d = new Date(value * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatRemainTime = (value) => {
  if (!value) return '--'
  const remain = value - Math.floor(Date.now() / 1000)
  if (remain < 0) return '已到达'
  return `${Math.floor(remain / 60)}分${remain % 60}秒`
}

const formatFormationSlot = (slot) => {
  if (!slot) return '--'
  const hero = slot?.main_hero?.id
  if (!hero) return '--'
  const name = getHeroName(hero)
  const level = slot?.level ?? '?'
  const star = slot?.star ?? 0
  return `${name} Lv${level}${star > 0 ? ' ' + star + '红' : ''}`
}

const fixHeroDisplay = (str) => {
  if (!str || str === '--') return ''
  // 替换所有 "ID:数字" 为武将名
  let result = str.replace(/ID:(\d+)/g, (_, id) => getHeroName(parseInt(id)))
  // 替换纯数字开头（如 "100807 Lv43 0红"）
  result = result.replace(/^(\d{5,})\s+(Lv)/g, (_, id, lv) => `${getHeroName(parseInt(id))} ${lv}`)
  return result
}

const resolveHeroField = (teamField, formationSlot) => {
  if (teamField && teamField !== '--') {
    const fixed = fixHeroDisplay(teamField)
    if (fixed && fixed !== '--') return fixed
  }
  return formatFormationSlot(formationSlot)
}

const heroName = (str) => {
  if (!str || str === '--') return '--'
  // "ID:100013 Lv43 1红" -> "马超 Lv43 1红"
  // "100013 Lv43 1红" -> "马超 Lv43 1红"
  let result = str.replace(/ID:(\d+)/g, (_, id) => getHeroName(parseInt(id)))
  result = result.replace(/^(\d{5,})\s/g, (_, id) => getHeroName(parseInt(id)) + ' ')
  return result
}

const buildIdentityKey = (team) => {
  if (team?.identity_key) return String(team.identity_key)
  const formation = team?.formation || {}
  const alliance = String(team?.alliance_name ?? team?.attack_union_name ?? '').trim()
  const player = String(team?.player_name ?? team?.name ?? '').trim()
  const parts = ['front', 'middle', 'back'].map(pos => {
    const slot = formation?.[pos] || {}
    return `${pos}:${slot?.main_hero?.id || 0}/${slot?.sub_hero?.id || 0}`
  })
  return [alliance, player, ...parts].join('||')
}

const normalizeTeam = (team) => {
  const formation = team?.formation || {}
  const arriveTs = Number(team?.arrive_time || 0)
  const hasTime = arriveTs > 1000000000
  return {
    id: String(team?.id || `${team?.player_name}-${Date.now()}-${Math.random()}`),
    player_name: String(team?.player_name ?? team?.name ?? ''),
    alliance_name: String(team?.alliance_name ?? team?.attack_union_name ?? ''),
    start_coord: String(team?.start_coord ?? team?.wid ?? ''),
    target_coord: String(team?.target_coord ?? team?.target_wid ?? ''),
    arrive_time: team?.arrive_time_text || (hasTime ? formatArriveTime(arriveTs) : '--'),
    remain_time: hasTime ? formatRemainTime(arriveTs) : '--',
    main_camp: resolveHeroField(team?.main_camp, formation.back),
    middle_army: resolveHeroField(team?.middle_army, formation.middle),
    vanguard: resolveHeroField(team?.vanguard, formation.front),
    arrive_timestamp: hasTime ? arriveTs : 0,
    identity_key: buildIdentityKey(team)
  }
}

const mergeTeamRows = (rows, reset = false) => {
  const next = reset ? [] : [...teamRows.value]
  const keyMap = new Map()
  next.forEach((r, i) => keyMap.set(r.identity_key, i))
  rows.forEach(row => {
    const n = normalizeTeam(row)
    const idx = keyMap.get(n.identity_key)
    if (idx !== undefined) { next[idx] = n } else { keyMap.set(n.identity_key, next.length); next.push(n) }
  })
  next.sort((a, b) => (b.arrive_timestamp || 0) - (a.arrive_timestamp || 0))
  teamRows.value = next
}

const loadStats = async () => {
  try {
    const res = await getBattlefieldRealtimeStats()
    if (res?.code === 200 && res.data) stats.value = res.data
  } catch {}
}

const loadPackets = async () => {
  try {
    const res = await getBattlefieldRealtimePackets({ limit: 100 })
    if (res?.code === 200 && res.data) packets.value = res.data.packets || []
  } catch {}
}

const autoSearchFromPackets = () => {
  for (const pkt of packets.value) {
    if (pkt.cmd_id !== 5028 || !pkt.parsed) continue
    try {
      const rawStr = typeof pkt.parsed === 'string' ? pkt.parsed : JSON.stringify(pkt.parsed)
      const fixed = rawStr.replace(/([{,])\s*(\d+)\s*:/g, '$1"$2":')
      const raw = JSON.parse(fixed)
      if (!Array.isArray(raw) || raw.length < 7) continue
      const playerMap = raw[1]
      const entityMap = raw[6]
      if (!entityMap || typeof entityMap !== 'object') continue
      for (const entityId of Object.keys(entityMap)) {
        const mid = entityId.trim()
        if (!mid || fetchedMainIds.has(mid)) continue
        fetchedMainIds.add(mid)
        let playerName = ''
        const entityFields = entityMap[entityId]
        if (Array.isArray(entityFields) && entityFields.length > 1) {
          const playerId = String(entityFields[1] || '').trim()
          if (playerMap && playerMap[playerId] && Array.isArray(playerMap[playerId])) {
            playerName = String(playerMap[playerId][0] || '').trim()
          }
        }
        doAutoSearch(mid, playerName)
      }
    } catch {}
  }
}

const doAutoSearch = async (mainId, playerName) => {
  const key = playerName || mainId
  if (!key || pendingSearches.has(key)) return
  pendingSearches.add(key)
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'search_team', side: 'all', main_id: mainId || '', player_name: playerName || '', request_id: Date.now() }))
    } else {
      const res = await searchRealtimeMonitorTeams({ keyword: key })
      if (res?.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
        mergeTeamRows(res.data)
      }
    }
  } catch {} finally {
    setTimeout(() => pendingSearches.delete(key), 1000)
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    loadStats()
    loadPackets().then(() => autoSearchFromPackets())
    teamRows.value = teamRows.value.map(row => ({
      ...row,
      remain_time: row.arrive_timestamp ? formatRemainTime(row.arrive_timestamp) : '--'
    }))
  }, 3000)
}

const stopAutoRefresh = () => { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null } }

const handleEnable = async () => {
  starting.value = true
  try {
    const res = await enableBattlefieldRealtime()
    if (res.code === 200) { ElMessage.success('已开启战场实时监控'); await loadStats(); startAutoRefresh(); startWebSocket() }
    else ElMessage.error(res.message || '开启失败')
  } catch { ElMessage.error('开启失败') } finally { starting.value = false }
}

const handleDisable = async () => {
  stopping.value = true
  try {
    const res = await disableBattlefieldRealtime()
    if (res.code === 200) { ElMessage.success('已关闭战场实时监控'); await loadStats(); stopAutoRefresh() }
    else ElMessage.error(res.message || '关闭失败')
  } catch { ElMessage.error('关闭失败') } finally { stopping.value = false }
}

const handleClear = async () => {
  clearing.value = true
  try {
    const res = await clearBattlefieldRealtimePackets()
    if (res.code === 200) { packets.value = []; teamRows.value = []; fetchedMainIds.clear(); pendingSearches.clear(); ElMessage.success('已清空'); await loadStats() }
  } catch {} finally { clearing.value = false }
}

const handleSearch = () => {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  searchLoading.value = true
  const isId = /^\d+/.test(kw)
  const doSearch = async () => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'search_team', side: 'all', main_id: isId ? kw : '', player_name: isId ? '' : kw, request_id: Date.now() }))
      } else {
        const res = await searchRealtimeMonitorTeams({ keyword: kw })
        if (res?.code === 200) mergeTeamRows(Array.isArray(res.data) ? res.data : [], true)
      }
    } catch { ElMessage.error('搜索失败') } finally { searchLoading.value = false }
  }
  doSearch()
}

const buildWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const sessionId = getSessionId()
  const url = new URL(`${protocol}//${window.location.host}/v1/ws/realtime-monitor`)
  if (sessionId) url.searchParams.set('session_id', sessionId)
  return url.toString()
}

const startWebSocket = () => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  wsManualClose = false
  wsStatus.value = 'connecting'
  try { ws = new WebSocket(buildWsUrl()) } catch { wsStatus.value = 'error'; scheduleReconnect(); return }

  ws.onopen = () => {
    wsStatus.value = 'connected'
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' })) }, 15000)
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'pong') return

      if (data.type === 'protocol_5028_search_result') {
        if (Array.isArray(data.results) && data.results.length > 0) mergeTeamRows(data.results)
        searchLoading.value = false
        return
      }

      if (data.type === 'protocol_5028') {
        if (Array.isArray(data.results) && data.results.length > 0) {
          mergeTeamRows(data.results)
        }
        const ctx = data?.realtime_context || {}
        const mainId = String(ctx?.main_id || '').trim()
        const playerName = String(ctx?.attacker_name || '').trim()
        // 始终尝试搜索，不管之前是否搜过（因为后端 team_count=0 可能是暂时的）
        if (playerName || mainId) {
          doAutoSearch(mainId, playerName)
        }
        return
      }
    } catch {}
  }

  ws.onclose = () => { wsStatus.value = 'disconnected'; if (pingTimer) { clearInterval(pingTimer); pingTimer = null }; if (!wsManualClose) scheduleReconnect() }
  ws.onerror = () => { wsStatus.value = 'error' }
}

const stopWebSocket = () => { wsManualClose = true; if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }; if (pingTimer) { clearInterval(pingTimer); pingTimer = null }; if (ws) { ws.close(); ws = null }; wsStatus.value = 'disconnected' }
const scheduleReconnect = () => { if (reconnectTimer) return; reconnectTimer = setTimeout(() => { reconnectTimer = null; startWebSocket() }, 3000) }

onMounted(() => { loadStats(); loadPackets().then(() => autoSearchFromPackets()); startAutoRefresh(); startWebSocket() })
onUnmounted(() => { stopAutoRefresh(); stopWebSocket() })
</script>

<!-- PLACEHOLDER_STYLE -->
<style lang="scss" scoped>
.battlefield-page { padding: 16px; padding-bottom: 80px; }
.status-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
.status-card { background: #fff; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
.status-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  &.enabled { background: #d1fae5; color: #059669; }
  &.disabled { background: #f1f5f9; color: #94a3b8; }
  &.connecting { background: #dbeafe; color: #2563eb; }
  &.error { background: #fee2e2; color: #dc2626; }
  &.teams { background: #f3e8ff; color: #7c3aed; }
  &.packets { background: #dbeafe; color: #2563eb; }
}
.status-label { font-size: 11px; color: #94a3b8; }
.status-value { font-size: 14px; font-weight: 600; color: #1e293b; }
.control-card { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
.control-row { display: flex; flex-wrap: wrap; gap: 8px; }
.search-card { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
.section-card { background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: pointer; }
.section-title { font-size: 15px; font-weight: 600; color: #1e293b; }
.live-dot { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #059669;
  &::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #059669; animation: pulse 1.5s infinite; }
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.empty-tip { text-align: center; color: #94a3b8; font-size: 13px; padding: 24px 0; }
.team-list { display: flex; flex-direction: column; gap: 10px; }
.team-card { background: #f8fafc; border-radius: 12px; padding: 14px; border: 1px solid #f1f5f9; }
.team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.team-player { font-size: 15px; font-weight: 600; color: #1e293b; }
.team-coords { font-size: 13px; color: #64748b; margin-bottom: 6px;
  .arrow { margin: 0 6px; color: #94a3b8; }
  .target { color: #dc2626; font-weight: 500; }
}
.team-time { font-size: 12px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
  .time-label { color: #94a3b8; }
  .time-value { font-weight: 500; }
  .remain { margin-left: auto; color: #f59e0b; font-weight: 600; &.arrived { color: #059669; } }
}
.team-formation { display: flex; gap: 8px; }
.formation-slot { flex: 1; background: #fff; border-radius: 8px; padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; }
.slot-label { display: block; font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.slot-value { font-size: 11px; font-weight: 500; color: #1e293b; }
.packet-list { max-height: 300px; overflow-y: auto; }
.packet-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; &:last-child { border-bottom: none; } }
.packet-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.packet-time { font-size: 11px; color: #94a3b8; }
.packet-size { font-size: 11px; color: #64748b; margin-left: auto; }
.packet-content { font-size: 11px; font-family: 'SF Mono', 'Consolas', monospace; color: #64748b; background: #f1f5f9; padding: 6px 8px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 80px; }
</style>
