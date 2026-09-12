import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

/**
 * 口令哈希：使用 Node 内置 scrypt，避免引入需要本地编译的依赖。
 * 存储格式：scrypt$<salt-hex>$<hash-hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const hash = parts[2]
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const derived = scryptSync(password, salt, KEY_LENGTH)
  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
