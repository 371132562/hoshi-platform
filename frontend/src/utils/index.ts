/** 手机号校验规则：允许为空，非空时仅接受中国大陆手机号格式。 */
export const validatePhoneNumber = (_: unknown, value: string) => {
  if (!value) {
    return Promise.resolve() // 当前表单策略允许手机号为空
  }

  // 中国大陆手机号：1 开头，第二位 3-9，后面 9 位数字。
  const reg = /^1[3-9]\d{9}$/
  if (reg.test(value)) {
    return Promise.resolve()
  }
  return Promise.reject(new Error('请输入有效的手机号！'))
}

// 富文本图片地址转换工具：在“文件名”与“完整 URL”之间做双向转换。

/** 从图片 URL 中提取文件名。 */
export const extractFilename = (url: string): string => {
  const lastSlashIndex = url.lastIndexOf('/')
  return lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url
}

/** 根据文件名构造完整图片地址，需与富文本编辑器的解析逻辑保持一致。 */
export const buildFullImageUrl = (filename: string): string => {
  return (
    '//' +
    location.hostname +
    (import.meta.env.DEV ? ':3888' : location.port ? ':' + location.port : '') +
    (import.meta.env.VITE_DEPLOY_PATH === '/' ? '' : import.meta.env.VITE_DEPLOY_PATH) +
    import.meta.env.VITE_IMAGES_BASE_URL +
    filename
  )
}

/** 将 HTML 内容中的 <img src> 统一转成文件名，供后端存储。 */
export const toFilenameContent = (html: string): string => {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || ''
    if (!src) return
    img.setAttribute('src', extractFilename(src))
  })
  return doc.body.innerHTML
}

/** 将 HTML 内容中的文件名图片地址扩展为当前环境可访问的完整路径。 */
export const toFullPathContent = (html: string): string => {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || ''
    if (!src) return
    // 已是完整地址或已包含路径信息时，直接保持原值。
    if (/^(https?:)?\/\//.test(src) || src.includes('/')) return
    img.setAttribute('src', buildFullImageUrl(src))
  })
  return doc.body.innerHTML
}

/**
 * 通用的文件下载工具函数
 * 处理从后端下载文件的通用逻辑，包括文件名解析和下载触发
 * @param response 包含文件数据的响应对象
 * @param defaultFileName 默认文件名，当无法从响应头解析时使用
 * @returns 下载是否成功
 */
export const downloadFile = (
  response: { data: Blob; headers: Record<string, unknown> },
  defaultFileName: string = '下载文件.xlsx'
): boolean => {
  try {
    // 1. 优先从响应头解析文件名，兼容 RFC 5987 与传统 filename 两种格式。
    const contentDisposition = response.headers['content-disposition'] as string | undefined
    let fileName = defaultFileName
    if (contentDisposition) {
      const fileNameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
      if (fileNameStarMatch && fileNameStarMatch[1]) {
        fileName = decodeURIComponent(fileNameStarMatch[1])
      } else {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1])
        }
      }
    }

    // 2. 构造 blob URL 并触发浏览器下载。
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()

    // 3. 下载完成后立即释放 DOM 与 blob 资源。
    link.parentNode?.removeChild(link)
    window.URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error('文件下载失败:', error)
    return false
  }
}
