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
import type {
  CreateUserEncrypted,
  DeleteUser,
  ResetUserPasswordEncrypted,
  UpdateUser,
  UserItem,
  UserListResDto
} from '../types'
import { decryptSalt, encryptData } from '../utils/crypto'

// 临时类型定义，用于前端表单
type CreateUserFormData = {
  code: string
  name: string
  department: string
  email?: string
  phone?: string
  password: string
  roleId?: string
}

type ResetPasswordFormData = {
  id: string
  newPassword: string
}

export const useUserStore = create<{
  userList: UserItem[]
  loading: boolean
  fetchUserList: () => Promise<void>
  createUser: (data: CreateUserFormData) => Promise<boolean>
  updateUser: (data: UpdateUser) => Promise<boolean>
  deleteUser: (data: DeleteUser) => Promise<boolean>
  resetUserPassword: (data: ResetPasswordFormData) => Promise<boolean>
}>((set, get) => ({
  userList: [],
  loading: false,
  // 获取用户列表
  fetchUserList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<UserListResDto>(userListApi)
      set({ userList: res.data, loading: false })
    } finally {
      set({ loading: false })
    }
  },
  // 创建用户
  createUser: async data => {
    set({ loading: true })
    try {
      // 两步加密：先获取加密的随机盐，解密后使用crypto-js加密(盐+密码)，然后提交加密数据
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      // 解密后端返回的加密盐值
      const salt = decryptSalt(encryptedSalt)
      const encryptedPassword = await encryptData(salt, data.password)

      const encryptedData: CreateUserEncrypted = {
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
      await get().fetchUserList()
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
      // 两步加密：先获取加密的随机盐，解密后使用crypto-js加密(盐+新密码)，然后提交加密数据
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      // 解密后端返回的加密盐值
      const salt = decryptSalt(encryptedSalt)
      const encryptedNewPassword = await encryptData(salt, data.newPassword)

      const encryptedData: ResetUserPasswordEncrypted = {
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
