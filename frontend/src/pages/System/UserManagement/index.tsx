import { PlusOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect
} from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { SYSTEM_ADMIN_ROLE_NAME } from 'template-backend/src/types/constants'
import type { UserItemRes } from 'template-backend/src/types/dto'

import ResetPasswordModal from '@/components/ResetPasswordModal'

import { useOrganizationStore } from '../../../stores/organizationStore'
import { useRoleStore } from '../../../stores/roleStore'
import { useUserStore } from '../../../stores/userStore'

const UserManagement: React.FC = () => {
  // Store 取值
  const userList = useUserStore(s => s.userList)
  const userTotal = useUserStore(s => s.userTotal)
  const userPageParams = useUserStore(s => s.userPageParams)
  const loading = useUserStore(s => s.loading)
  const fetchUserList = useUserStore(s => s.fetchUserList)
  const updateUserPageParams = useUserStore(s => s.updateUserPageParams)
  const resetUserSearch = useUserStore(s => s.resetUserSearch)
  const createUser = useUserStore(s => s.createUser)
  const updateUser = useUserStore(s => s.updateUser)
  const deleteUser = useUserStore(s => s.deleteUser)
  const roleList = useRoleStore(s => s.roleList)
  const fetchRoleList = useRoleStore(s => s.fetchRoleList)
  const organizationList = useOrganizationStore(s => s.organizationList)
  const fetchOrganizationList = useOrganizationStore(s => s.fetchOrganizationList)

  // 搜索表单实例
  const [searchForm] = Form.useForm()

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserItemRes | null>(null)
  const [form] = Form.useForm()
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserItemRes | null>(null)

  // 初始化加载
  useEffect(() => {
    // 从 Store 恢复筛选条件
    const { name, roleId } = userPageParams
    searchForm.setFieldsValue({
      name: name || '',
      roleId: roleId || undefined
    })
    fetchUserList()
    fetchRoleList()
    fetchOrganizationList()
  }, [])

  // 搜索提交
  const handleSearchSubmit = () => {
    const { name, roleId } = searchForm.getFieldsValue()
    updateUserPageParams({ page: 1, name: name || undefined, roleId })
  }

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields()
    resetUserSearch()
  }

  // 打开编辑/新建弹窗
  const openModal = (user?: UserItemRes) => {
    setEditUser(user || null)
    setModalOpen(true)
    if (user) {
      form.setFieldsValue({ ...user })
    } else {
      form.resetFields()
    }
  }

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

  const openResetModal = (user: UserItemRes) => {
    setResetUser(user)
    setResetModalOpen(true)
  }

  // 表格列定义
  const columns = useMemo(
    () => [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username'
      },
      { title: '姓名', dataIndex: 'name', key: 'name' },
      {
        title: '角色',
        key: 'role',
        render: (_: unknown, record: UserItemRes) => {
          const roleName = record.role?.name || '未分配角色'
          return roleName === SYSTEM_ADMIN_ROLE_NAME ? (
            <Tag color="red">超级管理员</Tag>
          ) : (
            <Tag>{roleName}</Tag>
          )
        }
      },
      {
        title: '所属部门',
        key: 'organization',
        render: (_: unknown, record: UserItemRes) => record.organization?.name || '-'
      },
      { title: '电话', dataIndex: 'phone', key: 'phone' },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: UserItemRes) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => openResetModal(record)}
            >
              重置密码
            </Button>
            <Button
              color="primary"
              variant="outlined"
              onClick={() => openModal(record)}
              disabled={record.username === 'admin'}
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
                    将被删除：用户 {record.name}（{record.username}）
                  </span>
                </span>
              }
              onConfirm={async () => {
                const success = await deleteUser({ id: record.id })
                if (success) {
                  message.success('用户删除成功')
                }
              }}
              disabled={record.username === 'admin'}
              okText="确定"
              cancelText="取消"
            >
              <Button
                color="danger"
                variant="outlined"
                disabled={record.username === 'admin'}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [openModal, openResetModal, deleteUser]
  )

  return (
    <div className="w-full">
      {/* 搜索区域 */}
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearchSubmit}
        >
          <Form.Item name="name">
            <Input
              placeholder="请输入姓名搜索"
              style={{ width: 180 }}
              allowClear
              onPressEnter={handleSearchSubmit}
              onClear={handleSearchSubmit}
            />
          </Form.Item>
          <Form.Item name="roleId">
            <Select
              placeholder="请选择角色搜索"
              allowClear
              style={{ width: 180 }}
              onChange={() => setTimeout(handleSearchSubmit, 0)}
              onClear={() => setTimeout(handleSearchSubmit, 0)}
            >
              {roleList.map(r => (
                <Select.Option
                  key={r.id}
                  value={r.id}
                >
                  {r.name === SYSTEM_ADMIN_ROLE_NAME ? '超级管理员' : r.name}
                </Select.Option>
              ))}
            </Select>
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
          onClick={() => openModal()}
        >
          新建用户
        </Button>
      </div>

      {/* 表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={userList}
        pagination={{
          current: userPageParams.page,
          pageSize: userPageParams.pageSize,
          total: userTotal,
          onChange: (page, pageSize) => updateUserPageParams({ page, pageSize }),
          showSizeChanger: true,
          showTotal: total => `共 ${total} 条`
        }}
        loading={loading}
      />

      {/* 新增/编辑用户弹窗 */}
      <Modal
        title={editUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              disabled={!!editUser}
              maxLength={20}
              placeholder="请输入用户名"
            />
          </Form.Item>
          {!editUser && (
            <>
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
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    }
                  })
                ]}
              >
                <Input.Password
                  maxLength={32}
                  placeholder="请再次输入密码"
                />
              </Form.Item>
            </>
          )}
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
              {roleList.map(r => (
                <Select.Option
                  value={r.id}
                  key={r.id}
                  label={r.name === SYSTEM_ADMIN_ROLE_NAME ? '超级管理员' : r.name}
                >
                  <div>
                    <div>
                      {r.name === SYSTEM_ADMIN_ROLE_NAME ? (
                        <Tag color="red">超级管理员</Tag>
                      ) : (
                        r.name
                      )}
                    </div>
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
            name="organizationId"
            label="所属部门"
          >
            <TreeSelect
              treeData={organizationList}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              allowClear
              placeholder="请选择所属部门"
              treeDefaultExpandAll
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
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <ResetPasswordModal
        open={resetModalOpen}
        userId={resetUser ? String(resetUser.id) : ''}
        userName={resetUser?.name}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  )
}

export default UserManagement
