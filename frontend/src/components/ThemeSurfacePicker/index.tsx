import { ColorPicker, Tooltip } from 'antd'
import type { FC } from 'react'

import { useThemeStore } from '@/stores/themeStore'

type Props = {
  tooltip?: string
}

// 界面底色选择器：控制 Header/Sider/Menu 等深色背景
const ThemeSurfacePicker: FC<Props> = ({ tooltip = '界面底色' }) => {
  const surfaceColor = useThemeStore(state => state.surfaceColor)
  const setSurfaceColor = useThemeStore(state => state.setSurfaceColor)

  return (
    <Tooltip title={tooltip}>
      <ColorPicker
        value={surfaceColor}
        onChange={(_, hex) => setSurfaceColor(hex)}
        showText={false}
        placement="bottomRight"
      >
        <div
          aria-label="切换界面底色"
          role="button"
          tabIndex={0}
          className="h-8 w-8 cursor-pointer rounded-md border border-white/30 shadow-sm outline-none transition-all hover:border-white/60 focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ backgroundColor: surfaceColor }}
        />
      </ColorPicker>
    </Tooltip>
  )
}

export default ThemeSurfacePicker
