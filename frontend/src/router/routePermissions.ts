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

const createRouteMatcher = (path: string) => new RegExp(`^${path.replace(/\/:[^/]+/g, '/[^/]+')}$`)

const permissionEntries = Object.entries(routePermissionMap).map(([path, meta]) => ({
  path,
  meta,
  matcher: path.includes('/:') ? createRouteMatcher(path) : undefined
}))

export const resolveRoutePermissionMeta = (
  pathname: string,
  fallbackPath?: string
): (RoutePermissionMeta & { path: string }) | undefined => {
  // 1. 优先做精确匹配，再回退到动态路由匹配与 fallbackPath。
  const exactMatch = permissionEntries.find(entry => entry.path === pathname)

  if (exactMatch) {
    return {
      path: exactMatch.path,
      ...exactMatch.meta
    }
  }

  const dynamicMatch = permissionEntries.find(entry => entry.matcher?.test(pathname))

  if (dynamicMatch) {
    return {
      path: dynamicMatch.path,
      ...dynamicMatch.meta
    }
  }

  if (fallbackPath && routePermissionMap[fallbackPath]) {
    return {
      path: fallbackPath,
      ...routePermissionMap[fallbackPath]
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
