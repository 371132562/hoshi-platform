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
import { createRouteRuntime } from './routeRuntime'

const routeErrorElement = <ErrorPage />

const publicRouteRuntime = createRouteRuntime(publicRoutes)
const adminRouteRuntime = createRouteRuntime(adminRoutes)

const generateRoutes = (routes: RouteItem[]): RouteObject[] =>
  routes.flatMap(route => {
    if (!route.component) {
      return []
    }

    const RouteComponent = route.component

    return [
      {
        path: route.path,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RouteComponent />
          </Suspense>
        )
      }
    ]
  })

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
      errorElement: routeErrorElement
    },
    {
      path: '/login',
      element: <LoginPage />,
      errorElement: routeErrorElement
    },
    // 前台布局（公开页面，顶部导航）
    {
      element: <PublicLayout />,
      errorElement: routeErrorElement,
      children: generateRoutes(publicRouteRuntime.getRenderableRoutes())
    },
    // 后台布局（管理页面，侧边导航，需登录）
    {
      path: '/admin',
      element: <AdminLayout />,
      errorElement: routeErrorElement,
      children: generateRoutes(adminRouteRuntime.getRenderableRoutes())
    }
  ],
  {
    // 设置路由基础路径，如果部署在子目录下需要修改这里
    basename: getBasename()
  }
)

export default router
