import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 主题配色的Store类型定义
export type ThemeStore = {
  // 主色，采用HEX字符串，默认使用Ant Design默认蓝色
  primaryColor: string
  // 界面底色（深色系），用于Header/Sider/Menu等
  surfaceColor: string
  // 设置主色
  setPrimaryColor: (color: string) => void
  // 设置界面底色
  setSurfaceColor: (color: string) => void
}

// 主题配色Store实现，持久化到localStorage
export const useThemeStore = create<ThemeStore>()(
  persist(
    set => ({
      primaryColor: '#1677ff',
      surfaceColor: '#001529',
      setPrimaryColor: (color: string) => set({ primaryColor: color }),
      setSurfaceColor: (color: string) => set({ surfaceColor: color })
    }),
    {
      name: 'theme-storage',
      partialize: state => ({ primaryColor: state.primaryColor, surfaceColor: state.surfaceColor })
    }
  )
)
