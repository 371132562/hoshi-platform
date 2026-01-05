import { ColorPicker, Tooltip } from 'antd'
import type { FC } from 'react'

import { useThemeStore } from '@/stores/themeStore'

type Props = {
  // 可选：自定义提示文案
  tooltip?: string
}

// 主题色选择器组件：允许用户实时调整AntD主色
const ThemeColorPicker: FC<Props> = ({ tooltip = '主题色' }) => {
  const primaryColor = useThemeStore(state => state.primaryColor)
  const setPrimaryColor = useThemeStore(state => state.setPrimaryColor)

  return (
    <Tooltip title={tooltip}>
      <ColorPicker
        value={primaryColor}
        onChange={(_, hex) => setPrimaryColor(hex)}
        showText={false}
        placement="bottomRight"
      >
        <div
          aria-label="切换主题色"
          role="button"
          tabIndex={0}
          className="h-8 w-8 cursor-pointer rounded-md border border-white/30 shadow-sm transition-all outline-none hover:border-white/60 focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ backgroundColor: primaryColor }}
        />
      </ColorPicker>
    </Tooltip>
  )
}

export default ThemeColorPicker
