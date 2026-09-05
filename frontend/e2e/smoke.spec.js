import { test, expect } from '@playwright/test'

test('sistema começa protegido por login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Biblioteca Escolar' })).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
})