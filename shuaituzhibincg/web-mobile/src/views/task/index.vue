<template>
  <div class="task-page">
    <div class="task-list">
      <div
        class="task-card"
        v-for="task in tasks"
        :key="task.id"
      >
        <div class="task-header">
          <div class="task-name">{{ task.taskname }}</div>
          <el-tag :type="task.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
            {{ task.status === 'active' ? '进行中' : '已结束' }}
          </el-tag>
        </div>
        <div class="task-info">
          <div class="info-item">
            <el-icon><Location /></el-icon>
            <span>{{ task.taskpos }}</span>
          </div>
          <div class="info-item">
            <el-icon><User /></el-icon>
            <span>{{ task.targetgroup }}</span>
          </div>
          <div class="info-item">
            <el-icon><Clock /></el-icon>
            <span>{{ task.tasktime }}</span>
          </div>
        </div>
      </div>

      <el-empty v-if="tasks.length === 0" description="暂无任务" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Location, User, Clock } from '@element-plus/icons-vue'
import { getTasks } from '@/api/task'

const tasks = ref([])

const loadData = async () => {
  try {
    const res = await getTasks()
    if (res.code === 200) {
      tasks.value = res.data || []
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
.task-page {
  padding: 16px;
  padding-bottom: 80px;
}

.task-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
}
</style>
