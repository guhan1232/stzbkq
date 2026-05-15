<template>
  <div class="stats-page">
    <div class="filter-card">
      <div class="filter-header" @click="showFilter = !showFilter">
        <span class="filter-title">筛选条件</span>
        <el-icon :size="16"><component :is="showFilter ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
      </div>

      <div v-if="showFilter" class="filter-body">
        <div class="filter-row">
          <el-input v-model="filter.x_min" placeholder="X最小" size="small" type="number" />
          <span class="filter-sep">~</span>
          <el-input v-model="filter.x_max" placeholder="X最大" size="small" type="number" />
        </div>
        <div class="filter-row">
          <el-input v-model="filter.y_min" placeholder="Y最小" size="small" type="number" />
          <span class="filter-sep">~</span>
          <el-input v-model="filter.y_max" placeholder="Y最大" size="small" type="number" />
        </div>
        <div class="preset-row">
          <el-tag
            v-for="preset in presets"
            :key="preset.name"
            size="small"
            :type="activePreset === preset.name ? '' : 'info'"
            effect="plain"
            @click="applyPreset(preset)"
            class="preset-tag"
          >{{ preset.name }}</el-tag>
        </div>
        <div class="filter-actions">
          <el-button type="primary" size="small" :loading="loading" @click="loadData">查询</el-button>
          <el-button size="small" @click="resetFilter">重置</el-button>
        </div>
      </div>
    </div>

    <div class="summary-row" v-if="battlefieldList.length > 0">
      <div class="summary-card">
        <div class="summary-value">{{ battlefieldList.length }}</div>
        <div class="summary-label">战场数</div>
      </div>
      <div class="summary-card">
        <div class="summary-value attack">{{ totalAttacks }}</div>
        <div class="summary-label">总进攻</div>
      </div>
      <div class="summary-card">
        <div class="summary-value defend">{{ totalDefends }}</div>
        <div class="summary-label">总防守</div>
      </div>
    </div>

    <div class="section-card" v-if="battlefieldList.length > 0">
      <div class="section-title">战场列表</div>
      <div class="battlefield-list">
        <div
          class="bf-card"
          v-for="bf in battlefieldList"
          :key="bf.wid"
          @click="viewReports(bf)"
        >
          <div class="bf-header">
            <div class="bf-name">{{ bf.wid_name || bf.wid }}</div>
            <div class="bf-coord">({{ bf.x }}, {{ bf.y }})</div>
          </div>
          <div class="bf-stats">
            <div class="bf-stat">
              <span class="bf-stat-value attack">{{ bf.attack_count }}</span>
              <span class="bf-stat-label">进攻</span>
            </div>
            <div class="bf-stat">
              <span class="bf-stat-value defend">{{ bf.defend_count }}</span>
              <span class="bf-stat-label">防守</span>
            </div>
            <div class="bf-stat">
              <span class="bf-stat-value">{{ bf.report_count }}</span>
              <span class="bf-stat-label">战报</span>
            </div>
          </div>
          <div class="bf-unions" v-if="bf.attack_unions || bf.defend_unions">
            <el-tag v-for="u in (bf.attack_unions || '').split(',').filter(Boolean).slice(0, 3)" :key="'a'+u" size="small" type="danger" effect="plain">{{ u }}</el-tag>
            <el-tag v-for="u in (bf.defend_unions || '').split(',').filter(Boolean).slice(0, 3)" :key="'d'+u" size="small" type="success" effect="plain">{{ u }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && battlefieldList.length === 0" description="暂无战场数据" />

    <el-drawer v-model="reportDialog" :title="currentBf?.wid_name || '战报列表'" direction="btt" size="75%">
      <div class="report-list">
        <div v-if="reportLoading" class="loading-tip">加载中...</div>
        <div v-else-if="reportList.length === 0" class="empty-tip">暂无战报</div>
        <div v-else>
          <div class="report-card" v-for="report in reportList" :key="report.battle_id">
            <div class="report-header">
              <el-tag :type="getResultType(report.result)" size="small" effect="plain">{{ getResultText(report.result) }}</el-tag>
              <span class="report-time">{{ report.time_text || '--' }}</span>
            </div>
            <div class="report-vs">
              <div class="report-side attack">
                <div class="side-name">{{ report.attack_name || '--' }}</div>
                <div class="side-union">{{ report.attack_union_name || '--' }}</div>
                <div class="side-hp">HP: {{ report.attack_hp ?? '--' }}</div>
              </div>
              <div class="vs-badge">VS</div>
              <div class="report-side defend">
                <div class="side-name">{{ report.defend_name || '--' }}</div>
                <div class="side-union">{{ report.defend_union_name || '--' }}</div>
                <div class="side-hp">HP: {{ report.defend_hp ?? '--' }}</div>
              </div>
            </div>
          </div>
          <div class="pagination-wrap" v-if="reportTotal > 20">
            <el-pagination
              small
              layout="prev, pager, next"
              :total="reportTotal"
              :page-size="20"
              :current-page="reportPage"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { getBattlefieldStats, getBattleReports } from '@/api/battlefield'

const showFilter = ref(true)
const loading = ref(false)
const activePreset = ref('')
const battlefieldList = ref([])

const filter = ref({
  x_min: '',
  x_max: '',
  y_min: '',
  y_max: ''
})

const presets = [
  { name: '洛阳', x_min: 495, x_max: 505, y_min: 495, y_max: 505 },
  { name: '虎牢关', x_min: 480, x_max: 520, y_min: 480, y_max: 520 },
  { name: '全图', x_min: 0, x_max: 1000, y_min: 0, y_max: 1000 }
]

const totalAttacks = computed(() => battlefieldList.value.reduce((sum, bf) => sum + (bf.attack_count || 0), 0))
const totalDefends = computed(() => battlefieldList.value.reduce((sum, bf) => sum + (bf.defend_count || 0), 0))

const applyPreset = (preset) => {
  activePreset.value = preset.name
  filter.value = { x_min: preset.x_min, x_max: preset.x_max, y_min: preset.y_min, y_max: preset.y_max }
  loadData()
}

const resetFilter = () => {
  activePreset.value = ''
  filter.value = { x_min: '', x_max: '', y_min: '', y_max: '' }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (filter.value.x_min !== '') params.x_min = filter.value.x_min
    if (filter.value.x_max !== '') params.x_max = filter.value.x_max
    if (filter.value.y_min !== '') params.y_min = filter.value.y_min
    if (filter.value.y_max !== '') params.y_max = filter.value.y_max
    const res = await getBattlefieldStats(params)
    if (res.code === 200) {
      battlefieldList.value = res.data || []
    }
  } catch (e) {
    ElMessage.error('加载失败')
  } finally { loading.value = false }
}

