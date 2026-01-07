import { PlusOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import { Button, Input, message, Popconfirm, Space, Table } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table/interface'
import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import useArticleStore from '@/stores/articleStore'
import { dayjs } from '@/utils/dayjs'

import type { ArticleMetaItem } from '../../types'

const ArticleManagement: React.FC = () => {
  // Router hooks
  const navigate = useNavigate()

  // Store 取值
  const articles = useArticleStore(state => state.articles)
  const total = useArticleStore(state => state.total)
  const currentPage = useArticleStore(state => state.currentPage)
  const pageSize = useArticleStore(state => state.pageSize)
  const loading = useArticleStore(state => state.loading)
  const searchTitle = useArticleStore(state => state.searchTitle)
  const getArticleList = useArticleStore(state => state.getArticleList)
  const setSearchTitle = useArticleStore(state => state.setSearchTitle)
  const deleteArticle = useArticleStore(state => state.deleteArticle)

  // React Hooks: useEffect
  useEffect(() => {
    getArticleList(1, 10, '')
  }, [])

  const onSearch = () => {
    getArticleList(1, pageSize, searchTitle)
  }

  const onReset = () => {
    setSearchTitle('')
    getArticleList(1, pageSize, '')
  }

  const handleTableChange = (pagination: TablePaginationConfig) => {
    const current = pagination.current ?? 1
    const size = pagination.pageSize ?? pageSize
    getArticleList(current, size)
  }

  // Const 变量 - 派生变量
  const columns = useMemo(
    () => [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title'
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        key: 'updateTime',
        render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: ArticleMetaItem) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => navigate(`/article/modify/${record.id}`)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这篇文章吗？"
              description={
                <span>
                  此操作不可恢复，请谨慎操作。
                  <br />
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    将被删除：文章《{record.title}》
                  </span>
                </span>
              }
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                danger
                disabled={record.title === '关于我们'} // 示例：保护特定文章
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [navigate]
  )

  const handleDelete = async (id: string) => {
    const success = await deleteArticle(id)
    if (success) {
      message.success('文章删除成功')
      // 删除逻辑中 store 已经处理了刷新，但这里为了保险或特定逻辑可以再次调用，不过 store 里 deleteArticle 已经调用了 refresh
    }
  }

  return (
    <div className="w-full">
      {/* 搜索区域 */}
      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="请输入标题搜索"
          value={searchTitle}
          onChange={e => setSearchTitle(e.target.value)}
          style={{ width: 180 }}
          allowClear
          onPressEnter={onSearch}
          onClear={() => {
            setSearchTitle('')
            getArticleList(1, pageSize, '')
          }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={onSearch}
        >
          搜索
        </Button>
        <Button
          icon={<UndoOutlined />}
          onClick={onReset}
        >
          重置
        </Button>
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/article/create')}
        >
          新增文章
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={articles}
        rowKey="id"
        pagination={{
          total,
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 条`
        }}
        loading={loading}
        onChange={handleTableChange}
      />
    </div>
  )
}

export default ArticleManagement
