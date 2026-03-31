import { PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag
} from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { RoleCode } from 'template-backend/src/common/config/constants'
import type { RoleListItemResDto } from 'template-backend/src/types/dto'

import { getMenuOptionsForRoleEdit } from '../../../router/routesConfig'
import { useRoleStore } from '../../../stores/roleStore'

// 角色管理页面
const RoleManagement: React.FC = () => {
  const roleList = useRoleStore(s => s.roleList)
  const loading = useRoleStore(s => s.loading)
  const fetchRoleList = useRoleStore(s => s.fetchRoleList)
  const createRole = useRoleStore(s => s.createRole)
  const updateRole = useRoleStore(s => s.updateRole)
  const deleteRole = useRoleStore(s => s.deleteRole)
  const assignRoleRoutes = useRoleStore(s => s.assignRoleRoutes)

  const [modalOpen, setModalOpen] = useState(false)
  const [editRole, setEditRole] = useState<RoleListItemResDto | null>(null)
  const [form] = Form.useForm()
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignRole, setAssignRole] = useState<RoleListItemResDto | null>(null)
  const [assignForm] = Form.useForm()

  useEffect(() => {
    fetchRoleList()
  }, [])

  const openModal = (role?: RoleListItemResDto) => {
    setEditRole(role || null)
    setModalOpen(true)
    if (role) {
      form.setFieldsValue({ ...role })
    } else {
      form.resetFields()
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    let success = false
    if (editRole) {
      success = await updateRole({ ...values, id: editRole.id })
      if (success) {
        message.success('角色更新成功')
      }
    } else {
      success = await createRole(values)
      if (success) {
        message.success('角色创建成功')
      }
    }
    if (success) {
      setModalOpen(false)
    }
  }

  const openAssignModal = (role: RoleListItemResDto) => {
    setAssignRole(role)
    setAssignModalOpen(true)
    assignForm.setFieldsValue({ allowedRoutes: role.allowedRoutes })
  }

  const handleAssignOk = async () => {
    const values = await assignForm.validateFields()
    if (assignRole) {
      const success = await assignRoleRoutes({
        id: assignRole.id,
        allowedRoutes: values.allowedRoutes
      })
      if (success) {
        message.success('权限分配成功')
        setAssignModalOpen(false)
      }
    }
  }

  const menuOptions = getMenuOptionsForRoleEdit()

  const columns = useMemo(
    () => [
      {
        title: '角色编码',
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: '角色名称',
        dataIndex: 'displayName',
        key: 'displayName',
        render: (v: string, record: RoleListItemResDto) => {
          return record.isSystem ? <Tag color="red">{v}</Tag> : v
        }
      },
      { title: '描述', dataIndex: 'description', key: 'description' },
      { title: '用户数', dataIndex: 'userCount', key: 'userCount' },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: RoleListItemResDto) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => openAssignModal(record)}
              disabled={record.code === RoleCode.ADMIN} // 仅系统管理员(admin)拥有所有权限，无需分配
            >
              分配权限
            </Button>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => openModal(record)}
              disabled={record.isSystem}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除该角色？"
              description={
                <span>
                  此操作不可恢复，请谨慎操作。
                  <br />
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    将被删除：角色 {record.displayName}
                  </span>
                </span>
              }
              onConfirm={async () => {
                const success = await deleteRole({ id: record.id })
                if (success) {
                  message.success('角色删除成功')
                }
              }}
              disabled={record.isSystem}
              okText="确定"
              cancelText="取消"
            >
              <Button
                color="danger"
                variant="outlined"
                disabled={record.isSystem}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [openModal, openAssignModal, deleteRole]
  )

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新增角色
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={roleList}
        pagination={false}
        loading={loading}
      />
      {/* 新增/编辑角色弹窗 */}
      <Modal
        title={editRole ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ code: '', displayName: '', description: '' }}
        >
          <Form.Item
            name="code"
            label="角色编码（唯一标识，不可重复）"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input
              disabled={!!editRole} // 编辑时不可修改编码
              maxLength={20}
              placeholder="请输入角色编码 (e.g. admin)"
              showCount
            />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="角色显示名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input
              maxLength={20}
              placeholder="请输入角色名称"
              showCount
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input
              maxLength={50}
              placeholder="请输入描述"
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
      {/* 分配权限弹窗 */}
      <Modal
        title="分配菜单权限"
        open={assignModalOpen}
        onOk={handleAssignOk}
        onCancel={() => setAssignModalOpen(false)}
        destroyOnHidden
      >
        {/* 说明提示：系统管理菜单为超级管理员默认权限，不允许分配 */}
        <Alert
          title="提示"
          description="系统管理 菜单为系统管理员默认权限，不支持分配。"
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <Form
          form={assignForm}
          layout="vertical"
        >
          <Form.Item
            name="allowedRoutes"
            label="可访问菜单"
            rules={[{ required: true, message: '请选择菜单权限' }]}
          >
            <Select
              mode="multiple"
              options={menuOptions}
              showSearch={{ optionFilterProp: 'label' }}
              maxTagCount={6}
              placeholder="请选择可访问菜单"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RoleManagement
