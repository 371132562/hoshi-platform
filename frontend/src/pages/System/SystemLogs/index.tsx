import { Alert, Card, Space, Tabs } from 'antd'

import SystemLogsFull from './components/SystemLogsFull'
import SystemLogsUser from './components/SystemLogsUser'

// 系统日志父页面：使用Tabs承载两个子页面
const SystemLogs: React.FC = () => {
  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4">
        <Alert
          type="info"
          showIcon
          message="提示"
          description={
            <Space direction="vertical">
              <div>
                系统日志文件将保留30天，超过30天的日志文件将被自动清理。如需长期保存，请及时下载备份。
              </div>
              <div>
                日志文件可能较大，读取需要一些时间，请耐心等待。频繁切换日志文件会增加服务器负担，影响整体性能。
              </div>
            </Space>
          }
        />
      </div>
      <Card>
        <Tabs
          defaultActiveKey="full"
          items={[
            {
              key: 'full',
              label: '完整日志',
              children: <SystemLogsFull />
            },
            {
              key: 'user',
              label: '用户日志',
              children: <SystemLogsUser />
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default SystemLogs
