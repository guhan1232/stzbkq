<template>
    <div class="ip-whitelist-page">
        <div class="page-header">
            <div class="page-title-area">
                <h2 class="page-title">IP 白名单管理</h2>
                <span :class="['status-badge', enabled ? 'status-on' : 'status-off']">
                    {{ enabled ? '已启用' : '已禁用' }}
                </span>
            </div>
        </div>

        <div class="config-card">
            <el-form label-position="top" class="whitelist-form">
                <el-form-item label="启用白名单">
                    <el-switch
                        v-model="enabled"
                        active-text="启用"
                        inactive-text="禁用"
                        @change="handleToggleEnabled"
                    />
                    <div class="form-tip">
                        启用后，只有白名单中的 IP 地址可以登录系统
                    </div>
                </el-form-item>

                <el-form-item label="白名单 IP">
                    <el-input
                        v-model="whitelistText"
                        type="textarea"
                        :rows="10"
                        placeholder="请输入 IP 地址，每行一个或使用逗号分隔&#10;IPv4: 192.168.1.100&#10;IPv6: 2001:db8::1&#10;IPv4 CIDR: 192.168.1.0/24&#10;IPv6 CIDR: 2001::/16, 2001:db8::/32"
                    />
                    <div class="form-tips">
                        <div class="tip-item">支持 IPv4 和 IPv6 地址</div>
                        <div class="tip-item">支持 IPv4 CIDR（如 192.168.1.0/24）</div>
                        <div class="tip-item">支持 IPv6 CIDR（如 2001::/16、2001:db8::/32）</div>
                        <div class="tip-item">多个 IP 用逗号或换行分隔</div>
                    </div>
                </el-form-item>

                <el-form-item>
                    <div class="form-actions">
                        <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
                        <el-button @click="loadConfig">重新加载</el-button>
                        <el-button @click="addCurrentIP">添加当前 IP</el-button>
                    </div>
                </el-form-item>
            </el-form>

            <div class="divider"></div>

            <div class="current-ip-section">
                <div class="section-label">您当前的 IP 地址</div>
                <div class="ip-display">
                    <span class="ip-value">{{ currentIP || '未知' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const enabled = ref(false);
const whitelistText = ref('');
const currentIP = ref('');
const saving = ref(false);

const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
};

const loadConfig = async () => {
    try {
        const res = await axios.get(`${getApiBaseUrl()}/ip-whitelist`, {
            withCredentials: true
        });
        
        if (res.data.code === 200) {
            enabled.value = res.data.data.enabled;
            const ips = res.data.data.whitelist || [];
            whitelistText.value = ips.join(',\n');
            
            try {
                const ipRes = await axios.get('https://api.ipify.org?format=json');
                currentIP.value = ipRes.data.ip;
            } catch (e) {
                currentIP.value = '无法获取（可能使用了代理）';
            }
        }
    } catch (error) {
        ElMessage.error('加载配置失败: ' + (error.response?.data?.msg || error.message));
    }
};

const handleToggleEnabled = async () => {
    try {
        await saveConfig();
        ElMessage.success(enabled.value ? '已启用 IP 白名单' : '已禁用 IP 白名单');
    } catch (error) {
        ElMessage.error('操作失败');
        enabled.value = !enabled.value;
    }
};

const handleSave = async () => {
    ElMessageBox.confirm(
        '保存后将立即生效，确定要保存吗？',
        '确认保存',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        await saveConfig();
        ElMessage.success('保存成功');
    }).catch(() => {});
};

const saveConfig = async () => {
    saving.value = true;
    try {
        const ips = whitelistText.value
            .split(/[,\n]/)
            .map(ip => ip.trim())
            .filter(ip => ip !== '');

        const formData = new FormData();
        formData.append('enabled', enabled.value ? '1' : '0');
        formData.append('whitelist', ips.join(','));

        await axios.post(`${getApiBaseUrl()}/ip-whitelist/save`, formData, {
            withCredentials: true
        });
    } catch (error) {
        throw error;
    } finally {
        saving.value = false;
    }
};

const addCurrentIP = () => {
    if (!currentIP.value || currentIP.value.includes('无法获取')) {
        ElMessage.warning('无法获取当前 IP 地址');
        return;
    }

    const ips = whitelistText.value
        .split(/[,\n]/)
        .map(ip => ip.trim())
        .filter(ip => ip !== '');

    if (ips.includes(currentIP.value)) {
        ElMessage.info('当前 IP 已在白名单中');
        return;
    }

    ips.push(currentIP.value);
    whitelistText.value = ips.join(',\n');
    ElMessage.success('已添加当前 IP 到输入框，请点击保存');
};

onMounted(() => {
    loadConfig();
});
</script>

<style scoped>
.ip-whitelist-page {
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

.whitelist-form :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--text-secondary);
}

.form-tip {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-tertiary);
}

.form-tips {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
}

.tip-item {
    font-size: 12px;
    color: var(--text-tertiary);
}

.tip-item::before {
    content: '·';
    margin-right: 4px;
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

.current-ip-section {
    padding: 0;
}

.section-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.ip-display {
    background: var(--bg-page);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    border: 1px solid var(--border-color);
}

.ip-value {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}
</style>
