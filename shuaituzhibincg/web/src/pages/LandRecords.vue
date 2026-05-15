<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, Refresh, List, DataAnalysis, Search } from '@element-plus/icons-vue';
import { ApiGetLandRecords, ApiGetLandRecordsStats, getExportLandRecordsUrl } from '../api';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const loading = ref(false);
const records = ref([]);
const stats = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const playerNameFilter = ref('');
const successFilter = ref('');
const activeView = ref('list');

const startTime = ref('');
const endTime = ref('');
const onlyMembers = ref(true);
const groupNameFilter = ref('');

const loadRecords = async () => {
    loading.value = true;
    try {
        const params = {
            page: currentPage.value,
            page_size: pageSize.value,
            player_name: playerNameFilter.value,
            is_success: successFilter.value,
            only_members: onlyMembers.value ? '1' : '0',
            group_name: groupNameFilter.value
        };
        
        if (startTime.value) {
            const [y, m, d] = startTime.value.split('-').map(Number);
            const date = new Date(y, m - 1, d, 0, 0, 0, 0);
            params.start_time = Math.floor(date.getTime() / 1000);
        }
        if (endTime.value) {
            const [y, m, d] = endTime.value.split('-').map(Number);
            const date = new Date(y, m - 1, d, 23, 59, 59, 999);
            params.end_time = Math.floor(date.getTime() / 1000);
        }
        
        const res = await ApiGetLandRecords(params);
        if (res.data.code === 200) {
            records.value = Array.isArray(res.data.data?.list) ? res.data.data.list : [];
            total.value = res.data.data?.total || 0;
        }
    } catch (error) {
        ElMessage.error('加载失败');
    } finally {
        loading.value = false;
    }
};

const loadStats = async () => {
    loading.value = true;
    try {
        const res = await ApiGetLandRecordsStats({
            player_name: playerNameFilter.value
        });
        if (res.data.code === 200) {
            stats.value = Array.isArray(res.data.data?.list) ? res.data.data.list : [];
        }
    } catch (error) {
        ElMessage.error('加载统计失败');
    } finally {
        loading.value = false;
    }
};

const handleViewChange = () => {
    currentPage.value = 1;
    if (activeView.value === 'list') {
        loadRecords();
    } else {
        loadStats();
    }
};

const handlePageChange = (page) => {
    currentPage.value = page;
    loadRecords();
};

const handleSearch = () => {
    currentPage.value = 1;
    if (activeView.value === 'list') {
        loadRecords();
    } else {
        loadStats();
    }
};

