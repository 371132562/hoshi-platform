import {
  BarChartOutlined,
  CommentOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ForkOutlined,
  FunctionOutlined,
  GlobalOutlined,
  GoldOutlined,
  HomeOutlined,
  RiseOutlined,
  SettingOutlined,
  TeamOutlined
} from '@ant-design/icons'
import React, { lazy } from 'react'

import { RouteItem } from '@/types'

// 使用React.lazy实现懒加载（默认导出）
const ArticleManagement = lazy(() => import('@/pages/ArticleManagement'))
const ModifyArticle = lazy(() => import('@/pages/ArticleManagement/Modify'))
const OrderConfig = lazy(() => import('@/pages/ArticleManagement/OrderConfig'))
const ComprehensiveEvaluation = lazy(() => import('@/pages/ComprehensiveEvaluation'))
const ComprehensiveEvaluationDetail = lazy(() => import('@/pages/ComprehensiveEvaluation/Detail'))
const DataManagement = lazy(() => import('@/pages/DataManagement'))
const ExportData = lazy(() => import('@/pages/DataManagement/Export'))
const ImportData = lazy(() => import('@/pages/DataManagement/Import'))
const ModifyData = lazy(() => import('@/pages/DataManagement/Modify'))
const EvaluationModel = lazy(() => import('@/pages/EvaluationModel'))
const FormulaDetail = lazy(() => import('@/pages/EvaluationModel/FormulaDetail'))
const WeightManagement = lazy(() => import('@/pages/EvaluationModel/WeightManagement'))
const Home = lazy(() => import('@/pages/Home'))
const HumanDynamics = lazy(() => import('@/pages/HumanDynamics'))
const MapEdit = lazy(() => import('@/pages/Map/MapEdit'))
const UrbanizationRate = lazy(() => import('@/pages/Map/UrbanizationRate'))
const MaterialDynamics = lazy(() => import('@/pages/MaterialDynamics'))
const ScoreManagement = lazy(() => import('@/pages/ScoreManagement'))
const Detail = lazy(() => import('@/pages/ScoreManagement/Detail'))
const DetailModify = lazy(() => import('@/pages/ScoreManagement/Detail/Modify'))
const ScoreEvaluation = lazy(() => import('@/pages/ScoreManagement/Evaluation'))
const Export = lazy(() => import('@/pages/ScoreManagement/Export'))
const ImportScore = lazy(() => import('@/pages/ScoreManagement/Import'))
const ModifyScore = lazy(() => import('@/pages/ScoreManagement/Modify'))
const SpatialDynamics = lazy(() => import('@/pages/SpatialDynamics'))
const RoleManagement = lazy(() => import('@/pages/System/RoleManagement/RoleManagement'))
const SystemMaintenance = lazy(() => import('@/pages/System/SystemMaintenance'))
const UserManagement = lazy(() => import('@/pages/System/UserManagement/UserManagement'))
const SystemLogs = lazy(() => import('@/pages/System/SystemLogs'))
const DataList = lazy(() => import('@/pages/Transform/dataList'))
const Formula = lazy(() => import('@/pages/Transform/Formula'))
const UrbanizationProcess = lazy(() => import('@/pages/UrbanizationProcess'))

