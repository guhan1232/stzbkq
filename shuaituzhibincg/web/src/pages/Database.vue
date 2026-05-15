<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue'
import { ApiGetDatabases, ApiCreateDatabase, ApiDeleteDatabase, ApiClaimDatabase, ApiReleaseDatabase, ApiGetDatabaseInfo, ApiUpdateDatabase } from '../api';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();

const loading = ref(false);
const databases = ref([]);
const total = ref(0);
const pagination = ref({
    page: 1,
    pageSize: 10
});

const showCreateModal = ref(false);
const createForm = ref({
    name: '',
    display_name: '',
    server: '',
    state: '',
    alliance_name: ''
});
const createLoading = ref(false);

const showEditModal = ref(false);
const editForm = ref({
    display_name: '',
    server: '',
    state: '',
    alliance_name: '',
    bind_ip: '',
    priority: 0
});
const editLoading = ref(false);
const editingId = ref(null);

const showDetailModal = ref(false);
const currentDatabase = ref(null);
const dbStats = ref(null);

const isAdmin = () => userStore.isAdmin();

const loadDatabases = async () => {
    loading.value = true;
    try {
        const res = await ApiGetDatabases({
            page: pagination.value.page,
            page_size: pagination.value.pageSize
        });
        if (res.data.code === 200) {
            databases.value = res.data.data.list;
            total.value = res.data.data.total;
        }
    } catch (error) {
        ElMessage.error('加载数据库列表失败');
    } finally {
        loading.value = false;
    }
};

