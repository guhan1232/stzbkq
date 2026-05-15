<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Refresh, Plus } from '@element-plus/icons-vue'
import { ApiGetTeamGroup, ApiCreateTask, ApiGetTaskList, ApiDelTask, ApiEnableGetReport, ApiGetReportNumByTaskId, ApiStatisticsReport, ApiGetTask, ApiDelTaskReport, ApiSetTaskUserLeave } from '@/api'
import * as XLSX from 'xlsx';

const addtaskshow = ref(false);
const targetgroup = ref([]);
const grouplist = ref([]);
const tasktime = ref([]); // 修改为数组，用于存储时间范围
const taskname = ref("");
const taskpos = ref();
const createing = ref(false);
const tasks = ref([]);
const taskNum = ref(0);
const selectedTasks = ref([]);
const exporting = ref(false);

const isAllSelected = computed({
    get: () => tasks.value.length > 0 && selectedTasks.value.length === tasks.value.length,
    set: (val) => {
        selectedTasks.value = val ? tasks.value.map(t => t.id) : [];
    }
});

const toggleSelectAll = () => {
    isAllSelected.value = !isAllSelected.value;
};

const createTask = () => {
    let taskposArr = [];
    if (taskpos.value && typeof taskpos.value === 'string') {
        const parts = taskpos.value.split(',');
        if (parts.length === 2) {
            taskposArr = [parts[0].trim(), parts[1].trim()];
        }
    }
    
    if (taskposArr.length !== 2) {
        ElMessage.error("任务坐标格式错误，请使用格式：70,1092");
        return;
    }
    
    if (!tasktime.value || tasktime.value.length !== 2) {
        ElMessage.error("请选择任务时间范围");
        return;
    }
    
    createing.value = true;
    ApiCreateTask({
        taskname: taskname.value,
        tasktime: Math.floor(new Date(tasktime.value[0]).getTime() / 1000),
        taskendtime: Math.floor(new Date(tasktime.value[1]).getTime() / 1000),
        targetgroup: targetgroup.value,
        taskpos: taskposArr,
    }).then(v => {
        if (v.status == 200) {
            if (v.data.code == 200) {
                ElMessage.success(v.data.msg);
                taskname.value = "";
                targetgroup.value = [];
                taskpos.value = [];
                tasktime.value = [];
                getTaskList();
            } else {
                ElMessage.error(v.data.msg);
            }
        } else {
            ElMessage.error("创建出错");
        }
        createing.value = false;
    }).catch(e => {
        createing.value = false;
        ElMessage.error(e);
    });
}

const delTask = (id) => {
    ApiDelTask(id).then(v => {
        if (v.status == 200) {
            if (v.data.code == 200) {
                ElMessage.success(v.data.msg);
                getTaskList();
            } else {
                ElMessage.error(v.data.msg);
            }
        } else {
            ElMessage.error("任务删除失败" + v.status);
        }
    });
}

const delTaskReport = (id) => {
    ApiDelTaskReport(id).then(v => {
        if (v.status == 200) {
            if (v.data.code == 200) {
                ElMessage.success(v.data.msg);
                getTaskList();
            } else {
                ElMessage.error(v.data.msg);
            }
        } else {
            ElMessage.error("任务删除失败" + v.status);
        }
    });
}

function getTaskList() {
    tasks.value = [];
    taskNum.value = 0;
    ApiGetTaskList().then(v => {
        if (v.status == 200) {
            let resp = v.data;
            if (resp.code == 200) {
                let data = resp.data;
                tasks.value = data;
                taskNum.value = data.length;
            } else {
                ElMessage.error(resp.msg);
            }
        } else {
            ElMessage.error("获取任务列表失败");
        }
    });
}

