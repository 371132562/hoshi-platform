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
import { RoleCode } from 'template-backend/src/common/config/constants'
import type { UserItemResDto } from 'template-backend/src/types/dto'

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
  const [editUser, setEditUser] = useState<UserItemResDto | null>(null)
  const [form] = Form.useForm()
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserItemResDto | null>(null)

  // 初始化加载
  useEffect(() => {
    // 从 Store 恢复筛选条件
    const { displayName, roleId } = userPageParams
    searchForm.setFieldsValue({
      displayName: displayName || '',
      roleId: roleId || undefined
    })
    fetchUserList()
    fetchRoleList()
    fetchOrganizationList()
  }, [])

  // 搜索提交
  const handleSearchSubmit = () => {
    const { displayName, roleId } = searchForm.getFieldsValue()
    updateUserPageParams({ page: 1, displayName: displayName || undefined, roleId })
  }

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields()
    resetUserSearch()
  }

  // 打开编辑/新建弹窗
  const openModal = (user?: UserItemResDto) => {
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

  const openResetModal = (user: UserItemResDto) => {
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
      { title: '姓名', dataIndex: 'displayName', key: 'displayName' },
      {
        title: '角色',
        key: 'role',
        render: (_: unknown, record: UserItemResDto) => {
          const roleDisplayName = record.role?.displayName || '未分配角色'
          // 系统管理员角色特殊显示
          const isSystemAdmin = record.role?.code === RoleCode.ADMIN
          return isSystemAdmin ? <Tag color="red">系统管理员</Tag> : <Tag>{roleDisplayName}</Tag>
        }
      },
      {
        title: '所属部门',
        key: 'organization',
        render: (_: unknown, record: UserItemResDto) => record.organization?.name || '-'
      },
      { title: '电话', dataIndex: 'phone', key: 'phone' },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: UserItemResDto) => (
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
              disabled={record.isSystem}
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
                    将被删除：用户 {record.displayName}（{record.username}）
                  </span>
                </span>
              }
              onConfirm={async () => {
                const success = await deleteUser({ id: record.id })
                if (success) {
                  message.success('用户删除成功')
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
          <Form.Item name="displayName">
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
              options={roleList.map(r => {
                return {
                  label: r.isSystem ? '系统管理员' : r.displayName, // 简单处理，系统角色显示特定名称或原名
                  value: r.id
                }
              })}
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
          initialValues={{ displayName: '' }}
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
              optionLabelProp="selectedLabel"
              showSearch={{ optionFilterProp: 'selectedLabel' }}
              options={roleList.map(r => {
                const isSystem = r.isSystem
                return {
                  value: r.id,
                  label: (
                    <div>
                      <div>{isSystem ? <Tag color="red">系统管理员</Tag> : r.displayName}</div>
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
                  ),
                  selectedLabel: isSystem ? '系统管理员' : r.displayName
                }
              })}
            />
          </Form.Item>
          <Form.Item
            name="displayName"
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
        userName={resetUser?.displayName}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  )
}

export default UserManagement
