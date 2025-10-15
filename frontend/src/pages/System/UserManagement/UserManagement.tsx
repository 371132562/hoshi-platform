import { PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag
} from 'antd'
import React, { useEffect, useState } from 'react'

import { useRoleStore } from '../../../stores/roleStore'
import { useUserStore } from '../../../stores/userStore'
import { UserItem } from '../../../types'

const UserManagement: React.FC = () => {
  const userList = useUserStore(s => s.userList)
  const loading = useUserStore(s => s.loading)
  const fetchUserList = useUserStore(s => s.fetchUserList)
  const createUser = useUserStore(s => s.createUser)
  const updateUser = useUserStore(s => s.updateUser)
  const deleteUser = useUserStore(s => s.deleteUser)
  const resetUserPassword = useUserStore(s => s.resetUserPassword)

  const roleList = useRoleStore(s => s.roleList)
  const fetchRoleList = useRoleStore(s => s.fetchRoleList)

  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [form] = Form.useForm()
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserItem | null>(null)
  const [resetForm] = Form.useForm()

  useEffect(() => {
    fetchUserList()
    fetchRoleList()
  }, [fetchUserList, fetchRoleList])

  // 打开新建/编辑弹窗
  const openModal = (user?: UserItem) => {
    setEditUser(user || null)
    setModalOpen(true)
    if (user) {
      form.setFieldsValue({ ...user })
    } else {
      form.resetFields()
    }
  }

  // 提交新建/编辑
  const handleOk = async () => {
    const values = await form.validateFields()
    let success = false
    if (editUser) {
      success = await updateUser({ ...values, id: editUser.id })
      if (success) {
        message.success('用户更新成功')
      }
    } else {
      success = await createUser(values)
      if (success) {
        message.success('用户创建成功')
      }
    }
    if (success) {
      setModalOpen(false)
    }
  }

  // 打开重置密码弹窗
  const openResetModal = (user: UserItem) => {
    setResetUser(user)
    setResetModalOpen(true)
    resetForm.resetFields()
  }

  // 提交重置密码
  const handleResetOk = async () => {
    const values = await resetForm.validateFields()
    if (resetUser) {
      const success = await resetUserPassword({
        id: String(resetUser.id),
        newPassword: values.newPassword
      })
      if (success) {
        message.success('密码重置成功')
        setResetModalOpen(false)
      }
    }
  }

  const columns = [
    {
      title: '用户编号',
      dataIndex: 'code',
      key: 'code'
    },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    {
      title: '角色',
      key: 'role',
      render: (_: unknown, record: UserItem) => {
        const roleName = record.role?.name || '未分配角色'
        return roleName === 'admin' ? <Tag color="red">超级管理员</Tag> : <Tag>{roleName}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserItem) => (
        <Space>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => openResetModal(record)}
          >
            重置密码
          </Button>
          <Button
            onClick={() => openModal(record)}
            disabled={record.code === '88888888'}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该用户？"
            description={
              <span>
                此操作不可恢复，请谨慎操作。
                <br />
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  将被删除：用户 {record.name}（{record.code}）
                </span>
              </span>
            }
            onConfirm={async () => {
              const success = await deleteUser({ id: record.id })
              if (success) {
                message.success('用户删除成功')
              }
            }}
            disabled={record.code === '88888888'}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              disabled={record.code === '88888888'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold"></h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新建用户
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={userList}
          pagination={false}
        />
      </Spin>
      {/* 新建/编辑用户弹窗 */}
      <Modal
        title={editUser ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '', department: '' }}
        >
          <Form.Item
            name="code"
            label="用户编号"
            rules={[{ required: true, message: '请输入用户编号' }]}
          >
            <Input
              disabled={!!editUser}
              maxLength={20}
              placeholder="请输入用户编号"
            />
          </Form.Item>
          <Form.Item
            name="roleId"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              allowClear
              placeholder="请选择角色"
              optionLabelProp="label"
            >
              {/* 下拉项：若为超级管理员，显示与表格一致的红色标签样式，并展示角色描述 */}
              {roleList.map(r => (
                <Select.Option
                  value={r.id}
                  key={r.id}
                  label={r.name === 'admin' ? '超级管理员' : r.name}
                >
                  <div>
                    <div>{r.name === 'admin' ? <Tag color="red">超级管理员</Tag> : r.name}</div>
                    {r.description && (
                      <div
                        style={{
                          color: '#8c8c8c',
                          fontSize: '12px',
                          marginTop: '2px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        {r.description}
                      </div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input
              maxLength={20}
              placeholder="请输入姓名"
            />
          </Form.Item>
          <Form.Item
            name="department"
            label="部门"
            rules={[{ required: true, message: '请输入部门' }]}
          >
            <Input
              maxLength={20}
              placeholder="请输入部门"
            />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input
              maxLength={50}
              placeholder="请输入邮箱"
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
          >
            <Input
              maxLength={20}
              placeholder="请输入电话"
            />
          </Form.Item>
          {!editUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[{ required: true, message: '请输入初始密码' }]}
            >
              <Input.Password
                maxLength={32}
                placeholder="请输入初始密码"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
      {/* 重置密码弹窗 */}
      <Modal
        title="重置用户密码"
        open={resetModalOpen}
        onOk={handleResetOk}
        onCancel={() => setResetModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={resetForm}
          layout="vertical"
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password
              maxLength={32}
              placeholder="请输入新密码"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
