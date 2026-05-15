<template>
  <div class="teamuser-page">
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索成员名称"
        :prefix-icon="Search"
        clearable
      />
      <el-select v-model="selectedGroup" placeholder="分组" clearable style="width: 110px; margin-left: 8px;">
        <el-option
          v-for="g in groups"
          :key="g"
          :label="g"
          :value="g"
        />
      </el-select>
    </div>

    <div class="member-list">
      <el-scrollbar height="calc(100vh - 200px)">
        <div
          class="member-card"
          v-for="member in filteredMembers"
          :key="member.id"
        >
          <div class="member-info">
            <div class="member-name">{{ member.name }}</div>
            <el-tag size="small" type="warning" effect="plain">{{ member.group }}</el-tag>
          </div>
          <div class="member-stats">
            <div class="stat">
              <span class="label">势力</span>
              <span class="value">{{ member.power }}</span>
            </div>
            <div class="stat">
              <span class="label">武勋</span>
              <span class="value highlight">{{ member.wu }}</span>
            </div>
          </div>
        </div>

        <el-empty v-if="filteredMembers.length === 0" description="暂无数据" />
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getTeamUsers, getTeamGroups } from '@/api/team'

const members = ref([])
const groups = ref([])
const searchText = ref('')
const selectedGroup = ref('')

const filteredMembers = computed(() => {
  return members.value.filter(m => {
    const matchName = !searchText.value || m.name.includes(searchText.value)
    const matchGroup = !selectedGroup.value || m.group === selectedGroup.value
    return matchName && matchGroup
  })
})

const loadData = async () => {
  try {
    const [usersRes, groupsRes] = await Promise.all([
      getTeamUsers(),
      getTeamGroups()
    ])
    if (usersRes.code === 200) {
      members.value = usersRes.data || []
    }
    if (groupsRes.code === 200) {
      groups.value = groupsRes.data || []
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
.teamuser-page {
  padding: 16px;
  padding-bottom: 80px;
}

.search-bar {
  display: flex;
  margin-bottom: 14px;
}

.member-list {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.member-card {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
}

.member-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.member-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.member-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;

  .label {
    font-size: 12px;
    color: #94a3b8;
  }

  .value {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;

    &.highlight {
      color: #4f6ef7;
    }
  }
}
</style>
