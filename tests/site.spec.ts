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
  await expect(page.locator('#closing .closing-background')).toHaveAttribute('src', /nordix-closing-bg\.png$/)
  await expect(page.locator('#closing .closing-word-art')).toHaveAttribute('src', /nordix-closing-word\.png$/)
  await expect(page.locator('#closing .closing-background')).toHaveAttribute('draggable', 'false')
  await expect(page.locator('#closing .closing-cover')).toHaveCount(0)
  await expect(page.locator('#closing .closing-go')).toBeVisible()
  await expect(page.locator('#closing #closing-title')).toHaveText('NORDIX')
  await expect(page.locator('#closing .closing-go')).toHaveAttribute('href', '#directions')
  await expect(page.locator('#closing .closing-copyright')).toHaveText('© 2026 NORDIX')
  await expect(page.locator('#closing .closing-tagline')).toHaveText('Точность · Надёжность · Промышленный холод')
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

test('fridge video is the full-screen background behind the hero headlines', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  const hero = page.locator('#hero')
  const background = page.locator('#hero .nordix-hero-video')
  const player = background.locator('video')
  const layout = page.locator('#hero .hero-layout')
  await expect(player).toHaveCount(1)
  await expect(player).toHaveAttribute('autoplay', '')
  await expect(player).toHaveAttribute('muted', '')
  await expect(player).toHaveAttribute('loop', '')
  await expect(player).toHaveAttribute('playsinline', '')
  await expect(player.locator('source')).toHaveAttribute('src', '/NORDIX/videos/nordix-fridge.mp4')
  const heroBox = await hero.boundingBox()
  const videoBox = await background.boundingBox()
  if (!heroBox || !videoBox) throw new Error('Hero background and page need visible dimensions')
  expect(heroBox.width).toBeGreaterThan(1700)
  expect(heroBox.height).toBeGreaterThanOrEqual(834)
  expect(heroBox.height).toBeLessThanOrEqual(900)
  expect(Math.abs(videoBox.x - heroBox.x)).toBeLessThan(2)
  expect(Math.abs(videoBox.y - heroBox.y)).toBeLessThan(2)
  expect(Math.abs(videoBox.width - heroBox.width)).toBeLessThan(2)
  expect(Math.abs(videoBox.height - heroBox.height)).toBeLessThan(2)
  await expect(player).toHaveCSS('object-fit', 'contain')
  // The first screen should show the entire 16:9 movie frame without cropping.
  const title = await page.locator('#hero .hero-title').boundingBox()
  if (!title) throw new Error('Hero text is not laid out')
  expect(title.x + title.width).toBeLessThan(1792 * .64)
  await expect(background).toHaveCSS('position', 'absolute')
  await expect(layout).toHaveCSS('z-index', '2')
  await expect(page.locator('#hero .hero-title')).toBeVisible()
  await expect(page.locator('#hero a[href="#directions"]')).toBeVisible()
})

test('fridge video remains a background on mobile, never a separate block', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const hero = await page.locator('#hero').boundingBox()
  const film = await page.locator('#hero .nordix-hero-video').boundingBox()
  if (!film || !hero) throw new Error('Mobile hero and film should be laid out')
  expect(Math.abs(film.x - hero.x)).toBeLessThan(2)
  expect(Math.abs(film.y - hero.y)).toBeLessThan(2)
  expect(Math.abs(film.width - hero.width)).toBeLessThan(2)
  expect(Math.abs(film.height - hero.height)).toBeLessThan(2)
  expect(film.width).toBeLessThanOrEqual(390)
  await expect(page.locator('#hero .nordix-hero-video-player')).toHaveCSS('object-fit', 'cover')
  await expect(page.locator('#hero .hero-title')).toBeVisible()
  await expect(page.locator('#hero .hero-intro')).toBeVisible()
})

test('uploaded refrigerator video exists under the exact URL used by the hero', async ({ page }) => {
  await page.goto('/')
  const source = page.locator('#hero video source')
  await expect(source).toHaveAttribute('src', '/NORDIX/videos/nordix-fridge.mp4')
  const response = await page.request.head('/NORDIX/videos/nordix-fridge.mp4')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('video/mp4')
  expect(Number(response.headers()['content-length'])).toBeGreaterThan(20_000_000)
})

