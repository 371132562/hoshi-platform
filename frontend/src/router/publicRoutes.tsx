import { HomeOutlined } from '@ant-design/icons'
import { lazy } from 'react'

import { RouteItem } from '@/types'

// 前台页面懒加载
const Home = lazy(() => import('@/pages/Home'))

/**
 * 前台公开路由配置
 * - 无需登录即可访问
 * - 使用顶部导航布局
 */
export const publicRoutes: RouteItem[] = [
  { path: '/home', title: '首页', icon: <HomeOutlined />, component: Home }
]
