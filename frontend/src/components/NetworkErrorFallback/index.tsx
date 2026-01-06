import { ReloadOutlined, WifiOutlined } from '@ant-design/icons'
import { Button, Result, Typography } from 'antd'
import { FC } from 'react'

const { Text } = Typography

interface NetworkErrorFallbackProps {
  /** 错误信息 */
  error?: string
}

/**
 * 网络错误回退组件
 * 当网络异常或后端不可访问时显示，提供刷新页面功能
 */
const NetworkErrorFallback: FC<NetworkErrorFallbackProps> = ({
  error = '网络连接失败，请检查网络连接或稍后重试'
}) => {
  return (
    <div className="flex flex-grow items-center justify-center p-6">
      <Result
        icon={
          <WifiOutlined
            className="text-blue-500"
            style={{ fontSize: 72 }}
          />
        }
        title="网络连接失败"
        subTitle={
          <div className="mt-2 text-center">
            <Text type="secondary">{error}</Text>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
            size="large"
            className="mt-4"
          >
            刷新页面
          </Button>
        }
      />
    </div>
  )
}

export default NetworkErrorFallback
