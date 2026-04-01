import { RouteItem } from '@/types'

import { adminRoutes } from './adminRoutes'
import { publicRoutes } from './publicRoutes'
import { resolveRoutePermissionMeta } from './routePermissions'
import { createRouteRuntime } from './routeRuntime'

const publicRouteRuntime = createRouteRuntime(publicRoutes)
const adminRouteRuntime = createRouteRuntime(adminRoutes)

/** 返回前台顶栏菜单使用的公开路由配置。 */
export const getPublicMenuRoutes = (): RouteItem[] => publicRoutes

type UserPermissionLike = {
  isAdmin?: boolean
  permissionKeys?: string[]
}

export const getAllRoutes = (): RouteItem[] => [
  ...publicRouteRuntime.getRenderableRoutes(),
  ...adminRouteRuntime.getRenderableRoutes()
]

/** 根据当前用户权限返回后台可见菜单树。 */
export const getAdminMenuRoutes = (user?: UserPermissionLike | null): RouteItem[] =>
  adminRouteRuntime.getAccessResult(user).visibleMenuTree

/** 递归获取可见菜单树中的第一个可访问叶子路由。 */
const getFirstAccessiblePath = (routes: RouteItem[]): string | undefined => {
  for (const route of routes) {
    if (route.children && route.children.length > 0) {
      const firstChildPath = getFirstAccessiblePath(route.children)
      if (firstChildPath) {
        return firstChildPath
      }
    }

    if (!route.children || route.children.length === 0) {
      return route.path
    }
  }

  return undefined
}

/** 为登录跳转和“进入后台”按钮计算默认后台落点。 */
export const getDefaultAdminPath = (user?: UserPermissionLike | null) => {
  const sideMenuRoutes = getAdminMenuRoutes(user)
  return getFirstAccessiblePath(sideMenuRoutes) || '/admin'
}

/** 将后台菜单叶子节点转换为角色权限分配弹窗可直接消费的选项结构。 */
export const getMenuOptionsForRoleEdit = () => {
  const options: Array<{ label: string; options: Array<{ label: string; value: string }> }> = []

  adminRoutes.forEach(route => {
    if (route.adminOnly) return

    const routeOptions: Array<{ label: string; value: string }> = []

    if (route.children) {
      route.children.forEach(child => {
        const permissionMeta = resolveRoutePermissionMeta(child.path, child.path)

        if (child.component && permissionMeta?.permissionKey) {
          routeOptions.push({ label: child.title, value: permissionMeta.permissionKey })
        }
      })

      if (routeOptions.length > 0) {
        options.push({ label: route.title, options: routeOptions })
      }
      return
    }

    const permissionMeta = resolveRoutePermissionMeta(route.path, route.path)

    if (route.component && permissionMeta?.permissionKey) {
      routeOptions.push({ label: route.title, value: permissionMeta.permissionKey })
    }

    if (routeOptions.length > 0) {
      options.push({ label: route.title, options: routeOptions })
    }
  })

  return options
}

export const getBreadcrumbItems = (pathname: string) => {
  const runtime = pathname.startsWith('/admin') ? adminRouteRuntime : publicRouteRuntime
  return runtime.resolveRouteUiMeta(pathname)?.breadcrumbItems || []
}

/** 为前台布局聚合菜单、面包屑与当前页面元数据。 */
export const getPublicLayoutData = (pathname: string) => {
  const topMenuRoutes = getPublicMenuRoutes()
  const uiMeta = publicRouteRuntime.resolveRouteUiMeta(pathname)

  return {
    topMenuRoutes,
    topNavSelectedKey: uiMeta ? [uiMeta.selectedMenuPath] : ['/home'],
    breadcrumbItems: uiMeta?.breadcrumbItems || [],
    currentRoute: uiMeta?.currentRoute
  }
}

/** 为后台布局聚合菜单、面包屑、默认展开项与当前页面权限结果。 */
export const getAdminLayoutData = (pathname: string, user?: UserPermissionLike | null) => {
  const uiMeta = adminRouteRuntime.resolveRouteUiMeta(pathname)
  const accessResult = adminRouteRuntime.getAccessResult(user, pathname)

  return {
    sideMenuRoutes: accessResult.visibleMenuTree,
    sideMenuSelectedKey: uiMeta ? [uiMeta.selectedMenuPath] : [pathname],
    defaultOpenKeys: uiMeta?.openMenuKeys || [],
    breadcrumbItems: uiMeta?.breadcrumbItems || [],
    currentRoute: uiMeta?.currentRoute,
    permissionTargetKey: uiMeta?.permissionTargetKey,
    permissionKey: uiMeta?.permissionKey,
    hasPermission: accessResult.hasPermission
  }
}