test('ticker is visible at the very bottom of the opening viewport, like SYS/LAB', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  const hero = await page.locator('#hero').boundingBox()
  const ticker = await page.locator('#hero-marquee').boundingBox()
  if (!hero || !ticker) throw new Error('Hero and ticker must have visible layout boxes')
  expect(Math.abs(hero.y + hero.height - ticker.y)).toBeLessThan(2)
  expect(ticker.height).toBe(64)
  // No initial scrolling is needed to see the complete ticker.
  expect(ticker.y).toBeGreaterThan(800)
  expect(ticker.y + ticker.height).toBeLessThanOrEqual(902)
  await expect(page.locator('#hero .hero-title')).toBeVisible()
  await expect(page.locator('#hero .nordix-hero-video')).toBeVisible()
})

test('hero typography is larger but stays inside the first screen beside the refrigerator', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  const fontSize = async (selector: string): Promise<number> => Number(
    (await page.locator(selector).first().evaluate(el => getComputedStyle(el).fontSize)).replace('px','')
  )
  expect(await fontSize('#hero .hero-title')).toBeGreaterThanOrEqual(74)
  expect(await fontSize('#hero .hero-status span.text-n800')).toBeGreaterThanOrEqual(15)
  expect(await fontSize('#hero .hero-intro p')).toBeGreaterThanOrEqual(20)
  expect(await fontSize('#hero .hero-intro a')).toBeGreaterThanOrEqual(13)
  await expect(page.locator('#hero .hero-intro button')).toHaveCount(0)
  const title = await page.locator('#hero .hero-title').boundingBox()
  const cta = await page.locator('#hero .hero-intro').boundingBox()
  const ticker = await page.locator('#hero-marquee').boundingBox()
  if (!title || !cta || !ticker) throw new Error('Headline, CTA and ticker must exist')
  expect(title.x + title.width).toBeLessThan(1792 * .60)
  expect(cta.y + cta.height).toBeLessThan(ticker.y)
  await expect(page.locator('#hero .nordix-hero-video')).toBeVisible()
})

test('restored NORDIX slogan uses original inline logo at the unchanged large font size', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  await expect(page.locator('#hero .hero-intro p')).toHaveText('Разбирай железо, изучай схемы и прокачивай навыки. Всё о технологиях холода — без лишней воды.')
  const title = page.locator('#hero .hero-title')
  const lines = title.locator(':scope > span')
  await expect(lines).toHaveCount(4)
  await expect(title).toHaveAttribute('aria-label', 'Держим холод под контролем')
  await expect(lines.nth(0)).toHaveText('ДЕРЖИМ')
  await expect(lines.nth(1)).toContainText('ХОЛОД')
  await expect(lines.nth(2)).toHaveText('ПОД')
  await expect(lines.nth(3)).toHaveText('КОНТРОЛЕМ')
  const image = lines.nth(1).locator('img[alt="Символ бесконечности NORDIX"]')
  await expect(image).toHaveCount(1)
  await expect(image).toBeVisible()
  await expect(lines.nth(1)).toHaveCSS('display', 'flex')
  const fontSize = Number(await title.evaluate(el => getComputedStyle(el).fontSize.replace('px','')))
  expect(fontSize).toBeGreaterThanOrEqual(90) // slightly smaller than previous 100px desktop type
  expect(fontSize).toBeLessThanOrEqual(96)
  const rects = await Promise.all([0,1,2,3].map(i => lines.nth(i).boundingBox()))
  if (rects.some(box => !box)) throw new Error('All restored headline rows should be visible')
  const [first, second, third, fourth] = rects as Array<NonNullable<typeof rects[0]>>
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 2)
  expect(third.y).toBeGreaterThanOrEqual(second.y + second.height - 2)
  expect(fourth.y).toBeGreaterThanOrEqual(third.y + third.height - 2)
  expect(fourth.x + fourth.width).toBeLessThan(1792 * .62)
  const intro = await page.locator('#hero .hero-intro').boundingBox()
  const ticker = await page.locator('#hero-marquee').boundingBox()
  if (!intro || !ticker) throw new Error('Intro and ticker must remain visible')
  expect(intro.y + intro.height).toBeLessThan(ticker.y)
  await expect(page.locator('#hero .nordix-hero-video')).toBeVisible()
})

