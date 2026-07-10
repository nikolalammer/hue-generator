// UI-Smoke-Test für die Schüler-Seite (Aufruf: node scripts/ui-smoke-test.mjs <hue-id>)
// Voraussetzungen: npm run dev läuft auf :5173, die HÜ existiert,
// Edge ist installiert. Prüft Layout (kein horizontaler Overflow) und
// den kompletten Löse-Flow: Klasse/Nummer → Aufgaben beantworten → Auswerten.
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const hueId = process.argv[2]
if (!hueId) {
  console.error('Aufruf: node scripts/ui-smoke-test.mjs <hue-id>')
  process.exit(1)
}

// Edge liegt je nach Windows-Installation in Program Files oder (x86)
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
if (!EDGE) {
  console.error('Microsoft Edge nicht gefunden – Pfade in scripts/ui-smoke-test.mjs prüfen.')
  process.exit(1)
}
const fehler = []
const ok = (name) => console.log(`  OK   ${name}`)
const fail = (name, detail) => { fehler.push(name); console.log(`  FAIL ${name}${detail ? ' – ' + detail : ''}`) }

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
const page = await browser.newPage()
// Schmales Handy-Format – Schüler-Seite muss perfekt mobil sein
await page.setViewport({ width: 390, height: 850 })
await page.goto(`http://localhost:5173/hue/${hueId}`, { waitUntil: 'networkidle0', timeout: 30000 })

// --- Test 1: kein horizontaler Overflow ---
async function overflowPruefen(schritt) {
  const report = await page.evaluate(() => {
    const max = document.documentElement.clientWidth
    const breit = []
    document.querySelectorAll('body *').forEach((el) => {
      // Deko-Formen ragen absichtlich über den Rand – ihre Ebene clippt per overflow:hidden
      if (el.closest('.deko-ebene')) return
      const r = el.getBoundingClientRect()
      if (r.right > max + 1 && r.width > 0) {
        breit.push(`${el.tagName}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`)
      }
    })
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: max, breit: breit.slice(0, 8) }
  })
  if (report.scrollWidth > report.clientWidth + 1 || report.breit.length > 0) {
    fail(`Layout ${schritt}: horizontaler Overflow`, `${report.scrollWidth}>${report.clientWidth} ${report.breit.join(' | ')}`)
  } else {
    ok(`Layout ${schritt}: kein horizontaler Overflow`)
  }
}
await overflowPruefen('Eingabe-Schritt')

// --- Test 2: Klasse + Katalognummer ---
await page.type('#klasse', '2a')
await page.type('#nummer', '7')
await page.click('.nummern-weiter-btn')
await page.waitForSelector('.frage', { timeout: 10000 })
ok('Klasse/Nummer bestätigt, Aufgaben sichtbar')
await overflowPruefen('Aufgaben-Schritt')

// --- Test 3: Fortschritts-Punkte vorhanden ---
const punkte = await page.$$('.fortschritt-punkt')
if (punkte.length > 0) ok(`Fortschritts-Punkte: ${punkte.length}`)
else fail('Fortschritts-Punkte fehlen')

// --- Test 4: Auswerten-Button gesperrt solange Aufgaben offen ---
const gesperrt = await page.$eval('.auswerten-btn', (b) => b.disabled)
gesperrt ? ok('Auswerten gesperrt bei offenen Aufgaben') : fail('Auswerten nicht gesperrt')

// --- Test 5: alle Aufgaben beantworten ---
// MC + Wahr/Falsch: jeweils erste Option wählen
for (const liste of await page.$$('.antwortliste')) {
  const erste = await liste.$('.antwort-option')
  if (erste) await erste.click()
}
// Lückentexte füllen
for (const input of await page.$$('.luecken-input')) {
  await input.type('bellt')
}
// Zuordnung: jeweils erste echte Option wählen
for (const select of await page.$$('.zuordnung-select')) {
  await select.evaluate((s) => {
    if (s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })) }
  })
}
const nochGesperrt = await page.$eval('.auswerten-btn', (b) => b.disabled)
nochGesperrt ? fail('Auswerten weiterhin gesperrt trotz vollständiger Antworten') : ok('Alle Aufgaben beantwortet, Auswerten freigegeben')

// --- Test 6: Auswerten → Ergebnis erscheint, Lösungen markiert ---
await page.click('.auswerten-btn')
await page.waitForSelector('.ergebnis-prozent', { timeout: 15000 })
const prozent = await page.$eval('.ergebnis-prozent', (e) => e.textContent.trim())
ok(`Auswertung angezeigt: ${prozent}`)
const korrektMarkiert = await page.$$('.antwort-option.korrekt')
korrektMarkiert.length > 0 ? ok(`Richtige Antworten markiert (${korrektMarkiert.length})`) : fail('Keine Antworten als korrekt markiert')
await overflowPruefen('Ergebnis-Schritt')

// Screenshot des Endzustands für die optische Kontrolle
const shot = process.env.SMOKE_SCREENSHOT
if (shot) {
  await page.screenshot({ path: shot, fullPage: true })
  console.log(`  Screenshot: ${shot}`)
}

await browser.close()
if (fehler.length > 0) {
  console.log(`\n${fehler.length} Test(s) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nAlle UI-Smoke-Tests bestanden')
