import { Button, Modal } from 'antd'
import { FC, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import useAIStore from '@/stores/aiStore'

/**
 * AI 总结弹窗组件的属性类型定义
 */
type AISummaryModalProps = {
  /** 国家ID，用于请求 AI 总结 */
  countryId: string
  /** 年份，用于请求 AI 总结 */
  year: string
  /** 国家名称，用于显示在界面上 */
  countryName?: string
}

/**
 * AI 总结弹窗组件
 *
 * 功能特性：
 * 1. 提供 AI 总结按钮，点击后打开弹窗
 * 2. 集成 SSE 流式响应，实时显示 AI 生成内容
 * 3. 支持 Markdown 渲染
 * 4. 提供复制功能
 * 5. 完整的错误处理和用户反馈
 *
 * @param props 组件属性
 * @returns AI 总结弹窗组件
 */
const AISummaryModal: FC<AISummaryModalProps> = ({ countryId, year, countryName }) => {
  // 内部状态管理
  /** 控制弹窗是否可见 */
  const [modalVisible, setModalVisible] = useState(false)
  // 仅保留正式文案，不再提供原始内容调试视图

  // 从 AI Store 获取状态和方法
  /** 是否正在生成 AI 总结 */
  const aiStreaming = useAIStore(state => state.streaming)
  /** AI 生成的总结内容 */
  const aiContent = useAIStore(state => state.content)
  /** AI 生成过程中的错误信息 */
  const aiError = useAIStore(state => state.error)
  /** 开始生成 AI 总结的方法 */
  const startAISummary = useAIStore(state => state.startAISummary)
  /** 停止生成 AI 总结的方法 */
  const stopAISummary = useAIStore(state => state.stop)
  /** AI 生成过程中的推理内容（原始） */
  const aiReasoning = useAIStore(state => state.reasoning)
  /** 推理计时：开始与结束时间，用于计算耗时 */
  const reasoningStartMs = useAIStore(state => state.reasoningStartMs)
  const reasoningEndMs = useAIStore(state => state.reasoningEndMs)

  const handleAISummary = async () => {
    if (!countryId || !year) return

    try {
      setModalVisible(true)
      startAISummary({ countryId, year: parseInt(year), language: 'zh' })
    } catch {
      // 静默失败（交由错误区提示）
    }
  }

  const handleModalClose = () => {
    if (aiStreaming) {
      stopAISummary()
    }
    setModalVisible(false)
  }

  useEffect(() => {}, [aiStreaming, aiContent, aiError])

  return (
    <>
      <div className="mt-2 text-center">
        <Button
          type="primary"
          loading={aiStreaming}
          onClick={handleAISummary}
        >
          生成AI总结
        </Button>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <span>AI 智能总结</span>
          </div>
        }
        open={modalVisible}
        onCancel={handleModalClose}
        width={800}
        footer={[
          <Button
            key="close"
            onClick={handleModalClose}
          >
            关闭
          </Button>,
          aiContent && (
            <Button
              key="copy"
              type="primary"
              onClick={() => navigator.clipboard.writeText(aiContent)}
            >
              复制内容
            </Button>
          )
        ].filter(Boolean)}
        style={{ top: 20 }}
      >
        {/* 弹窗内容区域 */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* 错误状态：显示错误信息 */}
          {aiError && (
            <div className="py-8 text-center">
              <div className="mb-2 text-red-500">生成失败</div>
              <div className="text-sm text-gray-500">{aiError}</div>
            </div>
          )}

          {/* 推理过程：在收到第一段推理前显示骨架屏 */}
          {aiStreaming && !reasoningStartMs && (
            <div className="mt-4 animate-pulse rounded-lg bg-gray-100 p-4">
              <div className="mb-3 h-4 w-40 rounded bg-gray-300" />
              <div className="space-y-2">
                <div className="h-4 rounded bg-gray-300" />
                <div className="h-4 rounded bg-gray-300" />
                <div className="h-4 rounded bg-gray-300" />
              </div>
            </div>
          )}

          {/* 推理过程显示 */}
          {aiReasoning && (
            <div className="my-4 rounded-lg bg-yellow-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-yellow-700">
                <span>推理过程</span>
                <span className="font-normal text-yellow-800">
                  已深度思考
                  {typeof reasoningStartMs === 'number' && typeof reasoningEndMs === 'number'
                    ? ` ${(Math.max(0, reasoningEndMs - reasoningStartMs) / 1000).toFixed(1)} 秒`
                    : ' …'}
                </span>
              </div>
              <div className="prose prose-sm max-w-none leading-relaxed text-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiReasoning}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* 内容显示：有内容时显示 */}
          {aiContent && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  基于 {countryName || '该国家'} {year} 年度数据生成
                </div>
              </div>
              <div className="prose max-w-none leading-relaxed text-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiContent}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default AISummaryModal