onMounted(() => {
    ApiGetTeamGroup().then(v => {
        if (v.status == 200) {
            let resp = v.data;
            let data = resp.data || [];
            grouplist.value = [];
            if (Array.isArray(data)) {
                data.forEach(e => {
                    grouplist.value.push({
                        label: e,
                        value: e
                    });
                });
            }
        }
    });
    getTaskList();
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
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
    return `${firstPart},${lastFourNumber}`;
}

const showModal = ref(false);
const getReporting = ref(false);
const reportNum = ref(0);
const getReportNumTimer = ref(null);
const inStatistics = ref(false);
const curtaskid = ref(0);
const timeRange = ref([]);

const enableGetReport = (id, pos, startTime, endTime) => {
    showModal.value = true;
    // 构建时间范围参数
    const params = { pos };
    if (startTime && endTime) {
        params.start_time = startTime;
        params.end_time = endTime;
    } else if (timeRange.value && timeRange.value.length === 2) {
        params.start_time = Math.floor(timeRange.value[0].getTime() / 1000);
        params.end_time = Math.floor(timeRange.value[1].getTime() / 1000);
    }
    ApiEnableGetReport(params);
    getReporting.value = true;
    reportNum.value = 0;
    curtaskid.value = id;
    getReportNumTimer.value = setInterval(() => {
        ApiGetReportNumByTaskId(id).then(v => {
            if (v.status == 200 && v.data.code == 200) {
                reportNum.value = v.data.data.count;
            }
        });
    }, 1000);
}

const statistics = () => {
    clearInterval(getReportNumTimer.value);
    getReporting.value = false;
    inStatistics.value = true;
    ApiStatisticsReport(curtaskid.value).then(v => {
        if (v.data.code == 200) {
            ElMessage.success(v.data.msg);
            showModal.value = false;
            curtaskid.value = 0;
            getTaskList();
        } else {
            ElMessage.error(v.data.msg);
        }
        inStatistics.value = false;
    }).catch(e => {
        inStatistics.value = false;
        ElMessage.error("统计考勤数据失败:" + e);
    });
}

const showModal2 = ref(false);
const taskDetail = ref({});
const getTask = (id) => {
    taskDetail.value = {};
    showModal2.value = true;
    ApiGetTask(id).then(v => {
        if (v.data.code == 200) {
            taskDetail.value = v.data.data;
        } else {
            ElMessage.error(v.data.msg);
        }
    }).catch(e => {
        ElMessage.error("获取考勤数据失败:" + e);
    });
}

const getLeaveUserNum = (taskData) => {
    return Object.values(taskData?.user_list || {}).filter(user => user?.is_leave && !user?.atk_num && !user?.dis_num).length;
};

const getAbsentUserNum = (taskData) => {
    const total = Object.keys(taskData?.user_list || {}).length || taskData?.target_user_num || 0;
    return Math.max(0, total - (taskData?.complete_user_num || 0) - getLeaveUserNum(taskData));
};

const setTaskUserLeave = async (row, isLeave) => {
    if (!taskDetail.value?.id || !row?.id) return;
    let reason = row.leave_reason || '';
    try {
        if (isLeave) {
            const result = await ElMessageBox.prompt(`请输入 ${row.name} 的请假原因（可留空）`, '设置请假', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputValue: reason,
            });
            reason = (result.value || '').trim();
        } else {
            await ElMessageBox.confirm(`确认取消 ${row.name} 的请假状态吗？`, '取消请假', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            });
        }

        const v = await ApiSetTaskUserLeave(taskDetail.value.id, {
            user_id: row.id,
            is_leave: isLeave ? 1 : 0,
            reason,
        });
        if (v.data.code === 200) {
            ElMessage.success('保存成功');
            getTask(taskDetail.value.id);
            getTaskList();
        } else {
            ElMessage.error(v.data.message || '保存请假状态失败');
        }
    } catch (e) {
        if (e !== 'cancel' && e !== 'close') {
            ElMessage.error('保存请假状态失败');
        }
    }
};

