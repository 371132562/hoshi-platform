import { RouteItem } from '@/types'

import { resolvePermissionTargetMeta, resolveRoutePermissionMeta } from './routePermissions'

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

export type RouteRuntime = {
  getRenderableRoutes: () => RouteItem[] // 返回可注册到 React Router 的平铺路由
  resolveRouteUiMeta: (pathname: string) => RouteUiMeta | undefined // 解析路径对应的 UI 元数据
  getAccessResult: (user?: AccessUserInfo | null, pathname?: string) => AccessResult // 解析菜单可见性与访问权限
}

/** 将带参数的路由路径转换为可复用的正则匹配器。 */
const createDynamicMatcher = (path: string) =>
  new RegExp(`^${path.replace(/\/:[^/]+/g, '/[^/]+')}$`)

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
        matcher: route.path.includes('/:') ? createDynamicMatcher(route.path) : undefined
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

  walkRoutes(routeList)

  return {
    getRenderableRoutes: () => Array.from(renderableRouteMap.values()),
    resolveRouteUiMeta: pathname => {
      const routeContext = resolveRouteContext(pathname)

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
    },
    getAccessResult: (
      user,
      pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    ) => {
      const routeContext = pathname ? resolveRouteContext(pathname) : undefined

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
  }
}

export const getFirstVisibleRoutePath = (routeTree: RouteItem[]): string | undefined => {
  const runtime = createRouteRuntime(routeTree)
  return runtime.getRenderableRoutes().find(route => route.component)?.path
}
