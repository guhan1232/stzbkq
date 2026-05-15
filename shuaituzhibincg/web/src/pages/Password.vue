<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock, ArrowLeft } from '@element-plus/icons-vue';
import { ApiChangePassword } from '../api';

const router = useRouter();

const loading = ref(false);

const form = ref({
    old_password: '',
    new_password: '',
    confirm_password: ''
});

const handleSubmit = async () => {
    if (!form.value.old_password) {
        ElMessage.error('请输入旧密码');
        return;
    }
    if (!form.value.new_password) {
        ElMessage.error('请输入新密码');
        return;
    }
    if (form.value.new_password.length < 6) {
        ElMessage.error('新密码长度至少6个字符');
        return;
    }
    if (form.value.new_password !== form.value.confirm_password) {
        ElMessage.error('两次输入的新密码不一致');
        return;
    }

    loading.value = true;
    try {
        const res = await ApiChangePassword({
            old_password: form.value.old_password,
            new_password: form.value.new_password
        });
        if (res.data.code === 200) {
            ElMessage.success('密码修改成功');
            form.value = {
                old_password: '',
                new_password: '',
                confirm_password: ''
            };
        } else {
            ElMessage.error(res.data.msg);
        }
    } catch (error) {
        ElMessage.error('修改失败：' + (error.message || '网络错误'));
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="password-page">
        <div class="password-card">
            <div class="card-header">
                <div class="header-icon">
                    <el-icon :size="24"><Lock /></el-icon>
                </div>
                <h2 class="card-title">修改密码</h2>
                <p class="card-desc">请输入当前密码并设置新密码</p>
            </div>

            <el-form label-position="top" class="password-form">
                <el-form-item label="旧密码" required>
                    <el-input
                        v-model="form.old_password"
                        type="password"
                        placeholder="请输入当前密码"
                        show-password
                        prefix-icon="Lock"
                    />
                </el-form-item>
                <el-form-item label="新密码" required>
                    <el-input
                        v-model="form.new_password"
                        type="password"
                        placeholder="请输入新密码（至少6字符）"
                        show-password
                        prefix-icon="Lock"
                    />
                </el-form-item>
                <el-form-item label="确认密码" required>
                    <el-input
                        v-model="form.confirm_password"
                        type="password"
                        placeholder="请再次输入新密码"
                        show-password
                        prefix-icon="Lock"
                        @keyup.enter="handleSubmit"
                    />
                </el-form-item>
                <el-form-item>
                    <div class="form-actions">
                        <el-button @click="router.back()" :icon="ArrowLeft">返回</el-button>
                        <el-button type="primary" :loading="loading" @click="handleSubmit">确认修改</el-button>
                    </div>
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<style scoped>
.password-page {
    max-width: 480px;
    margin: 40px auto 0;
}

.password-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    padding: 32px;
}

.card-header {
    text-align: center;
    margin-bottom: 28px;
}

.header-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

.card-title {
    margin: 0 0 6px;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.card-desc {
    margin: 0;
    font-size: 13px;
    color: var(--text-tertiary);
}

.password-form :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--text-secondary);
}

.form-actions {
    display: flex;
    gap: 12px;
    width: 100%;
    padding-top: 8px;
}

.form-actions .el-button {
    flex: 1;
}
</style>
