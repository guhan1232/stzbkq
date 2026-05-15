<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { ApiGetMemberHistory } from '../api';

const loading = ref(false);
const history = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const actionFilter = ref('');

const loadHistory = async () => {
    loading.value = true;
    try {
        const res = await ApiGetMemberHistory({
            page: currentPage.value,
            page_size: pageSize.value,
            action: actionFilter.value
        });
        if (res.data.code === 200) {
            history.value = res.data.data.list;
            total.value = res.data.data.total;
        }
    } catch (error) {
        ElMessage.error('加载失败');
    } finally {
        loading.value = false;
    }
};

const handlePageChange = (page) => {
    currentPage.value = page;
    loadHistory();
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

onMounted(() => {
    loadHistory();
});
</script>

<template>
    <div class="member-history-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">成员变动记录</h2>
                <span class="hint-badge">共 {{ total }} 条记录</span>
            </div>
            <div class="page-actions">
                <el-select v-model="actionFilter" placeholder="筛选类型" clearable style="width: 120px;" @change="loadHistory">
                    <el-option label="全部" value="" />
                    <el-option label="加入" value="join" />
                    <el-option label="退出" value="leave" />
                </el-select>
                <el-button @click="loadHistory" :icon="Refresh">刷新</el-button>
            </div>
        </div>

        <div class="table-card">
            <el-table :data="history" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="player_name" label="玩家名称" min-width="130">
                    <template #default="{ row }">
                        <span class="player-name">{{ row.player_name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作类型" width="100" align="center">
                    <template #default="{ row }">
                        <span :class="['action-tag', row.action === 'join' ? 'action-join' : 'action-leave']">
                            {{ row.action === 'join' ? '加入' : '退出' }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="group_name" label="当时分组" width="120">
                    <template #default="{ row }">
                        <span class="group-tag">{{ row.group_name || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="power" label="当时势力" width="110" align="right">
                    <template #default="{ row }">
                        <span class="power-value">{{ row.power || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="时间" width="170">
                    <template #default="{ row }">
                        <span class="time-text">{{ formatTime(row.action_time) }}</span>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrap">
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    layout="total, prev, pager, next"
                    @current-change="handlePageChange"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.member-history-page {
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

.page-actions {
    display: flex;
    gap: 8px;
    align-items: center;
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

.action-tag {
    display: inline-block;
    padding: 2px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.action-join {
    background: var(--color-success-light);
    color: #059669;
}

.action-leave {
    background: var(--color-danger-light);
    color: #dc2626;
}

.group-tag {
    display: inline-block;
    padding: 2px 10px;
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
}

.power-value {
    font-weight: 500;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}

.time-text {
    color: var(--text-secondary);
    font-size: 13px;
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

    .page-actions {
        width: 100%;
    }
}
</style>
