import {
  Button,
  Collapse,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ScoreEvaluationDetailListItemDto } from 'urbanization-backend/types/dto'

import RichEditor from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { refreshActiveYearData, refreshYearData, toFullPathContent } from '@/utils'

const { Text } = Typography

// 骨架屏（与评分管理列表页风格保持一致）
const DetailSkeleton = () => (
  <div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200"
        >
          <div className="border-b border-gray-200 p-4">
            <Skeleton.Input
              style={{ width: '100px' }}
              active
              size="small"
            />
          </div>
          <div className="p-4">
            <Skeleton
              active
              title={false}
              paragraph={{ rows: 3, width: '100%' }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// 评价详情文案列表页：按年份分组展示，仅包含综合分/匹配文案/是否存在自定义详情
const ScoreEvaluationDetailListPage = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  // 年份
  const years = useScoreStore(state => state.years)
  const yearsLoading = useScoreStore(state => state.yearsLoading)
  const getScoreYears = useScoreStore(state => state.getScoreYears)

  // 列表数据（评价详情-自定义文案）
  const yearDataMap = useScoreStore(state => state.customEvaluationDetailYearDataMap)
  const yearLoadingMap = useScoreStore(state => state.customEvaluationDetailYearLoadingMap)
  const setCustomEvaluationDetailSearchTerm = useScoreStore(
    state => state.setCustomEvaluationDetailSearchTerm
  )
  const getListByYear = useScoreStore(state => state.getCustomEvaluationDetailListByYear)
  const yearQueryMap = useScoreStore(state => state.customEvaluationDetailYearQueryMap)
  const getCustomEvaluationDetail = useScoreStore(state => state.getCustomEvaluationDetail)
  const customEvaluationDetailEditLoading = useScoreStore(
    state => state.customEvaluationDetailEditLoading
  )
  const deleteCustomEvaluationDetail = useScoreStore(state => state.deleteCustomEvaluationDetail)
  const getEvaluationText = useScoreStore(state => state.getEvaluationText)
  const previewContent = useScoreStore(state => state.previewContent)

  // 使用useMemo处理预览内容
  const processedPreviewContent = useMemo(() => {
    return toFullPathContent(previewContent)
  }, [previewContent])

  const [activeCollapseKey, setActiveCollapseKey] = useState<string | ''>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState('')

  // 初始化仅获取年份
  useEffect(() => {
    getScoreYears()
  }, [])

  // 年份变化后默认展开第一年并加载
  useEffect(() => {
    if (years && years.length > 0) {
      const firstYear = years[0]
      setActiveCollapseKey(prev => prev || String(firstYear))
      // 返回列表页时强制刷新，避免显示缓存
      const q = yearQueryMap[firstYear] || { page: 1, pageSize: 10 }
      getListByYear({
        year: firstYear,
        page: q.page,
        pageSize: q.pageSize,
        ...(searchTerm ? { searchTerm } : {})
      })
    }
  }, [years])

  // 列定义
  const columns: ColumnsType<ScoreEvaluationDetailListItemDto> = useMemo(
    () => [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        render: (text, record) => (
          <Space size={4}>
            <span>{text}</span>
            <Text type="secondary">({record.enName})</Text>
          </Space>
        )
      },
      {
        title: '综合评分',
        dataIndex: 'totalScore',
        key: 'totalScore',
        render: v => (v != null ? v.toFixed(3) : '-')
      },
      {
        title: '评价文案（来自评价体系）',
        key: 'matchedText',
        render: (_: unknown, record) =>
          record.hasMatchedText ? (
            <Button
              onClick={async () => {
                try {
                  await getEvaluationText({
                    year: record.year,
                    countryId: record.countryId
                  })
                  setPreviewTitle(`${record.cnName}（${record.year}年）评价体系文案`)
                  setPreviewOpen(true)
                } catch {
                  message.error('获取评价文案失败')
                }
              }}
            >
              查看
            </Button>
          ) : (
            <Button disabled>未匹配到评价文案</Button>
          )
      },
      {
        title: '评价详情文案（可自行配置）',
        dataIndex: 'hasCustomDetail',
        key: 'hasCustomDetail',
        render: (_: unknown, record) =>
          record.hasCustomDetail ? (
            <Button
              loading={customEvaluationDetailEditLoading}
              onClick={async () => {
                await getCustomEvaluationDetail({ year: record.year, countryId: record.countryId })
                setPreviewTitle(`${record.cnName}（${record.year}年）评价详情文案`)
                setPreviewOpen(true)
              }}
            >
              查看
            </Button>
          ) : (
            <Button disabled>未配置</Button>
          )
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() =>
                navigate(`/scoreManagement/detail/modify/${record.countryId}/${record.year}`)
              }
            >
              配置
            </Button>
            {record.hasCustomDetail && (
              <Popconfirm
                title="确定要删除吗？"
                description={
                  <span>
                    此操作不可恢复，请谨慎操作。
                    <br />
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      将被删除：{record.cnName}（{record.year}年）的评价详情文案
                    </span>
                  </span>
                }
                onConfirm={async () => {
                  const success = await deleteCustomEvaluationDetail({
                    year: record.year,
                    countryId: record.countryId
                  })
                  if (success) {
                    message.success('删除成功！')
                    await refreshActiveYearData({
                      activeCollapseKey,
                      years,
                      yearQueryMap,
                      searchTerm,
                      getListByYear
                    })
                  } else {
                    message.error('删除失败，请重试')
                  }
                }}
                onCancel={() => {}}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  color="danger"
                  variant="outlined"
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      }
    ],
    []
  )

  // 编辑页跳转逻辑将于后续“编辑页”任务中实现

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCustomEvaluationDetailSearchTerm(value)
    refreshActiveYearData({
      activeCollapseKey,
      years,
      yearQueryMap,
      searchTerm: value,
      getListByYear
    })
  }

  const onChangePage = (year: number, page: number, pageSize?: number) => {
    getListByYear({ year, page, pageSize: pageSize || 10, ...(searchTerm ? { searchTerm } : {}) })
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex justify-between">
        <Input.Search
          placeholder="按国家名称搜索"
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
      </div>
      {yearsLoading ? (
        <DetailSkeleton />
      ) : years && years.length > 0 ? (
        <Collapse
          accordion
          activeKey={activeCollapseKey}
          onChange={key => {
            const k = Array.isArray(key) ? key[0] : key
            setActiveCollapseKey(k as string)
            const year = Number(k)
            if (year && !yearDataMap[year]) {
              refreshYearData({
                year,
                yearQueryMap,
                searchTerm,
                getListByYear
              })
            }
          }}
          items={(years || []).map(year => {
            const yearData = yearDataMap[year]
            const loading = yearLoadingMap[year]
            const dataSource = yearData?.data || []
            return {
              key: String(year),
              label: <span className="text-base font-semibold">{year}年</span>,
              children: (
                <Table<ScoreEvaluationDetailListItemDto>
                  columns={columns}
                  dataSource={dataSource}
                  rowKey={r => `${r.countryId}-${r.year}`}
                  pagination={{
                    current: yearData?.pagination.page || 1,
                    pageSize: yearData?.pagination.pageSize || 10,
                    total: yearData?.pagination.total || 0,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    onChange: (page, pageSize) => onChangePage(year, page, pageSize || 10)
                  }}
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                />
              )
            }
          })}
        />
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
          <Empty description="暂无数据" />
        </div>
      )}
      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
      >
        <RichEditor
          value={processedPreviewContent}
          readOnly
          height="auto"
        />
      </Modal>
    </div>
  )
}

export default ScoreEvaluationDetailListPage
