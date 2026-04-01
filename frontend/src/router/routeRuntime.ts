import { RouteItem } from '@/types'

import { adminRoutes } from './adminRoutes'
import { publicRoutes } from './publicRoutes'
import { resolvePermissionTargetMeta, resolveRoutePermissionMeta } from './routePermissions'

// =========================
// Runtime Core
// =========================

/** 将带参数的路由路径转换为可复用的正则匹配器。 */
const createPathMatcher = (path: string): RegExp =>
  new RegExp(`^${path.replace(/\/:[^/]+/g, '/[^/]+')}$`)

type RouteEntryMeta = {
  route: RouteItem // 当前匹配到的路由声明
  menuOwner?: RouteItem // 详情页所属的菜单路由
  matcher?: RegExp // 动态路由匹配器
  breadcrumbTrail: RouteItem[] // 从根到当前路由的面包屑链路
}

type ResolvedRouteContext = {
  matchedEntry: RouteEntryMeta // 当前路径命中的路由上下文
  selectedMenuPath: string // 当前页面应高亮的菜单路径
  permissionKey?: string // 当前路径自身映射出的权限 key
  permissionTargetKey?: string // 当前页面真正用于访问控制的目标权限 key
}

export type RouteBreadcrumbItem = {
  path: string // 面包屑点击后应跳转的路径
  title: string // 面包屑标题
  canLink: boolean // 当前面包屑是否允许渲染为链接
}

export type RouteUiMeta = {
  selectedMenuPath: string // 当前页面应高亮的菜单路径
  breadcrumbItems: RouteBreadcrumbItem[] // 当前页面的面包屑数据
  openMenuKeys: string[] // 侧边栏默认展开的菜单分组
  currentRoute: RouteItem // 当前实际命中的路由声明
  menuOwner?: RouteItem // 当前页面所属菜单；详情页会指向父菜单
  permissionTargetKey?: string // 当前页面真正用于判权的目标权限 key
  permissionKey?: string // 当前路径自身映射到的权限 key
}

export type AccessUserInfo = {
  isAdmin?: boolean // 是否超级管理员
  permissionKeys?: string[] | null // 当前用户聚合后的权限 key 列表
}

export type AccessResult = {
  visibleMenuTree: RouteItem[] // 当前用户可见的菜单树
  hasPermission: boolean // 当前路径是否允许访问
}

export type ResolvedLayoutAccess = {
  uiMeta?: RouteUiMeta // 当前路径对应的菜单/面包屑元信息
  accessResult: AccessResult // 当前路径对应的菜单可见性与访问权限
}

export type RouteRuntime = {
  getRenderableRoutes: () => RouteItem[] // 返回可注册到 React Router 的平铺路由
  resolveRouteUiMeta: (pathname: string) => RouteUiMeta | undefined // 解析路径对应的 UI 元数据
  getAccessResult: (user?: AccessUserInfo | null, pathname?: string) => AccessResult // 解析菜单可见性与访问权限
  resolveLayoutAccess: (pathname: string, user?: AccessUserInfo | null) => ResolvedLayoutAccess // 一次性解析布局需要的 UI 元数据与权限结果
}

/**
 * 为路由声明建立运行时索引，统一派生菜单高亮、面包屑与权限结果。
 */
