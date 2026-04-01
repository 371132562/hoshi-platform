import type { LoginReqDto, LoginResDto, UserProfileResDto } from 'template-backend/src/types/dto'
import { ErrorCode } from 'template-backend/src/types/response'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { challengeApiUrl, loginApiUrl, profileApiUrl } from '../services/apis'
import http from '../services/base'
import { decryptSalt, encryptData } from '../utils/crypto'

export type AuthStore = {
  token: string | null // 当前登录态对应的 JWT token
  user: UserProfileResDto | null // 当前登录用户信息
  loading: boolean // 认证相关请求是否进行中
  error: string | null // 最近一次认证失败的错误文案
  login: (data: LoginReqDto) => Promise<boolean>
  logout: () => boolean
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      /**
       * 完成挑战码登录流程，并在成功后同步 token 与用户信息。
       */
      async login(data) {
        set({ loading: true, error: null })
        try {
          // 1. 先向后端请求一次性 challenge，用于生成本次登录加密参数。
          const challenge = await http.post<string>(challengeApiUrl)
          const encryptedSalt = challenge.data

          // 2. 解密 challenge 后再对用户输入的密码进行加密，避免明文直传。
          const salt = decryptSalt(encryptedSalt)
          const encryptedData = encryptData(salt, data.password)

          // 3. 登录成功后一次性写入 token 与用户上下文，供持久化中间件接管。
          const res = await http.post<LoginResDto>(loginApiUrl, {
            username: data.username,
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
      /** 清空认证状态，并删除本地持久化的登录信息。 */
      logout() {
        set({ token: null, user: null, error: null })
        localStorage.removeItem('auth-storage')
        return true
      },
      /**
       * 使用现有 token 刷新当前用户信息，并在认证失效时自动清理本地状态。
       * 上游：后端 profile 接口返回当前用户及其权限信息（如 hasAdminRole、permissionKeys）。
       * 下游：Layout 会把 user 交给 routeRuntime，统一计算左侧菜单可见性与当前页面访问权限。
       */
      async fetchProfile() {
        set({ loading: true })
        try {
          const res = await http.post<UserProfileResDto>(profileApiUrl)
          set({ user: res.data, loading: false, error: null })
        } catch (err: unknown) {
          // 1. 统一从后端响应中提取错误码与错误文案。
          const errorCode = (err as { response?: { data?: { code?: string } } })?.response?.data
            ?.code
          const errorMsg =
            (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
            (err as { msg?: string })?.msg ||
            '获取用户信息失败'

          // 2. 认证已失效时，直接清空内存与本地持久化，避免 UI 继续显示过期身份。
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

          // 3. 非认证类错误仅回写错误文案，不主动登出当前用户。
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

/** 安全解析本地持久化的 auth-storage，避免 JSON 异常影响页面启动。 */
const readPersistedAuth = (): { token: string | null; user: UserProfileResDto | null } => {
  try {
    const raw = localStorage.getItem('auth-storage') || '{}'
    const parsed = JSON.parse(raw) as { state?: { token?: string; user?: UserProfileResDto } }
    const token = (parsed.state?.token as string | undefined) || null
    const user = (parsed.state?.user as UserProfileResDto | undefined) || null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

/**
 * 将内存中的认证状态与 localStorage 持久化状态对齐。
 */
const syncAuthFromLocalStorage = (): void => {
  const { token: lsToken, user: lsUser } = readPersistedAuth()
  const mem = useAuthStore.getState()

  // 1. 本地无 token，但内存仍有，说明用户手动清空了存储；此时应立即清空内存。
  if (!lsToken && mem.token) {
    useAuthStore.setState({ token: null, user: null })
    return
  }

  // 2. 本地 token 与内存不一致时，以本地为准，并补一次 profile 校验。
  if (lsToken && lsToken !== mem.token) {
    useAuthStore.setState({ token: lsToken, user: lsUser })
    setTimeout(() => {
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
