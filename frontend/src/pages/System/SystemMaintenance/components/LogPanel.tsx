import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography
} from 'antd'
import type { Dayjs } from 'dayjs'
import { FC, useEffect, useMemo, useState } from 'react'
import type { LogFileLevel } from 'template-backend/src/types/dto'

import { useSystemLogsStore } from '@/stores/systemLogsStore'
import { dayjs } from '@/utils/dayjs'

const { Text } = Typography

type LogType = 'system' | 'user'

type LogPanelProps = {
  type: LogType
}

/** 日志等级选项配置 */
const LOG_LEVEL_OPTIONS: { label: string; value: LogFileLevel }[] = [
  { label: 'INFO', value: 'info' },
  { label: 'WARN', value: 'warn' },
  { label: 'ERROR', value: 'error' }
]

/** 日志等级颜色映射 */
const LOG_LEVEL_COLOR: Record<string, string> = {
  info: 'blue',
  warn: 'orange',
  error: 'red',
  debug: 'gray'
}

const LogPanel: FC<LogPanelProps> = ({ type }) => {
  // State for filtering
  const [selectedFilename, setSelectedFilename] = useState<string>()
  const [selectedUsername, setSelectedUsername] = useState<string>()
  const [keyword, setKeyword] = useState<string>()
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null] | null>()
  const [selectedLevel, setSelectedLevel] = useState<LogFileLevel>()

  // Store actions and state
  const {
    files,
    filesLoading,
    contentLoading,
    readResult,
    readLog,
    refreshFilesWithDebounce,

    // User log specific
    usersLoading,
    userFilesLoading,
    readUserResult,
    userFiles,
    userOptions,
    readUserLog,
    listUsers,
    refreshUserFilesWithDebounce
  } = useSystemLogsStore()

  // Initialize data
  useEffect(() => {
    if (type === 'system') {
      refreshFilesWithDebounce(true)
    } else {
      listUsers()
    }
  }, [type, refreshFilesWithDebounce, listUsers])

  // Computed options
  const fileOptions = useMemo(() => {
    const targetFiles = type === 'system' ? files : userFiles
    return targetFiles.map((f: { filename: string }) => ({ label: f.filename, value: f.filename }))
  }, [type, files, userFiles])

  // Handle User Change
  const handleUserChange = async (username: string | undefined) => {
    setSelectedUsername(username)
    setSelectedFilename(undefined)
    if (username) {
      await refreshUserFilesWithDebounce(username, true)
    }
  }

  // Auto fetch logs when filename matches requirements
  useEffect(() => {
    const fetch = async () => {
      if (!selectedFilename) return

      try {
        if (type === 'system') {
          await readLog({ filename: selectedFilename })
        } else if (selectedUsername) {
          await readUserLog({ username: selectedUsername, filename: selectedFilename })
        }
      } catch (_) {
        // Error handling is usually done in store/service
      }
    }
    fetch()
  }, [type, selectedFilename, selectedUsername, readLog, readUserLog])

  // Data processing
  const rawData = type === 'system' ? readResult : readUserResult

  const processedData = useMemo(() => {
    if (!rawData || !selectedFilename) return []

    let data = rawData.map((l, idx) => ({
      key: `${idx}`,
      ts: l.ts,
      level: l.level || 'info',
      message: l.message
    }))

    // Filter by log level
    if (selectedLevel) {
      data = data.filter(item => item.level === selectedLevel)
    }

    // Filter by keyword
    if (keyword?.trim()) {
      const lower = keyword.trim().toLowerCase()
      data = data.filter(item => item.message.toLowerCase().includes(lower))
    }

    // Filter by time range
    if (timeRange && timeRange.length === 2) {
      const [start, end] = timeRange
      const startTime = dayjs(start).startOf('second')
      const endTime = dayjs(end).endOf('second')

      data = data.filter(item => {
        const t = dayjs(item.ts)
        return t.isAfter(startTime) && t.isBefore(endTime)
      })
    }

    return data
  }, [rawData, keyword, timeRange, selectedFilename, selectedLevel])

  // Columns
  const columns = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'ts',
        key: 'ts',
        width: 180,
        render: (text: string) => <Tag color="blue">{text}</Tag>
      },
      {
        title: '等级',
        dataIndex: 'level',
        key: 'level',
        width: 80,
        render: (level: string) => (
          <Tag color={LOG_LEVEL_COLOR[level] || 'default'}>{level.toUpperCase()}</Tag>
        )
      },
      {
        title: '内容',
        dataIndex: 'message',
        key: 'message',
        render: (text: string) => {
          const k = keyword?.trim()
          if (!k) return <Text className="font-mono text-xs whitespace-pre-wrap">{text}</Text>

          // Highlight logic
          const parts = text.split(new RegExp(`(${k})`, 'gi'))
          return (
            <Text className="font-mono text-xs whitespace-pre-wrap">
              {parts.map((part, i) =>
                part.toLowerCase() === k.toLowerCase() ? (
                  <span
                    key={i}
                    className="rounded bg-yellow-200 px-1 text-black"
                  >
                    {part}
                  </span>
                ) : (
                  part
                )
              )}
            </Text>
          )
        }
      }
    ],
    [keyword]
  )

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        {type === 'user' && (
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="请选择用户搜索"
            style={{ width: 220 }}
            options={userOptions}
            loading={usersLoading}
            value={selectedUsername}
            onChange={handleUserChange}
            allowClear
          />
        )}

        <Select
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="请选择日志文件"
          style={{ width: 260 }}
          options={fileOptions}
          loading={type === 'system' ? filesLoading : userFilesLoading}
          disabled={type === 'user' && !selectedUsername}
          value={selectedFilename}
          onChange={val => setSelectedFilename(val)}
          allowClear
        />

        <Select
          placeholder="日志等级"
          style={{ width: 120 }}
          options={LOG_LEVEL_OPTIONS}
          value={selectedLevel}
          onChange={val => setSelectedLevel(val)}
          allowClear
        />

        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="输入关键词搜索"
          allowClear
          style={{ width: 220 }}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />

        <DatePicker.RangePicker
          showTime
          placeholder={['开始时间', '结束时间']}
          style={{ width: 380 }}
          value={timeRange}
          onChange={val => setTimeRange(val)}
        />

        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setSelectedUsername(undefined)
            setSelectedFilename(undefined)
            setKeyword(undefined)
            setTimeRange(null)
            setSelectedLevel(undefined)
            if (type === 'system') refreshFilesWithDebounce(true)
            else if (selectedUsername) refreshUserFilesWithDebounce(selectedUsername, true)
          }}
        >
          重置
        </Button>
      </div>

      {/* Content Area */}
      <Card
        variant="borderless"
        className="min-h-[500px] shadow-sm"
      >
        {contentLoading ? (
          <Skeleton
            active
            paragraph={{ rows: 12 }}
          />
        ) : (
          <Table
            rowKey="key"
            columns={columns}
            dataSource={processedData}
            size="small"
            pagination={{ pageSize: 50, showSizeChanger: true, size: 'default' }}
            scroll={{ y: 'calc(100vh - 480px)' }}
            locale={{
              emptyText: <Empty description="暂无日志数据，请选择文件查看" />
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default LogPanel
