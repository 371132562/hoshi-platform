import { create } from 'zustand'

import { aiSummarySSE } from '@/services/apis'

/**
 * AI 总结功能的状态管理类型定义
 */
type AISummaryState = {
  /** 是否正在生成 AI 总结（用于显示加载状态） */
  streaming: boolean
  /** AI 生成的总结内容（累积的流式数据） */
  content: string
  /** 模型的推理过程（reasoning_content 原始字符串累积） */
  reasoning: string
  /** 推理计时：开始时间（毫秒时间戳） */
  reasoningStartMs?: number
  /** 推理计时：结束时间（毫秒时间戳），以接收完最后一段推理为准 */
  reasoningEndMs?: number
  /** 错误信息（如果生成过程中出现错误） */
  error?: string
  /** 开始生成 AI 总结的方法 */
  startAISummary: (params: { countryId: string; year: number; language?: 'zh' | 'en' }) => void
  /** 停止生成 AI 总结的方法（中断 SSE 连接） */
  stop: () => void
}

/**
 * 全局 AbortController 实例，用于中断正在进行的 SSE 请求
 * 当用户关闭 Modal 或开始新的请求时，可以取消之前的请求
 */
let currentController: AbortController | null = null

/**
 * AI 总结功能的 Zustand Store
 * 管理 AI 总结的生成状态、内容和错误处理
 */
const useAIStore = create<AISummaryState>()(set => ({
  // 初始状态
  streaming: false,
  content: '',
  reasoning: '',
  reasoningStartMs: undefined,
  reasoningEndMs: undefined,
  error: undefined,

  /**
   * 开始生成 AI 总结
   * 建立 SSE 连接，接收流式响应，并实时更新内容
   *
   * @param params 请求参数
   * @param params.countryId 国家ID
   * @param params.year 年份
   * @param params.language 语言，默认为中文
   */
  startAISummary: async ({ countryId, year, language = 'zh' }) => {
    // 如果已有请求在进行中，先中断它
    if (currentController) {
      currentController.abort()
    }

    // 创建新的 AbortController 用于控制当前请求
    currentController = new AbortController()

    // 重置状态，开始新的生成过程
    set({
      streaming: true,
      content: '',
      reasoning: '',
      reasoningStartMs: undefined,
      reasoningEndMs: undefined,
      error: undefined
    })

    try {
      // 构建完整的 API URL
      const baseURL =
        (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
        import.meta.env.VITE_API_BASE_URL
      const url = baseURL + aiSummarySSE

      // 从 localStorage 获取认证 token
      const authPersist = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      const token = authPersist.state?.token || null

      // 发起 POST 请求，建立 SSE 连接
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ countryId, year, language }),
        signal: currentController.signal // 绑定 AbortController，支持中断请求
      })

      // 检查响应是否包含可读流
      if (!res.body) {
        throw new Error('服务器未返回可读流')
      }

      // 创建流读取器和文本解码器
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')

      // 缓冲区，用于存储未完整的 SSE 数据
      let buffer = ''

      // 循环读取流数据
      while (true) {
        const { done, value } = await reader.read()
        if (done) break // 流结束

        // 解码当前数据块并添加到缓冲区
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 解析 SSE 数据：按双换行符分段
        // SSE 格式：每个事件以双换行符分隔
        const parts = buffer.split('\n\n')

        // 保留最后一个可能未完整的事件在缓冲区中
        buffer = parts.pop() || ''

        // 处理完整的事件
        for (const part of parts) {
          if (!part) continue

          // 解析可选的 event 行与 data 行
          // 允许两种格式：
          // 1) event: <type>\n data: {"event":"<type>","data":"..."}
          // 2) data: {"event":"<type>","data":"..."}

          let eventType: string | null = null
          let dataLine: string | null = null
          const lines = part.split('\n')
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            }
            if (line.startsWith('data: ')) {
              dataLine = line.slice(6)
            }
          }

          if (dataLine != null) {
            const data = dataLine

            // 检查是否是结束标记
            if (data === '[DONE]') {
              // 生成完成，更新状态并清理
              set(state => ({
                streaming: false,
                reasoningEndMs: state.reasoningEndMs || Date.now()
              }))
              if (currentController) {
                currentController.abort()
                currentController = null
              }
              return
            }

            // data 可能是 JSON 字符串：{"event":"content|reasoning","data":"..."}
            try {
              const parsed = JSON.parse(data) as { event?: string; data?: string }
              const typ = parsed.event || eventType || 'content'
              const payload = parsed.data ?? ''
              if (typ === 'reasoning') {
                set(state => ({
                  reasoning: state.reasoning + payload,
                  reasoningStartMs: state.reasoningStartMs ?? Date.now(),
                  reasoningEndMs: Date.now()
                }))
              } else {
                set(state => ({ content: state.content + payload }))
              }
            } catch {
              // 非 JSON，回退为内容事件
              const typ = eventType || 'content'
              if (typ === 'reasoning') {
                set(state => ({
                  reasoning: state.reasoning + data,
                  reasoningStartMs: state.reasoningStartMs ?? Date.now(),
                  reasoningEndMs: Date.now()
                }))
              } else {
                set(state => ({ content: state.content + data }))
              }
            }
          }
        }
      }

      // 流正常结束，更新状态（若此前未记录推理结束时间，这里兜底赋值）
      set(state => ({ streaming: false, reasoningEndMs: state.reasoningEndMs || Date.now() }))
    } catch (e) {
      // 处理错误：更新状态并显示错误信息
      set({ streaming: false, error: (e as Error).message })
    }
  },

  /**
   * 停止生成 AI 总结
   * 中断当前的 SSE 连接，清理资源
   */
  stop: () => {
    // 如果存在控制器，中断请求
    if (currentController) {
      currentController.abort()
      currentController = null
    }

    // 更新状态，停止流式生成
    set(state => ({ streaming: false, reasoningEndMs: state.reasoningEndMs || Date.now() }))
  }
}))

export default useAIStore