// 顶部导航菜单配置
export const topRoutes: RouteItem[] = [
  { path: '/home', title: '首页', icon: <HomeOutlined />, component: Home },
  {
    path: '/comprehensiveEvaluation',
    title: '综合评价',
    icon: <BarChartOutlined />,
    component: ComprehensiveEvaluation,
    children: [
      {
        path: '/comprehensiveEvaluation/detail/:countryId/:year',
        title: '评价详情',
        component: ComprehensiveEvaluationDetail,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/urbanizationProcess',
    title: '城镇化进程',
    icon: <RiseOutlined />,
    component: UrbanizationProcess
  },
  {
    path: '/humanDynamics',
    title: '人口迁徙动力',
    icon: <TeamOutlined />,
    component: HumanDynamics
  },
  {
    path: '/materialDynamics',
    title: '经济发展动力',
    icon: <GoldOutlined />,
    component: MaterialDynamics
  },
  {
    path: '/spatialDynamics',
    title: '空间发展动力',
    icon: <GlobalOutlined />,
    component: SpatialDynamics
  }
]

// 侧边栏导航菜单配置
export const sideRoutes: RouteItem[] = [
  {
    path: '/dataManagement',
    title: '数据管理',
    icon: <DatabaseOutlined />,
    children: [
      {
        path: '/dataManagement/list',
        title: '数据列表',
        component: DataManagement
      },
      {
        path: '/dataManagement/import',
        title: '数据导入',
        component: ImportData
      },
      {
        path: '/dataManagement/create',
        title: '数据录入',
        component: ModifyData
      },
      {
        path: '/dataManagement/export',
        title: '数据导出',
        component: ExportData
      },
      {
        path: '/dataManagement/modify/:countryId/:year',
        title: '数据编辑',
        component: ModifyData,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/transform',
    title: '数据转换',
    icon: <ForkOutlined />,
    children: [
      {
        path: '/transform/formula',
        title: '转换公式',
        component: Formula
      },
      {
        path: '/transform/dataList',
        title: '转换数据列表',
        component: DataList
      }
    ]
  },
  {
    path: '/map',
    title: '地图功能',
    icon: <EnvironmentOutlined />,
    children: [
      {
        path: '/map/urbanizationRate',
        title: '世界地图',
        component: UrbanizationRate
      },
      {
        path: '/map/mapEdit',
        title: '研究样本',
        component: MapEdit
      }
    ]
  },
  {
    path: '/evaluationModel',
    title: '评估模型',
    icon: <FunctionOutlined />,
    children: [
      {
        path: '/evaluationModel/introduction',
        title: '模型介绍',
        component: EvaluationModel
      },
      {
        path: '/evaluationModel/formulaDetail',
        title: '公式详情',
        component: FormulaDetail
      },
      {
        path: '/evaluationModel/weight',
        title: '权重管理',
        component: WeightManagement
      }
    ]
  },
  {
    path: '/scoreManagement',
    title: '评价管理',
    icon: <CommentOutlined />,
    children: [
      {
        path: '/scoreManagement/list',
        title: '评分列表',
        component: ScoreManagement
      },
      {
        path: '/scoreManagement/import',
        title: '评分导入',
        component: ImportScore
      },
      {
        path: '/scoreManagement/create',
        title: '评分录入',
        component: ModifyScore
      },
      {
        path: '/scoreManagement/export',
        title: '评分导出',
        component: Export
      },
      {
        path: '/scoreManagement/evaluation',
        title: '配置评价体系',
        component: ScoreEvaluation
      },
      {
        path: '/scoreManagement/detail',
        title: '评价详情',
        component: Detail
      },
      {
        path: '/scoreManagement/detail/modify/:countryId/:year',
        title: '评价详情编辑',
        component: DetailModify,
        hideInMenu: true
      },
      {
        path: '/scoreManagement/modify/:countryId/:year',
        title: '评分编辑',
        component: ModifyScore,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    children: [
      {
        path: '/article/list',
        title: '文章列表',
        component: ArticleManagement
      },
      {
        path: '/article/create',
        title: '新增文章',
        component: ModifyArticle
      },
      {
        path: '/article/order',
        title: '配置文章顺序',
        component: OrderConfig
      },
      {
        path: '/article/modify/:id',
        title: '编辑文章',
        component: ModifyArticle,
        hideInMenu: true
      }
    ]
  },
  // 系统管理菜单（仅admin可见）
  {
    path: '/system',
    title: '系统管理',
    icon: <SettingOutlined />,
    adminOnly: true,
    children: [
      {
        path: '/system/userManagement',
        title: '用户管理',
        component: UserManagement
      },
      {
        path: '/system/roleManagement',
        title: '角色管理',
        component: RoleManagement
      },
      {
        path: '/system/logs',
        title: '系统日志',
        component: SystemLogs
      },
      {
        path: '/system/maintenance',
        title: '系统维护',
        component: SystemMaintenance
      }
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

  return [...flattenRoutes(topRoutes), ...flattenRoutes(sideRoutes)]
}

// 根据用户角色过滤路由
export const getFilteredRoutes = (userRole?: {
  name: string
  allowedRoutes: string[]
}): {
  topRoutes: RouteItem[]
  sideRoutes: RouteItem[]
} => {
  // 顶部菜单不做权限限制，始终显示
  // 超管显示所有侧边栏菜单
  if (userRole?.name === 'admin') {
    return { topRoutes, sideRoutes }
  }

  // 其他角色按allowedRoutes过滤侧边栏菜单
  const allowedRoutes = userRole?.allowedRoutes || []

  const filterRoute = (route: RouteItem): RouteItem | null => {
    // 检查当前路由是否在允许列表中
    const isAllowed = allowedRoutes.includes(route.path)

    if (route.children) {
      // 过滤子路由
      const filteredChildren = route.children
        .map(child => filterRoute(child))
        .filter(Boolean) as RouteItem[]

      // 如果有子路由被允许，则保留父路由
      if (filteredChildren.length > 0) {
        return {
          ...route,
          children: filteredChildren
        }
      }
    } else if (isAllowed) {
      // 叶子节点且被允许
      return route
    }

    return null
  }

  const filteredSideRoutes = sideRoutes
    .map(route => filterRoute(route))
    .filter(Boolean) as RouteItem[]

  return {
    topRoutes,
    sideRoutes: filteredSideRoutes
  }
}

// 导出分组菜单数据，供角色管理编辑使用
export const getMenuOptionsForRoleEdit = () => {
  const options: Array<{ label: string; options: Array<{ label: string; value: string }> }> = []

  // 只从sideRoutes生成选项，顶部菜单不做权限限制
  sideRoutes.forEach(route => {
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

  // 构建路径映射表
  const pathMap = new Map<string, RouteItem>()
  allRoutes.forEach(route => {
    const routePath = route.path.replace(/\/:[^/]+/g, '/*')
    pathMap.set(routePath, route)
  })

  // 构建面包屑
  const pathSegments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  pathSegments.forEach(segment => {
    currentPath += '/' + segment

    // 处理动态路由参数
    const pathToCheck = currentPath.replace(/\/\d+/g, '/*')

    // 尝试找到匹配的路由配置
    const matchingRoute =
      pathMap.get(pathToCheck) ||
      pathMap.get(currentPath) ||
      allRoutes.find(route => {
        const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
        const regex = new RegExp(`^${routePathPattern}$`)
        return regex.test(currentPath)
      })

    if (matchingRoute && !matchingRoute.hideInBreadcrumb) {
      result.push({
        path: currentPath,
        title: matchingRoute.title,
        component: matchingRoute.component
      })
    }
  })

  return result
}
