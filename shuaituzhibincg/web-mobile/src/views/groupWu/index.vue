<template>
  <div class="groupWu-page">
    <div class="group-list">
      <div
        class="group-card"
        v-for="item in groupList"
        :key="item.group"
      >
        <div class="group-header">
          <div class="group-name">{{ item.group }}</div>
          <div class="member-count">{{ item.member_count }}人</div>
        </div>
        <div class="group-stats">
          <div class="stat-item">
            <div class="stat-value">{{ item.total_wu }}</div>
            <div class="stat-label">总武勋</div>
          </div>
          <div class="stat-item">
            <div class="stat-value avg">{{ item.average_wu }}</div>
            <div class="stat-label">人均武勋</div>
          </div>
          <div class="stat-item">
            <div class="stat-value danger">{{ item.zero_wu_count }}</div>
            <div class="stat-label">零武勋</div>
          </div>
        </div>
      </div>

      <el-empty v-if="groupList.length === 0" description="暂无数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getGroupWu } from '@/api/groupWu'

const groupList = ref([])

const loadData = async () => {
  try {
    const res = await getGroupWu()
    if (res.code === 200) {
      groupList.value = res.data || []
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
.groupWu-page {
  padding: 16px;
  padding-bottom: 80px;
}

.group-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.group-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.member-count {
  color: #94a3b8;
  font-size: 14px;
}

.group-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #4f6ef7;

  &.avg {
    color: #8b5cf6;
  }

  &.danger {
    color: #f87171;
  }
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
