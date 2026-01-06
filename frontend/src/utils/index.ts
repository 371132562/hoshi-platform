// 自定义手机号校验规则
export const validatePhoneNumber = (_: unknown, value: string) => {
  // 如果没有输入，则不进行校验，这里你可以根据需求调整是否允许为空
  if (!value) {
    return Promise.resolve() // 允许为空
  }

  // 中国大陆手机号的正则表达式：以1开头，第二位是3-9，后面是9位数字
  const reg = /^1[3-9]\d{9}$/
  if (reg.test(value)) {
    return Promise.resolve()
  }
  return Promise.reject(new Error('请输入有效的手机号！'))
}

// ---------------- 富文本图片地址转换通用方法 ----------------
// 说明：以下方法用于在富文本保存与展示时，在“文件名”与“完整URL”之间进行互转。

// 从 URL 中提取文件名
export const extractFilename = (url: string): string => {
  const lastSlashIndex = url.lastIndexOf('/')
  return lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url
}

// 根据文件名构造完整图片地址（需与富文本编辑器内的 parseImageSrc 逻辑保持一致）
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

// 将 HTML 内容中的 <img src> 统一为文件名
// 用于提交给后端存储，富文本编辑器内完整路径时才能正常显示，但入库时只需要文件名，所以删除路径后保存
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

// 将 HTML 内容中的 <img src> 从文件名扩展为完整路径（用于从库中读取时将文件名根据当前环境转换为完整路径）
export const toFullPathContent = (html: string): string => {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || ''
    if (!src) return
    // 已是完整地址则跳过（http/https/双斜杠）或包含路径分隔符（相对路径）
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
    // 解析文件名
    const contentDisposition = response.headers['content-disposition'] as string | undefined
    let fileName = defaultFileName
    if (contentDisposition) {
      // 优先匹配 filename* (RFC 5987), 处理UTF-8编码的文件名
      const fileNameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
      if (fileNameStarMatch && fileNameStarMatch[1]) {
        fileName = decodeURIComponent(fileNameStarMatch[1])
      } else {
        // 其次匹配 filename (传统方式)
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1])
        }
      }
    }

    // 创建blob URL并触发下载
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()

    // 清理资源
    link.parentNode?.removeChild(link)
    window.URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error('文件下载失败:', error)
    return false
  }
}
