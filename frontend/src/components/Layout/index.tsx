import { Breadcrumb, FloatButton, Layout, Menu, MenuProps } from 'antd'
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import Forbidden from '@/components/Forbidden'
import LoadingFallback from '@/components/LoadingFallback'
import NetworkErrorFallback from '@/components/NetworkErrorFallback'
import { UserInfoStatus, useUserInfo } from '@/hooks/useUserInfo'
import { getLayoutData } from '@/router/routesConfig'
import { useAuthStore } from '@/stores/authStore'
import { RouteItem } from '@/types'

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

  // 1. 调用 getLayoutData 获取布局所需的所有派生数据
  const {
    topMenuItems,
    menuItems,
    topNavSelectedKey,
    sideMenuSelectedKey,
    breadcrumbItems,
    defaultOpenKeys,
    hasPermission
  } = useMemo(() => {
    const data = getLayoutData(pathname, user)

    // 转换菜单格式为 Ant Design 要求的 items
    const topMenuItems: MenuProps['items'] = data.topMenuRoutes.map((route: RouteItem) => ({
      key: route.path,
      label: route.title,
      icon: route.icon
    }))

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
      topMenuItems,
      menuItems,
      ...data,
      breadcrumbItems
    }
  }, [pathname, user])

  // 当路由驱动的默认展开项变化时，同步到本地状态（用于手动折叠后的恢复或初次进入）
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
              className="box-border flex flex-grow flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-md"
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
