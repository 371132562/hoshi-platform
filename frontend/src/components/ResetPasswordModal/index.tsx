import { Form, Input, message, Modal } from 'antd'
import { FC, useEffect, useState } from 'react'

import { useUserStore } from '@/stores/userStore'

interface ResetPasswordModalProps {
  open: boolean
  userId: string
  userName?: string
  onCancel: () => void
  onSuccess?: () => void
}

/**
 * 通用重置密码弹窗组件
 * 内部调用 userStore.resetUserPassword 完成密码重置
 * 包含新密码和确认密码两个字段，自动校验两次输入是否一致
 */
const ResetPasswordModal: FC<ResetPasswordModalProps> = ({
  open,
  userId,
  userName,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const resetUserPassword = useUserStore(state => state.resetUserPassword)

  // 弹窗关闭时重置表单
  useEffect(() => {
    if (!open) {
      form.resetFields()
    }
  }, [open, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const success = await resetUserPassword({
        id: userId,
        newPassword: values.newPassword
      })
      if (success) {
        message.success('密码重置成功')
        form.resetFields()
        onSuccess?.()
        onCancel()
      }
    } finally {
      setLoading(false)
    }
  }

  const title = userName ? `重置密码 - ` + userName : '重置密码'

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form
        form={form}
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
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              }
            })
          ]}
        >
          <Input.Password
            maxLength={32}
            placeholder="请再次输入新密码"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ResetPasswordModal