export const createRouteRuntime = (routeList: RouteItem[]): RouteRuntime => {
  const dynamicEntries: RouteEntryMeta[] = []
  const exactPathMap = new Map<string, RouteEntryMeta>()
  const renderableRouteMap = new Map<string, RouteItem>()

  const walkRoutes = (
    currentRoutes: RouteItem[],
    menuOwner?: RouteItem,
    ancestorBreadcrumbTrail: RouteItem[] = []
  ) => {
    // 1. 递归遍历路由树，同时记录详情页与父菜单的归属关系。
    currentRoutes.forEach(route => {
      const breadcrumbTrail = [...ancestorBreadcrumbTrail, route]
      const entry: RouteEntryMeta = {
        route,
        menuOwner,
        breadcrumbTrail,
        matcher: route.path.includes('/:') ? createPathMatcher(route.path) : undefined
      }

      exactPathMap.set(route.path, entry)

      if (entry.matcher) {
        dynamicEntries.push(entry)
      }

      if (route.component && !renderableRouteMap.has(route.path)) {
        renderableRouteMap.set(route.path, route)
      }

      if (route.children?.length) {
        walkRoutes(route.children, undefined, breadcrumbTrail)
      }

      if (route.detailRoutes?.length) {
        walkRoutes(route.detailRoutes, route, breadcrumbTrail)
      }
    })
  }

  const findRouteEntryByPath = (pathname: string) =>
    exactPathMap.get(pathname) || dynamicEntries.find(entry => entry.matcher?.test(pathname))

  /**
   * 基于路径统一解析“命中的路由 + 菜单归属 + 判权目标”。
   * 这样 UI 元数据与访问控制共用同一份上下文，避免后续改详情页归属规则时出现两套口径。
   */
  const resolveRouteContext = (pathname: string): ResolvedRouteContext | undefined => {
    const matchedEntry = findRouteEntryByPath(pathname)

    if (!matchedEntry) {
      return undefined
    }

    const selectedMenuPath = matchedEntry.menuOwner?.path || matchedEntry.route.path
    const permissionMeta = resolveRoutePermissionMeta(pathname, selectedMenuPath)
    const permissionTargetMeta = resolvePermissionTargetMeta(pathname, selectedMenuPath)

    return {
      matchedEntry,
      selectedMenuPath,
      permissionKey: permissionMeta?.permissionKey,
      permissionTargetKey: permissionTargetMeta?.permissionKey
    }
  }

  const filterVisibleMenuTree = (
    routes: RouteItem[],
    allowedPermissionKeySet: Set<string>,
    isAdmin: boolean
  ): RouteItem[] => {
    const filterRoute = (route: RouteItem): RouteItem | null => {
      if (route.adminOnly && !isAdmin) {
        return null
      }

      // 2. 先递归过滤子菜单；只要子菜单仍可见，就保留父分组。
      const filteredChildren = route.children?.map(child => filterRoute(child)).filter(Boolean) as
        | RouteItem[]
        | undefined

      if (filteredChildren?.length) {
        return {
          ...route,
          children: filteredChildren
        }
      }

      const permissionMeta = resolveRoutePermissionMeta(route.path, route.path)

      // 3. 叶子菜单使用稳定权限 key 做判权，不再依赖 path 本身。
      if (
        isAdmin ||
        (permissionMeta?.permissionKey && allowedPermissionKeySet.has(permissionMeta.permissionKey))
      ) {
        return {
          ...route,
          children: undefined
        }
      }

      return null
    }

    return routes.map(route => filterRoute(route)).filter(Boolean) as RouteItem[]
  }

  /**
   * 基于上下文派生页面 UI 元数据；未命中路由时返回 undefined。
   */
  const resolveRouteUiMetaFromContext = (
    routeContext: ResolvedRouteContext | undefined,
    pathname: string
  ): RouteUiMeta | undefined => {
    if (!routeContext) {
      return undefined
    }

    const { matchedEntry, selectedMenuPath, permissionKey, permissionTargetKey } = routeContext

    // 4. 将当前页面需要的菜单高亮、面包屑与权限目标一次性派生出来。
    return {
      selectedMenuPath,
      openMenuKeys: matchedEntry.breadcrumbTrail
        .filter(route => Boolean(route.children?.length))
        .map(route => route.path),
      breadcrumbItems: matchedEntry.breadcrumbTrail.map((route, index) => ({
        path: index === matchedEntry.breadcrumbTrail.length - 1 ? pathname : route.path,
        title: route.title,
        canLink: Boolean(route.component) && index < matchedEntry.breadcrumbTrail.length - 1
      })),
      currentRoute: matchedEntry.route,
      menuOwner: matchedEntry.menuOwner,
      permissionTargetKey,
      permissionKey
    }
  }

  /**
   * 基于已解析的路径上下文计算菜单可见性与当前访问权限。
   */
  const resolveAccessResultFromContext = (
    user?: AccessUserInfo | null,
    routeContext?: ResolvedRouteContext
  ): AccessResult => {
    if (!user) {
      return {
        visibleMenuTree: [],
        hasPermission: false
      }
    }

    // 5. 先计算菜单可见树，再判断当前路径是否命中允许访问的目标权限 key。
    const allowedPermissionKeySet = new Set((user.permissionKeys || []).filter(Boolean))
    const isAdmin = Boolean(user.isAdmin)
    const visibleMenuTree = filterVisibleMenuTree(routeList, allowedPermissionKeySet, isAdmin)

    if (!routeContext) {
      return {
        visibleMenuTree,
        hasPermission: false
      }
    }

    if (isAdmin) {
      return {
        visibleMenuTree,
        hasPermission: true
      }
    }

    const { permissionTargetKey } = routeContext

    if (!permissionTargetKey) {
      return {
        visibleMenuTree,
        hasPermission: false
      }
    }

    return {
      visibleMenuTree,
      hasPermission: allowedPermissionKeySet.has(permissionTargetKey)
    }
  }

  walkRoutes(routeList)

  return {
    getRenderableRoutes: () => Array.from(renderableRouteMap.values()),
    resolveRouteUiMeta: pathname =>
      resolveRouteUiMetaFromContext(resolveRouteContext(pathname), pathname),
    getAccessResult: (
      user,
      pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    ) => resolveAccessResultFromContext(user, pathname ? resolveRouteContext(pathname) : undefined),
    resolveLayoutAccess: (pathname, user) => {
      const routeContext = resolveRouteContext(pathname)
      return {
        uiMeta: resolveRouteUiMetaFromContext(routeContext, pathname),
        accessResult: resolveAccessResultFromContext(user, routeContext)
      }
    }
  }
}

