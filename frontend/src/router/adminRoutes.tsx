import { FileTextOutlined, SettingOutlined } from '@ant-design/icons'
import { lazy } from 'react'

import { RouteItem } from '@/types'

// 后台页面懒加载
const ArticleManagement = lazy(() => import('@/pages/ArticleManagement'))
const ModifyArticle = lazy(() => import('@/pages/ArticleManagement/Modify'))
const RoleManagement = lazy(() => import('@/pages/System/RoleManagement'))
const SystemMaintenance = lazy(() => import('@/pages/System/SystemMaintenance'))
const UserManagement = lazy(() => import('@/pages/System/UserManagement'))
const OrganizationManagement = lazy(() => import('@/pages/System/OrganizationManagement'))

/**
 * 后台管理路由配置
 * - 需要登录才能访问
 * - 使用侧边导航布局
 * - 路径统一带 /admin 前缀
 * - permissionKey 仅声明在菜单叶子节点：
 *   上游与后端返回的 user.permissionKeys 对齐；
 *   下游由 routeRuntime 用于菜单可见性过滤、当前路径判权与角色权限选项生成。
 */
export const adminRoutes: RouteItem[] = [
  {
    path: '/admin/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    children: [
      {
        path: '/admin/article/list',
        title: '文章列表',
        permissionKey: 'article:list',
        component: ArticleManagement,
        detailRoutes: [
          {
            path: '/admin/article/create',
            title: '新增文章',
            component: ModifyArticle
          },
          {
            path: '/admin/article/modify/:id',
            title: '编辑文章',
            component: ModifyArticle
          }
        ]
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
      {
        path: '/admin/system/organization',
        title: '部门管理',
        permissionKey: 'system:organization',
        component: OrganizationManagement
      },
      {
        path: '/admin/system/roleManagement',
        title: '角色管理',
        permissionKey: 'system:role',
        component: RoleManagement
      },
      {
        path: '/admin/system/userManagement',
        title: '用户管理',
        permissionKey: 'system:user',
        component: UserManagement
      },
      {
        path: '/admin/system/maintenance',
        title: '系统维护',
        permissionKey: 'system:maintenance',
        component: SystemMaintenance
      }
    ]
  }
]
