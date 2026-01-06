import { Breadcrumb, FloatButton, Layout, Menu, MenuProps } from 'antd'
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import Forbidden from '@/components/Forbidden'
import LoadingFallback from '@/components/LoadingFallback'
import NetworkErrorFallback from '@/components/NetworkErrorFallback'
import { UserInfoStatus, useUserInfo } from '@/hooks/useUserInfo'
import {
  getAllRoutes,
  getBreadcrumbItems,
  getSideMenuRoutes,
  getTopMenuRoutes
} from '@/router/routesConfig'
import { useAuthStore } from '@/stores/authStore'

import UserDropdown from './components/UserDropdown'

const { Header, Sider, Content /* Footer */ } = Layout

export const Component: FC = () => {
  // Router hooks
  const outlet = useOutlet()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Store 取值
  const user = useAuthStore(state => state.user)

  // React Hooks: useState
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])

  // React Hooks: useRef
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 使用增强的用户信息获取 Hook
  const { status: userInfoStatus, error: userInfoError } = useUserInfo()

  // React Hooks: useMemo - 派生变量
  const topRoutes = useMemo(() => getTopMenuRoutes(), [])

  const sideRoutes = useMemo(
    () =>
      getSideMenuRoutes(
        user?.role && user.role.name
          ? { name: user.role.name, allowedRoutes: user.role.allowedRoutes || [] }
          : undefined
      ),
    [user?.role]
  )

  const { topNavSelectedKey, sideMenuSelectedKey, defaultOpenKeys, breadcrumbItems, currentRoute } =
    useMemo(() => {
      const pathSegments = pathname.split('/').filter(Boolean)
      const allRoutes = getAllRoutes()

      const currentRoute = allRoutes.find(route => {
        const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
        const regex = new RegExp(`^${routePathPattern}$`)
        return regex.test(pathname)
      })

      const breadcrumbItems = getBreadcrumbItems(pathname).map(item => ({
        title:
          item.component && item.path !== pathname ? (
            <Link to={item.path}>{item.title}</Link>
          ) : (
            item.title
          )
      }))

      return {
        topNavSelectedKey: pathSegments.length === 0 ? ['/home'] : [`/${pathSegments[0]}`],
        defaultOpenKeys: pathSegments.length > 1 ? [`/${pathSegments[0]}`] : [],
        sideMenuSelectedKey: currentRoute?.menuParent ? [currentRoute.menuParent] : [pathname],
        breadcrumbItems,
        currentRoute
      }
    }, [pathname])

  const topMenuItems: MenuProps['items'] = useMemo(
    () =>
      topRoutes.map(route => ({
        key: route.path,
        label: route.title,
        icon: route.icon
      })),
    [topRoutes]
  )

  const menuItems: MenuProps['items'] = useMemo(
    () =>
      sideRoutes.map(route => {
        const item: {
          key: string
          icon?: ReactNode
          label: ReactNode
          children?: { key: string; label: ReactNode }[]
        } = {
          key: route.path,
          icon: route.icon,
          label: route.title
        }

        if (route.children && route.children.filter(child => !child.menuParent).length > 0) {
          item.children = route.children
            .filter(child => !child.menuParent)
            .map(child => ({
              key: child.path,
              label: child.title
            }))
        }

        return item
      }),
    [sideRoutes]
  )

  const hasPermission = useMemo(() => {
    const topMenuPaths = topRoutes.map(route => route.path)
    const isTopMenuRoute = topMenuPaths.some(
      path => pathname === path || pathname.startsWith(path + '/')
    )

    if (isTopMenuRoute) {
      return true
    }

    if (!user) {
      return false
    }

    if (user.role?.name === 'admin') return true

    if (currentRoute?.menuParent) {
      return true
    }

    const allowed = user.role?.allowedRoutes || []
    return allowed.some((route: string) => pathname === route || pathname.startsWith(route + '/'))
  }, [user, pathname, topRoutes, currentRoute])

  useEffect(() => {
    setOpenKeys(defaultOpenKeys)
  }, [defaultOpenKeys])

  return (
    <Layout className="h-screen w-full">
      <Header className="flex items-center !pl-[29px] text-white">
        <div className="flex-shrink-0 text-xl font-bold text-white">模版平台</div>
        <div className="flex-grow" />
        <Menu
          theme="dark"
          mode="horizontal"
          items={topMenuItems}
          selectedKeys={topNavSelectedKey}
          onClick={e => navigate(e.key)}
          className="flex-grow-0"
          style={{ minWidth: 0 }}
        />
        <div className="flex-grow" />

        <UserDropdown />
      </Header>
      <Layout className="flex-grow">
        {/* 只有登录用户才显示侧边栏 */}
        {user && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            theme="dark"
            width={220}
            className="flex flex-col"
          >
            <Menu
              theme="light"
              mode="inline"
              items={menuItems}
              onClick={e => navigate(e.key)}
              onOpenChange={setOpenKeys}
              // 将菜单的选中状态与路由同步
              selectedKeys={sideMenuSelectedKey}
              // 控制菜单展开状态，支持手动操作和路由驱动
              openKeys={openKeys}
              // 设置菜单高度和滚动，确保所有菜单项都能显示
              style={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                // 为滚动条预留空间，防止内容宽度变化
                scrollbarGutter: 'stable'
              }}
            />
          </Sider>
        )}
        <Layout>
          <Content className="!flex flex-grow flex-col bg-gray-100 p-6 pt-4">
            {/* 添加面包屑导航 */}
            <div className="mb-2">
              <Breadcrumb items={breadcrumbItems} />
            </div>
            <div
              ref={scrollRef}
              className="box-border flex flex-grow flex-col items-center overflow-y-auto rounded-lg bg-white p-6 shadow-md"
              style={{
                // 为滚动条预留空间，防止内容宽度变化
                scrollbarGutter: 'stable'
              }}
            >
              {/* 路由守卫：根据状态显示不同内容 */}
              {userInfoStatus === UserInfoStatus.LOADING ? (
                // 正在加载用户信息
                <LoadingFallback />
              ) : userInfoStatus === UserInfoStatus.NETWORK_ERROR ? (
                // 网络错误，显示重试界面
                <NetworkErrorFallback error={userInfoError || '网络连接异常'} />
              ) : userInfoStatus === UserInfoStatus.AUTH_FAILED ? (
                // 认证失败，跳转到登录页
                (() => {
                  navigate('/login')
                  return <LoadingFallback />
                })()
              ) : userInfoStatus === UserInfoStatus.SUCCESS && !hasPermission ? (
                // 用户已登录但无权限访问当前页面
                <Forbidden />
              ) : userInfoStatus === UserInfoStatus.SUCCESS ? (
                // 用户已登录且有权限，渲染业务页面
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              ) : (
                // 其他未知状态，显示加载中
                <LoadingFallback />
              )}
            </div>
          </Content>

          <FloatButton.BackTop
            target={() => scrollRef.current as HTMLElement}
            visibilityHeight={800}
            tooltip="回到顶部"
            style={{ right: 36, bottom: 86 }}
          />
          {/* <Footer className="!pt-0">
            <div className="flex w-full justify-center">如需帮助请联系 1234567890</div>
          </Footer> */}
        </Layout>
      </Layout>
    </Layout>
  )
}
