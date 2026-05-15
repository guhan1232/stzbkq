<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Promotion, CopyDocument, Delete } from '@element-plus/icons-vue';
import axios from 'axios';
import qs from 'qs';

// API配置
const method = ref('GET');
const endpoint = ref('');
const requestBody = ref('');
const headers = ref([{ key: 'Content-Type', value: 'application/x-www-form-urlencoded' }]);
const response = ref(null);
const loading = ref(false);
const requestTime = ref(0);
const history = ref([]);

// 方法选项
const methodOptions = [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'DELETE', value: 'DELETE' }
];

// 预设API
const presetApis = [
    { label: '获取用户信息', method: 'GET', endpoint: '/v1/user/info' },
    { label: '获取数据库列表', method: 'GET', endpoint: '/v1/databases' },
    { label: '获取同盟成员', method: 'GET', endpoint: '/v1/getTeamUser' },
    { label: '获取任务列表', method: 'GET', endpoint: '/v1/getTaskList' },
    { label: '获取分组', method: 'GET', endpoint: '/v1/getTeamGroup' },
    { label: '获取分组武勋', method: 'GET', endpoint: '/v1/getGroupWu' },
    { label: '登录', method: 'POST', endpoint: '/v1/auth/login', body: 'username=&password=' },
    { label: '注册', method: 'POST', endpoint: '/v1/auth/register', body: 'username=&password=&nickname=' },
    { label: '修改密码', method: 'POST', endpoint: '/v1/user/changePassword', body: 'old_password=&new_password=' },
    { label: '创建数据库', method: 'POST', endpoint: '/v1/databases/create', body: 'name=&display_name=' },
    { label: '认领数据库', method: 'POST', endpoint: '/v1/databases/1/claim' },
    { label: '获取用户列表(管理员)', method: 'GET', endpoint: '/v1/admin/users' }
];

const currentPreset = ref(null);

// 选择预设API
const selectPreset = (preset) => {
    method.value = preset.method;
    endpoint.value = preset.endpoint;
    if (preset.body) {
        requestBody.value = preset.body;
    } else {
        requestBody.value = '';
    }
    currentPreset.value = preset.label;
};

// 发送请求
const sendRequest = async () => {
    if (!endpoint.value) {
        ElMessage.warning('请输入API端点');
        return;
    }

    loading.value = true;
    const startTime = Date.now();
    
    try {
        let config = {
            method: method.value.toLowerCase(),
            url: endpoint.value,
            withCredentials: true
        };

        // 添加请求头
        const headerObj = {};
        headers.value.forEach(h => {
            if (h.key && h.value) {
                headerObj[h.key] = h.value;
            }
        });
        config.headers = headerObj;

        // 添加请求体
        if (method.value !== 'GET' && requestBody.value) {
            if (headerObj['Content-Type'] === 'application/x-www-form-urlencoded') {
                config.data = qs.stringify(Object.fromEntries(new URLSearchParams(requestBody.value)));
            } else if (headerObj['Content-Type'] === 'application/json') {
                config.data = JSON.parse(requestBody.value);
            } else {
                config.data = requestBody.value;
            }
        }

        const res = await axios(config);
        
        response.value = {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            data: res.data
        };
        
        // 添加到历史
        history.value.unshift({
            method: method.value,
            endpoint: endpoint.value,
            time: new Date().toLocaleString(),
            status: res.status
        });
        if (history.value.length > 20) {
            history.value.pop();
        }
        
    } catch (error) {
        response.value = {
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Error',
            headers: error.response?.headers || {},
            data: error.response?.data || { error: error.message }
        };
    } finally {
        requestTime.value = Date.now() - startTime;
        loading.value = false;
    }
};

// 复制响应
const copyResponse = () => {
    if (response.value) {
        navigator.clipboard.writeText(JSON.stringify(response.value.data, null, 2));
        ElMessage.success('已复制到剪贴板');
    }
};

// 清空
const clearAll = () => {
    endpoint.value = '';
    requestBody.value = '';
    response.value = null;
    currentPreset.value = null;
};

// 格式化JSON
const formattedResponse = computed(() => {
    if (!response.value?.data) return '';
    try {
        return JSON.stringify(response.value.data, null, 2);
    } catch {
        return String(response.value.data);
    }
});

// 状态颜色
const statusType = computed(() => {
    if (!response.value) return 'info';
    const status = response.value.status;
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'danger';
    return 'info';
});

// 添加请求头
const addHeader = () => {
    headers.value.push({ key: '', value: '' });
};

// 删除请求头
const removeHeader = (index) => {
    headers.value.splice(index, 1);
};
</script>

