import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, message, Modal, Popconfirm, Spin, Tooltip, Tree } from 'antd'
import React, { useEffect, useState } from 'react'

import { useOrganizationStore } from '@/stores/organizationStore'
import { OrganizationTreeNode } from '@/types'

/**
 * 判断是否为根部门（id 为 '0'）
 */
const isRootOrg = (id: string) => id === '0'

/**
 * 部门管理页面
 * 以树状结构展示部门层级，操作按钮在节点 hover 时显示
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

  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchOrganizationList()
  }, [fetchOrganizationList])

  /**
   * 打开新增/编辑弹窗
   * @param type 操作类型：create=新增子部门，update=编辑当前部门
   * @param node 操作的目标节点（新增时为父节点，编辑时为当前节点）
   */
  const openModal = React.useCallback(
    (type: 'create' | 'update', node: OrganizationTreeNode) => {
      setModalType(type)
      setTargetNode(node)
      setModalOpen(true)

      if (type === 'create') {
        // 新增模式：传入的 node 是父节点
        form.resetFields()
        form.setFieldsValue({
          parentId: node.id
        })
      } else {
        // 编辑模式：传入的 node 是当前节点
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
        if (success) {
          message.success('更新成功')
        }
      } else {
        success = await createOrganization(values)
        if (success) {
          message.success('创建成功')
        }
      }

      if (success) {
        setModalOpen(false)
      }
    } catch {
      // 校验失败
    }
  }

  /**
   * 渲染树节点标题（包含操作按钮）
   */
  const renderTitle = React.useCallback(
    (node: OrganizationTreeNode) => {
      return (
        <div
          className="group flex min-h-8 items-center rounded px-2 py-1 transition-colors hover:bg-gray-50"
          onMouseEnter={() => setHoveredKey(node.id)}
          onMouseLeave={() => setHoveredKey(null)}
        >
          <span className="font-medium text-gray-800">{node.name}</span>
          {node.description && (
            <span className="ml-2 text-xs text-gray-400">（{node.description}）</span>
          )}
          {/* hover 时显示操作按钮 */}
          <span
            className={`ml-6 flex items-center gap-1 transition-opacity ${
              hoveredKey === node.id ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Tooltip title="添加子部门">
              <Button
                type="text"
                className="text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                icon={<PlusOutlined />}
                onClick={e => {
                  e.stopPropagation()
                  openModal('create', node)
                }}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                className="text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                icon={<EditOutlined />}
                onClick={e => {
                  e.stopPropagation()
                  openModal('update', node)
                }}
              />
            </Tooltip>
            {/* 根部门不可删除 */}
            {!isRootOrg(node.id) && (
              <Popconfirm
                title="确定删除该部门？"
                description="删除后不可恢复，且如果有子部门或关联用户将删除失败。"
                onConfirm={async e => {
                  e?.stopPropagation()
                  const success = await deleteOrganization(node.id)
                  if (success) {
                    message.success('删除成功')
                  }
                }}
                onCancel={e => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button
                    type="text"
                    danger
                    className="text-gray-400 hover:bg-red-50 hover:text-red-500"
                    icon={<DeleteOutlined />}
                    onClick={e => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </span>
        </div>
      )
    },
    [hoveredKey, openModal, deleteOrganization]
  )

  return (
    <div className="w-full rounded-lg bg-white p-4">
      <Spin spinning={loading}>
        {organizationList.length > 0 ? (
          <Tree<OrganizationTreeNode>
            className="bg-transparent"
            treeData={organizationList}
            fieldNames={{ title: 'name', key: 'id', children: 'children' }}
            titleRender={renderTitle}
            defaultExpandAll
            selectable={false}
            switcherIcon={<DownOutlined />}
            showLine
          />
        ) : (
          <div className="py-12 text-center text-gray-400">暂无部门数据</div>
        )}
      </Spin>

      <Modal
        title={modalType === 'create' ? '新建部门' : '编辑部门'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
        >
          {/* 上级部门展示 */}
          <Form.Item label="上级部门">
            <span className="text-gray-700">
              {modalType === 'create' ? targetNode?.name : targetNode?.parentName || '无'}
            </span>
          </Form.Item>

          {modalType === 'create' && (
            <Form.Item
              name="parentId"
              hidden
              rules={[{ required: true, message: '父部门ID丢失' }]}
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
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              maxLength={200}
              placeholder="请输入描述"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OrganizationManagement
