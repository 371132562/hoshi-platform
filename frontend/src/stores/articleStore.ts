import type {
  ArticleItemResDto,
  ArticleListResDto,
  ArticleMetaItemResDto,
  CreateArticleReqDto,
  DeleteArticleReqDto,
  UpdateArticleReqDto
} from 'template-backend/src/types/dto'
import { create } from 'zustand'

import {
  articleCreate,
  articleDelete,
  articleDetail,
  articleGetByPage,
  articleGetDetailsByIds,
  articleList,
  articleListAll,
  articlePublicGetByPage,
  articleUpdate,
  articleUpsertOrder
} from '@/services/apis'
import http from '@/services/base'

// 文章列表查询参数类型（分页 + 搜索统一对象）
type ArticlePageParams = {
  page?: number // 页码，从 1 开始
  pageSize?: number // 每页数量
  title?: string // 按标题模糊搜索
}

type ArticleStore = {
  articles: ArticleMetaItemResDto[] // 当前页文章元信息列表
  total: number // 文章总数
  articlePageParams: ArticlePageParams // 当前分页与搜索条件
  loading: boolean // 列表加载状态
  articleDetail: ArticleItemResDto | null // 当前查看/编辑的文章详情
  detailLoading: boolean // 详情加载状态
  submitLoading: boolean // 创建、更新、排序等提交态
  allArticles: ArticleMetaItemResDto[] // 排序配置页使用的全量文章列表
  pageArticles: ArticleItemResDto[] // 某个页面当前配置的文章列表
  orderConfigLoading: boolean // 排序配置相关请求加载态
  previewArticles: ArticleItemResDto[] // 排序预览弹窗使用的文章详情列表
  previewLoading: boolean // 预览详情加载态

  fetchArticleList: (params?: Partial<ArticlePageParams>) => Promise<void>
  updateArticlePageParams: (params: Partial<ArticlePageParams>) => void
  resetArticleSearch: () => void
  createArticle: (data: CreateArticleReqDto) => Promise<boolean>
  updateArticle: (data: UpdateArticleReqDto) => Promise<boolean>
  deleteArticle: (data: DeleteArticleReqDto) => Promise<boolean>
  getArticleDetail: (id: string) => Promise<void>
  clearArticleDetail: () => void
  getAllArticles: () => Promise<void>
  getPublicArticlesByPage: (page: string) => Promise<void>
  getArticlesByPage: (page: string) => Promise<void>
  upsertArticleOrder: (page: string, articleIds: string[]) => Promise<boolean>
  getArticleDetailsByIds: (ids: string[]) => Promise<void>
}

