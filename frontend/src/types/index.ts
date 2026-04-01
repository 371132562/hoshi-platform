import type { ComponentType, LazyExoticComponent, ReactNode } from 'react'
import type { OrganizationResDto } from 'template-backend/src/types/dto'

// ==================== 前端专用类型 ====================
// 后端共享类型请直接从 'template-backend/src/types/dto' 导入
// 后端常量请直接从 'template-backend/src/common/config/constants' 导入

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string // 路由路径，既用于注册也用于菜单选中
  title: string // 路由展示标题，用于菜单和面包屑
  icon?: ReactNode // 菜单图标，仅导航类路由需要提供
  component?: ComponentType | LazyExoticComponent<ComponentType> // 路由承载组件；纯分组节点可省略
  children?: RouteItem[] // 菜单层级下的可见子路由
  detailRoutes?: RouteItem[] // 不进入菜单、但归属于当前路由的详情页家族
  adminOnly?: boolean // 仅admin可见
}

/**
 * 带有 key 属性的部门树节点类型（AntD Tree 组件专用）
 */
export type OrganizationTreeNode = Omit<OrganizationResDto, 'children'> & {
  key: string // AntD Tree 组件要求的节点唯一 key
  children?: OrganizationTreeNode[] // 子部门节点列表
}
