import { useEffect } from 'react'

import cursor from './sections/Cursor.html?raw'
import header from './sections/Header.html?raw'
import mobileMenu from './sections/MobileMenu.html?raw'
import hero from './sections/Hero.html?raw'
import ticker from './sections/Ticker.html?raw'
import programs from './sections/Programs.html?raw'
import methodology from './sections/Methodology.html?raw'
import learningPlan from './sections/LearningPlan.html?raw'
import faq from './sections/Faq.html?raw'
import footer from './sections/Footer.html?raw'
import closing from './sections/Closing.html?raw'
import modals from './sections/Modals.html?raw'

/**
 * NORDIX gradual migration: mount the existing, user-approved HTML unchanged
 * within React components, then move each interaction to React individually.
 *
 * Static strings are part of the trusted repository (not user input).
 * The display:contents wrapper preserves the original DOM box/layout structure.
 */
function LegacyMarkup({ html }: { html: string }) {
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Cursor() { return <LegacyMarkup html={cursor} /> }
function Header() { return <LegacyMarkup html={header} /> }
function MobileMenu() { return <LegacyMarkup html={mobileMenu} /> }
function Hero() { return <LegacyMarkup html={hero} /> }
function Ticker() { return <LegacyMarkup html={ticker} /> }
function Programs() { return <LegacyMarkup html={programs} /> }
function Methodology() { return <LegacyMarkup html={methodology} /> }
function LearningPlan() { return <LegacyMarkup html={learningPlan} /> }
function Faq() { return <LegacyMarkup html={faq} /> }
function Footer() { return <LegacyMarkup html={footer} /> }
function Closing() {
  return <LegacyMarkup html={closing.replace('__NORDIX_CLOSING_SVG__', import.meta.env.BASE_URL + 'closing.svg')} />
}
function Modals() { return <LegacyMarkup html={modals} /> }

function loadLegacyScript(filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = import.meta.env.BASE_URL + 'scripts/' + filename
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Не удалось загрузить скрипт NORDIX: ' + filename))
    document.body.appendChild(script)
  })
}

export function App() {
  useEffect(() => {
    // Loading scripts after React has mounted guarantees their DOM selectors find
    // every existing section. Scripts are intentionally classic, not modules:
    // inline onclick handlers in the unchanged original HTML still work.
    void (async () => {
      for (const filename of ['core.js', 'ticker.js', 'navbar.js']) {
        await loadLegacyScript(filename)
      }
    })().catch(error => console.error(error))
  }, [])

  return (
    <>
      <Cursor />
      <Header />
      <MobileMenu />
      <Hero />
      <Ticker />
      <Programs />
      <Methodology />
      <LearningPlan />
      <Faq />
      <Footer />
      <Closing />
      <Modals />
    </>
  )
}
