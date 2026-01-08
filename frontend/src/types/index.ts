import { LazyExoticComponent, ReactNode } from 'react'
import type { OrganizationRes } from 'template-backend/src/types/dto'

// ==================== 前端专用类型 ====================
// 后端共享类型请直接从 'template-backend/src/types/dto' 导入
// 后端常量请直接从 'template-backend/src/types/constants' 导入

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: React.ComponentType | LazyExoticComponent<React.ComponentType>
  menuParent?: string // 指定父级菜单路径，设置后自动隐藏在菜单中
  hideInBreadcrumb?: boolean
  children?: RouteItem[]
  adminOnly?: boolean // 仅admin可见
}

/**
 * 带有 key 属性的组织树节点类型（AntD Tree 组件专用）
 */
export type OrganizationTreeNode = Omit<OrganizationRes, 'children'> & {
  key: string
  children?: OrganizationTreeNode[]
}