const handleCreate = async () => {
    if (!createForm.value.name) {
        ElMessage.error('请输入数据库名称');
        return;
    }

    createLoading.value = true;
    try {
        const res = await ApiCreateDatabase(createForm.value);
        if (res.data.code === 200) {
            ElMessage.success('创建成功');
            showCreateModal.value = false;
            createForm.value = { name: '', display_name: '', server: '', state: '', alliance_name: '' };
            loadDatabases();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('创建失败');
    } finally {
        createLoading.value = false;
    }
};

const openEditModal = (row) => {
    editingId.value = row.id;
    editForm.value = {
        display_name: row.display_name || '',
        server: row.server || '',
        state: row.state || '',
        alliance_name: row.alliance_name || '',
        bind_ip: row.bind_ip || '',
        priority: row.priority || 0
    };
    showEditModal.value = true;
};

const handleEdit = async () => {
    if (!editingId.value) return;

    editLoading.value = true;
    try {
        const res = await ApiUpdateDatabase(editingId.value, editForm.value);
        if (res.data.code === 200) {
            ElMessage.success('更新成功');
            showEditModal.value = false;
            loadDatabases();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('更新失败');
    } finally {
        editLoading.value = false;
    }
};

const handleClaim = async (id) => {
    try {
        const res = await ApiClaimDatabase(id);
        if (res.data.code === 200) {
            ElMessage.success('绑定成功');
            loadDatabases();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('绑定失败');
    }
};

const handleRelease = async (id) => {
    try {
        const res = await ApiReleaseDatabase(id);
        if (res.data.code === 200) {
            ElMessage.success('解绑成功');
            loadDatabases();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('解绑失败');
    }
};

const handleDelete = async (id) => {
    try {
        const res = await ApiDeleteDatabase(id);
        if (res.data.code === 200) {
            ElMessage.success('删除成功');
            loadDatabases();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('删除失败');
    }
};

const showDetail = async (row) => {
    currentDatabase.value = row;
    showDetailModal.value = true;
    
    try {
        const res = await ApiGetDatabaseInfo(row.id);
        if (res.data.code === 200) {
            dbStats.value = res.data.data.stats;
        }
    } catch (error) {
        ElMessage.error('获取详情失败');
    }
};

const handlePageChange = (page) => {
    pagination.value.page = page;
    loadDatabases();
};

const confirmDelete = (id) => {
    ElMessageBox.confirm('确定删除此区服吗？此操作将删除该区服的所有数据，且不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        handleDelete(id);
    }).catch(() => {});
};

onMounted(() => {
    loadDatabases();
});
</script>

<template>
    <div class="database-page">
        <div class="page-header">
            <h2 class="page-title">区服管理</h2>
            <el-button type="primary" @click="showCreateModal = true" :icon="Plus">新建区服</el-button>
        </div>

        <div class="table-card">
            <el-table :data="databases" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="name" label="数据库名" min-width="140" />
                <el-table-column prop="server" label="区服" width="100">
                    <template #default="{ row }">
                        <span class="group-tag">{{ row.server || row.server_name || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="state" label="所在州" width="90">
                    <template #default="{ row }">
                        <span>{{ row.state || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="alliance_name" label="同盟名字" min-width="110" />
                <el-table-column prop="status" label="状态" width="80" align="center">
                    <template #default="{ row }">
                        <span :class="['status-dot', row.status === 1 ? 'status-ok' : 'status-off']"></span>
                        {{ row.status === 1 ? '正常' : '禁用' }}
                    </template>
                </el-table-column>
                <el-table-column prop="bind_ip" label="内网IP" width="140" show-overflow-tooltip>
                    <template #default="{ row }">
                        <span v-if="row.bind_ip" class="mono-text">{{ row.bind_ip }}</span>
                        <span v-else class="muted-text">未绑定</span>
                    </template>
                </el-table-column>
                <el-table-column prop="priority" label="优先级" width="80" align="center" />
                <el-table-column prop="owner_id" label="绑定用户" width="100">
                    <template #default="{ row }">
                        <span v-if="row.owner_id" class="mono-text">用户#{{ row.owner_id }}</span>
                        <span v-else class="muted-text">未绑定</span>
                    </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="160" />
                <el-table-column label="操作" width="280">
                    <template #default="{ row }">
                        <el-button size="small" @click="showDetail(row)">详情</el-button>
                        <el-button size="small" type="primary" v-if="isAdmin() || row.owner_id === userStore.userInfo?.id" @click="openEditModal(row)">编辑</el-button>
                        <el-button size="small" type="success" v-if="isAdmin() && row.owner_id === 0" @click="handleClaim(row.id)">绑定</el-button>
                        <el-button size="small" v-if="row.owner_id === userStore.userInfo?.id || isAdmin()" @click="handleRelease(row.id)">解绑</el-button>
                        <el-button size="small" type="danger" v-if="isAdmin() || row.owner_id === userStore.userInfo?.id" @click="confirmDelete(row.id)" plain>删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrap">
                <el-pagination
                    v-model:current-page="pagination.page"
                    :page-size="pagination.pageSize"
                    :total="total"
                    layout="total, prev, pager, next"
                    @current-change="handlePageChange"
                />
            </div>
        </div>
        
        <el-dialog v-model="showCreateModal" title="新建区服" width="500px" :append-to-body="true">
            <el-form label-width="100px">
                <el-form-item label="数据库名称" required>
                    <el-input v-model="createForm.name" placeholder="完整的同盟标识，如: 率土有米#5664034_X5536" />
                    <div class="form-tip">数据库唯一标识，用于数据隔离</div>
                </el-form-item>
                <el-form-item label="区服">
                    <el-input v-model="createForm.server" placeholder="例如: X5536" />
                    <div class="form-tip">区服编号，如 X5536</div>
                </el-form-item>
                <el-form-item label="所在州">
                    <el-input v-model="createForm.state" placeholder="例如: 凉州、冀州" />
                    <div class="form-tip">同盟所在州</div>
                </el-form-item>
                <el-form-item label="同盟名字">
                    <el-input v-model="createForm.alliance_name" placeholder="例如: 率土有米" />
                    <div class="form-tip">同盟名字，如"率土有米"</div>
                </el-form-item>
                <el-form-item label="显示名称">
                    <el-input v-model="createForm.display_name" placeholder="自定义显示名称（可选）" />
                    <div class="form-tip">可选，自定义显示给用户看的名称</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showCreateModal = false">取消</el-button>
                <el-button type="primary" :loading="createLoading" @click="handleCreate">创建</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="showEditModal" title="编辑区服" width="500px" :append-to-body="true">
            <el-form label-width="100px">
                <el-form-item label="区服">
                    <el-input v-model="editForm.server" placeholder="例如: X5536" />
                    <div class="form-tip">区服编号，如 X5536</div>
                </el-form-item>
                <el-form-item label="所在州">
                    <el-input v-model="editForm.state" placeholder="例如: 凉州、冀州" />
                    <div class="form-tip">同盟所在州</div>
                </el-form-item>
                <el-form-item label="同盟名字">
                    <el-input v-model="editForm.alliance_name" placeholder="例如: 率土有米" />
                    <div class="form-tip">同盟名字，如"率土有米"</div>
                </el-form-item>
                <el-form-item label="显示名称">
                    <el-input v-model="editForm.display_name" placeholder="自定义显示名称（可选）" />
                    <div class="form-tip">可选，自定义显示给用户看的名称</div>
                </el-form-item>
                <el-form-item label="绑定内网IP">
                    <el-input type="textarea" :rows="2" v-model="editForm.bind_ip" placeholder="例如: 192.168.1.10,192.168.1.11" />
                    <div class="form-tip">支持绑定多个IP，请使用英文逗号或换行分隔</div>
                </el-form-item>
                <el-form-item label="区服优先级">
                    <el-input-number v-model="editForm.priority" :min="0" :max="999" />
                    <div class="form-tip">多个区服匹配同一IP时，数字越大优先级越高</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showEditModal = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click="handleEdit">保存</el-button>
            </template>
        </el-dialog>
        
        <el-dialog v-model="showDetailModal" title="区服详情" width="600px" :append-to-body="true">
            <template v-if="currentDatabase">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="数据库名">{{ currentDatabase.name }}</el-descriptions-item>
                    <el-descriptions-item label="区服">{{ currentDatabase.server || currentDatabase.server_name || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="所在州">{{ currentDatabase.state || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="同盟名字">{{ currentDatabase.alliance_name || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="完整名称">{{ currentDatabase.full_name || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="状态">{{ currentDatabase.status === 1 ? '正常' : '禁用' }}</el-descriptions-item>
                    <el-descriptions-item label="绑定用户">{{ currentDatabase.owner_id ? `用户#${currentDatabase.owner_id}` : '未绑定' }}</el-descriptions-item>
                    <el-descriptions-item label="绑定内网IP">{{ currentDatabase.bind_ip || '未绑定' }}</el-descriptions-item>
                    <el-descriptions-item label="区服优先级">{{ currentDatabase.priority || 0 }}</el-descriptions-item>
                </el-descriptions>
                
                <h4 style="margin: 20px 0 16px;">数据统计</h4>
                <el-row :gutter="16" v-if="dbStats">
                    <el-col :span="6">
                        <el-statistic title="同盟成员" :value="dbStats.team_user_count" />
                    </el-col>
                    <el-col :span="6">
                        <el-statistic title="任务数量" :value="dbStats.task_count" />
                    </el-col>
                    <el-col :span="6">
                        <el-statistic title="战报数量" :value="dbStats.report_count" />
                    </el-col>
                    <el-col :span="6">
                        <el-statistic title="详细战报" :value="dbStats.battle_report_count" />
                    </el-col>
                </el-row>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.database-page {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.table-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 4px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
}

.pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 4px 4px;
}

.group-tag {
    display: inline-block;
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 500;
}

.status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
}

.status-ok {
    background: var(--color-success);
}

.status-off {
    background: var(--color-danger);
}

.mono-text {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--text-secondary);
}

.muted-text {
    font-size: 12px;
    color: var(--text-tertiary);
}

.form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-tertiary);
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
}
</style>
