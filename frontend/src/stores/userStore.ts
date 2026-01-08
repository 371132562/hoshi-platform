import type {
  CreateUserEncryptedReq,
  DeleteUserReq,
  ResetUserPasswordEncryptedReq,
  UpdateUserReq,
  UserItemRes,
  UserListResDto
} from 'template-backend/src/types/dto'
import { create } from 'zustand'

import {
  challengeApiUrl,
  userCreateApi,
  userDeleteApi,
  userListApi,
  userResetPasswordApi,
  userUpdateApi
} from '../services/apis'
import request from '../services/base'
import { decryptSalt, encryptData } from '../utils/crypto'

// 临时类型定义，用于前端表单
type CreateUserFormData = {
  username: string
  name: string
  organizationId?: string
  phone?: string
  password: string
  roleId: string
}

type ResetPasswordFormData = {
  id: string
  newPassword: string
}

// 用户列表查询参数类型
type UserPageParams = {
  page?: number
  pageSize?: number
} & {
  name?: string
  roleId?: string
}

// Store 状态类型
type UserStoreState = {
  userList: UserItemRes[]
  userTotal: number
  userPageParams: UserPageParams
  loading: boolean
  fetchUserList: (params?: Partial<UserPageParams>) => Promise<void>
  updateUserPageParams: (params: Partial<UserPageParams>) => void
  handleUserPageChange: (page: number, pageSize?: number) => void
  handleUserSearch: () => void
  resetUserSearch: () => void
  createUser: (data: CreateUserFormData) => Promise<boolean>
  updateUser: (data: UpdateUserReq) => Promise<boolean>
  deleteUser: (data: DeleteUserReq) => Promise<boolean>
  resetUserPassword: (data: ResetPasswordFormData) => Promise<boolean>
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  userList: [],
  userTotal: 0,
  userPageParams: { page: 1, pageSize: 10 },
  loading: false,

  // 获取用户列表（支持分页和筛选）
  fetchUserList: async (params?: Partial<UserPageParams>) => {
    const merged = { ...get().userPageParams, ...params }
    set({ loading: true, userPageParams: merged })
    try {
      const res = await request.post<UserListResDto>(userListApi, merged)
      set({
        userList: res.data.list,
        userTotal: res.data.total,
        userPageParams: { ...merged, page: res.data.page, pageSize: res.data.pageSize },
        loading: false
      })
    } catch {
      set({ loading: false })
    }
  },

  // 更新分页/筛选参数并刷新列表
  updateUserPageParams: (params: Partial<UserPageParams>) => {
    const merged = { ...get().userPageParams, ...params }
    get().fetchUserList(merged)
  },

  // 处理分页变化
  handleUserPageChange: (page: number, pageSize?: number) => {
    const update: Partial<UserPageParams> = { page }
    if (pageSize !== undefined) update.pageSize = pageSize
    get().updateUserPageParams(update)
  },

  // 处理搜索（重置到第一页）
  handleUserSearch: () => {
    get().updateUserPageParams({ page: 1 })
  },

  // 重置搜索条件
  resetUserSearch: () => {
    get().updateUserPageParams({ page: 1, name: undefined, roleId: undefined })
  },

  // 创建用户
  createUser: async data => {
    set({ loading: true })
    try {
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      const salt = decryptSalt(encryptedSalt)
      const encryptedPassword = await encryptData(salt, data.password)

      const encryptedData: CreateUserEncryptedReq = {
        ...data,
        encryptedPassword
      }

      await request.post(userCreateApi, encryptedData)
      await get().fetchUserList()
      return true
    } catch (error) {
      console.error('用户创建失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 编辑用户
  updateUser: async data => {
    set({ loading: true })
    try {
      await request.post(userUpdateApi, data)
      await get().fetchUserList()
      return true
    } catch (error) {
      console.error('用户更新失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 删除用户
  deleteUser: async data => {
    set({ loading: true })
    try {
      await request.post(userDeleteApi, data)
      // 智能处理分页：删除后检查当前页是否为空
      const { userTotal, userPageParams } = get()
      const newTotal = userTotal - 1
      const totalPages = Math.ceil(newTotal / (userPageParams.pageSize || 10))
      if ((userPageParams.page || 1) > totalPages && totalPages > 0) {
        await get().fetchUserList({ page: totalPages })
      } else {
        await get().fetchUserList()
      }
      return true
    } catch (error) {
      console.error('用户删除失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 重置用户密码
  resetUserPassword: async data => {
    set({ loading: true })
    try {
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      const salt = decryptSalt(encryptedSalt)
      const encryptedNewPassword = await encryptData(salt, data.newPassword)

      const encryptedData: ResetUserPasswordEncryptedReq = {
        id: data.id,
        encryptedNewPassword
      }

      await request.post(userResetPasswordApi, encryptedData)
      await get().fetchUserList()
      return true
    } catch (error) {
      console.error('密码重置失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
