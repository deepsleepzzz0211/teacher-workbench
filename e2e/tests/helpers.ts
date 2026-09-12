import { expect, type Page } from '@playwright/test'

export const DEMO_PASSWORD = 'Teach@2026'

export async function login(page: Page, username = 't1001'): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('例如 t1001').fill(username)
  await page.getByPlaceholder('请输入密码').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await expect(page).toHaveURL(/127\.0\.0\.1:5173\/$|localhost:5173\/$/)
}

export async function gotoMenu(page: Page, label: string): Promise<void> {
  await page.getByRole('menuitem', { name: label }).click()
  await expect(page.getByRole('heading', { name: label })).toBeVisible()
}
