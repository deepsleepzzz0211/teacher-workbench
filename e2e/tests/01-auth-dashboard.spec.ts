import { expect, test } from '@playwright/test'

import { login } from './helpers'

test.describe('登录与工作台首页', () => {
  test('未登录时访问受保护页面会跳转到登录页', async ({ page }) => {
    await page.goto('/workload')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '高职院校教师工作台' })).toBeVisible()
  })

  test('密码错误时留在登录页并给出提示', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('例如 t1001').fill('t1001')
    await page.getByPlaceholder('请输入密码').fill('wrong-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await expect(page.getByText('用户名或密码不正确')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('演示账号一键填入后可直接登录并进入工作台', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: '专任教师 · 陈立群' }).click()
    await page.getByRole('button', { name: /登\s*录/ }).click()

    const main = page.getByRole('main')
    await expect(page.getByRole('heading', { name: /陈立群/ })).toBeVisible()
    await expect(main.getByText('本学期折算学时')).toBeVisible()
    await expect(main.getByText('教科研成果', { exact: true })).toBeVisible()
    await expect(main.getByText('企业实践累计')).toBeVisible()
  })

  test('工作台展示本学期工作量达成情况与企业实践进度', async ({ page }) => {
    await login(page)

    const main = page.getByRole('main')
    await expect(main.getByText('468.2 / 240')).toBeVisible()
    await expect(main.getByText('教学工作量达成情况')).toBeVisible()
    await expect(main.getByText(/已超出基本工作量/)).toBeVisible()
    await expect(main.getByText('企业实践进度（双师型）')).toBeVisible()
    await expect(main.getByText(/近 5 年累计 127 天/)).toBeVisible()
  })

  test('工作台展示待办、通知与成果构成', async ({ page }) => {
    await login(page)

    const main = page.getByRole('main')
    await expect(main.getByText('待办事项').first()).toBeVisible()
    await expect(main.getByText('全部待办')).toBeVisible()
    await expect(main.getByText('最新通知')).toBeVisible()
    await expect(main.getByText('关于开展 2026 年度"双师型"教师认定工作的通知')).toBeVisible()
    await expect(main.getByText('教科研成果构成')).toBeVisible()
    await expect(main.getByText('最近登记成果')).toBeVisible()
  })

  test('可以退出登录并回到登录页', async ({ page }) => {
    await login(page)

    await page.getByTestId('user-menu').click()
    const logoutItem = page.locator('.ant-dropdown-menu-item').filter({ hasText: '退出登录' })
    await expect(logoutItem).toBeVisible()
    await logoutItem.click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByPlaceholder('例如 t1001')).toBeVisible()
  })

  test('可以用键盘聚焦账户菜单并展开', async ({ page }) => {
    await login(page)

    const trigger = page.getByTestId('user-menu')
    await trigger.focus()
    await expect(trigger).toBeFocused()

    await page.keyboard.press('Enter')

    await expect(page.getByRole('menuitem', { name: '退出登录' })).toBeVisible()
  })

  test('通知列表可以用键盘打开详情', async ({ page }) => {
    await login(page)
    await page.getByRole('menuitem', { name: '通知公告' }).click()

    const row = page.getByRole('button', { name: /关于开展 2026 年度/ })
    await expect(row).toBeVisible()
    await row.focus()
    await expect(row).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByText(/各二级学院/).first()).toBeVisible()
  })
})