<template>
    <div class="api-test-page">
        <el-container>
            <!-- 左侧：预设和历史 -->
            <el-aside width="280px" class="left-panel">
                <el-card class="panel-card">
                    <template #header>
                        <span>预设API</span>
                    </template>
                    <div class="preset-list">
                        <div 
                            v-for="preset in presetApis" 
                            :key="preset.label"
                            class="preset-item"
                            :class="{ 'active': currentPreset === preset.label }"
                            @click="selectPreset(preset)"
                        >
                            <el-tag :type="preset.method === 'GET' ? 'info' : 'success'" size="small">
                                {{ preset.method }}
                            </el-tag>
                            <span class="preset-label">{{ preset.label }}</span>
                        </div>
                    </div>
                </el-card>
                
                <el-card class="panel-card" v-if="history.length">
                    <template #header>
                        <span>请求历史</span>
                    </template>
                    <div class="history-list">
                        <div 
                            v-for="(item, index) in history" 
                            :key="index"
                            class="history-item"
                        >
                            <el-tag :type="item.method === 'GET' ? 'info' : 'success'" size="small">
                                {{ item.method }}
                            </el-tag>
                            <span class="history-endpoint">{{ item.endpoint }}</span>
                            <el-tag :type="item.status < 300 ? 'success' : 'danger'" size="small">
                                {{ item.status }}
                            </el-tag>
                        </div>
                    </div>
                </el-card>
            </el-aside>
            
            <!-- 右侧：请求和响应 -->
            <el-main class="right-panel">
                <!-- 请求配置 -->
                <el-card class="panel-card">
                    <template #header>
                        <span>请求配置</span>
                    </template>
                    <div class="request-config">
                        <!-- URL输入 -->
                        <div class="url-input">
                            <el-select v-model="method" style="width: 100px;">
                                <el-option v-for="item in methodOptions" :key="item.value" :label="item.label" :value="item.value" />
                            </el-select>
                            <el-input 
                                v-model="endpoint"
                                placeholder="输入API端点，如: /v1/user/info"
                                clearable
                                @keyup.enter="sendRequest"
                                style="flex: 1;"
                            />
                            <el-button type="primary" :loading="loading" @click="sendRequest">
                                <el-icon><Promotion /></el-icon>
                                发送
                            </el-button>
                        </div>
                        
                        <!-- 请求体 -->
                        <div v-if="method !== 'GET'" class="request-body">
                            <div class="section-label">请求体</div>
                            <el-input 
                                v-model="requestBody"
                                type="textarea"
                                placeholder="输入请求参数，如: username=admin&password=123456"
                                :rows="4"
                            />
                        </div>
                        
                        <!-- 操作按钮 -->
                        <div class="actions">
                            <el-button @click="clearAll">
                                <el-icon><Trash2 /></el-icon>
                                清空
                            </el-button>
                        </div>
                    </div>
                </el-card>
                
                <!-- 响应结果 -->
                <el-card class="panel-card" v-if="response">
                    <template #header>
                        <div class="response-header">
                            <span>响应结果</span>
                            <div class="response-info">
                                <el-tag :type="statusType">
                                    {{ response.status }} {{ response.statusText }}
                                </el-tag>
                                <el-tag type="info">
                                    {{ requestTime }}ms
                                </el-tag>
                                <el-button size="small" @click="copyResponse">
                                    <el-icon><CopyDocument /></el-icon>
                                    复制
                                </el-button>
                            </div>
                        </div>
                    </template>
                    
                    <el-collapse>
                        <el-collapse-item title="响应数据" name="body">
                            <pre class="response-body">{{ formattedResponse }}</pre>
                        </el-collapse-item>
                        <el-collapse-item title="响应头" name="headers">
                            <el-descriptions :column="1" border size="small">
                                <el-descriptions-item v-for="(value, key) in response.headers" :key="key" :label="key">
                                    {{ value }}
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-collapse-item>
                    </el-collapse>
                </el-card>
                
                <!-- 空状态 -->
                <el-card v-else class="panel-card empty-state">
                    <div class="empty-content">
                        <el-icon :size="48" color="#d9d9d9"><Monitor /></el-icon>
                        <p>选择预设API或输入端点后发送请求</p>
                    </div>
                </el-card>
            </el-main>
        </el-container>
    </div>
</template>

<style scoped>
.api-test-page {
    height: calc(100vh - 96px);
}

.left-panel {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 8px;
    background: #fafafa;
}

.right-panel {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 20px;
}

.panel-card {
    flex-shrink: 0;
}

.panel-card span {
    font-weight: 500;
}

.preset-list, .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.preset-item, .history-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #fff;
}

.preset-item:hover, .history-item:hover {
    background: #f0f0f0;
}

.preset-item.active {
    background: #fff7e6;
    border: 1px solid #ffd591;
}

.preset-label, .history-endpoint {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.request-config {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.url-input {
    display: flex;
    gap: 8px;
}

.section-label {
    font-size: 13px;
    font-weight: 500;
    color: #666;
    margin-bottom: 8px;
}

.actions {
    display: flex;
    gap: 8px;
}

.response-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.response-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.response-body {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-content {
    text-align: center;
    color: #999;
}

.empty-content p {
    margin-top: 16px;
    font-size: 14px;
}

@media (max-width: 768px) {
    .api-test-page :deep(.el-container) {
        flex-direction: column;
    }
    
    .left-panel {
        width: 100% !important;
        max-height: 300px;
    }
    
    .url-input {
        flex-wrap: wrap;
    }
    
    .url-input .el-select {
        width: 100% !important;
    }
}
</style>