const generateTaskExportData = (taskData) => {
    const rows = [];
    const userList = taskData.user_list || {};
    
    const groupMap = {};
    Object.values(userList).forEach(user => {
        const g = user.group || '未分组';
        if (!groupMap[g]) groupMap[g] = [];
        groupMap[g].push(user);
    });
    
    const sortedGroups = Object.keys(groupMap).sort();
    
    const leaveCount = getLeaveUserNum(taskData);
    rows.push([`【${taskData.name}】 坐标:${splitwid(taskData.pos)} 目标:${taskData.target_user_num}人 实到:${taskData.complete_user_num}人 请假:${leaveCount}人`]);
    
    let totalAtkTeam = 0, totalDisTeam = 0, totalAtkNum = 0, totalDisNum = 0;
    Object.values(userList).forEach(u => {
        totalAtkTeam += u.atk_team_num || 0;
        totalDisTeam += u.dis_team_num || 0;
        totalAtkNum += u.atk_num || 0;
        totalDisNum += u.dis_num || 0;
    });
    
    rows.push([`汇总: 主力${totalAtkTeam}队/拆迁${totalDisTeam}队 主力${totalAtkNum}次/拆迁${totalDisNum}次`]);
    rows.push(["名字", "分组", "主力(队)", "拆迁(队)", "主力次数", "拆迁次数", "请假", "请假原因"]);
    
    sortedGroups.forEach(groupName => {
        rows.push([`── ${groupName} ──`]);
        
        let groupAtkTeam = 0, groupDisTeam = 0, groupAtkNum = 0, groupDisNum = 0;
        
        groupMap[groupName].forEach(user => {
            rows.push([
                user.name,
                user.group,
                user.atk_team_num || 0,
                user.dis_team_num || 0,
                user.atk_num || 0,
                user.dis_num || 0,
                user.is_leave ? '是' : '',
                user.leave_reason || ''
            ]);
            groupAtkTeam += user.atk_team_num || 0;
            groupDisTeam += user.dis_team_num || 0;
            groupAtkNum += user.atk_num || 0;
            groupDisNum += user.dis_num || 0;
        });
        
        rows.push([`${groupName}小计`, '', groupAtkTeam, groupDisTeam, groupAtkNum, groupDisNum]);
    });
    
    rows.push([]);
    
    return rows;
};

const exportExcel = async () => {
    try {
        const v = await ApiGetTask(taskDetail.value.id, true);
        if (v.data.code === 200) {
            taskDetail.value = v.data.data;
        }
    } catch (e) {
        console.error('刷新数据失败:', e);
    }
    
    const rows = generateTaskExportData(taskDetail.value);
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 16 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 8 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '考勤表');
    XLSX.writeFile(wb, `${taskDetail.value.name}考勤表.xlsx`);
};

const handleDeleteTask = (id) => {
    ElMessageBox.confirm('确认删除该任务吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        delTask(id);
    }).catch(() => {});
};

const handleClearReport = (id) => {
    ElMessageBox.confirm('确认清理战报吗? 数据删除后无法恢复。清理战报可以减少统计考勤的耗时', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        delTaskReport(id);
    }).catch(() => {});
};

const batchExportExcel = async () => {
    if (selectedTasks.value.length === 0) {
        ElMessage.warning('请先选择要导出的任务');
        return;
    }
    
    exporting.value = true;
    ElMessage.info(`正在导出 ${selectedTasks.value.length} 个任务的考勤数据...`);
    
    try {
        const allRows = [];
        allRows.push([`攻城考勤汇总 (${new Date().toLocaleDateString()})`]);
        allRows.push([]);
        
        for (const taskId of selectedTasks.value) {
            try {
                const v = await ApiGetTask(taskId, true);
                const taskData = v.data.data;
                const taskRows = generateTaskExportData(taskData);
                if (Array.isArray(taskRows)) {
                    allRows.push(...taskRows);
                }
            } catch (e) {
                console.error(`导出任务 ${taskId} 失败:`, e);
            }
        }
        
        if (allRows.length > 2) {
            const ws = XLSX.utils.aoa_to_sheet(allRows);
            ws['!cols'] = [
                { wch: 20 },
                { wch: 10 },
                { wch: 10 },
                { wch: 10 },
                { wch: 8 },
                { wch: 18 },
                { wch: 10 },
                { wch: 10 },
            ];
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '考勤汇总');
            XLSX.writeFile(wb, `攻城考勤汇总_${new Date().toLocaleDateString()}.xlsx`);
            ElMessage.success('导出成功');
        } else {
            ElMessage.error('没有可导出的数据');
        }
    } catch (e) {
        ElMessage.error('导出失败: ' + e);
    } finally {
        exporting.value = false;
    }
};
</script>

