import { Decimal } from '@prisma/client/runtime/library';

/**
 * 将 Prisma Decimal 或其他常见数值输入统一转换为 number
 * - 兼容 Decimal 实例、number、可解析为数字的 string
 * - 兼容部分对象通过 valueOf/toString 可还原原始数值的情况（Prisma 序列化）
 * - 兜底返回 0，避免出现 NaN
 */
export function decimalToNumber(value: unknown): number {
  // 空值兜底
  if (value == null) return 0;

  if (value instanceof Decimal) {
    return value.toNumber();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value);
  }

  // 处理可能是对象的情况（可能是 Prisma 的序列化问题）
  if (typeof value === 'object' && value !== null) {
    const maybeValueOf = (value as { valueOf?: () => unknown }).valueOf;
    if (typeof maybeValueOf === 'function') {
      const primitive: unknown = maybeValueOf.call(value);
      if (typeof primitive === 'number') return primitive;
      if (typeof primitive === 'string' && !isNaN(Number(primitive))) {
        return Number(primitive);
      }
    }
  }

  return 0;
}
