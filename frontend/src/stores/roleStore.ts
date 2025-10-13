import { create } from 'zustand'

import {
  roleAssignRoutesApi,
  roleCreateApi,
  roleDeleteApi,
  roleListApi,
  roleUpdateApi
} from '../services/apis'
import request from '../services/base'
import type {
  AssignRoleRoutes,
  CreateRole,
  DeleteRole,
  RoleListItemDto,
  RoleListResDto,
  UpdateRole
} from '../types'

// 角色管理store
export const useRoleStore = create<{
  roleList: RoleListItemDto[]
  loading: boolean
  fetchRoleList: () => Promise<void>
  createRole: (data: CreateRole) => Promise<boolean>
  updateRole: (data: UpdateRole) => Promise<boolean>
  deleteRole: (data: DeleteRole) => Promise<boolean>
  assignRoleRoutes: (data: AssignRoleRoutes) => Promise<boolean>
}>((set, get) => ({
  roleList: [],
  loading: false,
  // 获取角色列表
  fetchRoleList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<RoleListResDto>(roleListApi)
      set({ roleList: res.data, loading: false })
    } finally {
      set({ loading: false })
    }
  },
  // 创建角色
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
  // 编辑角色
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
  // 删除角色
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
  // 分配角色菜单权限
  assignRoleRoutes: async data => {
    set({ loading: true })
    try {
      await request.post(roleAssignRoutesApi, data)
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
