import { expect, test } from '@playwright/test'

import { gotoMenu, login } from './helpers'

test.describe('调课请假、通知公告与待办', () => {
  test('教师可查看自己的申请列表与状态', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '调课请假')

    const main = page.getByRole('main')
    await expect(main.getByText('待审批').first()).toBeVisible()
    await expect(main.getByText('已通过').first()).toBeVisible()
    await expect(main.getByText('已驳回').first()).toBeVisible()
  })

  test('教师发起调课申请后出现在列表中', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '调课请假')

    await page.getByRole('button', { name: '发起申请' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog
      .getByLabel('申请事由')
      .fill('带队参加全国职业院校技能大赛，需要调整本周数控加工工艺与编程的上课时间')

    await dialog.getByRole('button', { name: /确\s*定|提\s*交/ }).click()

    await expect(page.getByText(/数控加工工艺与编程/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('管理员可审批待办申请', async ({ page }) => {
    await login(page, 'admin')
    await gotoMenu(page, '调课请假')

    await page.getByRole('tab', { name: '待我审批' }).click()
    const approve = page.getByRole('button', { name: /通\s*过/ }).first()
    await expect(approve).toBeVisible()
    await approve.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /确\s*定|提\s*交|通\s*过/ }).click()

    await expect(page.getByText('已通过该申请')).toBeVisible({ timeout: 10_000 })
  })

  test('通知列表展示置顶与未读，打开后未读数减少', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '通知公告')

    const main = page.getByRole('main')
    await expect(main.getByText('置顶').first()).toBeVisible()
    await expect(main.getByText('关于开展 2026 年度"双师型"教师认定工作的通知')).toBeVisible()

    await main.getByText('关于开展 2026 年度"双师型"教师认定工作的通知').click()
    await expect(page.getByText(/各二级学院/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('待办可新增并标记完成', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '待办事项')

    await page.getByRole('button', { name: '新增待办' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('待办内容').fill('整理本学期实训室安全检查记录')
    await dialog.getByRole('button', { name: /确\s*定|保\s*存|提\s*交/ }).click()

    await expect(page.getByText('整理本学期实训室安全检查记录')).toBeVisible({ timeout: 10_000 })
  })
})
