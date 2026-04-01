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
    // 前后端必须使用完全一致的固定密钥与算法参数，否则无法互通。
    // 这里仍然保留“与后端使用同一密钥”的语义，避免维护时只看到实现细节、忽略跨端约束。
    const keyString = 'urbanization-secret-key'.padEnd(32, '\0').slice(0, 32)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 每次加密都生成独立 IV，避免相同明文产生相同密文。
    // IV 长度固定为 16 字节，对应 AES-CBC 的块大小要求。
    const iv = CryptoJS.lib.WordArray.random(16)

    // 登录口令的明文载荷固定为 “salt|password”。
    // 这个拼接格式需要与后端解密后的拆分规则保持一致。
    const dataToEncrypt = salt + '|' + password

    // 使用 AES-CBC 执行加密；模式、padding 和 IV 都必须与后端解密侧严格对齐。
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 前 32 位存放 IV 的 hex，后半段存放密文 base64，便于后端统一拆解。
    // 这种“IV + 密文”的扁平串格式，是当前登录链路默认的传输协议。
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
    // 前 32 个字符固定为 IV，其余部分为密文 base64。
    // 32 来自 16 字节 IV 的 hex 表示长度。
    const ivHex = encryptedData.substring(0, 32)
    const encryptedBase64 = encryptedData.substring(32)

    // 解密参数必须与加密侧保持完全一致。
    // 这里同样强调“与后端使用同一密钥”的跨端约束，避免维护时误改密钥长度或内容。
    const keyString = 'urbanization-secret-key'.padEnd(32, '\0').slice(0, 32)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 把字符串形式的 IV 恢复成 CryptoJS 可用的二进制结构。
    const iv = CryptoJS.enc.Hex.parse(ivHex)

    // 将 base64 密文包成 CipherParams，交给 crypto-js 的 AES 解密入口处理。
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedBase64)
    })

    // 使用 AES-CBC 解密，参数必须和加密阶段保持完全一致。
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 解密结果默认是 WordArray，这里统一转回 UTF-8 明文字符串。
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
    // 盐值使用独立密钥解密，避免与密码加密链路混用。
    // 这里仍保留“16 字节 AES-128 专用密钥”的语义，帮助维护者快速理解长度选择原因。
    const keyString = 'salt-encryption-key-2024'.padEnd(16, '\0').slice(0, 16)
    const key = CryptoJS.enc.Utf8.parse(keyString)

    // 盐值载荷同样采用“IV + 密文”拼接格式。
    // 前 32 个字符是 16 字节 IV 的 hex 表示，剩余部分是密文 base64。
    const ivHex = encryptedSalt.substring(0, 32)
    const encryptedBase64 = encryptedSalt.substring(32)

    // 将 IV 从 hex 字符串恢复为 CryptoJS 可识别的结构。
    const iv = CryptoJS.enc.Hex.parse(ivHex)

    // 创建密文对象，保持与 decryptData 相同的解包方式。
    const encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedBase64)
    })

    // 盐值解密同样使用 AES-CBC，但密钥与口令链路不同。
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    // 统一输出 UTF-8 字符串，供 challenge/login 流程后续使用。
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('crypto-js 解密盐值失败:', error)
    throw new Error('盐值解密失败')
  }
}
