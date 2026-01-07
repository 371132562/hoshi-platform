import {
  ClearOutlined,
  DeleteOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Image,
  List,
  message,
  Modal,
  Space,
  Statistic,
  Typography
} from 'antd'
import { FC, useMemo, useState } from 'react'

import useSystemMaintenanceStore from '@/stores/systemMaintenanceStore'
import { buildFullImageUrl } from '@/utils'

const { Text } = Typography

const CleanupPanel: FC = () => {
  const orphanImages = useSystemMaintenanceStore(s => s.orphanImages)
  const scanning = useSystemMaintenanceStore(s => s.scanning)
  const deleting = useSystemMaintenanceStore(s => s.deleting)
  const scanOrphanImages = useSystemMaintenanceStore(s => s.scanOrphanImages)
  const deleteOrphanImages = useSystemMaintenanceStore(s => s.deleteOrphanImages)
  const clearOrphanImages = useSystemMaintenanceStore(s => s.clearOrphanImages)

  const [selected, setSelected] = useState<string[]>([])

  const allChecked = useMemo(() => {
    return orphanImages.length > 0 && selected.length === orphanImages.length
  }, [orphanImages, selected])

  const onToggleAll = (checked: boolean) => {
    setSelected(checked ? orphanImages.slice() : [])
  }

  const onToggleOne = (filename: string, checked: boolean) => {
    setSelected(prev => (checked ? [...prev, filename] : prev.filter(f => f !== filename)))
  }

  const handleScan = async () => {
    setSelected([])
    const result = await scanOrphanImages()
    if (result.success) {
      if (result.count > 0) {
        message.success(result.message)
      } else {
        message.info(result.message)
      }
    } else {
      message.error(result.message)
    }
  }

  const handleDelete = () => {
    if (selected.length === 0) return

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selected.length} 张图片吗？此操作无法恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await deleteOrphanImages(selected)
        if (result) {
          const { deleted, failed } = result
          if (deleted.length > 0) message.success(`成功删除 ${deleted.length} 张图片`)
          if (failed.length > 0) message.error(`${failed.length} 张图片删除失败`)
          setSelected([])
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 顶部统计与操作区 */}
      {/* 顶部统计与操作区 */}
      <div className="mb-4 flex flex-col items-center justify-between gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm md:flex-row">
        <div className="flex items-center gap-6">
          <Statistic
            title="待清理图片"
            value={orphanImages.length}
            prefix={<PictureOutlined />}
            suffix="张"
            styles={{ content: { color: orphanImages.length > 0 ? '#cf1322' : '#3f8600' } }}
          />
          <div className="hidden h-10 w-px bg-gray-200 md:block"></div>
          <div>
            <Text
              type="secondary"
              className="mb-1 block"
            >
              <QuestionCircleOutlined className="mr-1" />
              关于孤立图片
            </Text>
            <Text className="block max-w-md text-xs text-gray-500">
              孤立图片是数据库中无引用但存在于磁盘的文件。清理它们可以释放存储空间。建议定期扫描。
            </Text>
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={scanning}
            onClick={handleScan}
          >
            扫描系统
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={selected.length === 0}
            loading={deleting}
            onClick={handleDelete}
          >
            批量删除 ({selected.length})
          </Button>
        </Space>
      </div>

      {/* 图片列表区 */}
      <Card
        variant="borderless"
        className="shadow-sm"
        title={
          orphanImages.length > 0 && (
            <Checkbox
              checked={allChecked}
              onChange={e => onToggleAll(e.target.checked)}
              indeterminate={selected.length > 0 && selected.length < orphanImages.length}
            >
              全选所有 ({orphanImages.length})
            </Checkbox>
          )
        }
        extra={
          orphanImages.length > 0 && (
            <Button
              type="link"
              onClick={() => clearOrphanImages()}
              icon={<ClearOutlined />}
            >
              清空列表
            </Button>
          )
        }
      >
        <List
          grid={{ gutter: 24, xs: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
          dataSource={orphanImages}
          loading={scanning}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-gray-400">
                    {scanning ? '正在扫描中...' : '暂无孤立图片，系统非常干净 ✨'}
                  </span>
                }
              />
            )
          }}
          renderItem={filename => (
            <List.Item>
              <div
                className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  selected.includes(filename)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:border-gray-200 hover:shadow-md'
                }`}
                onClick={() => onToggleOne(filename, !selected.includes(filename))}
              >
                <div className="relative flex aspect-square items-center justify-center bg-gray-100">
                  {/* 图片 */}
                  <Image
                    src={buildFullImageUrl(filename)}
                    alt={filename}
                    preview={{
                      src: buildFullImageUrl(filename),
                      mask: <div className="text-xs">点击预览</div>
                    }}
                    height="100%"
                    width="100%"
                    className="object-cover"
                    onClick={e => e.stopPropagation()} // 阻止冒泡，避免触发选择
                  />
                  {/* 选择框 */}
                  <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                      checked={selected.includes(filename)}
                      className="scale-110"
                      onClick={e => e.stopPropagation()} // 阻止 checkbox 点击触发外层 div click
                      onChange={e => onToggleOne(filename, e.target.checked)}
                    />
                  </div>
                </div>
                <div className="p-2 text-center">
                  <Text
                    ellipsis
                    className="block w-full text-xs text-gray-500"
                    title={filename}
                  >
                    {filename}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* 提示 Alert */}
      {orphanImages.length > 0 && (
        <Alert
          title="安全提示"
          description="删除操作不可逆，请在删除前确认图片确实不再需要。建议先备份重要数据。"
          type="warning"
          showIcon
        />
      )}
    </div>
  )
}

export default CleanupPanel
