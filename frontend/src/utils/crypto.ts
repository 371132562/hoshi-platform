/**
 * 使用 crypto-js 进行加密的工具函数
 * 提供跨平台兼容的加密功能
 */

import CryptoJS from 'crypto-js'

/**
 * 使用 AES-CBC 模式加密数据
 * 使用 crypto-js 实现，提供跨平台兼容性
 * @param salt 盐值
 * @param password 密码
 * @returns 加密后的字符串（IV + 加密数据）
 */
export const encryptData = (salt: string, password: string): string => {
  try {
    // 使用与后端相同的密钥进行加密
    const keyString = 'urbanization-secret-key'.padEnd(32, '\0').slice(0, 32)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 生成随机 IV（16 字节）
    const iv = CryptoJS.lib.WordArray.random(16)

    // 数据格式：salt + '|' + password
    const dataToEncrypt = salt + '|' + password

    // 使用 AES-CBC 加密
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 将 IV 和加密数据组合
    const ivHex = iv.toString(CryptoJS.enc.Hex)
    const encryptedBase64 = encrypted.toString()
    const result = ivHex + encryptedBase64

    return result
  } catch (error) {
    console.error('crypto-js 加密数据失败:', error)
    throw new Error('数据加密失败')
  }
}

/**
 * 使用 AES-CBC 模式解密数据
 * 使用 crypto-js 实现，提供跨平台兼容性
 * @param encryptedData 加密的数据（IV + 加密数据）
 * @returns 解密后的字符串
 */
export const decryptData = (encryptedData: string): string => {
  try {
    // 提取 IV（前 32 个字符，16 字节的十六进制表示）
    const ivHex = encryptedData.substring(0, 32)
    const encryptedBase64 = encryptedData.substring(32)

    // 使用与后端相同的密钥进行解密
    const keyString = 'urbanization-secret-key'.padEnd(32, '\0').slice(0, 32)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 转换 IV
    const iv = CryptoJS.enc.Hex.parse(ivHex)

    // 创建加密对象
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedBase64)
    })

    // 使用 AES-CBC 解密
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 将解密结果转换为字符串
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('crypto-js 解密数据失败:', error)
    throw new Error('数据解密失败')
  }
}

/**
 * 生成加密级随机字符串
 * 使用 crypto-js 实现，提供跨平台兼容性
 * @param length 字符串长度
 * @returns 随机字符串
 */
export const generateRandomString = (length: number): string => {
  const randomBytes = CryptoJS.lib.WordArray.random(length / 2)
  return randomBytes.toString(CryptoJS.enc.Hex)
}

/**
 * 计算字符串的 SHA-256 哈希值
 * 使用 crypto-js 实现，提供跨平台兼容性
 * @param data 要哈希的数据
 * @returns 十六进制哈希值
 */
export const sha256 = (data: string): string => {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex)
}

/**
 * 解密后端返回的加密盐值
 * 使用专用的盐值解密算法（AES-128-CBC），与密码解密算法不同
 * @param encryptedSalt 加密的盐值（格式：iv(32字符hex) + 加密数据）
 * @returns 解密后的盐值
 */
export const decryptSalt = (encryptedSalt: string): string => {
  try {
    // 使用专用的盐值解密密钥（16字节，适合AES-128）
    const keyString = 'salt-encryption-key-2024'.padEnd(16, '\0').slice(0, 16)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 提取 IV（前 32 个字符，16 字节的十六进制表示）
    const ivHex = encryptedSalt.substring(0, 32)
    // 提取加密数据（剩余部分）
    const encryptedBase64 = encryptedSalt.substring(32)

    // 转换 IV
    const iv = CryptoJS.enc.Hex.parse(ivHex)

    // 创建加密对象
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedBase64)
    })

    // 使用 AES-CBC 解密
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 将解密结果转换为字符串
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('crypto-js 解密盐值失败:', error)
    throw new Error('盐值解密失败')
  }
}