test('restored oversized headline and logo fit laptop and mobile screens', async ({ page }) => {
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    await page.goto('/')
    const title = page.locator('#hero .hero-title')
    const lines = title.locator(':scope > span')
    await expect(lines).toHaveCount(4)
    await expect(lines.nth(1).locator('img')).toBeVisible()
    const headline = await title.boundingBox()
    const ticker = await page.locator('#hero-marquee').boundingBox()
    const intro = await page.locator('#hero .hero-intro').boundingBox()
    if (!headline || !ticker || !intro) throw new Error('Responsive hero should remain visible')
    expect(headline.x).toBeGreaterThanOrEqual(0)
    expect(headline.x + headline.width).toBeLessThanOrEqual(size.width)
    expect(intro.y + intro.height).toBeLessThan(ticker.y)
    for (const index of [1,3]) {
      const overflow = await lines.nth(index).evaluate(el => el.scrollWidth - el.clientWidth)
      expect(overflow).toBeLessThanOrEqual(2)
    }
  }
})


test('hero has only the primary CTA, placed to the right of its description on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  const hero = page.locator('#hero')
  const description = hero.locator('.hero-intro p')
  const cta = hero.locator('.hero-module-cta')
  await expect(hero.getByText('Что будем изучать')).toHaveCount(0)
  await expect(hero.locator('button')).toHaveCount(0)
  await expect(cta).toHaveCount(1)
  await expect(cta).toContainText('Выбрать модуль')
  await expect(cta).toHaveAttribute('href', '#directions')
  const [descBox, ctaBox, tickerBox] = await Promise.all([
    description.boundingBox(), cta.boundingBox(), page.locator('#hero-marquee').boundingBox(),
  ])
  if (!descBox || !ctaBox || !tickerBox) throw new Error('Description, CTA and ticker must all be visible')
  expect(ctaBox.x).toBeGreaterThan(descBox.x + descBox.width - 2)
  expect(ctaBox.x).toBeGreaterThan(570)
  expect(ctaBox.x + ctaBox.width).toBeLessThan(980)
  expect(Math.abs((ctaBox.y + ctaBox.height / 2) - (descBox.y + descBox.height / 2))).toBeLessThan(10)
  expect(ctaBox.y + ctaBox.height).toBeLessThan(tickerBox.y)
  await expect(hero.locator('.nordix-hero-video')).toBeVisible()
})

test('primary module CTA stays accessible without overlap on smaller screens', async ({ page }) => {
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    await page.goto('/')
    const desc = await page.locator('#hero .hero-intro p').boundingBox()
    const cta = await page.locator('#hero .hero-module-cta').boundingBox()
    const ticker = await page.locator('#hero-marquee').boundingBox()
    if (!desc || !cta || !ticker) throw new Error('Responsive primary CTA must exist')
    expect(cta.x).toBeGreaterThanOrEqual(0)
    expect(cta.x + cta.width).toBeLessThanOrEqual(size.width)
    if (size.width >= 1024) {
      expect(cta.x).toBeGreaterThanOrEqual(desc.x + desc.width - 2)
    } else {
      expect(cta.y).toBeGreaterThanOrEqual(desc.y + desc.height)
    }
    expect(cta.y + cta.height).toBeLessThan(ticker.y)
  }
})

