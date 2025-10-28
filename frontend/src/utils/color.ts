// 轻量色彩工具：针对深色背景生成 hover/active/selected 等衍生色

// 将HEX转换为RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map(c => c + c)
          .join('')
      : normalized,
    16
  )
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

// 在深色上加亮一定比例（0-1）
export const lighten = (hex: string, ratio: number): string => {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * ratio))
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

// 在深色上进一步加亮，用于选中态
export const deriveHover = (base: string): string => lighten(base, 0.1)
export const deriveSelected = (base: string): string => lighten(base, 0.2)

// 计算相对亮度（sRGB）
const relativeLuminance = (hex: string): number => {
  const hexToSr = (h: string) => {
    const n = h.replace('#', '')
    const v = parseInt(
      n.length === 3
        ? n
            .split('')
            .map(c => c + c)
            .join('')
        : n,
      16
    )
    const r = (v >> 16) & 255
    const g = (v >> 8) & 255
    const b = v & 255
    const toLin = (c: number) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return [toLin(r), toLin(g), toLin(b)] as const
  }
  const [R, G, B] = hexToSr(hex)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

// 根据背景色选择可读性更好的前景色（黑/白）
export const readableOn = (bgHex: string): string => {
  const L = relativeLuminance(bgHex)
  return L < 0.5 ? '#ffffff' : '#000000'
}
