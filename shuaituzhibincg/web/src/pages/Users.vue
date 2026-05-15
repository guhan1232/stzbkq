<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Refresh, Key, User as UserIcon } from '@element-plus/icons-vue';
import { ApiGetUsers, ApiUpdateUserStatus, ApiResetPassword, ApiDeleteUser, ApiUpdateUserRole, ApiExecuteCleanup } from '../api';

const loading = ref(false);
const users = ref([]);
const total = ref(0);
const pagination = ref({
    page: 1,
    pageSize: 10
});

const showResetModal = ref(false);
const resetUserId = ref(null);
const resetUsername = ref('');
const newPassword = ref('');
const resetLoading = ref(false);

const cleanupLoading = ref(false);
const cleanupType = ref('auto');

const loadUsers = async () => {
    loading.value = true;
    try {
        const res = await ApiGetUsers({
            page: pagination.value.page,
            page_size: pagination.value.pageSize
        });
        if (res.data.code === 200) {
            users.value = res.data.data.list;
            total.value = res.data.data.total;
        }
    } catch (error) {
        ElMessage.error('加载用户列表失败');
    } finally {
        loading.value = false;
    }
};

const handleStatusChange = async (userId, status) => {
    try {
        const res = await ApiUpdateUserStatus({
            user_id: userId,
            status: status
        });
        if (res.data.code === 200) {
            ElMessage.success('状态更新成功');
            loadUsers();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('状态更新失败');
    }
};

const handleRoleChange = async (userId, role) => {
    try {
        const res = await ApiUpdateUserRole({
            user_id: userId,
            role: role
        });
        if (res.data.code === 200) {
            ElMessage.success('角色更新成功');
            loadUsers();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('角色更新失败');
    }
};

const openResetModal = (id, username) => {
    resetUserId.value = id;
    resetUsername.value = username;
    newPassword.value = '';
    showResetModal.value = true;
};

const handleResetPassword = async () => {
    if (!newPassword.value) {
        ElMessage.error('请输入新密码');
        return;
    }
    if (newPassword.value.length < 6) {
        ElMessage.error('密码长度至少6个字符');
        return;
    }
    
    resetLoading.value = true;
    try {
        const res = await ApiResetPassword({
            user_id: resetUserId.value,
            new_password: newPassword.value
        });
        if (res.data.code === 200) {
            ElMessage.success('密码重置成功');
            showResetModal.value = false;
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('密码重置失败');
    } finally {
        resetLoading.value = false;
    }
};

const handleDelete = async (id) => {
    try {
        const res = await ApiDeleteUser(id);
        if (res.data.code === 200) {
            ElMessage.success('删除成功');
            loadUsers();
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('删除失败');
    }
};

const confirmDelete = (id) => {
    ElMessageBox.confirm('确定删除此用户吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        handleDelete(id);
    }).catch(() => {});
};

const handleCleanup = async () => {
    let confirmMessage = '';
    let confirmButtonText = '确定清理';
    
    if (cleanupType.value === 'all_reports') {
        confirmMessage = '确定要清理所有战报吗？这将删除数据库中的全部战报数据，此操作不可恢复！';
        confirmButtonText = '确定清理所有战报';
    } else {
        confirmMessage = '确定要执行数据清理吗？这将删除超过7天的任务和战报，此操作不可恢复！';
    }
    
    try {
        await ElMessageBox.confirm(
            confirmMessage,
            '警告',
            {
                confirmButtonText: confirmButtonText,
                cancelButtonText: '取消',
                type: 'warning',
            }
        );
        
        cleanupLoading.value = true;
        const res = await ApiExecuteCleanup(cleanupType.value);
        if (res.data.code === 200) {
            ElMessage.success(res.data.msg || '清理任务已启动，请稍后查看日志');
        } else {
            ElMessage.error(res.data.msg || '清理失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('清理失败');
        }
    } finally {
        cleanupLoading.value = false;
    }
};

const handlePageChange = (page) => {
    pagination.value.page = page;
    loadUsers();
};

onMounted(() => {
    loadUsers();
});
</script>

<template>
    <div class="users-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">用户管理</h2>
                <span class="hint-badge">共 {{ total }} 个用户</span>
            </div>
            <div class="page-actions">
                <el-select v-model="cleanupType" size="default" style="width: 180px;">
                    <el-option label="自动清理(7天)" value="auto" />
                    <el-option label="清理所有战报" value="all_reports" />
                </el-select>
                <el-button type="danger" :loading="cleanupLoading" @click="handleCleanup" plain>
                    <el-icon><Delete /></el-icon>
                    执行数据清理
                </el-button>
                <el-button @click="loadUsers" :icon="Refresh">刷新</el-button>
            </div>
        </div>

        <div class="table-card">
            <el-table :data="users" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--bg-page)', color: 'var(--text-secondary)', fontWeight: 600 }">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="username" label="用户名" min-width="120">
                    <template #default="{ row }">
                        <div class="user-cell">
                            <div class="user-avatar">{{ row.username?.charAt(0)?.toUpperCase() }}</div>
                            <span>{{ row.username }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="nickname" label="昵称" min-width="100" />
                <el-table-column label="角色" width="130">
                    <template #default="{ row }">
                        <el-select 
                            :model-value="row.role" 
                            @change="(val) => handleRoleChange(row.id, val)"
                            size="small"
                            style="width: 110px;"
                        >
                            <el-option label="管理员" value="admin" />
                            <el-option label="普通用户" value="user" />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="90" align="center">
                    <template #default="{ row }">
                        <el-switch
                            :model-value="row.status === 1"
                            @change="(val) => handleStatusChange(row.id, val ? 1 : 0)"
                            inline-prompt
                            active-text="启"
                            inactive-text="停"
                        />
                    </template>
                </el-table-column>
                <el-table-column prop="last_login_at" label="最后登录" width="160">
                    <template #default="{ row }">
                        <span class="time-text">{{ row.last_login_at || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="created_at" label="注册时间" width="160">
                    <template #default="{ row }">
                        <span class="time-text">{{ row.created_at || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <el-button size="small" @click="openResetModal(row.id, row.username)" :icon="Key" plain>重置密码</el-button>
                        <el-button size="small" type="danger" @click="confirmDelete(row.id)" plain>删除</el-button>
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
        
        <el-dialog v-model="showResetModal" title="重置密码" width="420px" :close-on-click-modal="false">
            <div class="reset-modal-content">
                <p class="reset-hint">为用户 <strong>{{ resetUsername }}</strong> 设置新密码</p>
                <el-form label-position="top">
                    <el-form-item label="新密码">
                        <el-input
                            v-model="newPassword"
                            type="password"
                            placeholder="请输入新密码（至少6字符）"
                            show-password
                        />
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <el-button @click="showResetModal = false">取消</el-button>
                <el-button type="primary" :loading="resetLoading" @click="handleResetPassword">确认重置</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.users-page {
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
    flex-wrap: wrap;
}

.table-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    padding: 20px;
}

.user-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
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

.reset-modal-content {
    padding: 4px 0;
}

.reset-hint {
    margin-bottom: 16px;
    color: var(--text-secondary);
    font-size: 14px;
}

.reset-hint strong {
    color: var(--text-primary);
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