test('final NORDIX invitation uses black and blue branding and links to modules', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 900 })
  await page.goto('/')
  const footer = page.locator('footer')
  const invite = footer.locator('.nordix-join-cta')
  const heading = invite.locator('#nordix-join-title')
  await expect(invite).toHaveCount(1)
  await expect(heading).toHaveAttribute('aria-label', 'Готов врубиться в холод?')
  await expect(heading.locator(':scope > span')).toHaveCount(3)
  await expect(heading.locator(':scope > span').nth(0)).toHaveText('ГОТОВ')
  await expect(heading.locator(':scope > span').nth(1)).toHaveText('ВРУБИТЬСЯ')
  await expect(heading.locator(':scope > span').nth(2)).toHaveText('В ХОЛОД?')
  await expect(invite.locator('.nordix-join-description')).toContainText('Начни с главного — с любопытства.')
  await expect(invite.locator('.nordix-join-accent')).toHaveCSS('color', 'rgb(61, 117, 216)')
  const cta = invite.locator('.nordix-join-button')
  await expect(cta).toHaveAttribute('href', '#directions')
  await expect(cta).toContainText('ПОГНАЛИ')
  await expect(cta).toHaveCSS('background-color', 'rgb(61, 117, 216)')
  // The entire boxed logo/navigation strip from the screenshot is removed.
  await expect(footer.locator('img[alt="Логотип NORDIX"]')).toHaveCount(0)
  await expect(footer.getByText('Все модули')).toHaveCount(0)
  await expect(footer.getByText('О методологии')).toHaveCount(0)
  await expect(footer.getByText('План изучения')).toHaveCount(0)
  await expect(footer.getByText('Вопросы и ответы')).toHaveCount(0)
  const fontSize = Number(await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize)))
  // Match the giant lettering in the reference, not the former ~112px headline.
  expect(fontSize).toBeGreaterThanOrEqual(150)
  const headingBox = await heading.boundingBox()
  const fullscreenBox = await invite.boundingBox()
  const footerBox = await footer.boundingBox()
  if (!headingBox || !fullscreenBox || !footerBox) throw new Error('The footer CTA should fill the viewport')
  expect(headingBox.x).toBeLessThan(145)
  expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(1792)
  // The full-black NORDIX invitation touches all viewport edges.
  expect(Math.abs(fullscreenBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(fullscreenBox.width - 1792)).toBeLessThanOrEqual(2)
  expect(Math.abs(fullscreenBox.height - 900)).toBeLessThanOrEqual(2)
  expect(Math.abs(footerBox.height - fullscreenBox.height)).toBeLessThanOrEqual(2)
  await expect(footer.getByText('Отправить заявку')).toHaveCount(0)
  const metrics = await heading.locator(':scope > span').nth(1).evaluate(el => ({
    scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2)
})

test('final course invitation and course link fit a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const footer = page.locator('footer')
  const invite = footer.locator('.nordix-join-cta')
  const heading = invite.locator('.nordix-join-title')
  const link = invite.locator('.nordix-join-button')
  await expect(heading).toBeVisible()
  await expect(link).toBeVisible()
  await expect(footer.locator('img[alt="Логотип NORDIX"]')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)

  // Read all rectangles in one browser frame. Measuring them through
  // parallel Playwright calls can combine different scroll positions.
  const geometry = await invite.evaluate(el => {
    const title = el.querySelector<HTMLElement>('.nordix-join-title')!
    const button = el.querySelector<HTMLElement>('.nordix-join-button')!
    const description = el.querySelector<HTMLElement>('.nordix-join-description')!
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    const middleLine = title.querySelectorAll(':scope > span')[1] as HTMLElement
    return {
      fullMobile: rect(el),
      headingBox: rect(title),
      ctaBox: rect(button),
      descriptionBox: rect(description),
      headingOverflow: middleLine.scrollWidth - middleLine.clientWidth,
    }
  })
  const { fullMobile, headingBox, ctaBox, descriptionBox, headingOverflow } = geometry
  expect(Math.abs(fullMobile.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(fullMobile.width - 390)).toBeLessThanOrEqual(2)
  expect(fullMobile.height).toBeGreaterThanOrEqual(844)
  expect(headingBox.x).toBeGreaterThanOrEqual(0)
  expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(390)
  expect(ctaBox.x).toBeGreaterThanOrEqual(0)
  expect(ctaBox.x + ctaBox.width).toBeLessThanOrEqual(390)
  expect(ctaBox.y).toBeGreaterThanOrEqual(descriptionBox.y + descriptionBox.height)
  expect(headingOverflow).toBeLessThanOrEqual(2)
})


test('NORDIX curtain reveals with wheel and never traps scrolling upward', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const scene = page.locator('.nordix-final-scene')
  const footer = scene.locator('footer')
  const closing = scene.locator('#closing')
  await expect(footer).toHaveCount(1)
  await expect(closing).toHaveCount(1)
  await expect(closing).toHaveCSS('position', 'sticky')

  // Start from the browser's real bottom position. This avoids flaky
  // anchors/layout offsets while images, fonts, and the header settle.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
  })
  await page.waitForTimeout(300)
  const atBottom = await page.evaluate(() => window.scrollY)
  expect(atBottom).toBeGreaterThan(1000)

  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -320)
  await page.waitForTimeout(400)
  const upOne = await page.evaluate(() => window.scrollY)
  const footerTopOne = await footer.evaluate(el => el.getBoundingClientRect().top)
  expect(upOne).toBeLessThan(atBottom - 150)

  await page.mouse.wheel(0, -320)
  await page.waitForTimeout(400)
  const upTwo = await page.evaluate(() => window.scrollY)
  const footerTopTwo = await footer.evaluate(el => el.getBoundingClientRect().top)
  expect(upTwo).toBeLessThan(upOne - 150)
  expect(footerTopTwo).toBeGreaterThan(footerTopOne + 150)

  // Scrolling down reverses the curtain and uncovers the white section.
  await page.mouse.wheel(0, 240)
  await page.waitForTimeout(400)
  const downward = await page.evaluate(() => window.scrollY)
  expect(downward).toBeGreaterThan(upTwo + 110)

  // Critical regression: wheel up must be able to pass the black invitation
  // and continue into FAQ, not stop at its boundary.
  await page.mouse.wheel(0, -2200)
  await page.waitForTimeout(450)
  expect(await scene.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(100)

  const above = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 450)
  await page.waitForTimeout(450)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(above + 150)
})

