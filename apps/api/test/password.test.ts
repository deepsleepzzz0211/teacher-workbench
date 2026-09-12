import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../src/utils/password'

const stored = hashPassword('Teach@2026')

describe('口令哈希与校验', () => {
  it('正确口令校验通过', async () => {
    expect(await verifyPassword('Teach@2026', stored)).toBe(true)
  })

  it('错误口令校验失败', async () => {
    expect(await verifyPassword('wrong-password', stored)).toBe(false)
  })

  it('校验是异步的（返回 Promise，不阻塞事件循环）', () => {
    const result = verifyPassword('Teach@2026', stored)
    expect(result).toBeInstanceOf(Promise)
    return result
  })

  it('哈希格式非法时返回 false 而不是抛错', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$only-two-parts')).toBe(false)
    expect(await verifyPassword('x', 'bcrypt$salt$hash')).toBe(false)
  })

  it('同一口令两次哈希得到不同盐，但都能校验通过', async () => {
    const another = hashPassword('Teach@2026')
    expect(another).not.toBe(stored)
    expect(await verifyPassword('Teach@2026', another)).toBe(true)
  })
})
