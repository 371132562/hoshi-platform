import { Breadcrumb, FloatButton, Layout, Menu, MenuProps } from 'antd'
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import Forbidden from '@/components/Forbidden'
import LoadingFallback from '@/components/LoadingFallback'
import NetworkErrorFallback from '@/components/NetworkErrorFallback'
import { UserInfoStatus, useUserInfo } from '@/hooks/useUserInfo'
import { getAdminLayoutData } from '@/router/routesConfig'
import { useAuthStore } from '@/stores/authStore'
import { RouteItem } from '@/types'

import UserDropdown from './components/UserDropdown'

const { Header, Sider, Content } = Layout

/**
 * 后台管理布局组件
 * - 侧边栏菜单导航
 * - 需要登录校验
 * - 顶部仅显示 Logo 和用户下拉
 */
export const AdminLayout: FC = () => {
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

  // 获取布局数据
  const { menuItems, sideMenuSelectedKey, breadcrumbItems, defaultOpenKeys, hasPermission } =
    useMemo(() => {
      const data = getAdminLayoutData(pathname, user)

      const menuItems: MenuProps['items'] = data.sideMenuRoutes.map((route: RouteItem) => {
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

        if (
          route.children &&
          route.children.filter((child: RouteItem) => !child.menuParent).length > 0
        ) {
          item.children = route.children
            .filter((child: RouteItem) => !child.menuParent)
            .map((child: RouteItem) => ({
              key: child.path,
              label: child.title
            }))
        }

        return item
      })

      const breadcrumbItems = data.breadcrumbItems.map(item => ({
        title:
          item.component && item.path !== pathname ? (
            <Link to={item.path}>{item.title}</Link>
          ) : (
            item.title
          )
      }))

      return {
        menuItems,
        ...data,
        breadcrumbItems
      }
    }, [pathname, user])

  // 当路由驱动的默认展开项变化时，同步到本地状态
  useEffect(() => {
    setOpenKeys(defaultOpenKeys)
  }, [defaultOpenKeys])

  return (
    <Layout className="h-screen w-full">
      <Header className="flex items-center !pl-[29px] text-white">
        <div className="flex-shrink-0 text-xl font-bold text-white">模版平台</div>
        <div className="flex-grow" />
        <UserDropdown />
      </Header>
      <Layout className="flex-grow">
        {/* 后台始终显示侧边栏 */}
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
            selectedKeys={sideMenuSelectedKey}
            openKeys={openKeys}
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarGutter: 'stable'
            }}
          />
        </Sider>
        <Layout>
          <Content className="!flex flex-grow flex-col bg-gray-100 p-6 pt-4">
            {/* 添加面包屑导航 */}
            <div className="mb-2">
              <Breadcrumb items={breadcrumbItems} />
            </div>
            <div
              ref={scrollRef}
              className="box-border flex flex-grow flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-md"
              style={{
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
        </Layout>
      </Layout>
    </Layout>
  )
}
