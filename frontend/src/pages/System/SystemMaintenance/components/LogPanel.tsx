import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography
} from 'antd'
import { FC, useEffect, useMemo } from 'react'

import { useSystemLogsStore } from '@/stores/systemLogsStore'
import { dayjs } from '@/utils/dayjs'

const { Text } = Typography

type LogType = 'system' | 'user'

interface LogPanelProps {
  type: LogType
}

const LogPanel: FC<LogPanelProps> = ({ type }) => {
  const [form] = Form.useForm()

  // Watch form values for real-time filtering
  const selectedFilename = Form.useWatch('filename', form)
  const selectedUsername = Form.useWatch('username', form)
  const keyword = Form.useWatch('keyword', form)
  const timeRange = Form.useWatch('timeRange', form)

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
    form.setFieldValue('username', username)
    form.setFieldValue('filename', undefined)
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
      message: l.message
    }))

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
  }, [rawData, keyword, timeRange, selectedFilename])

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
          onChange={val => form.setFieldValue('filename', val)}
          allowClear
        />

        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="输入关键词搜索"
          allowClear
          style={{ width: 220 }}
          value={keyword}
          onChange={e => form.setFieldValue('keyword', e.target.value)}
        />

        <DatePicker.RangePicker
          showTime
          placeholder={['开始时间', '结束时间']}
          style={{ width: 380 }}
          value={timeRange}
          onChange={val => form.setFieldValue('timeRange', val)}
        />

        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            form.resetFields()
            if (type === 'system') refreshFilesWithDebounce(true)
            else if (selectedUsername) refreshUserFilesWithDebounce(selectedUsername, true)
          }}
        >
          重置
        </Button>
      </div>

      <Form
        form={form}
        className="hidden"
      >
        <Form.Item name="username" />
        <Form.Item name="filename" />
        <Form.Item name="keyword" />
        <Form.Item name="timeRange" />
      </Form>

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
