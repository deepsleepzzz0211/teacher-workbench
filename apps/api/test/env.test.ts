import { describe, expect, it } from 'vitest'

import { DEV_JWT_SECRET_DEFAULT, resolveJwtSecret } from '../src/config/env'

describe('令牌签名密钥解析', () => {
  it('生产环境未配置密钥时抛错，并给出可读的中文原因', () => {
    expect(() => resolveJwtSecret(undefined, true)).toThrow(/JWT_SECRET/)
  })

  it('生产环境仍等于示例默认值时抛错', () => {
    expect(() => resolveJwtSecret(DEV_JWT_SECRET_DEFAULT, true)).toThrow()
  })

  it('生产环境配置了独立密钥时正常返回该密钥', () => {
    expect(resolveJwtSecret('a-strong-independent-secret', true)).toBe(
      'a-strong-independent-secret',
    )
  })

  it('开发环境未配置时回退到开发默认值，本地体验不变', () => {
    expect(resolveJwtSecret(undefined, false)).toBe(DEV_JWT_SECRET_DEFAULT)
  })

  it('仅有空白的取值视为未配置', () => {
    expect(() => resolveJwtSecret('   ', true)).toThrow()
    expect(resolveJwtSecret('   ', false)).toBe(DEV_JWT_SECRET_DEFAULT)
  })
})
