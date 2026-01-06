import { KeyOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, MenuProps, message, Tag } from 'antd'
import { FC, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import ResetPasswordModal from '@/components/ResetPasswordModal'
import { useAuthStore } from '@/stores/authStore'

/**
 * 用户头像下拉菜单组件
 * 提取自 Layout 组件，负责展示用户信息、修改密码及退出登录操作
 */
const UserDropdown: FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  // 修改密码弹窗状态
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const userMenuItems: MenuProps['items'] = useMemo(
    () =>
      user
        ? [
            {
              key: 'userInfo',
              label: (
                <div
                  className="max-w-[340px] min-w-[280px] rounded-lg bg-white px-4 py-3"
                  style={{ lineHeight: 1.6 }}
                >
                  <div className="mb-2 text-base font-semibold text-gray-800">{user.name}</div>
                  <div className="mb-2 flex items-center text-sm text-gray-600">
                    <span className="mr-2 text-gray-400">用户名：</span>
                    <span className="font-mono">{user.username || '-'}</span>
                  </div>
                  <div className="mb-2 flex items-center text-sm text-gray-600">
                    <span className="mr-2 text-gray-400">角色：</span>
                    <span>
                      {(user.role?.name === 'admin' ? (
                        <Tag color="red">超级管理员</Tag>
                      ) : (
                        user.role?.name
                      )) || '-'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2 text-gray-400">部门：</span>
                    <span>{user.department || '-'}</span>
                  </div>
                </div>
              ),
              disabled: true
            },
            { type: 'divider' },
            {
              key: 'changePassword',
              label: <div className="px-2 py-1">修改密码</div>,
              icon: <KeyOutlined />,
              onClick: () => {
                setResetModalOpen(true)
              }
            },
            {
              key: 'logout',
              label: <div className="px-2 py-1 text-red-600 hover:text-red-700">退出登录</div>,
              icon: <LogoutOutlined className="!text-red-600" />,
              onClick: () => {
                const success = logout()
                if (success) {
                  message.success('退出成功')
                }
                navigate('/home')
              }
            }
          ]
        : [
            {
              key: 'guestInfo',
              label: (
                <div
                  className="max-w-[340px] min-w-[280px] rounded-lg bg-white px-4 py-3"
                  style={{ lineHeight: 1.6 }}
                >
                  <div className="mb-2 text-base font-semibold text-gray-800">访客模式</div>
                  <div className="text-sm text-gray-600">登录后可使用全部功能</div>
                </div>
              ),
              disabled: true
            },
            { type: 'divider' },
            {
              key: 'login',
              label: <div className="px-2 py-1 text-blue-600 hover:text-blue-700">立即登录</div>,
              icon: <LoginOutlined />,
              onClick: () => {
                navigate('/login')
              }
            }
          ],
    [user, logout, navigate]
  )

  return (
    <>
      <div className="flex-shrink-0">
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['hover']}
          classNames={{ root: 'user-info-dropdown' }}
        >
          <div
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/10"
            title={user?.name || '访客'}
          >
            <Avatar
              icon={<UserOutlined />}
              className={`h-8 w-8 cursor-pointer text-sm hover:opacity-80 ${
                user ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
              style={{ width: 32, height: 32 }}
            />
            <span className="max-w-[120px] truncate text-sm font-medium text-white">
              {user?.name || '访客'}
            </span>
          </div>
        </Dropdown>
      </div>

      {/* 修改密码弹窗 */}
      {user && (
        <ResetPasswordModal
          open={resetModalOpen}
          userId={String(user.id)}
          userName={user.name}
          onCancel={() => setResetModalOpen(false)}
        />
      )}
    </>
  )
}

export default UserDropdown
