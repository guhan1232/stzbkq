<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshRight, Download } from '@element-plus/icons-vue'
import { ApiGetTeamUser } from '@/api'
import * as XLSX from 'xlsx';

const teamUsers = ref([]);
const usersNum = ref(0);

const syncuser = () => {
    ElMessageBox.alert('请前往游戏中,点开同盟成员列表即可同步', '提示', {
        confirmButtonText: '确认',
    })
}

function getUserList() {
    teamUsers.value = [];
    usersNum.value = 0;
    ApiGetTeamUser().then(v => {
        let resp = v.data;
        if (resp.code === 200) {
            let data = resp.data;
            teamUsers.value = data || [];
            usersNum.value = (data || []).length;
        } else {
            console.error("请求错误:", resp.message);
            if (resp.message === '请先选择数据库') {
                ElMessage.warning('请先在首页选择数据库');
            }
        }
    }).catch(e => {
        console.error("请求异常:", e);
        if (e?.response?.data?.message === '请先选择数据库') {
            ElMessage.warning('请先在首页选择数据库');
        } else {
            ElMessage.error('获取同盟成员数据失败');
        }
    });
}

const exportExcel = () => {
    let data = [];
    data.push([
        "名字",
        "分组",
        "势力",
        "本周武勋",
        "总贡献",
        "周贡献",
        "位置",
        "进盟时间",
    ]);

    Object.values(teamUsers.value).forEach(v => {
        data.push([
            v.name,
            v.group,
            v.power,
            v.wu,
            v.contribute_total,
            v.contribute_week,
            splitwid(v.pos),
            formatTimestamp(v.join_time),
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${formatTimestamp(parseInt(new Date().getTime() / 1000))}同盟成员表.xlsx`);
};

onMounted(() => {
    getUserList()
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function splitwid(num) {
    const numStr = num.toString();
    const lastFour = numStr.slice(-4);
    const firstPart = numStr.slice(0, -4);
    const lastFourNumber = parseInt(lastFour, 10);
    return `${firstPart},${lastFourNumber}`
}
</script>

<template>
    <div class="team-user-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">同盟成员</h2>
                <span class="member-badge">共 {{ usersNum }} 人</span>
            </div>
            <div class="page-actions">
                <el-button @click="getUserList" :icon="Refresh">刷新</el-button>
                <el-button @click="syncuser" :icon="RefreshRight">同步成员</el-button>
                <el-button type="primary" @click="exportExcel" :icon="Download">导出表格</el-button>
            </div>
        </div>

        <div class="table-card">
            <el-table :data="teamUsers" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="name" label="名字" min-width="120" />
                <el-table-column prop="group" label="分组" width="90" align="center">
                    <template #default="{ row }">
                        <span class="group-tag">{{ row.group }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="power" label="势力" width="100" align="right" />
                <el-table-column prop="wu" label="周武勋" width="110" align="right">
                    <template #default="{ row }">
                        <span class="wu-value">{{ row.wu }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="contribute_total" label="总贡献" width="100" align="right" />
                <el-table-column prop="contribute_week" label="周贡献" width="100" align="right" />
                <el-table-column label="位置" width="130">
                    <template #default="{ row }">
                        <span class="pos-text">{{ splitwid(row.pos) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="进盟时间" min-width="170">
                    <template #default="{ row }">
                        <span class="time-text">{{ formatTimestamp(row.join_time) }}</span>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<style scoped>
.team-user-page {
    max-width: 1200px;
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

.member-badge {
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
}

.page-actions {
    display: flex;
    gap: 8px;
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
    font-weight: 600;
}

.pos-text {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--text-secondary);
}

.time-text {
    font-size: 13px;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .page-actions {
        width: 100%;
    }

    .page-actions .el-button {
        flex: 1;
    }
}
</style>
