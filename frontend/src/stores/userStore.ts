import type {
  CreateUserEncryptedReqDto,
  DeleteUserReqDto,
  ResetUserPasswordEncryptedReqDto,
  UpdateUserReqDto,
  UserItemResDto,
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
  username: string // 新建用户的登录账号
  displayName: string // 新建用户的展示姓名
  organizationId?: string // 所属部门ID
  phone?: string // 联系电话
  password: string // 表单中输入的明文密码
  roleIds: string[] // 初始绑定的角色ID列表
}

type ResetPasswordFormData = {
  id: string // 待重置密码的用户ID
  newPassword: string // 表单中输入的新密码明文
}

// 用户列表查询参数类型（分页 + 搜索统一对象）
type UserPageParams = {
  page?: number // 页码，从 1 开始
  pageSize?: number // 每页数量
  displayName?: string // 按姓名模糊搜索
  roleId?: string // 按角色筛选
}

// Store 状态类型
type UserStoreState = {
  userList: UserItemResDto[] // 当前页用户列表
  userTotal: number // 用户总数
  userPageParams: UserPageParams // 当前分页与筛选条件
  loading: boolean // 用户管理相关请求是否进行中
  fetchUserList: (params?: Partial<UserPageParams>) => Promise<void>
  updateUserPageParams: (params: Partial<UserPageParams>) => void
  resetUserSearch: () => void
  createUser: (data: CreateUserFormData) => Promise<boolean>
  updateUser: (data: UpdateUserReqDto) => Promise<boolean>
  deleteUser: (data: DeleteUserReqDto) => Promise<boolean>
  resetUserPassword: (data: ResetPasswordFormData) => Promise<boolean>
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  userList: [],
  userTotal: 0,
  userPageParams: { page: 1, pageSize: 10 },
  loading: false,

  /** 获取用户列表，并统一维护分页与筛选状态。 */
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

  /** 更新分页/筛选参数，并复用统一列表拉取逻辑。 */
  updateUserPageParams: (params: Partial<UserPageParams>) => {
    const merged = { ...get().userPageParams, ...params }
    get().fetchUserList(merged)
  },

  /** 重置用户搜索条件并回到第一页。 */
  resetUserSearch: () => {
    get().updateUserPageParams({ page: 1, displayName: undefined, roleId: undefined })
  },

  /** 创建用户，并通过 challenge 流程加密密码后提交。 */
  createUser: async data => {
    set({ loading: true })
    try {
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      const salt = decryptSalt(encryptedSalt)
      const encryptedPassword = await encryptData(salt, data.password)

      const encryptedData: CreateUserEncryptedReqDto = {
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

  /** 更新用户基础信息与角色绑定。 */
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

  /** 删除用户，并在必要时自动回退到上一页。 */
  deleteUser: async data => {
    set({ loading: true })
    try {
      await request.post(userDeleteApi, data)
      // 删除成功后检查当前页是否还有数据；若删空则自动回退一页。
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

  /** 重置用户密码，并沿用登录相同的 challenge 加密链路。 */
  resetUserPassword: async data => {
    set({ loading: true })
    try {
      const challenge = await request.post<string>(challengeApiUrl)
      const encryptedSalt = challenge.data
      const salt = decryptSalt(encryptedSalt)
      const encryptedNewPassword = await encryptData(salt, data.newPassword)

      const encryptedData: ResetUserPasswordEncryptedReqDto = {
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
