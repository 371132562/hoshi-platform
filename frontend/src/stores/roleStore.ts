import type {
  AssignRolePermissionKeysReqDto,
  CreateRoleReqDto,
  DeleteRoleReqDto,
  RoleListItemResDto,
  RoleListResDto,
  UpdateRoleReqDto
} from 'template-backend/src/types/dto'
import { create } from 'zustand'

import {
  roleAssignPermissionKeysApi,
  roleCreateApi,
  roleDeleteApi,
  roleListApi,
  roleUpdateApi
} from '../services/apis'
import request from '../services/base'

export const useRoleStore = create<{
  roleList: RoleListItemResDto[]
  loading: boolean
  fetchRoleList: () => Promise<void>
  createRole: (data: CreateRoleReqDto) => Promise<boolean>
  updateRole: (data: UpdateRoleReqDto) => Promise<boolean>
  deleteRole: (data: DeleteRoleReqDto) => Promise<boolean>
  assignRolePermissionKeys: (data: AssignRolePermissionKeysReqDto) => Promise<boolean>
}>((set, get) => ({
  roleList: [],
  loading: false,

  /** 拉取后台角色列表，并同步每个角色当前的权限 key 与用户数。 */
  fetchRoleList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<RoleListResDto>(roleListApi)
      set({ roleList: res.data, loading: false })
    } finally {
      set({ loading: false })
    }
  },

  /** 创建新角色，并在成功后刷新列表。 */
  createRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleCreateApi, data)
      await get().fetchRoleList()
      return true
    } catch (error) {
      console.error('角色创建失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  /** 更新角色基础信息，并在成功后刷新列表。 */
  updateRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleUpdateApi, data)
      await get().fetchRoleList()
      return true
    } catch (error) {
      console.error('角色更新失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  /** 删除角色，并在成功后刷新列表。 */
  deleteRole: async data => {
    set({ loading: true })
    try {
      await request.post(roleDeleteApi, data)
      await get().fetchRoleList()
      return true
    } catch (error) {
      console.error('角色删除失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  /** 覆盖角色的稳定权限 key 集合，并在成功后刷新列表。 */
  assignRolePermissionKeys: async data => {
    set({ loading: true })
    try {
      await request.post(roleAssignPermissionKeysApi, data)
      await get().fetchRoleList()
      return true
    } catch (error) {
      console.error('权限分配失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
