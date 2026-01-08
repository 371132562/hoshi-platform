import { FileTextOutlined, SettingOutlined } from '@ant-design/icons'
import { lazy } from 'react'

import { RouteItem } from '@/types'

// 后台页面懒加载
const ArticleManagement = lazy(() => import('@/pages/ArticleManagement'))
const ModifyArticle = lazy(() => import('@/pages/ArticleManagement/Modify'))
const OrderConfig = lazy(() => import('@/pages/ArticleManagement/OrderConfig'))
const RoleManagement = lazy(() => import('@/pages/System/RoleManagement'))
const SystemMaintenance = lazy(() => import('@/pages/System/SystemMaintenance'))
const UserManagement = lazy(() => import('@/pages/System/UserManagement'))
const OrganizationManagement = lazy(() => import('@/pages/System/OrganizationManagement'))

/**
 * 后台管理路由配置
 * - 需要登录才能访问
 * - 使用侧边导航布局
 * - 路径统一带 /admin 前缀
 */
export const adminRoutes: RouteItem[] = [
  {
    path: '/admin/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    children: [
      { path: '/admin/article/list', title: '文章列表', component: ArticleManagement },
      {
        path: '/admin/article/create',
        title: '新增文章',
        component: ModifyArticle,
        menuParent: '/admin/article/list'
      },
      { path: '/admin/article/order', title: '配置文章顺序', component: OrderConfig },
      {
        path: '/admin/article/modify/:id',
        title: '编辑文章',
        component: ModifyArticle,
        menuParent: '/admin/article/list',
        hideInBreadcrumb: false
      }
    ]
  },
  // 系统管理菜单（仅admin可见）
  {
    path: '/admin/system',
    title: '系统管理',
    icon: <SettingOutlined />,
    adminOnly: true,
    children: [
      { path: '/admin/system/organization', title: '部门管理', component: OrganizationManagement },
      { path: '/admin/system/roleManagement', title: '角色管理', component: RoleManagement },
      { path: '/admin/system/userManagement', title: '用户管理', component: UserManagement },
      { path: '/admin/system/maintenance', title: '系统维护', component: SystemMaintenance }
    ]
  }
]