const reportDialog = ref(false)
const reportList = ref([])
const reportLoading = ref(false)
const currentBf = ref(null)
const reportPage = ref(1)
const reportTotal = ref(0)

const viewReports = async (bf) => {
  currentBf.value = bf
  reportPage.value = 1
  reportDialog.value = true
  await loadReports()
}

const loadReports = async () => {
  reportLoading.value = true
  try {
    const res = await getBattleReports({ wid: currentBf.value.wid, page: reportPage.value, page_size: 20 })
    if (res.code === 200) {
      reportList.value = res.data?.list || res.data || []
      reportTotal.value = res.data?.total || reportList.value.length
    }
  } catch {} finally { reportLoading.value = false }
}

const handlePageChange = (page) => {
  reportPage.value = page
  loadReports()
}

const getResultText = (result) => {
  if (result === 1) return '攻方胜'
  if (result === 2) return '守方胜'
  return '未知'
}

const getResultType = (result) => {
  if (result === 1) return 'danger'
  if (result === 2) return 'success'
  return 'info'
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.stats-page {
  padding: 16px;
  padding-bottom: 80px;
}

.filter-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.filter-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.filter-body {
  margin-top: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.filter-sep {
  color: #94a3b8;
  font-size: 14px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-tag {
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;

  &.attack { color: #dc2626; }
  &.defend { color: #059669; }
}

.summary-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.section-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.battlefield-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bf-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;

  &:active { background: #eef1fe; }
}

.bf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bf-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.bf-coord {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'SF Mono', monospace;
}

.bf-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.bf-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bf-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;

  &.attack { color: #dc2626; }
  &.defend { color: #059669; }
}

.bf-stat-label {
  font-size: 11px;
  color: #94a3b8;
}

.bf-unions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.report-list {
  padding: 0 4px;
}

.loading-tip, .empty-tip {
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
  font-size: 13px;
}

.report-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid #f1f5f9;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.report-time {
  font-size: 12px;
  color: #94a3b8;
}

.report-vs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-side {
  flex: 1;
  text-align: center;

  .side-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .side-union {
    font-size: 11px;
    color: #64748b;
    margin-bottom: 2px;
  }

  .side-hp {
    font-size: 12px;
    font-weight: 500;
  }

  &.attack .side-hp { color: #dc2626; }
  &.defend .side-hp { color: #059669; }
}

.vs-badge {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  background: #e2e8f0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
</style>
