import { SearchOutlined } from '@ant-design/icons'
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
  type: LogType // 日志面板模式：系统日志或用户日志
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
  // 筛选条件：文件、用户、关键字、时间范围与日志等级。
  const [selectedFilename, setSelectedFilename] = useState<string>()
  const [selectedUsername, setSelectedUsername] = useState<string>()
  const [keyword, setKeyword] = useState<string>()
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null] | null>()
  const [selectedLevel, setSelectedLevel] = useState<LogFileLevel>()

  // Store 中统一维护文件列表、读取结果与拉取动作。
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

  // 初始化阶段：系统日志直接拉文件列表，用户日志先拉用户选项。
  useEffect(() => {
    if (type === 'system') {
      refreshFilesWithDebounce(true)
    } else {
      listUsers()
    }
  }, [type, refreshFilesWithDebounce, listUsers])

  // 根据当前模式把文件列表转换成 Select 可直接消费的选项结构。
  const fileOptions = useMemo(() => {
    const targetFiles = type === 'system' ? files : userFiles
    return targetFiles.map((f: { filename: string }) => ({ label: f.filename, value: f.filename }))
  }, [type, files, userFiles])

  /** 切换用户后刷新该用户对应的日志文件列表。 */
  const handleUserChange = async (username: string | undefined) => {
    setSelectedUsername(username)
    setSelectedFilename(undefined)
    if (username) {
      await refreshUserFilesWithDebounce(username, true)
    }
  }

  // 当文件名满足条件时自动读取日志内容，避免额外的“查询”按钮。
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
        // 错误提示统一交给 store / request 层，这里不重复处理。
      }
    }
    fetch()
  }, [type, selectedFilename, selectedUsername, readLog, readUserLog])

  // 读取结果统一在这里做二次过滤，避免把 UI 条件直接下沉到后端接口。
  const rawData = type === 'system' ? readResult : readUserResult

  const processedData = useMemo(() => {
    if (!rawData || !selectedFilename) return []

    let data = rawData.map((l, idx) => ({
      key: `${idx}`,
      ts: l.ts,
      level: l.level || 'info',
      message: l.message
    }))

    // 1. 先按日志等级过滤。
    if (selectedLevel) {
      data = data.filter(item => item.level === selectedLevel)
    }

    // 2. 再按关键词做大小写不敏感匹配。
    if (keyword?.trim()) {
      const lower = keyword.trim().toLowerCase()
      data = data.filter(item => item.message.toLowerCase().includes(lower))
    }

    // 3. 最后按时间范围收敛结果，保证各筛选条件是叠加关系。
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

  // 表格列定义集中放在 useMemo 中，避免高频重建 render 函数。
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

          // 关键词高亮仅在存在搜索词时启用，减少无意义的字符串拆分。
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
            pagination={{ pageSize: 50, showSizeChanger: true }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 500px)' }}
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
