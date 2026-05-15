<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download, Refresh, Delete } from '@element-plus/icons-vue';
import { ApiGetDailyReportList, ApiGenerateDailyReport, ApiGetDailyReportText, ApiDeleteDailyReport } from '../api';

const props = defineProps({
    visible: Boolean
});

const emit = defineEmits(['update:visible']);

const reports = ref([]);
const loading = ref(false);
const currentDownloadDate = ref('');
const deletingDate = ref('');

const loadReports = async () => {
    loading.value = true;
    try {
        const res = await ApiGetDailyReportList({ page: 1, page_size: 30 });
        if (res.data.code === 200) {
            reports.value = res.data.data.list;
        }
    } catch (error) {
        ElMessage.error('加载报告列表失败');
    } finally {
        loading.value = false;
    }
};

const handleDownload = async (date) => {
    currentDownloadDate.value = date;
    try {
        const res = await ApiGetDailyReportText(date);
        if (res.data.code === 200) {
            const content = res.data.data.text;
            downloadFile(content, `每日报告_${date}.txt`);
            ElMessage.success('下载成功');
        } else {
            ElMessage.error(res.data.message || '下载失败');
        }
    } catch (error) {
        ElMessage.error('下载失败');
    } finally {
        currentDownloadDate.value = '';
    }
};

const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const handleGenerate = async () => {
    try {
        const res = await ApiGenerateDailyReport();
        if (res.data.code === 200) {
            ElMessage.success('报告生成成功');
            loadReports();
        } else {
            ElMessage.error(res.data.message || '生成失败');
        }
    } catch (error) {
        ElMessage.error('生成失败');
    }
};

const handleDelete = async (date) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除 ${formatFullDate(date)} 的报告吗？此操作不可恢复。`,
            '删除确认',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        );
    } catch {
        return;
    }

    deletingDate.value = date;
    try {
        const res = await ApiDeleteDailyReport(date);
        if (res.data.code === 200) {
            ElMessage.success('删除成功');
            reports.value = reports.value.filter(r => r.date !== date);
        } else {
            ElMessage.error(res.data.message || '删除失败');
        }
    } catch (error) {
        ElMessage.error('删除失败');
    } finally {
        deletingDate.value = '';
    }
};

const getWeekDay = (dateStr) => {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(dateStr).getDay()];
};

const isToday = (dateStr) => {
    return new Date(dateStr).toDateString() === new Date().toDateString();
};

const formatFullDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

onMounted(() => {
    if (props.visible) loadReports();
});

watch(() => props.visible, (val) => {
    if (val) loadReports();
});
</script>

<template>
    <div class="panel" v-show="visible">
        <div class="panel-head">
            <span class="panel-title">每日报告</span>
            <button class="close-btn" @click="emit('update:visible', false)">×</button>
        </div>

        <button class="gen-btn" @click="handleGenerate">生成今日报告</button>

        <div class="list" v-loading="loading">
            <template v-if="reports.length">
                <div
                    v-for="r in reports"
                    :key="r.date"
                    class="row"
                    :class="{ today: isToday(r.date) }"
                >
                    <div class="row-date">
                        <span class="row-day">{{ r.date.slice(5).replace('-', '/') }}</span>
                        <span class="row-week">{{ getWeekDay(r.date) }}</span>
                    </div>
                    <span class="row-tag" v-if="isToday(r.date)">今天</span>
                    <div class="row-btns">
                        <button class="mini-btn" @click="handleDownload(r.date)" :disabled="currentDownloadDate === r.date" title="下载">
                            <Download :size="13" />
                        </button>
                        <button class="mini-btn del" @click="handleDelete(r.date)" :disabled="deletingDate === r.date" title="删除">
                            <Delete :size="13" />
                        </button>
                    </div>
                </div>
            </template>
            <div v-else class="empty">
                <p class="empty-text">暂无报告</p>
                <p class="empty-sub">点击上方按钮生成今日报告</p>
            </div>
        </div>

        <div class="foot">翻地统计 · 成员变动 · 攻城出勤</div>
    </div>
</template>

<style scoped>
.panel {
    width: 280px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-sidebar);
    border-left: 1px solid var(--border-color);
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--border-light);
    flex-shrink: 0;
}

.panel-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.close-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .15s;
    line-height: 1;
}

.close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
}

.gen-btn {
    margin: 12px 14px;
    width: calc(100% - 28px);
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s;
    flex-shrink: 0;
}
.gen-btn:hover {
    opacity: .88;
}
.gen-btn:active { transform: scale(.98); }

.list {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px;
}

.row {
    display: flex;
    align-items: center;
    padding: 10px 8px;
    margin-bottom: 4px;
    border-radius: 8px;
    background: var(--bg-page);
    border: 1px solid transparent;
    transition: all .15s;
}

.row:hover {
    background: var(--bg-hover);
    border-color: var(--border-light);
}

.row.today {
    border-color: rgba(64,158,255,.25);
    background: rgba(64,158,255,.04);
}

.row-date {
    min-width: 48px;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.row-day {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
}

.row-week {
    font-size: 11px;
    color: var(--text-tertiary);
    line-height: 1.3;
}

.row-tag {
    font-size: 10px;
    font-weight: 500;
    color: #fff;
    background: var(--color-primary);
    padding: 1px 6px;
    border-radius: 6px;
    margin-left: 6px;
    white-space: nowrap;
}

.row-btns {
    margin-left: auto;
    display: flex;
    gap: 2px;
}

.mini-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .15s;
}

.mini-btn:hover:not(:disabled) {
    background: rgba(64,158,255,.08);
    color: var(--color-primary);
}

.mini-btn.del:hover:not(:disabled) {
    background: rgba(245,108,108,.06);
    color: #f56c6c;
}

.mini-btn:disabled { opacity: .35; cursor: not-allowed; }

.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 0;
}

.empty-text {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 4px;
}

.empty-sub {
    font-size: 12px;
    color: var(--text-disabled);
    margin: 0;
}

.foot {
    padding: 10px 16px;
    text-align: center;
    font-size: 11px;
    color: var(--text-disabled);
    border-top: 1px solid var(--border-light);
    letter-spacing: .5px;
    flex-shrink: 0;
}
</style>
