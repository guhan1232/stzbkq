<template>
  <div class="users-page">
    <div class="user-list">
      <div
        class="user-card"
        v-for="user in users"
        :key="user.id"
      >
        <div class="user-info">
          <div class="avatar">{{ user.username?.charAt(0)?.toUpperCase() }}</div>
          <div class="detail">
            <div class="username">{{ user.username }}</div>
            <div class="meta">
              <el-tag :type="user.role === 'admin' ? 'danger' : 'primary'" size="small" effect="plain">
                {{ user.role === 'admin' ? '管理员' : '成员' }}
              </el-tag>
              <el-tag :type="user.status === 1 ? 'success' : 'info'" size="small" effect="plain">
                {{ user.status === 1 ? '正常' : '禁用' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <el-empty v-if="users.length === 0" description="暂无用户" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers } from '@/api/user'

const users = ref([])

const loadData = async () => {
  try {
    const res = await getUsers()
    if (res.code === 200) {
      users.value = res.data || []
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
.users-page {
  padding: 16px;
  padding-bottom: 80px;
}

.user-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 46px;
  height: 46px;
  background: linear-gradient(135deg, #4f6ef7 0%, #3a54c4 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.username {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.meta {
  display: flex;
  gap: 6px;
}
</style>
