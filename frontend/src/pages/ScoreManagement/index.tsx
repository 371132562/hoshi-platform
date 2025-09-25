/* 评分管理列表页 */
import { Button, Collapse, Empty, Input, message, Popconfirm, Skeleton, Space, Table } from 'antd'
import type { SortOrder } from 'antd/es/table/interface'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { PaginatedYearScoreData, ScoreDataItem } from 'urbanization-backend/types/dto'

import { SCORE_DIMENSIONS } from '@/config/dataImport'
import useScoreStore from '@/stores/scoreStore'
import { refreshActiveYearData, refreshYearData } from '@/utils'

const { Search } = Input

const ScoreManagementSkeleton = () => (
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

const ScoreManagement = () => {
  // 年份懒加载相关
  const years = useScoreStore(state => state.years)
  const yearsLoading = useScoreStore(state => state.yearsLoading)
  const yearDataMap = useScoreStore(state => state.yearDataMap)
  const yearLoadingMap = useScoreStore(state => state.yearLoadingMap)
  const yearQueryMap = useScoreStore(state => state.yearQueryMap)
  const getYears = useScoreStore(state => state.getScoreYears)
  const getListByYear = useScoreStore(state => state.getScoreListByYear)
  const setGlobalSearchTerm = useScoreStore(state => state.setGlobalSearchTerm)
  const deleteData = useScoreStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  const [yearSortMap, setYearSortMap] = useState<
    Record<number, { field: string | null; order: 'asc' | 'desc' | null }>
  >({})
  const [activeCollapseKey, setActiveCollapseKey] = useState<string | ''>('')
  const navigate = useNavigate()

  // 初始化仅获取年份
  useEffect(() => {
    getYears()
  }, [])

  // 年份变化后默认展开第一年并加载
  useEffect(() => {
    if (years && years.length > 0) {
      const firstYear = years[0]
      setActiveCollapseKey(prev => prev || String(firstYear))
      // 返回列表页时强制刷新，避免显示缓存
      const q = yearQueryMap[firstYear] || { page: 1, pageSize: 10 }
      const sort = yearSortMap[firstYear]
      getListByYear({
        year: firstYear,
        page: q.page,
        pageSize: q.pageSize,
        ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
        ...(searchTerm ? { searchTerm } : {})
      })
    }
  }, [years])

  const handleDelete = async (record: ScoreDataItem) => {
    const success = await deleteData({ id: record.id })
    if (success) {
      message.success('删除成功')
      const y = record.year
      const q = yearQueryMap[y] || { page: 1, pageSize: 10 }
      const current = yearDataMap[y]
      const remainingCount = (current?.data?.length || 0) - 1
      const totalPages = Math.ceil(((current?.pagination.total || 1) - 1) / (q.pageSize || 10))
      const nextPage =
        remainingCount === 0 && (q.page || 1) > 1
          ? Math.min((q.page || 1) - 1, totalPages)
          : q.page || 1
      const sort = yearSortMap[y]
      getListByYear({
        year: y,
        page: nextPage,
        pageSize: q.pageSize || 10,
        ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
        ...(searchTerm ? { searchTerm } : {})
      })
    } else {
      message.error('删除失败')
    }
  }

  const getCountryTableColumns = (year: number) => {
    const sort = yearSortMap[year]
    const baseColumns = [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        fixed: 'left' as const,
        width: 150,
        render: (_: any, record: ScoreDataItem) => (
          <div className="flex flex-col">
            <span className="truncate font-medium">{record.cnName}</span>
            <span className="truncate text-xs text-gray-500">{record.enName}</span>
          </div>
        )
      }
    ]

    const scoreColumns = SCORE_DIMENSIONS.map(dim => ({
      title: dim.cnName,
      dataIndex: dim.enName,
      key: dim.enName,
      width: 150,
      render: (_: any, record: ScoreDataItem) => {
        const value = record[dim.enName as keyof ScoreDataItem]
        if (typeof value === 'number') return value.toFixed(2)
        if (value instanceof Date) return value.toLocaleDateString()
        return String(value || '')
      },
      sorter: true,
      sortOrder:
        sort?.field === dim.enName
          ? sort?.order === 'asc'
            ? 'ascend'
            : sort?.order === 'desc'
              ? 'descend'
              : undefined
          : (undefined as SortOrder | undefined)
    }))

    const actionColumn = {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: ScoreDataItem) => (
        <Space>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => navigate(`/scoreManagement/modify/${record.countryId}/${year}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条数据吗？"
            description={
              <span>
                此操作不可恢复，请谨慎操作。
                <br />
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  将被删除：{record.cnName}（{record.year}年）的评分数据
                </span>
              </span>
            }
            onConfirm={() => handleDelete(record)}
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
        </Space>
      )
    }

    return [...baseColumns, ...scoreColumns, actionColumn]
  }

  // 处理分页年份数据的分页变更
  const handleYearPaginationChange = (year: number, page: number, pageSize: number) => {
    const sort = yearSortMap[year]
    getListByYear({
      year,
      page,
      pageSize,
      ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
      ...(searchTerm ? { searchTerm } : {})
    })
  }

  const handleTableChange =
    (year: number) => async (_pagination: any, _filters: any, sorter: any, extra: any) => {
      if (extra && extra.action === 'sort') {
        const orderVal =
          sorter && sorter.order === 'ascend'
            ? 'asc'
            : sorter && sorter.order === 'descend'
              ? 'desc'
              : null
        const fieldVal = orderVal ? (sorter.field as string) : null
        const newSortState = { field: fieldVal, order: orderVal as 'asc' | 'desc' | null }
        setYearSortMap(prev => ({ ...prev, [year]: newSortState }))
        await refreshYearData({
          year,
          yearQueryMap,
          searchTerm,
          getListByYear,
          yearSortMap: { [year]: newSortState }
        })
      }
    }

  const handleSearch = async (value: string) => {
    setSearchTerm(value)
    setGlobalSearchTerm(value)
    await refreshActiveYearData({
      activeCollapseKey,
      years,
      yearQueryMap,
      searchTerm: value,
      getListByYear,
      yearSortMap
    })
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex justify-between">
        <Search
          placeholder="按国家名称搜索"
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
      </div>
      {yearsLoading ? (
        <ScoreManagementSkeleton />
      ) : years && years.length > 0 ? (
        <Collapse
          accordion
          activeKey={activeCollapseKey}
          onChange={key => {
            const k = Array.isArray(key) ? key[0] : key
            setActiveCollapseKey(k as string)
            const year = Number(k)
            if (year && !yearDataMap[year]) {
              const q = yearQueryMap[year] || { page: 1, pageSize: 10 }
              const sort = yearSortMap[year]
              getListByYear({
                year,
                page: q.page,
                pageSize: q.pageSize,
                ...(sort?.field && sort?.order
                  ? { sortField: sort.field, sortOrder: sort.order }
                  : {}),
                ...(searchTerm ? { searchTerm } : {})
              })
            }
          }}
          items={years.map((year: number) => {
            const yearData: PaginatedYearScoreData | undefined = yearDataMap[year]
            const loading = yearLoadingMap[year]
            return {
              key: String(year),
              label: <span className="text-base font-semibold">{year}年</span>,
              children: (
                <Table
                  columns={getCountryTableColumns(year)}
                  dataSource={yearData?.data || []}
                  rowKey="id"
                  onChange={handleTableChange(year)}
                  pagination={{
                    current: yearData?.pagination.page || 1,
                    pageSize: yearData?.pagination.pageSize || 10,
                    total: yearData?.pagination.total || 0,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    onChange: (page, pageSize) =>
                      handleYearPaginationChange(year, page, pageSize || 10)
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
    </div>
  )
}

export default ScoreManagement