const useArticleStore = create<ArticleStore>((set, get) => ({
  articles: [],
  total: 0,
  articlePageParams: { page: 1, pageSize: 10 },
  loading: false,
  articleDetail: null,
  detailLoading: false,
  submitLoading: false,
  allArticles: [],
  pageArticles: [],
  orderConfigLoading: false,
  previewArticles: [],
  previewLoading: false,

  /** 获取文章列表，并统一维护分页与搜索状态。 */
  fetchArticleList: async (params?: Partial<ArticlePageParams>) => {
    const merged = { ...get().articlePageParams, ...params }
    set({ loading: true, articlePageParams: merged })
    try {
      const response = await http.post<ArticleListResDto>(articleList, merged)
      if (response && response.data) {
        set({
          articles: response.data.list,
          total: response.data.total,
          articlePageParams: {
            ...merged,
            page: response.data.page,
            pageSize: response.data.pageSize
          }
        })
      }
    } catch (error) {
      console.error('获取文章列表失败:', error)
      set({ articles: [], total: 0 })
    } finally {
      set({ loading: false })
    }
  },

  /** 更新分页/筛选参数，并复用统一列表拉取逻辑。 */
  updateArticlePageParams: (params: Partial<ArticlePageParams>) => {
    const merged = { ...get().articlePageParams, ...params }
    get().fetchArticleList(merged)
  },

  /** 重置文章搜索条件并回到第一页。 */
  resetArticleSearch: () => {
    get().updateArticlePageParams({ page: 1, title: undefined })
  },

  /** 创建文章，成功后回到第一页并刷新列表。 */
  createArticle: async (data: CreateArticleReqDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleCreate, data)
      await get().fetchArticleList({ page: 1, title: undefined })
      return true
    } catch (error) {
      console.error('创建文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  /** 更新文章，成功后刷新当前列表页。 */
  updateArticle: async (data: UpdateArticleReqDto) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpdate, data)
      await get().fetchArticleList()
      return true
    } catch (error) {
      console.error('更新文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  /** 删除文章，并在删空当前页时自动回退到上一页。 */
  deleteArticle: async (data: DeleteArticleReqDto) => {
    try {
      await http.post(articleDelete, data)
      const { articles, articlePageParams } = get()
      const currentPage = articlePageParams.page || 1
      // 删除成功后若当前页被删空，则自动回退一页，避免出现空白页。
      if (articles.length === 1 && currentPage > 1) {
        await get().fetchArticleList({ page: currentPage - 1 })
      } else {
        await get().fetchArticleList()
      }
      return true
    } catch (error) {
      console.error('删除文章失败:', error)
      return false
    }
  },

  /** 获取单篇文章详情，供编辑页与详情弹窗使用。 */
  getArticleDetail: async (id: string) => {
    set({ detailLoading: true, articleDetail: null })
    try {
      const response = await http.post<ArticleItemResDto>(articleDetail, { id })
      if (response && response.data) {
        set({ articleDetail: response.data })
      }
    } catch (error) {
      console.error('获取文章详情失败:', error)
      set({ articleDetail: null })
    } finally {
      set({ detailLoading: false })
    }
  },

  /** 清空当前文章详情缓存。 */
  clearArticleDetail: () => {
    set({ articleDetail: null })
  },

  /** 获取所有文章元信息，供排序配置页使用。 */
  getAllArticles: async () => {
    set({ orderConfigLoading: true })
    try {
      const response = await http.post<ArticleMetaItemResDto[]>(articleListAll)
      if (response && response.data) {
        set({ allArticles: response.data })
      }
    } catch (error) {
      console.error('获取所有文章列表失败:', error)
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  /** 获取前台指定页面展示的文章列表。 */
  getPublicArticlesByPage: async (page: string) => {
    set({ orderConfigLoading: true })
    try {
      const response = await http.post<ArticleItemResDto[]>(articlePublicGetByPage, { page })
      if (response && response.data) {
        set({ pageArticles: response.data })
      }
    } catch (error) {
      console.error(`获取前台页面 ${page} 文章失败:`, error)
      set({ pageArticles: [] })
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  /** 获取后台指定页面配置的文章列表。 */
  getArticlesByPage: async (page: string) => {
    set({ orderConfigLoading: true })
    try {
      const response = await http.post<ArticleItemResDto[]>(articleGetByPage, { page })
      if (response && response.data) {
        set({ pageArticles: response.data })
      }
    } catch (error) {
      console.error(`获取后台页面 ${page} 文章失败:`, error)
      set({ pageArticles: [] })
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  /** 提交页面文章顺序配置。 */
  upsertArticleOrder: async (page: string, articles: string[]) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpsertOrder, { page, articles })
      return true
    } catch (error) {
      console.error('更新文章顺序失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  /** 根据文章ID列表拉取预览所需的完整详情。 */
  getArticleDetailsByIds: async (ids: string[]) => {
    set({ previewLoading: true, previewArticles: [] })
    try {
      const response = await http.post<ArticleItemResDto[]>(articleGetDetailsByIds, {
        ids
      })
      if (response && response.data) {
        set({ previewArticles: response.data })
      }
    } catch (error) {
      console.error('获取预览文章失败:', error)
      set({ previewArticles: [] })
    } finally {
      set({ previewLoading: false })
    }
  }
}))

export default useArticleStore
