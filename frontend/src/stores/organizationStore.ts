import { create } from 'zustand'

import {
  organizationCreateApi,
  organizationDeleteApi,
  organizationListApi,
  organizationUpdateApi
} from '../services/apis'
import request from '../services/base'
import type { CreateOrganizationDto, Organization, UpdateOrganizationDto } from '../types'

export interface OrganizationTreeNode extends Organization {
  children?: OrganizationTreeNode[]
}

export const useOrganizationStore = create<{
  organizationList: OrganizationTreeNode[]
  loading: boolean
  fetchOrganizationList: () => Promise<void>
  createOrganization: (data: CreateOrganizationDto) => Promise<boolean>
  updateOrganization: (data: UpdateOrganizationDto) => Promise<boolean>
  deleteOrganization: (id: string) => Promise<boolean>
}>((set, get) => ({
  organizationList: [],
  loading: false,

  // 获取组织树
  fetchOrganizationList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<OrganizationTreeNode[]>(organizationListApi)
      set({
        organizationList: Array.isArray(res.data) ? res.data : [],
        loading: false
      })
    } finally {
      set({ loading: false })
    }
  },

  // 创建组织
  createOrganization: async (data: CreateOrganizationDto) => {
    set({ loading: true })
    try {
      await request.post(organizationCreateApi, data)
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('组织创建失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 更新组织
  updateOrganization: async (data: UpdateOrganizationDto) => {
    set({ loading: true })
    try {
      await request.post(organizationUpdateApi, data)
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('组织更新失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 删除组织
  deleteOrganization: async (id: string) => {
    set({ loading: true })
    try {
      await request.post(organizationDeleteApi, { id })
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('组织删除失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