<template>
    <el-drawer v-model="addtaskshow" title="新增任务" direction="rtl" size="400px" :append-to-body="true">
        <el-form label-width="80px">
            <el-form-item label="任务名称">
                <el-input v-model="taskname" placeholder="例如：内黄LV5" />
            </el-form-item>
            <el-form-item label="任务坐标">
                <el-input v-model="taskpos" placeholder="例如：100,200" />
            </el-form-item>
            <el-form-item label="任务时间范围">
                <el-date-picker v-model="tasktime" type="daterange" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="目标分组">
                <el-select v-model="targetgroup" multiple placeholder="选择分组" style="width: 100%;">
                    <el-option v-for="item in grouplist" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="addtaskshow = false">取消</el-button>
            <el-button type="primary" :loading="createing" @click="createTask">添加</el-button>
        </template>
    </el-drawer>

    <el-dialog v-model="showModal" title="攻城考勤" width="500px" :append-to-body="true">
        <div class="report-dialog-content">
            <p class="report-tip">请前往游戏中,到攻城任务坐标位置查看同盟战报,并勾选守城军士(否则获取不了拆迁战报)。然后一直往下滑直到没有战报为止</p>
            <p class="report-sub">系统只会获取攻城任务时间之后1小时内的战报</p>
            <div class="time-range-selector">
                <el-date-picker
                    v-model="timeRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%;"
                />
                <p class="time-range-tip">选择时间范围后，只会获取该时间范围内的战报</p>
            </div>
            <div class="report-counter">
                <span class="counter-label">已获取</span>
                <span class="counter-value">{{ reportNum }}</span>
                <span class="counter-label">封战报</span>
            </div>
        </div>
        <template #footer>
            <el-button type="info" :loading="true" v-if="getReporting">获取战报中</el-button>
            <el-button type="primary" @click="statistics" :loading="inStatistics">
                {{ inStatistics ? "统计考勤数据中" : "已获取完战报,开始统计考勤数据" }}
            </el-button>
        </template>
    </el-dialog>

    <el-dialog v-model="showModal2" title="考勤详情" width="800px" :append-to-body="true">
        <div class="detail-dialog">
            <el-button type="primary" @click="exportExcel" :icon="Download" style="margin-bottom: 16px;">导出为表格</el-button>
            <div class="detail-summary">
                <span>目标 {{ taskDetail.target_user_num || 0 }} 人</span>
                <span>实到 {{ taskDetail.complete_user_num || 0 }} 人</span>
                <span class="leave-summary">请假 {{ getLeaveUserNum(taskDetail) }} 人</span>
                <span>未到 {{ getAbsentUserNum(taskDetail) }} 人</span>
            </div>
            <el-table :data="Object.values(taskDetail.user_list || {})" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="name" label="名称" min-width="100" />
                <el-table-column prop="group" label="分组" width="90" align="center">
                    <template #default="{ row }">
                        <span class="group-tag">{{ row.group }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="atk_team_num" label="主力" width="80" align="center" />
                <el-table-column prop="dis_team_num" label="拆迁" width="80" align="center" />
                <el-table-column prop="atk_num" label="主力次数" width="90" align="center" />
                <el-table-column prop="dis_num" label="拆迁次数" width="90" align="center" />
                <el-table-column label="请假" width="100" align="center">
                    <template #default="{ row }">
                        <el-tag v-if="row.is_leave" type="warning" size="small">{{ row.leave_reason || '已请假' }}</el-tag>
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="100" align="center">
                    <template #default="{ row }">
                        <el-button v-if="row.is_leave" size="small" text type="info" @click="setTaskUserLeave(row, false)">销假</el-button>
                        <el-button v-else size="small" text type="warning" @click="setTaskUserLeave(row, true)">请假</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-dialog>

    <div class="task-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">攻城任务</h2>
                <span class="task-badge">共 {{ taskNum }} 个任务</span>
            </div>
            <div class="page-actions">
                <el-button @click="getTaskList" :icon="Refresh">刷新</el-button>
                <el-button 
                    type="success" 
                    :disabled="selectedTasks.length === 0" 
                    :loading="exporting"
                    @click="batchExportExcel"
                    :icon="Download"
                >
                    批量导出 {{ selectedTasks.length > 0 ? `(${selectedTasks.length})` : '' }}
                </el-button>
                <el-button type="primary" @click="addtaskshow = true" :icon="Plus">新增任务</el-button>
            </div>
        </div>

        <div v-if="tasks.length > 0" class="select-all-bar">
            <el-checkbox 
                v-model="isAllSelected" 
                :indeterminate="selectedTasks.length > 0 && selectedTasks.length < tasks.length"
            >
                全选 (已选 {{ selectedTasks.length }} 个)
            </el-checkbox>
        </div>

        <div class="task-list">
            <div v-for="task in tasks" :key="task.id" class="task-card">
                <div class="task-card-header">
                    <div class="task-card-left">
                        <el-checkbox 
                            :model-value="selectedTasks.includes(task.id)"
                            @change="(val) => val ? selectedTasks.push(task.id) : selectedTasks = selectedTasks.filter(id => id !== task.id)"
                        />
                        <h3 class="task-name">{{ task.name }}</h3>
                        <span class="task-pos">{{ splitwid(task.pos) }}</span>
                    </div>
                    <span :class="['status-tag', task.status == 1 ? 'status-done' : 'status-pending']">
                        {{ task.status == 1 ? '已完成' : '待考勤' }}
                    </span>
                </div>
                <div class="task-meta">
                    <div class="meta-item">
                        <span class="meta-label">目标分组</span>
                        <div class="meta-value">
                            <span v-for="g in (task.target || [])" :key="g" class="group-tag">{{ g }}</span>
                        </div>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">目标人数</span>
                        <span class="meta-value">{{ task.target_user_num }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">实到人数</span>
                        <span class="meta-value highlight">{{ task.complete_user_num }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">请假人数</span>
                        <span class="meta-value leave-value">{{ task.leave_user_num || 0 }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">任务时间</span>
                        <div class="meta-value time">
                            <span>{{ formatTimestamp(task.time) }}</span>
                            <span class="time-separator">至</span>
                            <span>{{ formatTimestamp(task.end_time) }}</span>
                        </div>
                    </div>
                </div>
                <div class="task-card-actions">
                    <el-button size="small" @click="getTask(task.id)">考勤详情</el-button>
                    <el-button size="small" type="primary" @click="enableGetReport(task.id, task.pos, task.time, task.end_time)">开始考勤</el-button>
                    <el-button size="small" type="warning" @click="handleClearReport(task.id)" plain>清理战报</el-button>
                    <el-button size="small" type="danger" @click="handleDeleteTask(task.id)" plain>删除</el-button>
                </div>
            </div>
        </div>

        <div v-if="tasks.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无攻城任务</p>
            <el-button type="primary" @click="addtaskshow = true" :icon="Plus">创建第一个任务</el-button>
        </div>
    </div>
</template>

<style scoped>
.task-page {
    max-width: 1000px;
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

.task-badge {
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

.select-all-bar {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 16px;
    margin-bottom: 14px;
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.task-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
}

.task-card:hover {
    box-shadow: var(--shadow-md);
}

.task-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}

.task-card-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.task-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.task-pos {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--text-tertiary);
    background: var(--bg-hover);
    padding: 2px 8px;
    border-radius: 4px;
}

.status-tag {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
}

.status-done {
    background: var(--color-success-light);
    color: var(--color-success);
}

.status-pending {
    background: var(--color-warning-light);
    color: #d97706;
}

.task-meta {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 14px;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.meta-label {
    font-size: 12px;
    color: var(--text-tertiary);
}

.meta-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.meta-value.highlight {
    color: var(--color-primary);
    font-weight: 700;
}

.meta-value.leave-value {
    color: #d97706;
    font-weight: 700;
}

.detail-summary {
    display: flex;
    gap: 14px;
    margin-bottom: 12px;
    color: var(--text-secondary);
    font-size: 13px;
}

.detail-summary .leave-summary {
    color: #d97706;
    font-weight: 600;
}

.meta-value.time {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 6px;
}

.time-separator {
    color: var(--text-tertiary);
    font-size: 12px;
}

.group-tag {
    display: inline-block;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 20px;
    margin-right: 4px;
    font-weight: 500;
}

.task-card-actions {
    display: flex;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--border-light);
}

.report-dialog-content {
    text-align: center;
}

.report-tip {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.7;
    margin-bottom: 8px;
}

.report-sub {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-bottom: 24px;
}

.time-range-selector {
    margin-bottom: 24px;
}

.time-range-tip {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 8px;
    text-align: left;
}

.report-counter {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
}

.counter-label {
    font-size: 14px;
    color: var(--text-secondary);
}

.counter-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--color-primary);
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-tertiary);
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.empty-state p {
    margin-bottom: 20px;
    font-size: 15px;
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .page-actions {
        width: 100%;
        flex-wrap: wrap;
    }

    .task-meta {
        grid-template-columns: repeat(2, 1fr);
    }

    .task-card-actions {
        flex-wrap: wrap;
    }
}
</style>
