import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input, message } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthStore } from '@/stores/authStore'

// 登录页组件
const LoginPage: React.FC = () => {
  // Router hooks
  const navigate = useNavigate()

  // Store 取值
  const login = useAuthStore(s => s.login)
  const error = useAuthStore(s => s.error)

  // React Hooks: useState
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 方法定义
  const onFinish = async (values: { username: string; password: string }) => {
    if (!values.username || !values.password) {
      message.open({ type: 'warning', content: '请输入用户名和密码' })
      return
    }
    setSubmitting(true)
    const success = await login(values)
    setSubmitting(false)
    if (success) {
      message.open({ type: 'success', content: '登录成功' })
      navigate('/home')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700" />

      {/* 浮动装饰元素 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 线条形式动画 */}
        <div
          className="animate-slide-horizontal absolute top-16 left-16 h-1 w-32 bg-white/10"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="animate-wave-vertical absolute top-80 right-24 h-24 w-1 bg-cyan-300/15"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="animate-glow-pulse absolute bottom-32 left-1/4 h-0.5 w-20 rotate-45 bg-blue-300/12"
          style={{ animationDuration: '5s' }}
        />

        {/* 圆形式动画 */}
        <div
          className="animate-scale-bounce absolute top-24 right-32 h-16 w-16 rounded-full bg-white/8"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="animate-orbit absolute bottom-48 left-32 h-12 w-12 rounded-full bg-cyan-200/10"
          style={{ animationDuration: '12s' }}
        />
        <div
          className="animate-breathe absolute top-2/3 right-1/3 h-8 w-8 rounded-full bg-blue-200/15"
          style={{ animationDuration: '4s' }}
        />

        {/* 三角形式动画 */}
        <div
          className="animate-wobble-spin absolute top-48 left-1/5 h-0 w-0 border-r-8 border-b-12 border-l-8 border-r-transparent border-b-white/10 border-l-transparent"
          style={{ animationDuration: '15s' }}
        />
        <div
          className="animate-pendulum absolute right-48 bottom-16 h-0 w-0 border-r-6 border-b-10 border-l-6 border-r-transparent border-b-cyan-300/12 border-l-transparent"
          style={{ animationDuration: '9s' }}
        />
        <div
          className="animate-flip-fade absolute top-12 right-2/5 h-0 w-0 border-r-4 border-b-8 border-l-4 border-r-transparent border-b-blue-400/8 border-l-transparent"
          style={{ animationDuration: '6s' }}
        />

        {/* 圆环形式动画 */}
        <div
          className="animate-ellipse-rotate absolute top-40 left-2/5 h-20 w-20 rounded-full border-2 border-white/12"
          style={{ animationDuration: '12s' }}
        />
        <div
          className="animate-pulse-scale absolute right-1/5 bottom-40 h-16 w-16 rounded-full border-2 border-cyan-300/15"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="animate-spiral absolute top-1/3 left-3/4 h-12 w-12 rounded-full border border-blue-200/10"
          style={{ animationDuration: '14s' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-8">
        <div className="overflow-hidden rounded-2xl border-0 bg-transparent shadow-2xl">
          <div className="flex min-h-[600px]">
            {/* 左侧 - 产品信息区域，带玻璃效果 */}
            <div className="relative hidden lg:flex lg:w-1/2">
              {/* 背景图案 */}
              <div className="absolute inset-0 overflow-hidden border-r border-white/20 bg-white/10 backdrop-blur-md">
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' strokeWidth='1' strokeOpacity='0.3'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Cline x1='0' y1='40' x2='80' y2='40'/%3E%3Cline x1='40' y1='0' x2='40' y2='80'/%3E%3C/g%3E%3C/svg%3E")`
                    }}
                  />
                </div>
              </div>

              <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                {/* 图标和标题在同一行 */}
                <div className="mb-8 flex items-center gap-4">
                  <div className="text-3xl leading-tight font-bold">
                    <div className="mb-2">模版平台</div>
                    <div>模版平台</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧 - 登录表单 */}
            <div className="flex w-full items-center justify-center rounded-r-2xl bg-white p-8 lg:w-1/2">
              <div className="w-full max-w-md">
                {/* 欢迎标题 */}
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">欢迎回来</h2>
                </div>

                <Form
                  form={form}
                  name="login"
                  onFinish={onFinish}
                  autoComplete="off"
                  layout="vertical"
                  className="space-y-6"
                >
                  {/* 用户名字段 */}
                  <div className="space-y-2">
                    <Form.Item
                      label={<span className="text-sm font-medium text-gray-700">用户名</span>}
                      name="username"
                      className="mb-0"
                    >
                      <div className="relative">
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="请输入用户名"
                          autoFocus
                          className="h-12 w-full rounded-md border border-gray-300 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </Form.Item>
                  </div>

                  {/* 密码字段 */}
                  <div className="space-y-2">
                    <Form.Item
                      label={<span className="text-sm font-medium text-gray-700">密码</span>}
                      name="password"
                      className="mb-0"
                    >
                      <div className="relative">
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="请输入密码"
                          className="h-12 w-full rounded-md border border-gray-300 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </Form.Item>
                  </div>

                  {/* 错误信息 */}
                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                      <div className="text-center text-sm text-red-600">{error}</div>
                    </div>
                  )}

                  {/* 登录按钮 */}
                  <Form.Item className="mb-0">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      className="!h-12 w-full rounded-md !bg-gradient-to-r !from-blue-600 !to-cyan-600 text-base font-medium text-white !transition-colors !duration-200 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {submitting ? '登录中...' : '登录'}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 自定义CSS动画样式 */}
      <style>{`
        @keyframes slide-horizontal {
          0% {
            transform: translateX(-100px) scaleX(0.5);
            opacity: 0.3;
          }
          50% {
            transform: translateX(50px) scaleX(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateX(-100px) scaleX(0.5);
            opacity: 0.3;
          }
        }

        @keyframes wave-vertical {
          0%,
          100% {
            transform: translateY(0px) scaleY(1);
          }
          25% {
            transform: translateY(-30px) scaleY(1.5);
          }
          75% {
            transform: translateY(30px) scaleY(0.7);
          }
        }

        @keyframes glow-pulse {
          0%,
          100% {
            opacity: 0.3;
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
          }
        }

        @keyframes scale-bounce {
          0%,
          100% {
            transform: scale(1) translateY(0px);
          }
          25% {
            transform: scale(1.3) translateY(-10px);
          }
          50% {
            transform: scale(0.8) translateY(5px);
          }
          75% {
            transform: scale(1.1) translateY(-5px);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(40px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(40px) rotate(-360deg);
          }
        }

        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.8);
            opacity: 0.1;
          }
        }

        @keyframes wobble-spin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.2);
          }
          50% {
            transform: rotate(180deg) scale(0.8);
          }
          75% {
            transform: rotate(270deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes pendulum {
          0%,
          100% {
            transform: rotate(-15deg) translateY(0px);
          }
          50% {
            transform: rotate(15deg) translateY(-20px);
          }
        }

        @keyframes flip-fade {
          0%,
          100% {
            transform: rotateY(0deg);
            opacity: 0.4;
          }
          50% {
            transform: rotateY(180deg);
            opacity: 0.8;
          }
        }

        @keyframes ellipse-rotate {
          0% {
            transform: rotate(0deg) scaleX(1) scaleY(0.5);
          }
          50% {
            transform: rotate(180deg) scaleX(0.7) scaleY(1.2);
          }
          100% {
            transform: rotate(360deg) scaleX(1) scaleY(0.5);
          }
        }

        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
            border-width: 2px;
          }
          50% {
            transform: scale(1.5);
            border-width: 1px;
          }
        }

        @keyframes spiral {
          0% {
            transform: rotate(0deg) translateX(0px) scale(1);
          }
          25% {
            transform: rotate(90deg) translateX(20px) scale(1.2);
          }
          50% {
            transform: rotate(180deg) translateX(0px) scale(0.8);
          }
          75% {
            transform: rotate(270deg) translateX(-20px) scale(1.1);
          }
          100% {
            transform: rotate(360deg) translateX(0px) scale(1);
          }
        }

        .animate-slide-horizontal {
          animation: slide-horizontal 8s ease-in-out infinite;
        }

        .animate-wave-vertical {
          animation: wave-vertical 6s ease-in-out infinite;
        }

        .animate-glow-pulse {
          animation: glow-pulse 5s ease-in-out infinite;
        }

        .animate-scale-bounce {
          animation: scale-bounce 8s ease-in-out infinite;
        }

        .animate-orbit {
          animation: orbit 12s linear infinite;
        }

        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }

        .animate-wobble-spin {
          animation: wobble-spin 15s ease-in-out infinite;
        }

        .animate-pendulum {
          animation: pendulum 9s ease-in-out infinite;
        }

        .animate-flip-fade {
          animation: flip-fade 6s ease-in-out infinite;
        }

        .animate-ellipse-rotate {
          animation: ellipse-rotate 12s ease-in-out infinite;
        }

        .animate-pulse-scale {
          animation: pulse-scale 10s ease-in-out infinite;
        }

        .animate-spiral {
          animation: spiral 14s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default LoginPage
