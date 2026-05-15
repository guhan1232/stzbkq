<template>
    <div class="host-check-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">主机名访问控制</h2>
                <span :class="['status-badge', enabled ? 'status-on' : 'status-off']">
                    {{ enabled ? '已启用' : '已禁用' }}
                </span>
            </div>
        </div>

        <div class="config-card">
            <div class="info-banner">
                <span class="info-icon">i</span>
                <div class="info-content">
                    <p>启用后，系统将禁止通过 IP 地址直接访问，只允许通过域名访问。</p>
                    <p class="info-sub">优点：提高安全性，防止恶意扫描和攻击</p>
                    <p class="info-sub">注意：启用前请确保已通过域名配置好访问方式</p>
                </div>
            </div>

            <el-form label-position="top" class="host-form">
                <el-form-item label="启用主机名检查">
                    <el-switch
                        v-model="enabled"
                        active-text="启用（禁止IP访问）"
                        inactive-text="禁用（允许IP访问）"
                        @change="handleToggle"
                    />
                    <div class="form-tip">
                        当前状态：{{ enabled ? '禁止通过 IP 地址访问' : '允许通过 IP 地址访问' }}
                    </div>
                </el-form-item>

                <el-form-item>
                    <div class="form-actions">
                        <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
                        <el-button @click="loadConfig">重新加载</el-button>
                    </div>
                </el-form-item>
            </el-form>

            <div class="divider"></div>

            <div class="test-section">
                <div class="section-title">访问测试</div>
                <div class="test-grid">
                    <div class="test-item">
                        <div class="test-label">通过域名访问</div>
                        <div class="test-row">
                            <span class="test-status allow">允许</span>
                            <span class="test-example">http://your-domain.com:9527</span>
                        </div>
                    </div>
                    <div class="test-item">
                        <div class="test-label">通过 IP 访问</div>
                        <div class="test-row">
                            <span :class="['test-status', enabled ? 'deny' : 'allow']">
                                {{ enabled ? '禁止' : '允许' }}
                            </span>
                            <span class="test-example">http://192.168.1.100:9527</span>
                        </div>
                    </div>
                    <div class="test-item">
                        <div class="test-label">localhost 访问</div>
                        <div class="test-row">
                            <span class="test-status allow">允许</span>
                            <span class="test-example">http://localhost:9527</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="warnings-section">
                <div class="section-title">重要提示</div>
                <div class="warning-card">
                    <div class="warning-label">启用前请确认</div>
                    <ul class="warning-list">
                        <li>确保已通过域名可以正常访问系统</li>
                        <li>确认 DNS 解析已正确配置</li>
                        <li>小程序 API 地址应使用域名而非 IP</li>
                        <li>建议先在测试环境验证后再在生产环境启用</li>
                    </ul>
                </div>
                <div class="warning-card danger">
                    <div class="warning-label">如果启用后无法访问</div>
                    <ol class="warning-list">
                        <li>联系管理员修改配置文件 <code>.env</code></li>
                        <li>设置 <code>ENABLE_HOST_CHECK=false</code></li>
                        <li>重启服务：<code>systemctl restart stzbhelper</code></li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ApiGetHostCheckConfig, ApiSaveHostCheckConfig } from '../api';

const enabled = ref(false);
const saving = ref(false);

const loadConfig = async () => {
    try {
        const res = await ApiGetHostCheckConfig();
        
        if (res.code === 200) {
            enabled.value = res.data.enabled;
        }
    } catch (error) {
        ElMessage.error('加载配置失败: ' + (error.response?.data?.msg || error.message));
    }
};

const handleToggle = async () => {
};

const handleSave = async () => {
    if (enabled.value) {
        try {
            await ElMessageBox.confirm(
                '启用后将禁止通过 IP 地址访问，请确保：\n\n1. 已通过域名配置好访问\n2. DNS 解析正常\n3. 小程序使用域名访问\n\n确定要启用吗？',
                '启用确认',
                {
                    confirmButtonText: '确定启用',
                    cancelButtonText: '取消',
                    type: 'warning',
                    distinguishCancelAndClose: true
                }
            );
        } catch (error) {
            enabled.value = !enabled.value;
            return;
        }
    }

    saving.value = true;
    try {
        await ApiSaveHostCheckConfig(enabled.value);
        
        ElMessage.success({
            message: '配置已保存！请按照提示修改 .env 文件并重启服务。',
            duration: 5000,
            showClose: true
        });
        
        ElMessageBox.alert(
            '请按以下步骤完成配置：\n\n' +
            '1. 编辑服务器上的 .env 文件\n' +
            '2. 设置 ENABLE_HOST_CHECK=' + (enabled.value ? 'true' : 'false') + '\n' +
            '3. 重启服务：systemctl restart stzbhelper\n\n' +
            '注意：配置修改后需要重启服务才能生效。',
            '配置保存成功',
            {
                confirmButtonText: '我知道了',
                type: 'success'
            }
        );
    } catch (error) {
        ElMessage.error('保存失败: ' + (error.response?.data?.msg || error.message));
        enabled.value = !enabled.value;
    } finally {
        saving.value = false;
    }
};

onMounted(() => {
    loadConfig();
});
</script>

<style scoped>
.host-check-page {
    max-width: 720px;
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

.status-badge {
    font-size: 12px;
    font-weight: 500;
    padding: 3px 12px;
    border-radius: 20px;
}

.status-on {
    background: var(--color-success-light);
    color: #059669;
}

.status-off {
    background: var(--color-info-light);
    color: var(--text-tertiary);
}

.config-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    padding: 24px;
}

.info-banner {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    background: var(--color-info-light);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
}

.info-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
}

.info-content p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
}

.info-sub {
    font-size: 12px !important;
    color: var(--text-tertiary) !important;
}

.host-form :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--text-secondary);
}

.form-tip {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-tertiary);
}

.form-actions {
    display: flex;
    gap: 8px;
}

.divider {
    height: 1px;
    background: var(--border-light);
    margin: 24px 0;
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 14px;
}

.test-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.test-item {
    background: var(--bg-page);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    border: 1px solid var(--border-light);
}

.test-label {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 6px;
}

.test-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.test-status {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.test-status.allow {
    background: var(--color-success-light);
    color: #059669;
}

.test-status.deny {
    background: var(--color-danger-light);
    color: #dc2626;
}

.test-example {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
}

.warnings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.warning-card {
    padding: 14px 16px;
    background: var(--color-warning-light);
    border: 1px solid #fde68a;
    border-radius: var(--radius-md);
}

.warning-card.danger {
    background: var(--color-danger-light);
    border-color: #fecaca;
}

.warning-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.warning-list {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.8;
}

.warning-list code {
    background: var(--bg-page);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 12px;
}
</style>
