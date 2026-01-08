import { PlusOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import { Button, Form, Input, message, Popconfirm, Space, Table } from 'antd'
import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { ArticleMetaItemRes } from 'template-backend/src/types/dto'

import useArticleStore from '@/stores/articleStore'
import { dayjs } from '@/utils/dayjs'

const ArticleManagement: React.FC = () => {
  // Router hooks
  const navigate = useNavigate()

  // Store 取值
  const articles = useArticleStore(state => state.articles)
  const total = useArticleStore(state => state.total)
  const articlePageParams = useArticleStore(state => state.articlePageParams)
  const loading = useArticleStore(state => state.loading)
  const fetchArticleList = useArticleStore(state => state.fetchArticleList)
  const updateArticlePageParams = useArticleStore(state => state.updateArticlePageParams)
  const resetArticleSearch = useArticleStore(state => state.resetArticleSearch)
  const deleteArticle = useArticleStore(state => state.deleteArticle)

  // Form 实例
  const [searchForm] = Form.useForm()

  // React Hooks: useEffect
  useEffect(() => {
    // 初始化时从 Store 恢复筛选条件
    searchForm.setFieldsValue({ title: articlePageParams.title || '' })
    fetchArticleList()
  }, [])

  // 搜索提交
  const handleSearchSubmit = () => {
    const { title } = searchForm.getFieldsValue()
    updateArticlePageParams({ page: 1, title: title || undefined })
  }

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields()
    resetArticleSearch()
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
        render: (_: unknown, record: ArticleMetaItemRes) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => navigate(`/admin/article/modify/${record.id}`)}
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
                color="danger"
                variant="outlined"
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
    const success = await deleteArticle({ id })
    if (success) {
      message.success('文章删除成功')
    }
  }

  return (
    <div className="w-full">
      {/* 搜索区域 */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearchSubmit}
        >
          <Form.Item name="title">
            <Input
              placeholder="请输入标题搜索"
              style={{ width: 180 }}
              allowClear
              onPressEnter={handleSearchSubmit}
              onClear={handleSearchSubmit}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
              >
                搜索
              </Button>
              <Button
                icon={<UndoOutlined />}
                onClick={handleResetSearch}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/article/create')}
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
          current: articlePageParams.page,
          pageSize: articlePageParams.pageSize,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 条`
        }}
        loading={loading}
        onChange={pagination =>
          updateArticlePageParams({ page: pagination.current, pageSize: pagination.pageSize })
        }
      />
    </div>
  )
}

export default ArticleManagement