test('keyboard navigation escapes the final block without a wheel lock', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')
    const scene = document.querySelector('.nordix-final-scene')!
    window.scrollTo({top: window.scrollY + scene.getBoundingClientRect().top + 250, behavior: 'instant'})
  })
  await page.waitForTimeout(150)
  await page.keyboard.press('PageUp')
  await page.waitForTimeout(450)
  // Positive top means FAQ is visible again above the black invitation.
  expect(await page.locator('.nordix-final-scene').evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(100)
  expect(await page.evaluate(() => document.documentElement.classList.contains('nordix-final-scroll-active'))).toBe(false)
})

test('NORDIX mobile final block remains in normal document flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.nordix-final-scene')).toHaveCSS('height', /auto|[0-9]+px/)
  await expect(page.locator('#closing')).toHaveCSS('position', 'relative')
})

test('NORDIX wordmark parallax reverses with native wheel scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const word = page.locator('#closing .closing-word-art')
  await expect(word).toBeVisible()
  const shift = () => page.locator('#closing').evaluate(el =>
    parseFloat(getComputedStyle(el).getPropertyValue('--closing-word-shift')))

  // Begin at the actual page bottom, where the logo has completed its travel.
  // This is independent of async font/video layout and scroll-padding.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
  })
  await expect.poll(shift).toBeLessThan(1)

  await page.mouse.move(720, 450)
  await page.mouse.wheel(0, -340)
  await expect.poll(shift).toBeGreaterThan(4)
  await expect.poll(shift).toBeLessThan(30)

  await page.mouse.wheel(0, -520)
  await expect.poll(shift).toBeGreaterThan(29)

  await page.mouse.wheel(0, 400)
  await expect.poll(shift).toBeLessThan(29)
  await expect.poll(shift).toBeGreaterThan(4)
  expect(await page.evaluate(() => document.documentElement.classList.contains('nordix-final-scroll-active'))).toBe(false)
})