// =========================
// App Facade
// =========================

/**
 * 路由运行时单例统一收敛在本文件，避免在多个入口重复创建索引。
 * Router 注册与布局查询共用同一份 runtime，保证菜单、面包屑、判权口径一致。
 */
export const publicRouteRuntime = createRouteRuntime(publicRoutes)
export const adminRouteRuntime = createRouteRuntime(adminRoutes)

type UserPermissionLike = AccessUserInfo

/** 根据当前用户权限返回后台可见菜单树。 */
const getAdminMenuRoutes = (user?: UserPermissionLike | null): RouteItem[] =>
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

type RolePermissionOption = {
  label: string
  value: string
}

type RolePermissionOptionGroup = {
  label: string
  options: RolePermissionOption[]
}

/** 将后台菜单叶子节点转换为角色权限分配弹窗可直接消费的选项结构。 */
export const getMenuOptionsForRoleEdit = () => {
  const options: RolePermissionOptionGroup[] = []

  adminRoutes.forEach(route => {
    if (route.adminOnly) return

    const routeOptions: RolePermissionOption[] = []

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

/** 为前台布局聚合菜单、面包屑与当前页面元数据。 */
export const getPublicLayoutData = (pathname: string) => {
  const uiMeta = publicRouteRuntime.resolveRouteUiMeta(pathname)

  return {
    topMenuRoutes: publicRoutes,
    topNavSelectedKey: uiMeta ? [uiMeta.selectedMenuPath] : ['/home'],
    breadcrumbItems: uiMeta?.breadcrumbItems || [],
    currentRoute: uiMeta?.currentRoute
  }
}

/** 为后台布局聚合菜单、面包屑、默认展开项与当前页面权限结果。 */
export const getAdminLayoutData = (pathname: string, user?: UserPermissionLike | null) => {
  const { uiMeta, accessResult } = adminRouteRuntime.resolveLayoutAccess(pathname, user)

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
