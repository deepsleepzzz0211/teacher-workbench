import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots')

const PAGES: { path: string; name: string }[] = [
  { path: '/', name: '01-dashboard' },
  { path: '/schedule', name: '02-schedule' },
  { path: '/workload', name: '03-workload' },
  { path: '/achievements', name: '04-achievements' },
  { path: '/practice', name: '05-practice' },
  { path: '/applications', name: '06-applications' },
  { path: '/notices', name: '07-notices' },
  { path: '/todos', name: '08-todos' },
]

async function signIn(page: import('@playwright/test').Page, demoLabel: string): Promise<void> {
  await page.goto('/login')
  await page.getByRole('button', { name: demoLabel }).click()
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await expect(page.getByRole('main')).toBeVisible()
}

test('采集全部页面截图', async ({ page }) => {
  mkdirSync(outputDir, { recursive: true })

  await page.goto('/login')
  await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible()
  await page.screenshot({ path: resolve(outputDir, '00-login.png') })

  await signIn(page, '专任教师 · 陈立群')

  for (const target of PAGES) {
    await page.goto(target.path)
    await expect(page.getByRole('main')).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    await page.screenshot({ path: resolve(outputDir, `${target.name}.png`), fullPage: true })
  }

  await page.goto('/workload')
  await expect(page.getByRole('main')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: '新增授课任务' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('课程').click()
  await page
    .locator('.ant-select-item-option')
    .filter({ hasText: '工业机器人操作与编程' })
    .first()
    .click()
  await page.getByLabel('授课班级').click()
  await page
    .locator('.ant-select-item-option')
    .filter({ hasText: '电气自动化技术2303' })
    .first()
    .click()
  await expect(page.getByRole('dialog').getByText(/折算学时/)).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: resolve(outputDir, '09-workload-calc-preview.png') })
  await page.getByRole('button', { name: /取\s*消/ }).click()
  await page.getByRole('button', { name: /放弃修改/ }).click()

  await page.getByRole('button', { name: '新增其它工作量' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: resolve(outputDir, '11-workload-item-form.png') })
  await page.getByRole('button', { name: /取\s*消/ }).click()

  await page.goto('/practice')
  await expect(page.getByRole('main')).toBeVisible()
  await page.getByRole('button', { name: '登记实践经历' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: resolve(outputDir, '12-practice-form.png') })
  await page.getByRole('button', { name: /取\s*消/ }).click()

  await page.getByTestId('user-menu').click()
  await page.locator('.ant-dropdown-menu-item').filter({ hasText: '退出登录' }).click()
  await signIn(page, '院系管理员 · 刘建国')
  await page.goto('/applications')
  await page.getByRole('tab', { name: '待我审批' }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(outputDir, '10-admin-approval.png'), fullPage: true })
})
