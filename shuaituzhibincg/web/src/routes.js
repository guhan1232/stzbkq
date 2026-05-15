import { createRouter, createWebHashHistory } from 'vue-router';
import { useUserStore } from './stores/user';

// 页面组件
import Login from './pages/Login.vue';
import MainLayout from './layouts/MainLayout.vue';
import Index from './pages/Index.vue';
import TeamUser from './pages/TeamUser.vue';
import Task from './pages/Task.vue';
import GroupWu from './pages/GroupWu.vue';
import Database from './pages/Database.vue';
import Users from './pages/Users.vue';
import Password from './pages/Password.vue';
import ApiTest from './pages/ApiTest.vue';
import MemberHistory from './pages/MemberHistory.vue';
import LandRecords from './pages/LandRecords.vue';
import Leaderboard from './pages/Leaderboard.vue';
import PacketCapture from './pages/PacketCapture.vue';
import IPWhitelist from './pages/IPWhitelist.vue';
import HostCheck from './pages/HostCheck.vue';
import AiKeyManager from './pages/AiKeyManager.vue';

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        component: MainLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'Home',
                component: Index
            },
            {
                path: 'teamuser',
                name: 'TeamUser',
                component: TeamUser
            },
            {
                path: 'memberhistory',
                name: 'MemberHistory',
                component: MemberHistory
            },
            {
                path: 'landrecords',
                name: 'LandRecords',
                component: LandRecords
            },
            {
                path: 'task',
                name: 'Task',
                component: Task
            },
            {
                path: 'groupWu',
                name: 'GroupWu',
                component: GroupWu
            },
            {
                path: 'database',
                name: 'Database',
                component: Database
            },
            {
                path: 'api',
                name: 'ApiTest',
                component: ApiTest
            },
            {
                path: 'users',
                name: 'Users',
                component: Users,
                meta: { requiresAdmin: true }
            },
            {
                path: 'leaderboard',
                name: 'Leaderboard',
                component: Leaderboard
            },
            {
                path: 'packet-capture',
                name: 'PacketCapture',
                component: PacketCapture
            },
            {
                path: 'ip-whitelist',
                name: 'IPWhitelist',
                component: IPWhitelist,
                meta: { requiresAdmin: true }
            },
            {
                path: 'host-check',
                name: 'HostCheck',
                component: HostCheck,
                meta: { requiresAdmin: true }
            },            {
                path: 'ai-key-manager',
                name: 'AiKeyManager',
                component: AiKeyManager,
                meta: { requiresAdmin: true }
            },
            {
                path: 'password',
                name: 'Password',
                component: Password
            }
        ]
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
    const userStore = useUserStore();
    
    if (to.meta.requiresAuth !== false && !userStore.isLoggedIn()) {
        // 需要登录但未登录
        next('/login');
    } else if (to.meta.requiresAdmin && !userStore.isAdmin()) {
        // 需要管理员权限但不是管理员
        next('/');
    } else if (to.path === '/login' && userStore.isLoggedIn()) {
        // 已登录访问登录页
        next('/');
    } else {
        next();
    }
});

export default router;
