import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

function deriveKey(password: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

/**
 * 口令哈希：使用 Node 内置 scrypt，避免引入需要本地编译的依赖。
 * 存储格式：scrypt$<salt-hex>$<hash-hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const hash = parts[2]
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const derived = await deriveKey(password, salt, KEY_LENGTH)
  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
