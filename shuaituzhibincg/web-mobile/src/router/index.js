import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', noAuth: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: { title: '首页', showTab: true }
      },
      {
        path: 'teamuser',
        name: 'TeamUser',
        component: () => import('@/views/teamuser/index.vue'),
        meta: { title: '同盟成员', showTab: true }
      },
      {
        path: 'task',
        name: 'Task',
        component: () => import('@/views/task/index.vue'),
        meta: { title: '攻城任务', showTab: true }
      },
      {
        path: 'groupWu',
        name: 'GroupWu',
        component: () => import('@/views/groupWu/index.vue'),
        meta: { title: '分组武勋', showTab: false }
      },
      {
        path: 'database',
        name: 'Database',
        component: () => import('@/views/database/index.vue'),
        meta: { title: '数据库', showTab: false }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', showTab: false, admin: true }
      },
      {
        path: 'password',
        name: 'Password',
        component: () => import('@/views/password/index.vue'),
        meta: { title: '修改密码', showTab: false }
      },
      {
        path: 'apiTest',
        name: 'ApiTest',
        component: () => import('@/views/apiTest/index.vue'),
        meta: { title: 'API调试', showTab: false }
      },
      {
        path: 'battlefield',
        name: 'Battlefield',
        component: () => import('@/views/battlefield/index.vue'),
        meta: { title: '战场监控', showTab: false }
      },
      {
        path: 'battlefieldStats',
        name: 'BattlefieldStats',
        component: () => import('@/views/battlefieldStats/index.vue'),
        meta: { title: '战场统计', showTab: false }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', showTab: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/m/'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 率土助手` : '率土之滨助手'
  
  const userStore = useUserStore()
  
  if (!to.meta.noAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.admin && !userStore.isAdmin) {
    next('/home')
  } else {
    next()
  }
})

export default router
