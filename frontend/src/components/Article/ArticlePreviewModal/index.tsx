import { Button, Modal, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import type { ArticleItemResDto } from 'template-backend/src/types/dto'

import RichEditor from '@/components/RichEditor'
import useArticleStore from '@/stores/articleStore'
import { toFullPathContent } from '@/utils'

// 基础 props
interface BaseProps {
  visible: boolean
  onClose: () => void
}

// ID 模式 props
interface IdModeProps extends BaseProps {
  mode: 'id'
  articleId: string | null
}

// 内容模式 props
interface ContentModeProps extends BaseProps {
  mode: 'content'
  title: string
  content: string
}

// 联合类型
type ArticlePreviewModalProps = IdModeProps | ContentModeProps

/**
 * 文章预览 Modal 组件
 * @description 支持两种预览模式：通过 articleId 获取文章详情，或直接传递内容预览
 */
const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = props => {
  const { visible, onClose } = props

  const [article, setArticle] = useState<ArticleItemResDto | null>(null)
  const [loading, setLoading] = useState(false)

  const getArticleDetail = useArticleStore(state => state.getArticleDetail)

  useEffect(() => {
    if (!visible) {
      setArticle(null)
      return
    }

    if (props.mode === 'id' && props.articleId) {
      const fetchDetail = async () => {
        setLoading(true)
        try {
          await getArticleDetail(props.articleId!)
          const detail = useArticleStore.getState().articleDetail
          setArticle(detail)
        } catch (error) {
          console.error('获取文章详情失败:', error)
          setArticle(null)
        } finally {
          setLoading(false)
        }
      }
      fetchDetail()
    } else {
      setLoading(false)
      setArticle(null)
    }
  }, [visible, props, getArticleDetail])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Spin size="large" />
        </div>
      )
    }

    if (props.mode === 'content') {
      return (
        <div>
          <h2 className="mb-4 text-xl font-bold">{props.title}</h2>
          <div className="prose max-w-none">
            <RichEditor
              value={toFullPathContent(props.content)}
              readOnly
            />
          </div>
        </div>
      )
    }

    if (article) {
      return (
        <div>
          <h2 className="mb-4 text-xl font-bold">{article.title}</h2>
          <div className="prose max-w-none">
            <RichEditor
              value={toFullPathContent(article.content)}
              readOnly
            />
          </div>
        </div>
      )
    }

    return <div className="py-8 text-center text-gray-500">暂无文章数据</div>
  }

  return (
    <Modal
      title="文章预览"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="close"
          onClick={onClose}
        >
          关闭
        </Button>
      ]}
      width="50vw"
      style={{ minWidth: '600px' }}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  )
}

export default ArticlePreviewModal
