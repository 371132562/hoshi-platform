import { PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  TreeSelect
} from 'antd'
import React, { useEffect, useState } from 'react'

import { OrganizationTreeNode, useOrganizationStore } from '../../../stores/organizationStore'

const OrganizationManagement: React.FC = () => {
  const organizationList = useOrganizationStore(s => s.organizationList)
  const loading = useOrganizationStore(s => s.loading)
  const fetchOrganizationList = useOrganizationStore(s => s.fetchOrganizationList)
  const createOrganization = useOrganizationStore(s => s.createOrganization)
  const updateOrganization = useOrganizationStore(s => s.updateOrganization)
  const deleteOrganization = useOrganizationStore(s => s.deleteOrganization)

  const [modalOpen, setModalOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<OrganizationTreeNode | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchOrganizationList()
  }, [])

  const openModal = (org?: OrganizationTreeNode, parentId?: string) => {
    setEditOrg(org || null)
    setModalOpen(true)
    if (org) {
      form.setFieldsValue({
        name: org.name,
        parentId: org.parentId,
        sort: org.sort,
        description: org.description
      })
    } else {
      form.resetFields()
      if (parentId) {
        form.setFieldValue('parentId', parentId)
      } else {
        form.setFieldValue('sort', 0)
      }
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      let success = false
      if (editOrg) {
        success = await updateOrganization({ ...values, id: editOrg.id })
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

  const columns = [
    {
      title: '组织名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: OrganizationTreeNode) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => openModal(undefined, record.id)}
          >
            添加子项
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该组织？"
            description="删除后不可恢复，且如果有子组织或关联用户将删除失败。"
            onConfirm={async () => {
              const success = await deleteOrganization(record.id)
              if (success) {
                message.success('删除成功')
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold"></h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新建根组织
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(organizationList) ? organizationList : []}
          pagination={false}
          expandable={{ defaultExpandAllRows: true }}
        />
      </Spin>

      <Modal
        title={editOrg ? '编辑组织' : '新建组织'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="parentId"
            label="上级组织"
          >
            <TreeSelect
              treeData={organizationList}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              allowClear
              placeholder="留空则作为根组织"
              treeDefaultExpandAll
              disabled={!!editOrg} // 编辑时暂不支持修改父节点以简化循环检测逻辑，如需支持需在前端过滤掉自己及子节点
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="组织名称"
            rules={[{ required: true, message: '请输入组织名称' }]}
          >
            <Input
              maxLength={50}
              placeholder="请输入组织名称"
            />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入排序值"
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
