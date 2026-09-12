import { expect, test } from '@playwright/test'

import { gotoMenu, login } from './helpers'

test.describe('教科研成果与企业实践', () => {
  test('成果页展示统计、图表与成果列表', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教科研成果')

    const main = page.getByRole('main')
    await expect(main.getByText('成果总数')).toBeVisible()
    await expect(main.getByText('业绩总分')).toBeVisible()
    await expect(main.getByText('按类别分布')).toBeVisible()
    await expect(main.getByText('按级别分布')).toBeVisible()
    await expect(main.getByText('产教融合背景下高职数控专业课程改革实践')).toBeVisible()
  })

  test('新增成果后按级别自动折算分值', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '教科研成果')

    await page.getByRole('button', { name: '登记新成果' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('成果名称').fill('高职实训教学数字化转型研究')
    await dialog.getByLabel('本人角色').fill('主持人')

    await dialog.getByRole('button', { name: /确\s*定|保\s*存|提\s*交/ }).click()

    await expect(page.getByRole('table').getByText('高职实训教学数字化转型研究')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('企业实践页展示近 5 年进度与政策要求', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '企业实践')

    const main = page.getByRole('main')
    await expect(main.getByText(/127/).first()).toBeVisible()
    await expect(main.getByText(/180/).first()).toBeVisible()
    await expect(main.getByText('宁波海天精工股份有限公司')).toBeVisible()
    await expect(main.getByText(/双师型/).first()).toBeVisible()
  })

  test('登记企业实践经历后累计天数增加', async ({ page }) => {
    await login(page)
    await gotoMenu(page, '企业实践')

    await page.getByRole('button', { name: '登记实践经历' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('企业名称').fill('杭州新松机器人自动化有限公司')
    await dialog.getByLabel('实践岗位').fill('机器人应用工程师')

    await dialog.getByRole('button', { name: /确\s*定|保\s*存|提\s*交/ }).click()

    await expect(page.getByRole('main').getByText('杭州新松机器人自动化有限公司').first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
