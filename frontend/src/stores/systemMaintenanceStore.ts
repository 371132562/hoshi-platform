import { create } from 'zustand'

import { deleteOrphanImagesApi, listOrphanImagesApi } from '@/services/apis'
import http from '@/services/base'

// 孤立图片删除结果类型
export type DeleteOrphanImagesResult = {
  deleted: string[] // 删除成功的文件名列表
  failed: { filename: string; error: string }[] // 删除失败的文件及错误原因
}

// 孤立图片扫描结果类型
export type ScanOrphanImagesResult = {
  success: boolean // 扫描是否成功
  count: number // 本次扫描发现的孤儿图片数量
  message: string // 面向 UI 展示的结果文案
}

// 系统维护相关的状态与动作
export type SystemMaintenanceStore = {
  orphanImages: string[] // 当前扫描出的孤儿图片文件名列表
  scanning: boolean // 扫描任务是否进行中
  deleting: boolean // 删除任务是否进行中

  scanOrphanImages: () => Promise<ScanOrphanImagesResult>
  deleteOrphanImages: (filenames: string[]) => Promise<DeleteOrphanImagesResult | null>
  clearOrphanImages: () => void
}

const useSystemMaintenanceStore = create<SystemMaintenanceStore>(set => ({
  orphanImages: [],
  scanning: false,
  deleting: false,

  /** 扫描孤儿图片，并返回可直接展示给用户的结果摘要。 */
  scanOrphanImages: async (): Promise<ScanOrphanImagesResult> => {
    set({ scanning: true })
    try {
      const res = await http.post<{ list: string[] }>(listOrphanImagesApi)
      if (res && Array.isArray(res.data?.list)) {
        const count = res.data.list.length
        set({ orphanImages: res.data.list })
        return {
          success: true,
          count,
          message: count > 0 ? `扫描完成，发现 ${count} 张孤立图片` : '扫描完成，未发现孤立图片'
        }
      } else {
        set({ orphanImages: [] })
        return {
          success: true,
          count: 0,
          message: '扫描完成，未发现孤立图片'
        }
      }
    } catch (e) {
      console.error('扫描孤立图片失败:', e)
      set({ orphanImages: [] })
      return {
        success: false,
        count: 0,
        message: '扫描失败，请检查网络连接或稍后重试'
      }
    } finally {
      set({ scanning: false })
    }
  },

  /** 删除选中的孤儿图片，并同步更新本地列表。 */
  deleteOrphanImages: async (filenames: string[]) => {
    if (!Array.isArray(filenames) || filenames.length === 0) return null
    set({ deleting: true })
    try {
      const res = await http.post<DeleteOrphanImagesResult>(deleteOrphanImagesApi, {
        filenames
      })
      // 删除成功后直接从本地列表剔除，避免额外再扫一遍系统。
      const deleted = res?.data?.deleted || []
      set(state => ({ orphanImages: state.orphanImages.filter(f => !deleted.includes(f)) }))
      return res?.data || { deleted: [], failed: [] }
    } catch (e) {
      console.error('删除孤立图片失败:', e)
      return null
    } finally {
      set({ deleting: false })
    }
  },

  clearOrphanImages: () => set({ orphanImages: [] })
}))

export default useSystemMaintenanceStore
