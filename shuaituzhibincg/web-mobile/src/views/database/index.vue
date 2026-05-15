<template>
  <div class="database-page">
    <div class="db-list">
      <div
        class="db-card"
        v-for="db in databases"
        :key="db.id"
      >
        <div class="db-info">
          <div class="db-icon">
            <el-icon :size="24" color="#4f6ef7"><Coin /></el-icon>
          </div>
          <div class="db-detail">
            <div class="db-name">{{ db.display_name || db.name }}</div>
            <div class="db-status">
              <el-tag :type="db.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
                {{ db.status === 'active' ? '活跃' : '停用' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <el-empty v-if="databases.length === 0" description="暂无数据库" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Coin } from '@element-plus/icons-vue'
import { getDatabases } from '@/api/database'

const databases = ref([])

const loadData = async () => {
  try {
    const res = await getDatabases()
    if (res.code === 200) {
      databases.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.database-page {
  padding: 16px;
  padding-bottom: 80px;
}

.db-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.db-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.db-icon {
  width: 44px;
  height: 44px;
  background: #eef1fe;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.db-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}
</style>
