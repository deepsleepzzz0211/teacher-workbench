import { expect, test } from '@playwright/test'

import { gotoMenu, login } from './helpers'

test.describe('教学工作量', () => {
  test('页面展示学期汇总、达成率与折算构成', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教学工作量')

    const main = page.getByRole('main')
    await expect(main.getByText('总折算学时', { exact: true })).toBeVisible()
    await expect(main.getByText('课堂教学', { exact: true })).toBeVisible()
    await expect(main.getByText('其它工作量', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('达成率', { exact: true })).toBeVisible()
    await expect(main.getByText('周学时分布', { exact: true })).toBeVisible()
    await expect(main.getByText('课程类型构成', { exact: true })).toBeVisible()
  })

  test('授课任务表格列出已排课程与折算学时列', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教学工作量')

    const main = page.getByRole('main')
    await expect(page.getByRole('columnheader', { name: '课程名称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '折算学时' }).first()).toBeVisible()
    await expect(main.getByText('机械制图与CAD').first()).toBeVisible()
    await expect(main.getByText('数控加工工艺与编程').first()).toBeVisible()
    await expect(main.getByText('86.4').first()).toBeVisible()
  })

  test('汇总数值与后端领域规则一致（468.2 折算学时 / 达成率 195.1%）', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教学工作量')

    const main = page.getByRole('main')
    await expect(main.getByText('468.2').first()).toBeVisible()
    await expect(main.getByText('195.1%').first()).toBeVisible()
    await expect(main.getByText(/已超出基本工作量 228.2 折算学时/)).toBeVisible()
  })

  test('新增授课任务时实时预览折算算式，提交后进入列表', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教学工作量')

    await page.getByRole('button', { name: '新增授课任务' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('课程').click()
    await page
      .locator('.ant-select-item-option')
      .filter({ hasText: '工业机器人操作与编程' })
      .first()
      .click()

    await dialog.getByLabel('授课班级').click()
    await page
      .locator('.ant-select-item-option')
      .filter({ hasText: '电气自动化技术2303' })
      .first()
      .click()

    await expect(dialog.getByText('75.3 折算学时')).toBeVisible()
    await expect(dialog.getByText(/1\.12（52 人）/)).toBeVisible()

    await dialog.getByRole('button', { name: /保\s*存/ }).click()

    await expect(page.getByText('授课任务已新增')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('main').getByText('工业机器人操作与编程').first()).toBeVisible()
  })

  test('新增其它工作量时按类别系数实时折算', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教学工作量')

    await page.getByRole('button', { name: '新增其它工作量' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await expect(dialog.getByText('20.0 折算学时')).toBeVisible()

    await dialog.getByLabel('工作内容').fill('2026年省职业院校技能大赛 工业机器人赛项指导')

    await dialog.getByRole('button', { name: /保\s*存/ }).click()

    await expect(page.getByText('工作量记录已新增')).toBeVisible({ timeout: 10_000 })
  })

  test('课表页展示本周课程与课程类型图例', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '我的课表')

    const main = page.getByRole('main')
    await expect(main.getByText('周一', { exact: true })).toBeVisible()
    await expect(main.getByText('周五', { exact: true })).toBeVisible()
    await expect(main.getByText('机械制图与CAD').first()).toBeVisible()
    await expect(main.getByText('理论课').first()).toBeVisible()
    await expect(main.getByText('本周课程数')).toBeVisible()
  })

  test('新增授课任务后，工作台首页的折算学时同步更新', async ({ page }) => {
    const goToDashboard = async (): Promise<void> => {
      await page.getByRole('menuitem', { name: '工作台' }).click()
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('heading', { name: /老师/ })).toBeVisible()
    }

    const readDashboardTotal = async (): Promise<number> => {
      const line = page.getByRole('main').getByText(/\d+(\.\d+)? \/ 240/).first()
      await expect(line).toBeVisible()
      const text = (await line.textContent()) ?? ''
      const matched = text.match(/([\d.]+)\s*\/\s*240/)
      return Number(matched?.[1] ?? Number.NaN)
    }

    await login(page)

    await goToDashboard()
    const before = await readDashboardTotal()
    expect(Number.isNaN(before)).toBe(false)

    await gotoMenu(page, '教学工作量')
    await page.getByRole('button', { name: '新增授课任务' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('课程').click()
    await page
      .locator('.ant-select-item-option')
      .filter({ hasText: '工业机器人操作与编程' })
      .first()
      .click()
    await dialog.getByLabel('授课班级').click()
    await page
      .locator('.ant-select-item-option')
      .filter({ hasText: '汽车检测与维修技术2402' })
      .first()
      .click()

    await expect(dialog.getByText('67.2 折算学时')).toBeVisible()
    await dialog.getByRole('button', { name: /保\s*存/ }).click()
    await expect(page.getByText('授课任务已新增')).toBeVisible({ timeout: 10_000 })

    await goToDashboard()
    const after = await readDashboardTotal()
    expect(after - before).toBeCloseTo(67.2, 1)
  })
})
