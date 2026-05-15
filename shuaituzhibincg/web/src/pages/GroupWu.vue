<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { ApiGetGroupWu } from '@/api'

const groupdata = ref([]);

function getData() {
    groupdata.value = [];
    ApiGetGroupWu().then(v => {
        if (v.status == 200) {
            let resp = v.data;
            if (resp.code == 200) {
                let data = resp.data;
                groupdata.value = data;
            } else {
                ElMessage.error(resp.msg);
            }
        } else {
            ElMessage.error("获取分组武勋数据失败");
        }
    });
}

onMounted(() => {
    getData();
});
</script>

<template>
    <div class="group-wu-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">分组武勋</h2>
                <span class="hint-badge">更新武勋数据请同步成员数据</span>
            </div>
            <el-button @click="getData" :icon="Refresh">刷新</el-button>
        </div>

        <div class="table-card">
            <el-table :data="groupdata" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="group" label="分组名称" min-width="120">
                    <template #default="{ row }">
                        <span class="group-tag">{{ row.group }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="member_count" label="人数" width="90" align="center" />
                <el-table-column prop="total_wu" label="总武勋" width="130" align="right">
                    <template #default="{ row }">
                        <span class="wu-value">{{ row.total_wu }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="average_wu" label="平均武勋" width="130" align="right">
                    <template #default="{ row }">
                        <span class="avg-value">{{ row.average_wu }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="zero_wu_count" label="0武勋人数" width="120" align="center">
                    <template #default="{ row }">
                        <span v-if="row.zero_wu_count > 0" class="zero-badge">{{ row.zero_wu_count }}</span>
                        <span v-else class="zero-ok">0</span>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<style scoped>
.group-wu-page {
    max-width: 900px;
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
    font-weight: 700;
    color: var(--text-primary);
}

.hint-badge {
    background: var(--color-warning-light);
    color: #d97706;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 20px;
}

.table-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 4px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
}

.group-tag {
    display: inline-block;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 12px;
    padding: 2px 10px;
    border-radius: 20px;
    font-weight: 500;
}

.wu-value {
    color: var(--color-primary);
    font-weight: 700;
}

.avg-value {
    color: var(--text-primary);
    font-weight: 600;
}

.zero-badge {
    display: inline-block;
    background: var(--color-danger-light);
    color: var(--color-danger);
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 20px;
}

.zero-ok {
    color: var(--text-tertiary);
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
