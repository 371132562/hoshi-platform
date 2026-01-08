import React from 'react'
import { SYSTEM_ADMIN_ROLE_NAME } from 'template-backend/src/types/constants'

import { RouteItem } from '@/types'

import { adminRoutes } from './adminRoutes'
import { publicRoutes } from './publicRoutes'

// 合并所有路由（用于辅助函数内部使用）
const allRoutesConfig = [...publicRoutes, ...adminRoutes]

/**
 * 获取所有路由项（扁平化）
 *
 * 将嵌套的路由配置树展开为一维数组，方便后续遍历查找。
 * 主要用于：
 * - 面包屑生成时查找匹配的路由配置
 * - 根据当前 URL 查找对应的路由信息
 * - 权限判断时遍历所有可用路由
 *
 * @returns 扁平化后的路由数组
 *
 * @example
 * 输入（嵌套结构）:
 * /admin/article
 *   └── /admin/article/list
 *   └── /admin/article/create
 *
 * 输出（扁平数组）:
 * [/admin/article, /admin/article/list, /admin/article/create]
 */
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

  return flattenRoutes(allRoutesConfig)
}

/**
 * 获取前台顶部菜单路由
 *
 * 返回前台公开页面的路由配置，用于渲染顶部导航菜单。
 * 前台路由无需登录即可访问。
 *
 * @returns 前台路由配置数组
 */
export const getPublicMenuRoutes = (): RouteItem[] => publicRoutes

/**
 * 获取后台侧边菜单路由（根据用户角色过滤）
 *
 * 根据当前用户的角色权限，过滤并返回该用户可访问的后台菜单。
 * - 超级管理员（admin）：返回全部后台菜单
 * - 普通用户：根据 allowedRoutes 过滤，只返回有权限的菜单项
 * - 未登录/无角色：返回空数组
 *
 * @param userRole - 用户角色信息
 * @param userRole.name - 角色名称
 * @param userRole.allowedRoutes - 该角色允许访问的路由路径数组
 * @returns 过滤后的后台菜单路由
 */
export const getAdminMenuRoutes = (userRole?: {
  name: string
  allowedRoutes: string[]
}): RouteItem[] => {
  // 超管：全部后台菜单
  if (userRole?.name === SYSTEM_ADMIN_ROLE_NAME) {
    return adminRoutes
  }

  const allowedRoutes = userRole?.allowedRoutes || []

  // 递归过滤路由：保留用户有权限访问的路由及其父级
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

  return adminRoutes
    .filter(r => !r.adminOnly) // 非超管不显示 adminOnly 菜单（如系统管理）
    .map(route => filterRoute(route))
    .filter(Boolean) as RouteItem[]
}

/**
 * 获取角色编辑页面的菜单选项数据
 *
 * 生成 Ant Design Select 组件所需的分组选项格式，
 * 用于角色管理页面编辑角色可访问的路由权限。
 *
 * 规则：
 * - 只生成后台路由的选项（前台路由无需权限控制）
 * - 跳过 adminOnly 菜单（系统管理等仅超管可见）
 * - 跳过设置了 menuParent 的子页面（如新增/编辑页）
 *
 * @returns 分组选项数组，格式为 [{ label: '文章管理', options: [...] }]
 */
