import './index.css'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import router from './router/index.tsx'
import { useThemeStore } from './stores/themeStore'
import { deriveHover, deriveSelected, readableOn } from './utils/color'

// 使用组件包裹以便在内部使用hook实现主题色的响应式更新
function AppWithTheme() {
  const primaryColor = useThemeStore(state => state.primaryColor)
  const surfaceColor = useThemeStore(state => state.surfaceColor)
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 全局主色，由算法自动推导其它语义色
          colorPrimary: primaryColor
        },
        components: {
          Layout: {
            headerBg: surfaceColor,
            siderBg: surfaceColor,
            bodyBg: surfaceColor,
            headerColor: readableOn(surfaceColor),
            triggerBg: deriveHover(surfaceColor),
            triggerColor: readableOn(deriveHover(surfaceColor))
          },
          Menu: {
            darkItemBg: surfaceColor,
            darkItemHoverBg: deriveHover(surfaceColor),
            darkItemSelectedBg: deriveSelected(surfaceColor),
            popupBg: deriveHover(surfaceColor),
            itemColor: readableOn(surfaceColor),
            darkItemColor: readableOn(surfaceColor),
            darkItemHoverColor: readableOn(deriveHover(surfaceColor)),
            darkItemSelectedColor: readableOn(deriveSelected(surfaceColor))
          }
        }
      }}
    >
      {/* 作为兜底覆盖：确保深色Menu与Sider触发器在所有情况下受控 */}
      <style>
        {`
          .ant-menu-dark, .ant-menu-dark .ant-menu-sub {
            background: ${surfaceColor} !important;
          }
          .ant-menu-dark .ant-menu-item:hover,
          .ant-menu-dark .ant-menu-submenu-title:hover {
            background: ${deriveHover(surfaceColor)} !important;
            color: ${readableOn(deriveHover(surfaceColor))} !important;
          }
          .ant-menu-dark .ant-menu-item-selected {
            background: ${deriveSelected(surfaceColor)} !important;
            color: ${readableOn(deriveSelected(surfaceColor))} !important;
          }
          .ant-layout-sider-trigger {
            background: ${deriveHover(surfaceColor)} !important;
            color: ${readableOn(deriveHover(surfaceColor))} !important;
            border-top: 1px solid rgba(255,255,255,0.12);
          }
        `}
      </style>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithTheme />
  </StrictMode>
)
