import { FileSearchOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Tabs } from 'antd'
import { FC } from 'react'

import CleanupPanel from './components/CleanupPanel'
import LogPanel from './components/LogPanel'

const SystemMaintenance: FC = () => {
  return (
    <div className="w-full">
      <Tabs
        defaultActiveKey="cleanup"
        type="card"
        className="custom-tabs"
        items={[
          {
            key: 'cleanup',
            label: (
              <span className="flex items-center gap-2 px-2 py-1">
                <SafetyCertificateOutlined />
                资源清理
              </span>
            ),
            children: <CleanupPanel />
          },
          {
            key: 'logs',
            label: (
              <span className="flex items-center gap-2 px-2 py-1">
                <FileSearchOutlined />
                系统日志
              </span>
            ),
            children: <LogPanel type="system" />
          },
          {
            key: 'userLogs',
            label: (
              <span className="flex items-center gap-2 px-2 py-1">
                <UserOutlined />
                用户日志
              </span>
            ),
            children: <LogPanel type="user" />
          }
        ]}
      />
    </div>
  )
}

export default SystemMaintenance
