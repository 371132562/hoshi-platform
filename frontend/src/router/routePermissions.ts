export type RoutePermissionMeta = {
  permissionKey: string // 当前路由归属的稳定权限 key
  parentPath?: string // 若为详情页，则指向真正承担判权的父路由 path
}

// 路由 path 与稳定权限 key 的唯一映射表；详情页通过 parentPath 继承父级权限。
export const routePermissionMap: Record<string, RoutePermissionMeta> = {
  '/admin/article/list': { permissionKey: 'article:list' },
  '/admin/article/create': {
    permissionKey: 'article:list',
    parentPath: '/admin/article/list'
  },
  '/admin/article/modify/:id': {
    permissionKey: 'article:list',
    parentPath: '/admin/article/list'
  },
  '/admin/article/order': { permissionKey: 'article:order' },
  '/admin/system/organization': { permissionKey: 'system:organization' },
  '/admin/system/roleManagement': { permissionKey: 'system:role' },
  '/admin/system/userManagement': { permissionKey: 'system:user' },
  '/admin/system/maintenance': { permissionKey: 'system:maintenance' }
}

/** 将带参数的路由路径转换为可复用的正则匹配器。 */
const createPathMatcher = (path: string): RegExp =>
  new RegExp(`^${path.replace(/\/:[^/]+/g, '/[^/]+')}$`)

const exactPermissionMap = new Map<string, RoutePermissionMeta>(Object.entries(routePermissionMap))
const dynamicPermissionEntries = Object.entries(routePermissionMap)
  .filter(([path]) => path.includes('/:'))
  .map(([path, meta]) => ({
    path,
    meta,
    matcher: createPathMatcher(path)
  }))

export const resolveRoutePermissionMeta = (
  pathname: string,
  fallbackPath?: string
): (RoutePermissionMeta & { path: string }) | undefined => {
  // 1. 优先命中精确路径，减少遍历与动态正则匹配开销。
  const exactMeta = exactPermissionMap.get(pathname)
  if (exactMeta) {
    return {
      path: pathname,
      ...exactMeta
    }
  }

  // 2. 精确路径未命中时，再回退到动态路由匹配。
  const dynamicMatch = dynamicPermissionEntries.find(entry => entry.matcher.test(pathname))

  if (dynamicMatch) {
    return {
      path: dynamicMatch.path,
      ...dynamicMatch.meta
    }
  }

  // 3. 最后回退 fallbackPath，兼容详情页归属菜单判权场景。
  const fallbackMeta = fallbackPath ? exactPermissionMap.get(fallbackPath) : undefined
  if (fallbackMeta && fallbackPath) {
    return {
      path: fallbackPath,
      ...fallbackMeta
    }
  }

  return undefined
}

export const resolvePermissionTargetMeta = (
  pathname: string,
  fallbackPath?: string
): (RoutePermissionMeta & { path: string }) | undefined => {
  const permissionMeta = resolveRoutePermissionMeta(pathname, fallbackPath)

  if (!permissionMeta) {
    return undefined
  }

  // 2. 详情页统一回退到父路由的权限元信息，保证判权口径只有一份。
  if (permissionMeta.parentPath) {
    return resolveRoutePermissionMeta(permissionMeta.parentPath, permissionMeta.parentPath)
  }

  return permissionMeta
}
