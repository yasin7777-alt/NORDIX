import { test, expect } from '@playwright/test'

test('original page sections, six modules and primary navigation still exist', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#hero')).toHaveCount(1)
  await expect(page.locator('#navbar')).toHaveCount(1)
  await expect(page.locator('#directions')).toHaveCount(1)
  await expect(page.locator('#manifesto')).toHaveCount(1)
  await expect(page.locator('#calculator')).toHaveCount(1)
  await expect(page.locator('#faq')).toHaveCount(1)
  await expect(page.locator('#closing')).toHaveCount(1)
  await expect(page.locator('#courses-grid .course-card')).toHaveCount(6)
  await expect(page.locator('#closing img.closing-vector')).toHaveAttribute('src', /closing\.svg$/)
})

test('course filter and course-details modal still work', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#courses-grid .course-card')).toHaveCount(6)
  await page.locator('.filter-btn[data-filter="ai"]').click()
  await expect(page.locator('#courses-grid .course-card')).toHaveCount(2)
  await page.locator('.filter-btn[data-filter="all"]').click()
  await expect(page.locator('#courses-grid .course-card')).toHaveCount(6)
  await page.getByText('Программа курса').first().click()
  await expect(page.locator('#enroll-modal')).not.toHaveClass(/hidden/)
  await expect(page.locator('#modal-subtitle')).toContainText('Модуль:')
  await page.locator('#enroll-modal button[aria-label="Закрыть"]').click()
  await expect(page.locator('#enroll-modal')).toHaveClass(/hidden/, {timeout:5000})
})

test('calculator and FAQ retain interactive behavior', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#hours-display')).toContainText('12')
  await page.locator('#hours-range').evaluate((el: HTMLInputElement) => {
    el.value = '20'
    el.dispatchEvent(new Event('input', {bubbles:true}))
  })
  await expect(page.locator('#hours-display')).toContainText('20 ч / нед')
  await page.locator('.role-btn[data-role="Компрессоры"]').click()
  await expect(page.locator('#res-role')).toHaveText('Компрессоры')
  const items = page.locator('#faq .accordion-item')
  await items.nth(1).click()
  await expect(items.nth(1)).toHaveClass(/open/)
})

test('responsive mobile menu opens and closes', async ({ page }) => {
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await expect(page.locator('#courses-grid .course-card')).toHaveCount(6)
  await page.locator('#mobile-menu-btn').click()
  await expect(page.locator('#mobile-menu')).not.toHaveClass(/translate-x-full/)
  await page.locator('#mobile-menu a[href="#faq"]').click()
  await expect(page.locator('#mobile-menu')).toHaveClass(/translate-x-full/)
})

test('original and migrated page have the same section order', async ({ page }) => {
  const gather = async () => page.locator('section[id], header[id], footer').evaluateAll(nodes =>
    nodes.map(node => node.id || node.tagName.toLowerCase()))
  await page.goto('/')
  const reactLayout = await gather()
  await page.goto('legacy.html')
  const originalLayout = await gather()
  expect(reactLayout).toEqual(originalLayout)
})

test('fridge video is framed at the right of the desktop hero', async ({ page }) => {
  await page.setViewportSize({width: 1792, height: 900})
  await page.goto('/')
  const player = page.locator('#hero .nordix-hero-video video')
  await expect(player).toHaveCount(1)
  await expect(player).toHaveAttribute('autoplay', '')
  await expect(player).toHaveAttribute('muted', '')
  await expect(player).toHaveAttribute('loop', '')
  await expect(player).toHaveAttribute('playsinline', '')
  await expect(player.locator('source')).toHaveAttribute('src', '/NORDIX/videos/nordix-fridge.mp4')
  const film = await page.locator('#hero .nordix-hero-video').boundingBox()
  if (!film) throw new Error('Hero video must have a visible layout box')
  expect(film.x).toBeGreaterThan(1050)
  expect(film.width).toBeGreaterThan(450)
  expect(film.x + film.width).toBeLessThanOrEqual(1792)
  await expect(page.locator('#hero .hero-title')).toBeVisible()
  await expect(page.locator('#hero a[href="#directions"]')).toBeVisible()
})

test('fridge film moves below the call to action on mobile', async ({ page }) => {
  await page.setViewportSize({width: 390, height: 844})
  await page.goto('/')
  const film = await page.locator('#hero .nordix-hero-video').boundingBox()
  const intro = await page.locator('#hero .hero-intro').boundingBox()
  if (!film || !intro) throw new Error('Hero content should be laid out on mobile')
  expect(film.y).toBeGreaterThan(intro.y)
  expect(film.width).toBeLessThanOrEqual(390)
})
