import { Breadcrumb, FloatButton, Layout, Menu, MenuProps } from 'antd'
import { FC, useMemo, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import { getPublicLayoutData } from '@/router/routesConfig'
import { RouteItem } from '@/types'

const { Header, Content } = Layout

/**
 * 前台布局组件
 * - 顶部导航栏
 * - 无侧边栏
 * - 无登录校验
 */
export const PublicLayout: FC = () => {
  // Router hooks
  const outlet = useOutlet()

  const { pathname } = useLocation()

  // React Hooks: useRef
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 获取布局数据
  const { topMenuItems, topNavSelectedKey, breadcrumbItems } = useMemo(() => {
    const data = getPublicLayoutData(pathname)

    // 转换菜单格式为 Ant Design 要求的 items
    const topMenuItems: MenuProps['items'] = data.topMenuRoutes.map((route: RouteItem) => ({
      key: route.path,
      label: <Link to={route.path}>{route.title}</Link>,
      icon: route.icon
    }))

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
      topNavSelectedKey: data.topNavSelectedKey,
      breadcrumbItems
    }
  }, [pathname])

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
          className="flex-grow-0"
          style={{ minWidth: 0 }}
        />
        <div className="flex-grow" />
      </Header>
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
            <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
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
  )
}
