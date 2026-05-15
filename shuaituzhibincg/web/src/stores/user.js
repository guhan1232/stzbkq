import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiGetUserInfo } from '../api';

export const useUserStore = defineStore('user', () => {
    const sessionId = ref('');
    const userInfo = ref(null);

    const setSessionId = (id) => {
        sessionId.value = id;
    };

    const setUserInfo = (info) => {
        userInfo.value = info;
    };

    const logout = () => {
        sessionId.value = '';
        userInfo.value = null;
    };

    const fetchUserInfo = async () => {
        try {
            const res = await ApiGetUserInfo();
            if (res.data.code === 200) {
                setUserInfo(res.data.data);
                return res.data.data;
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
        return null;
    };

    const isAdmin = () => {
        return userInfo.value?.role === 'admin';
    };

    const isLoggedIn = () => {
        return !!userInfo.value;
    };

    return {
        sessionId,
        userInfo,
        setSessionId,
        setUserInfo,
        logout,
        fetchUserInfo,
        isAdmin,
        isLoggedIn
    };
}, {
    persist: true
});
