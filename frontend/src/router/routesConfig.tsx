import { FileTextOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons'
import React, { lazy } from 'react'

import { RouteItem } from '@/types'

// 使用React.lazy实现懒加载（默认导出）
const ArticleManagement = lazy(() => import('@/pages/ArticleManagement'))
const ModifyArticle = lazy(() => import('@/pages/ArticleManagement/Modify'))
const OrderConfig = lazy(() => import('@/pages/ArticleManagement/OrderConfig'))
const Home = lazy(() => import('@/pages/Home'))
const RoleManagement = lazy(() => import('@/pages/System/RoleManagement/RoleManagement'))
const SystemMaintenance = lazy(() => import('@/pages/System/SystemMaintenance'))
const UserManagement = lazy(() => import('@/pages/System/UserManagement/UserManagement'))
const SystemLogs = lazy(() => import('@/pages/System/SystemLogs'))

// 统一的路由配置数组，通过 menuPosition 区分顶部与侧边栏
export const routes: RouteItem[] = [
  { path: '/home', title: '首页', icon: <HomeOutlined />, component: Home, menuPosition: 'top' },
  {
    path: '/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    menuPosition: 'side',
    children: [
      { path: '/article/list', title: '文章列表', component: ArticleManagement },
      { path: '/article/create', title: '新增文章', component: ModifyArticle },
      { path: '/article/order', title: '配置文章顺序', component: OrderConfig },
      {
        path: '/article/modify/:id',
        title: '编辑文章',
        component: ModifyArticle,
        hideInMenu: true,
        hideInBreadcrumb: false
      }
    ]
  },
  // 系统管理菜单（仅admin可见）
  {
    path: '/system',
    title: '系统管理',
    icon: <SettingOutlined />,
    adminOnly: true,
    menuPosition: 'side',
    children: [
      { path: '/system/userManagement', title: '用户管理', component: UserManagement },
      { path: '/system/roleManagement', title: '角色管理', component: RoleManagement },
      { path: '/system/logs', title: '系统日志', component: SystemLogs },
      { path: '/system/maintenance', title: '系统维护', component: SystemMaintenance }
    ]
  }
]

// 获取所有路由项（扁平化）
export const getAllRoutes = (): RouteItem[] => {
  const flattenRoutes = (routes: RouteItem[]): RouteItem[] => {
    return routes.reduce((acc: RouteItem[], route) => {
      acc.push(route)
      if (route.children) {
        acc.push(...flattenRoutes(route.children))
      }
      return acc
    }, [])
  }

  return flattenRoutes(routes)
}

// 根据用户角色过滤路由
export const getTopMenuRoutes = (): RouteItem[] => routes.filter(r => r.menuPosition === 'top')

export const getSideMenuRoutes = (userRole?: {
  name: string
  allowedRoutes: string[]
}): RouteItem[] => {
  // 超管：全部侧边菜单
  if (userRole?.name === 'admin') {
    return routes.filter(r => r.menuPosition === 'side')
  }

  const allowedRoutes = userRole?.allowedRoutes || []

  const filterRoute = (route: RouteItem): RouteItem | null => {
    const isAllowed = allowedRoutes.includes(route.path)
    if (route.children) {
      const filteredChildren = route.children
        .map(child => filterRoute(child))
        .filter(Boolean) as RouteItem[]
      if (filteredChildren.length > 0) {
        return { ...route, children: filteredChildren }
      }
    } else if (isAllowed) {
      return route
    }
    return null
  }

  return routes
    .filter(r => r.menuPosition === 'side')
    .map(route => filterRoute(route))
    .filter(Boolean) as RouteItem[]
}

// 导出分组菜单数据，供角色管理编辑使用
export const getMenuOptionsForRoleEdit = () => {
  const options: Array<{ label: string; options: Array<{ label: string; value: string }> }> = []

  // 只从 routes 中 menuPosition === 'side' 生成选项，顶部菜单不做权限限制
  routes
    .filter(r => r.menuPosition === 'side')
    .forEach(route => {
      if (route.adminOnly) return // 跳过系统管理等adminOnly菜单
      const routeOptions: Array<{ label: string; value: string }> = []
      if (route.children) {
        route.children.forEach(child => {
          if (!child.hideInMenu) {
            routeOptions.push({ label: child.title, value: child.path })
          }
        })
      } else {
        routeOptions.push({ label: route.title, value: route.path })
      }
      if (routeOptions.length > 0) {
        options.push({ label: route.title, options: routeOptions })
      }
    })

  return options
}

// 根据路径获取面包屑项
export const getBreadcrumbItems = (
  pathname: string
): { path: string; title: string; component: React.ComponentType | undefined }[] => {
  const allRoutes = getAllRoutes()
  const result: { path: string; title: string; component: React.ComponentType | undefined }[] = []

  // 构建路径映射表，支持动态路由
  const pathMap = new Map<string, RouteItem>()
  allRoutes.forEach(route => {
    // 将动态路由参数替换为通配符
    const routePath = route.path.replace(/\/:[^/]+/g, '/*')
    pathMap.set(routePath, route)
    // 同时保存原始路径
    pathMap.set(route.path, route)
  })

  // 构建面包屑
  const pathSegments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  pathSegments.forEach(segment => {
    currentPath += '/' + segment

    // 处理动态路由参数，将数字ID替换为通配符
    const pathToCheck = currentPath.replace(/\/\d+/g, '/*')

    // 尝试找到匹配的路由配置
    let matchingRoute = pathMap.get(pathToCheck) || pathMap.get(currentPath)

    // 如果直接匹配失败，尝试正则匹配动态路由
    if (!matchingRoute) {
      matchingRoute = allRoutes.find(route => {
        // 将路由路径转换为正则表达式
        const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
        const regex = new RegExp(`^${routePathPattern}$`)
        return regex.test(currentPath)
      })
    }

    // 如果找到匹配的路由且不在面包屑中隐藏
    if (matchingRoute && matchingRoute.hideInBreadcrumb !== true) {
      result.push({
        path: currentPath,
        title: matchingRoute.title,
        component: matchingRoute.component
      })
    }
  })

  return result
}