const handleExport = () => {
    const params = {
        player_name: playerNameFilter.value,
        is_success: successFilter.value,
        only_members: onlyMembers.value ? '1' : '0',
        group_name: groupNameFilter.value
    };
    
    if (startTime.value) {
        const [y, m, d] = startTime.value.split('-').map(Number);
        const date = new Date(y, m - 1, d, 0, 0, 0, 0);
        params.start_time = Math.floor(date.getTime() / 1000);
    }
    if (endTime.value) {
        const [y, m, d] = endTime.value.split('-').map(Number);
        const date = new Date(y, m - 1, d, 23, 59, 59, 999);
        params.end_time = Math.floor(date.getTime() / 1000);
    }
    if (groupNameFilter.value) {
        params.group_name = groupNameFilter.value;
    }
    
    const url = getExportLandRecordsUrl(params, userStore.sessionId);
    const link = document.createElement('a');
    link.href = url;
    
    let fileName = '翻地记录';
    if (groupNameFilter.value) {
        fileName = `${groupNameFilter.value}-翻地记录`;
    }
    if (startTime.value || endTime.value) {
        fileName += `_${startTime.value || '开始'}_至_${endTime.value || '现在'}`;
    }
    fileName += '.xlsx';
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('导出成功');
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const splitPos = (pos) => {
    const posStr = pos.toString();
    if (posStr.length < 4) return pos.toString();
    const x = posStr.slice(0, -4);
    const y = posStr.slice(-4);
    return `${x},${parseInt(y)}`;
};

onMounted(() => {
    loadRecords();
});
</script>

<template>
    <div class="land-records-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">翻地记录</h2>
                <span class="hint-badge">共 {{ total }} 条记录</span>
            </div>
            <div class="page-actions">
                <el-radio-group v-model="activeView" @change="handleViewChange" size="default">
                    <el-radio-button value="list">
                        <el-icon><List /></el-icon>
                        记录列表
                    </el-radio-button>
                    <el-radio-button value="stats">
                        <el-icon><DataAnalysis /></el-icon>
                        统计排名
                    </el-radio-button>
                </el-radio-group>
            </div>
        </div>

        <div class="filter-card">
            <div class="filter-row">
                <el-input
                    v-model="playerNameFilter"
                    placeholder="搜索玩家名称"
                    clearable
                    style="width: 160px;"
                    @keyup.enter="handleSearch"
                />
                <el-input
                    v-if="activeView === 'list'"
                    v-model="groupNameFilter"
                    placeholder="按团筛选"
                    clearable
                    style="width: 120px;"
                    @keyup.enter="handleSearch"
                />
                <el-select v-if="activeView === 'list'" v-model="successFilter" placeholder="结果筛选" clearable style="width: 120px;" @change="handleSearch">
                    <el-option label="全部" value="" />
                    <el-option label="成功" value="1" />
                    <el-option label="失败" value="0" />
                </el-select>
                <el-checkbox v-if="activeView === 'list'" v-model="onlyMembers" @change="handleSearch">
                    仅同盟成员
                </el-checkbox>
                <el-date-picker
                    v-if="activeView === 'list'"
                    v-model="startTime"
                    type="date"
                    placeholder="开始日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 140px;"
                />
                <span v-if="activeView === 'list'" class="date-sep">至</span>
                <el-date-picker
                    v-if="activeView === 'list'"
                    v-model="endTime"
                    type="date"
                    placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 140px;"
                />
                <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
                <el-button v-if="activeView === 'list'" type="success" @click="handleExport" :icon="Download" plain>导出Excel</el-button>
                <el-button @click="activeView === 'list' ? loadRecords() : loadStats()" :icon="Refresh">刷新</el-button>
            </div>
        </div>

        <div class="table-card">
            <el-table v-if="activeView === 'list'" :data="records" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="player_name" label="玩家名称" min-width="110">
                    <template #default="{ row }">
                        <span class="player-name">{{ row.player_name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="土地位置" width="120">
                    <template #default="{ row }">
                        <span class="pos-text">{{ splitPos(row.land_pos) }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="land_name" label="土地名称" min-width="120" />
                <el-table-column prop="land_level" label="土地等级" width="80" align="center">
                    <template #default="{ row }">
                        <span class="level-tag">{{ row.land_level }}级</span>
                    </template>
                </el-table-column>
                <el-table-column label="结果" width="80" align="center">
                    <template #default="{ row }">
                        <span :class="['result-tag', row.is_success === 1 ? 'result-success' : 'result-fail']">
                            {{ row.is_success === 1 ? '成功' : '失败' }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="defender_name" label="防守方" width="110">
                    <template #default="{ row }">
                        <span>{{ row.defender_name || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="时间" width="160">
                    <template #default="{ row }">
                        <span class="time-text">{{ formatTime(row.attack_time) }}</span>
                    </template>
                </el-table-column>
            </el-table>

            <div v-if="activeView === 'list'" class="pagination-wrap">
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    layout="total, prev, pager, next"
                    @current-change="handlePageChange"
                />
            </div>

            <el-table v-if="activeView === 'stats'" :data="stats" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column label="排名" width="80" align="center">
                    <template #default="{ $index }">
                        <span :class="['rank-badge', $index < 3 ? 'rank-top' : 'rank-normal']">{{ $index + 1 }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="player_name" label="玩家名称" min-width="130">
                    <template #default="{ row }">
                        <span class="player-name">{{ row.player_name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="总翻地数" width="110" align="right">
                    <template #default="{ row }">
                        <span class="stat-value">{{ row.total_count }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="成功数" width="100" align="center">
                    <template #default="{ row }">
                        <span class="success-count">{{ row.success_count }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="失败数" width="100" align="center">
                    <template #default="{ row }">
                        <span class="fail-count">{{ row.fail_count }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="成功率" width="110" align="right">
                    <template #default="{ row }">
                        <span :class="['rate-value', row.total_count > 0 && (row.success_count / row.total_count * 100) >= 80 ? 'rate-high' : 'rate-mid']">
                            {{ row.total_count > 0 ? (row.success_count / row.total_count * 100).toFixed(1) + '%' : '0%' }}
                        </span>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<style scoped>
.land-records-page {
    max-width: 1280px;
    margin: 0 auto;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
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

.page-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.filter-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    padding: 16px 20px;
    margin-bottom: 16px;
}

.filter-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.date-sep {
    color: var(--text-tertiary);
    font-size: 13px;
}

.table-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    padding: 20px;
}

.player-name {
    font-weight: 500;
    color: var(--text-primary);
}

.pos-text {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
}

.result-tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.result-success {
    background: var(--color-success-light);
    color: #059669;
}

.result-fail {
    background: var(--color-danger-light);
    color: #dc2626;
}

.level-tag {
    display: inline-block;
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 12px;
}

.time-text {
    color: var(--text-secondary);
    font-size: 13px;
}

.rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 13px;
    font-weight: 600;
}

.rank-top {
    background: var(--color-warning-light);
    color: #d97706;
}

.rank-normal {
    background: var(--bg-page);
    color: var(--text-secondary);
}

.stat-value {
    font-weight: 600;
    color: var(--color-primary);
    font-variant-numeric: tabular-nums;
}

.success-count {
    color: #059669;
    font-weight: 500;
}

.fail-count {
    color: #dc2626;
    font-weight: 500;
}

.rate-value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.rate-high {
    color: #059669;
}

.rate-mid {
    color: #d97706;
}

.pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .filter-row {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-row .el-input,
    .filter-row .el-select,
    .filter-row .el-date-picker {
        width: 100% !important;
    }
}
</style>
