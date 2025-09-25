import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { BusinessException } from '../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

/**
 * 加解密工具类
 * 提供统一的加解密功能，用于前后端数据传输安全
 */
export class CryptoUtil {
  private static readonly logger = new Logger(CryptoUtil.name);
  private static readonly SECRET_KEY = 'urbanization-secret-key';
  private static readonly ALGORITHM = 'aes-256-cbc';

  /**
   * 生成随机盐
   * @returns 32字节的随机十六进制字符串
   */
  static generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 解密前端crypto-js加密的数据
   * @param encryptedData 加密数据（格式：iv(32字符hex) + 加密数据）
   * @returns 解密后的原始数据
   */
  static decryptData(encryptedData: string): string {
    try {
      // 使用与前端相同的密钥进行解密
      const key = Buffer.from(this.SECRET_KEY.padEnd(32, '\0').slice(0, 32));

      // 前端crypto-js格式：iv(32字符hex) + 加密数据
      const ivHex = encryptedData.slice(0, 32);
      const encrypted = encryptedData.slice(32);

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(
        `[失败] 数据解密 - ${error instanceof Error ? error.message : '未知错误'}`,
      );
      throw new BusinessException(ErrorCode.PASSWORD_INCORRECT, '数据解密失败');
    }
  }

  /**
   * 从解密后的数据中提取密码部分
   * 数据格式：salt + '|' + password
   * @param decryptedData 解密后的数据
   * @returns 密码部分
   */
  static extractPasswordFromDecryptedData(decryptedData: string): string {
    const parts = decryptedData.split('|');
    if (parts.length !== 2) {
      throw new BusinessException(ErrorCode.PASSWORD_INCORRECT, '数据格式错误');
    }
    return parts[1]; // 返回密码部分
  }
}
