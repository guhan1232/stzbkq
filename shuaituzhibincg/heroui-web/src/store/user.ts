import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  userInfo: any;
  setUserInfo: (info: any) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userInfo: null,
      setUserInfo: (info) => set({ userInfo: info }),
      logout: () => set({ userInfo: null }),
    }),
    {
      name: 'user-storage',
    }
  )
)
