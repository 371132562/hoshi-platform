import { ErrorCode } from 'template-backend/types/response'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { challengeApiUrl, loginApiUrl, profileApiUrl } from '../services/apis'
import http from '../services/base'
import type { Login, LoginResponse, UserProfileDto } from '../types'
import { decryptSalt, encryptData } from '../utils/crypto'

// 认证store的类型定义
export type AuthStore = {
  token: string | null // JWT token
  user: UserProfileDto | null // 当前用户信息
  loading: boolean // 加载状态
  error: string | null // 错误信息
  login: (data: Login) => Promise<boolean>
  logout: () => boolean
  fetchProfile: () => Promise<void>
}

// 认证store实现
export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      // 登录方法
      async login(data) {
        set({ loading: true, error: null })
        try {
          // 两步登录：先获取加密的随机盐，解密后使用crypto-js加密(盐+密码)，然后提交加密数据
          const challenge = await http.post<string>(challengeApiUrl)
          const encryptedSalt = challenge.data
          // 解密后端返回的加密盐值
          const salt = decryptSalt(encryptedSalt)
          const encryptedData = encryptData(salt, data.password)
          const res = await http.post<LoginResponse>(loginApiUrl, {
            code: data.code,
            encryptedData
          })
          set({ token: res.data.token, user: res.data.user, loading: false, error: null })
          return true
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : '登录失败'
          set({ loading: false, error: errorMsg })
          return false
        }
      },
      // 登出方法
      logout() {
        set({ token: null, user: null, error: null })
        localStorage.removeItem('auth-storage')
        return true
      },
      // 获取用户信息
      async fetchProfile() {
        set({ loading: true })
        try {
          const user = await http.post<UserProfileDto>(profileApiUrl)
          set({ user: user.data, loading: false, error: null })
        } catch (err: unknown) {
          // 根据后端错误码处理
          const errorCode = (err as { response?: { data?: { code?: string } } })?.response?.data
            ?.code
          const errorMsg =
            (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
            (err as { msg?: string })?.msg ||
            '获取用户信息失败'

          // 用户不存在、token过期或认证失败，清除本地存储
          if (
            Number(errorCode) === ErrorCode.USER_NOT_FOUND ||
            Number(errorCode) === ErrorCode.TOKEN_EXPIRED ||
            Number(errorCode) === ErrorCode.UNAUTHORIZED
          ) {
            set({
              loading: false,
              error: errorMsg,
              token: null,
              user: null
            })
            localStorage.removeItem('auth-storage')
            return
          }

          // 其他错误
          set({
            loading: false,
            error: errorMsg
          })
        }
      }
    }),
    {
      name: 'auth-storage', // 本地存储key
      partialize: state => ({
        token: state.token,
        user: state.user
      })
    }
  )
)

// =========================
// 本地存储同步机制（解决用户手动清空 localStorage 后 UI 不刷新的问题）
// 思路：
// 1) 监听跨标签页的 storage 事件：当 auth-storage 被删除/变更时，同步内存状态
// 2) 监听页面 focus 与可见性变化：同页手动清空 localStorage 不会触发 storage 事件，通过这些时机主动对齐
// 3) 当本地无 token 且内存仍有 token 时，重置为未登录；当本地 token 与内存不一致时，以本地为准并触发后续逻辑
// =========================

// 安全解析本地持久化的 auth-storage
const readPersistedAuth = (): { token: string | null; user: UserProfileDto | null } => {
  try {
    const raw = localStorage.getItem('auth-storage') || '{}'
    const parsed = JSON.parse(raw) as { state?: { token?: string; user?: UserProfileDto } }
    const token = (parsed.state?.token as string | undefined) || null
    const user = (parsed.state?.user as UserProfileDto | undefined) || null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

// 将内存状态与本地持久化状态进行对齐
const syncAuthFromLocalStorage = (): void => {
  const { token: lsToken, user: lsUser } = readPersistedAuth()
  const mem = useAuthStore.getState()

  // 本地无 token，但内存仍有，说明用户清除了存储；需清空内存以刷新 UI
  if (!lsToken && mem.token) {
    useAuthStore.setState({ token: null, user: null })
    return
  }

  // 本地存在 token 且与内存不一致时，以本地为准进行对齐
  if (lsToken && lsToken !== mem.token) {
    // 先对齐 token，随后主动刷新用户信息，确保权限与菜单准确
    useAuthStore.setState({ token: lsToken, user: lsUser })
    // 立即触发一次用户信息拉取进行校验
    setTimeout(() => {
      // 使用当前 store 中的 fetchProfile，避免闭包过期
      const currentFetch = useAuthStore.getState().fetchProfile
      currentFetch().catch(() => {})
    }, 0)
    return
  }
}

// 仅在浏览器环境下注册监听（避免 SSR 报错）
if (typeof window !== 'undefined') {
  // 跨标签页同步
  window.addEventListener('storage', e => {
    // 仅关注 auth-storage 的变化
    if (e.key === 'auth-storage') {
      // e.newValue 可能为 null（被删除），统一走同步逻辑
      syncAuthFromLocalStorage()
    }
  })

  // 页面重新获得焦点时尝试同步（覆盖同页清空 localStorage 的场景）
  window.addEventListener('focus', () => {
    syncAuthFromLocalStorage()
  })

  // 可见性变化（从后台切回前台）时尝试同步
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncAuthFromLocalStorage()
    }
  })
}
