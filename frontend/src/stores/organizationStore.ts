import type {
  CreateOrganizationReqDto,
  OrganizationRes,
  UpdateOrganizationReqDto
} from 'template-backend/src/types/dto'
import { create } from 'zustand'

import {
  organizationCreateApi,
  organizationDeleteApi,
  organizationListApi,
  organizationUpdateApi
} from '../services/apis'
import request from '../services/base'
import type { OrganizationTreeNode } from '../types'

const transformToTreeNode = (data: OrganizationRes[]): OrganizationTreeNode[] => {
  return data.map(item => ({
    ...item,
    key: item.id,
    children: item.children ? transformToTreeNode(item.children) : undefined
  }))
}

export const useOrganizationStore = create<{
  organizationList: OrganizationTreeNode[]
  loading: boolean
  fetchOrganizationList: () => Promise<void>
  createOrganization: (data: CreateOrganizationReqDto) => Promise<boolean>
  updateOrganization: (data: UpdateOrganizationReqDto) => Promise<boolean>
  deleteOrganization: (id: string) => Promise<boolean>
}>((set, get) => ({
  organizationList: [],
  loading: false,

  // 获取部门树
  fetchOrganizationList: async () => {
    set({ loading: true })
    try {
      const res = await request.post<OrganizationRes[]>(organizationListApi)
      const data = Array.isArray(res.data) ? res.data : []
      set({
        organizationList: transformToTreeNode(data),
        loading: false
      })
    } finally {
      set({ loading: false })
    }
  },

  // 创建部门
  createOrganization: async (data: CreateOrganizationReqDto) => {
    set({ loading: true })
    try {
      await request.post(organizationCreateApi, data)
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('部门创建失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 更新部门
  updateOrganization: async (data: UpdateOrganizationReqDto) => {
    set({ loading: true })
    try {
      await request.post(organizationUpdateApi, data)
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('部门更新失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  },

  // 删除部门
  deleteOrganization: async (id: string) => {
    set({ loading: true })
    try {
      await request.post(organizationDeleteApi, { id })
      await get().fetchOrganizationList()
      return true
    } catch (error) {
      console.error('部门删除失败:', error)
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
