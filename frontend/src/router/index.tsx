import { Suspense } from 'react'
import { createBrowserRouter, Navigate, RouteObject } from 'react-router'

import ErrorPage from '@/components/Error'
import { AdminLayout } from '@/components/Layout/AdminLayout'
import { PublicLayout } from '@/components/Layout/PublicLayout'
import LoadingFallback from '@/components/LoadingFallback'
import LoginPage from '@/pages/Login'
import { RouteItem } from '@/types'

import { adminRoutes } from './adminRoutes'
import { publicRoutes } from './publicRoutes'

// 根据路由配置生成路由
const generateRoutes = (routes: RouteItem[]): RouteObject[] => {
  const generateChildrenRoutes = (routes: RouteItem[]): RouteObject[] => {
    return routes.flatMap(route => {
      const result: RouteObject[] = []

      // 添加主路由
      if (route.component) {
        result.push({
          path: route.path,
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <route.component />
            </Suspense>
          )
        })
      }

      // 添加子路由
      if (route.children) {
        result.push(...generateChildrenRoutes(route.children))
      }

      return result
    })
  }

  // 基于路由数组生成所有可渲染路由
  const allRoutes = generateChildrenRoutes(routes)

  // 去重
  const pathMap = new Map<string, RouteObject>()
  allRoutes.forEach(route => {
    if (route.path && !pathMap.has(route.path)) {
      pathMap.set(route.path, route)
    }
  })

  return Array.from(pathMap.values())
}

// 获取部署路径，处理斜杠问题
const getBasename = () => {
  const deployPath = import.meta.env.VITE_DEPLOY_PATH || '/'
  return deployPath.endsWith('/') ? deployPath.slice(0, -1) : deployPath
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to="/home" />,
      errorElement: <ErrorPage />
    },
    {
      path: '/login',
      element: <LoginPage />,
      errorElement: <ErrorPage />
    },
    // 前台布局（公开页面，顶部导航）
    {
      element: <PublicLayout />,
      errorElement: <ErrorPage />,
      children: generateRoutes(publicRoutes)
    },
    // 后台布局（管理页面，侧边导航，需登录）
    {
      path: '/admin',
      element: <AdminLayout />,
      errorElement: <ErrorPage />,
      children: generateRoutes(adminRoutes)
    }
  ],
  {
    // 设置路由基础路径，如果部署在子目录下需要修改这里
    basename: getBasename()
  }
)

export default router
