import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, message, Modal, Popconfirm, Spin, Tooltip, Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import React, { useEffect, useMemo, useState } from 'react'

import { useOrganizationStore } from '@/stores/organizationStore'
import { OrganizationTreeNode } from '@/types'

/**
 * 判断是否为根部门（id 为 '0'）
 */
const isRootOrg = (id: string) => id === '0'

/**
 * 部门管理页面
 * 参考 operation-webapp 组织管理页面样式与功能
 */
const OrganizationManagement: React.FC = () => {
  const organizationList = useOrganizationStore(s => s.organizationList)
  const loading = useOrganizationStore(s => s.loading)
  const fetchOrganizationList = useOrganizationStore(s => s.fetchOrganizationList)
  const createOrganization = useOrganizationStore(s => s.createOrganization)
  const updateOrganization = useOrganizationStore(s => s.updateOrganization)
  const deleteOrganization = useOrganizationStore(s => s.deleteOrganization)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'update'>('create')
  const [targetNode, setTargetNode] = useState<OrganizationTreeNode | null>(null)
  const [form] = Form.useForm()

  // 搜索相关状态
  const [searchValue, setSearchValue] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [autoExpandParent, setAutoExpandParent] = useState(true)

  useEffect(() => {
    fetchOrganizationList()
  }, [fetchOrganizationList])

  // 初始化展开根节点
  useEffect(() => {
    if (organizationList.length > 0 && expandedKeys.length === 0) {
      setExpandedKeys(organizationList.map(item => item.id))
    }
  }, [organizationList])

  /**
   * 打开新增/编辑弹窗
   */
  const openModal = React.useCallback(
    (type: 'create' | 'update', node: OrganizationTreeNode) => {
      setModalType(type)
      setTargetNode(node)
      setModalOpen(true)

      if (type === 'create') {
        form.resetFields()
        form.setFieldsValue({
          parentId: node.id
        })
      } else {
        form.setFieldsValue({
          name: node.name,
          description: node.description
        })
      }
    },
    [form]
  )

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      let success = false

      if (modalType === 'update' && targetNode) {
        success = await updateOrganization({ ...values, id: targetNode.id })
        if (success) message.success('更新成功')
      } else {
        success = await createOrganization(values)
        if (success) message.success('创建成功')
      }

      if (success) setModalOpen(false)
    } catch {
      // 校验失败
    }
  }

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys)
    setAutoExpandParent(false)
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setSearchValue(value)

    // 如果有搜索值，展开所有包含匹配项的路径
    if (value) {
      const getAllKeys = (nodes: OrganizationTreeNode[], keys: React.Key[]) => {
        nodes.forEach(node => {
          keys.push(node.id)
          if (node.children) getAllKeys(node.children, keys)
        })
      }
      const allKeys: React.Key[] = []
      getAllKeys(organizationList, allKeys)
      setExpandedKeys(allKeys)
    } else {
      // 清空搜索时恢复默认展开（根节点）
      setExpandedKeys(organizationList.map(item => item.id))
    }

    setAutoExpandParent(true)
  }

  // 构造 Tree 数据，处理 search 高亮
  const treeData = useMemo(() => {
    const loop = (data: OrganizationTreeNode[]): DataNode[] =>
      data.map(item => {
        const index = item.name.indexOf(searchValue)
        const beforeStr = item.name.substring(0, index)
        const afterStr = item.name.slice(index + searchValue.length)
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span className="font-bold text-red-500">{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{item.name}</span>
          )

        // 节点操作区
        const ops = (
          <span className="ml-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="text"
              size="small"
              className="px-1 text-gray-500 hover:bg-blue-50 hover:text-blue-500"
              icon={<PlusOutlined />}
              onClick={e => {
                e.stopPropagation()
                openModal('create', item)
              }}
            >
              新增子部门
            </Button>
            <Button
              type="text"
              size="small"
              className="px-1 text-gray-500 hover:bg-blue-50 hover:text-blue-500"
              icon={<EditOutlined />}
              onClick={e => {
                e.stopPropagation()
                openModal('update', item)
              }}
            >
              编辑
            </Button>
            {!isRootOrg(item.id) && (
              <Popconfirm
                title="确定删除该部门？"
                description="删除后不可恢复"
                onConfirm={e => {
                  e?.stopPropagation()
                  deleteOrganization(item.id)
                }}
                onCancel={e => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  className="px-1 text-gray-500 hover:bg-red-50 hover:text-red-500"
                  icon={<DeleteOutlined />}
                  onClick={e => e.stopPropagation()}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </span>
        )

        return {
          key: item.id,
          title: (
            <div className="group flex items-center py-1 pr-2">
              <div className="truncate">{title}</div>
              {ops}
            </div>
          ),
          children: item.children ? loop(item.children) : []
        }
      })

    return loop(organizationList)
  }, [organizationList, searchValue, deleteOrganization, openModal])

  return (
    <div className="flex h-full w-full flex-col rounded-lg bg-white p-4">
      {/* 顶部搜索栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="max-w-md flex-1">
          <Input.Search
            placeholder="请输入部门名称搜索"
            allowClear
            onChange={onChange}
            className="w-full"
          />
        </div>
      </div>

      {/* 树区域 */}
      <div className="flex-1 overflow-auto">
        <Spin spinning={loading}>
          {organizationList.length > 0 ? (
            <Tree
              showLine
              switcherIcon={<DownOutlined />}
              treeData={treeData}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={onExpand}
              selectable={false}
              className="w-full"
            />
          ) : (
            <div className="py-12 text-center text-gray-400">暂无部门数据</div>
          )}
        </Spin>
      </div>

      {/* 弹窗 */}
      <Modal
        title={modalType === 'create' ? '新建部门' : '编辑部门'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            label="上级部门"
            className="mb-4"
          >
            <span className="rounded bg-gray-50 px-3 py-1 font-medium text-gray-700">
              {modalType === 'create' ? targetNode?.name : targetNode?.parentName || '无'}
            </span>
          </Form.Item>

          {modalType === 'create' && (
            <Form.Item
              name="parentId"
              hidden
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input
              maxLength={50}
              placeholder="请输入部门名称"
              showCount
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              maxLength={200}
              placeholder="请输入描述"
              showCount
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OrganizationManagement
