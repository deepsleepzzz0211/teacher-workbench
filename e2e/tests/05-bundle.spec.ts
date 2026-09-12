import { expect, test } from '@playwright/test'

import { login } from './helpers'

function collectScripts(page: import('@playwright/test').Page): string[] {
  const scripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') {
      scripts.push(new URL(request.url()).pathname)
    }
  })
  return scripts
}

test.describe('分包与按需加载', () => {
  test('登录页不下载图表代码', async ({ page }) => {
    const scripts = collectScripts(page)

    await page.goto('/login')
    await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible()

    expect(scripts.length).toBeGreaterThan(0)
    expect(
      scripts.filter((path) => path.includes('vendor-charts')),
      '登录页不应加载图表分包',
    ).toHaveLength(0)
  })

  test('使用图表的页面会加载图表代码', async ({ page }) => {
    const scripts = collectScripts(page)

    await login(page)

    await expect(page.getByRole('main')).toBeVisible()
    expect(
      scripts.filter((path) => path.includes('vendor-charts')),
      '进入含图表的页面后应加载图表分包',
    ).not.toHaveLength(0)
  })
})