export const getMenuOptionsForRoleEdit = () => {
  const options: Array<{ label: string; options: Array<{ label: string; value: string }> }> = []

  adminRoutes.forEach(route => {
    if (route.adminOnly) return // 跳过系统管理等 adminOnly 菜单
    const routeOptions: Array<{ label: string; value: string }> = []
    if (route.children) {
      route.children.forEach(child => {
        // 只添加主菜单项，跳过设置了 menuParent 的子页面
        if (!child.menuParent) {
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

/**
 * 根据当前路径生成面包屑导航项
 *
 * 解析当前 URL 路径，逐级匹配路由配置，生成面包屑数组。
 * 支持：
 * - 静态路由匹配（如 /admin/article/list）
 * - 动态路由参数匹配（如 /admin/article/modify/:id）
 * - menuParent 父级插入（如编辑页自动插入列表页作为父级面包屑）
 *
 * @param pathname - 当前页面路径（如 /admin/article/modify/123）
 * @returns 面包屑项数组，每项包含 path、title、component
 *
 * @example
 * 输入: /admin/article/modify/123
 * 输出: [
 *   { path: '/admin/article/list', title: '文章列表', component: ... },
 *   { path: '/admin/article/modify/123', title: '编辑文章', component: ... }
 * ]
 */
export const getBreadcrumbItems = (
  pathname: string
): {
  path: string
  title: string
  component: React.ComponentType | React.LazyExoticComponent<React.ComponentType> | undefined
}[] => {
  const allRoutes = getAllRoutes()
  const result: {
    path: string
    title: string
    component: React.ComponentType | React.LazyExoticComponent<React.ComponentType> | undefined
  }[] = []

  // 构建路径映射表，支持动态路由
  const pathMap = new Map<string, RouteItem>()
  allRoutes.forEach(route => {
    // 将动态路由参数替换为通配符（如 /article/:id → /article/*）
    const routePath = route.path.replace(/\/:[^/]+/g, '/*')
    pathMap.set(routePath, route)
    // 同时保存原始路径用于精确匹配
    pathMap.set(route.path, route)
  })

  // 逐级构建面包屑
  const pathSegments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  pathSegments.forEach(segment => {
    currentPath += '/' + segment

    // 处理动态路由参数，将数字 ID 替换为通配符以便匹配
    const pathToCheck = currentPath.replace(/\/\d+/g, '/*')

    // 尝试找到匹配的路由配置
    let matchingRoute = pathMap.get(pathToCheck) || pathMap.get(currentPath)

    // 如果直接匹配失败，尝试正则匹配动态路由
    if (!matchingRoute) {
      matchingRoute = allRoutes.find(route => {
        // 将路由路径转换为正则表达式（如 /article/:id → /article/[^/]+）
        const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
        const regex = new RegExp(`^${routePathPattern}$`)
        return regex.test(currentPath)
      })
    }

    // 如果找到匹配的路由且不在面包屑中隐藏
    if (matchingRoute && matchingRoute.hideInBreadcrumb !== true) {
      // 如果当前路由有 menuParent，先插入父路由的面包屑项
      // 例如：编辑文章页的 menuParent 是文章列表页
      if (matchingRoute.menuParent) {
        const parentRoute = allRoutes.find(route => route.path === matchingRoute.menuParent)
        if (parentRoute && !result.some(item => item.path === parentRoute.path)) {
          result.push({
            path: parentRoute.path,
            title: parentRoute.title,
            component: typeof parentRoute.component === 'string' ? undefined : parentRoute.component
          })
        }
      }

      result.push({
        path: currentPath,
        title: matchingRoute.title,
        component: typeof matchingRoute.component === 'string' ? undefined : matchingRoute.component
      })
    }
  })

  return result
}

/**
 * 获取前台布局所需的数据
 *
 * 为 PublicLayout 组件提供渲染所需的全部数据，包括：
 * - 顶部菜单路由列表
 * - 当前选中的菜单项
 * - 面包屑导航项
 * - 当前路由信息
 *
 * @param pathname - 当前页面路径
 * @returns 前台布局数据对象
 */
export const getPublicLayoutData = (pathname: string) => {
  const allRoutes = getAllRoutes()
  const pathSegments = pathname.split('/').filter(Boolean)

  // 1. 获取顶部菜单路由
  const topMenuRoutes = getPublicMenuRoutes()

  // 2. 计算当前路由信息（用于面包屑等场景）
  const currentRoute = allRoutes.find(route => {
    const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
    const regex = new RegExp(`^${routePathPattern}$`)
    return regex.test(pathname)
  })

  // 3. 计算顶部菜单选中状态（根据 URL 第一段路径）
  const topNavSelectedKey = pathSegments.length === 0 ? ['/home'] : [`/${pathSegments[0]}`]

  // 4. 计算面包屑
  const breadcrumbItems = getBreadcrumbItems(pathname)

  return {
    topMenuRoutes,
    topNavSelectedKey,
    breadcrumbItems,
    currentRoute
  }
}

/**
 * 获取后台布局所需的数据
 *
 * 为 AdminLayout 组件提供渲染所需的全部数据，包括：
 * - 侧边菜单路由列表（已根据用户权限过滤）
 * - 当前选中的菜单项
 * - 默认展开的菜单组
 * - 面包屑导航项
 * - 当前路由信息
 * - 用户是否有权限访问当前页面
 *
 * @param pathname - 当前页面路径
 * @param user - 当前登录用户信息
 * @returns 后台布局数据对象
 */
export const getAdminLayoutData = (
  pathname: string,
  user?: { role?: { name?: string; allowedRoutes?: string[] } } | null
) => {
  const allRoutes = getAllRoutes()
  const pathSegments = pathname.split('/').filter(Boolean)

  // 1. 获取侧边菜单路由（已根据用户权限过滤）
  const sideMenuRoutes = getAdminMenuRoutes(
    user?.role?.name
      ? { name: user.role.name, allowedRoutes: user.role.allowedRoutes || [] }
      : undefined
  )

  // 2. 计算当前路由信息
  const currentRoute = allRoutes.find(route => {
    const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
    const regex = new RegExp(`^${routePathPattern}$`)
    return regex.test(pathname)
  })

  // 3. 计算选中与展开状态
  // 跳过 'admin' 前缀，根据第二段路径确定展开的菜单组
  const adminPathSegments = pathSegments.slice(1) // 去掉 'admin'
  const defaultOpenKeys = adminPathSegments.length > 0 ? [`/admin/${adminPathSegments[0]}`] : []
  // 如果当前路由有 menuParent，选中父级菜单项
  const sideMenuSelectedKey = currentRoute?.menuParent ? [currentRoute.menuParent] : [pathname]

  // 4. 计算面包屑
  const breadcrumbItems = getBreadcrumbItems(pathname)

  // 5. 权限判断
  let hasPermission = false
  if (user) {
    if (user.role?.name === SYSTEM_ADMIN_ROLE_NAME) {
      // 超级管理员有全部权限
      hasPermission = true
    } else if (currentRoute?.menuParent) {
      // 有 menuParent 的路由（如新增/编辑页）继承父路由权限
      // 假设用户能访问列表页，就能访问对应的新增/编辑页
      hasPermission = true
    } else {
      // 普通用户：检查 allowedRoutes 是否包含当前路径
      const allowed = user.role?.allowedRoutes || []
      hasPermission = allowed.some(
        (route: string) => pathname === route || pathname.startsWith(route + '/')
      )
    }
  }

  return {
    sideMenuRoutes,
    sideMenuSelectedKey,
    defaultOpenKeys,
    breadcrumbItems,
    currentRoute,
    hasPermission
  }
}
