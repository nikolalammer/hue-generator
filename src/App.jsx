import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import AutoGrowTextarea from './components/AutoGrowTextarea'
import VorschauEditor from './components/VorschauEditor'
import './App.css'

// URL der Edge Function
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

export default function App() {
  const [fach, setFach] = useState('Deutsch')
  const [thema, setThema] = useState('')
  // Aufgabentyp: mc | lueckentext | gemischt
  const [aufgabentyp, setAufgabentyp] = useState('mc')
  // Umfang: kurz (~3 Aufgaben) | mittel (~5) | lang (~8)
  const [umfang, setUmfang] = useState('mittel')
  // ergebnis enthält { id, text, fragen, lueckentexte } – id ist die UUID der gespeicherten HÜ
  const [ergebnis, setErgebnis] = useState(null)
  // istGespeichert: true sobald die Lehrperson die Vorschau gespeichert hat
  const [istGespeichert, setIstGespeichert] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [kopiert, setKopiert] = useState(false)

  async function generieren(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)
    setErgebnis(null)
    setIstGespeichert(false)
    setKopiert(false)

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fach, thema, aufgabentyp, umfang }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.fehler || 'Generierung fehlgeschlagen.')

      // Prüfen ob die KI tatsächlich Aufgaben geliefert hat
      const hatFragen = Array.isArray(data.fragen) && data.fragen.length > 0
      const hatLueckentexte = Array.isArray(data.lueckentexte) && data.lueckentexte.length > 0
      if (!hatFragen && !hatLueckentexte) {
        throw new Error('Die KI hat keine Aufgaben zurückgeliefert.')
      }

      // data = { id, text, fragen, lueckentexte }
      setErgebnis(data)
    } catch (err) {
      setFehler(err.message)
    } finally {
      setLaedt(false)
    }
  }

  // QR-Code als PNG herunterladen via Canvas-Export
  function qrHerunterladen() {
    const canvas = document.getElementById('hue-qr-code')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `hue-${ergebnis.id.substring(0, 8)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Schüler-Link in die Zwischenablage kopieren
  async function linkKopieren() {
    const link = `${window.location.origin}/hue/${ergebnis.id}`
    try {
      await navigator.clipboard.writeText(link)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    } catch {
      // Fallback für ältere Browser
      const eingabe = document.createElement('input')
      eingabe.value = link
      document.body.appendChild(eingabe)
      eingabe.select()
      document.execCommand('copy')
      document.body.removeChild(eingabe)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-mitte">
          <h1>Aufgabolino</h1>
          <p>KI-Hausübungen für die Mittelschule</p>
        </div>
        <Link to="/dashboard" className="dashboard-link">Dashboard →</Link>
      </header>

      {/* Schritt 1: Hausübung generieren */}
      <form className="formular" onSubmit={generieren}>
        <div className="formfeld">
          <label htmlFor="fach">Fach</label>
          <select
            id="fach"
            value={fach}
            onChange={(e) => setFach(e.target.value)}
          >
            <option value="Deutsch">Deutsch</option>
            <option value="Mathematik">Mathematik</option>
            <option value="Englisch">Englisch</option>
          </select>
        </div>

        <div className="formfeld">
          <label htmlFor="thema">Thema</label>
          <AutoGrowTextarea
            id="thema"
            placeholder="z.B. Adjektive – Steigerung und Vergleich"
            value={thema}
            onChange={(e) => setThema(e.target.value)}
            required
          />
        </div>

        <div className="formfeld">
          <label htmlFor="aufgabentyp">Aufgabentyp</label>
          <select
            id="aufgabentyp"
            value={aufgabentyp}
            onChange={(e) => setAufgabentyp(e.target.value)}
          >
            <option value="mc">Multiple Choice</option>
            <option value="lueckentext">Lückentext</option>
            <option value="gemischt">Gemischt</option>
          </select>
        </div>

        <div className="formfeld">
          <label htmlFor="umfang">Umfang</label>
          <select
            id="umfang"
            value={umfang}
            onChange={(e) => setUmfang(e.target.value)}
          >
            <option value="kurz">Kurz (ca. 5 Min)</option>
            <option value="mittel">Mittel (ca. 10 Min)</option>
            <option value="lang">Lang (ca. 15 Min)</option>
          </select>
        </div>

        <button className="generieren-btn" type="submit" disabled={laedt}>
          {laedt ? 'Wird generiert...' : 'Hausübung generieren'}
        </button>
      </form>

      {laedt && (
        <div className="ladeindikator">
          <span className="spinner" aria-hidden="true" />
          KI generiert deine Hausübung...
        </div>
      )}

      {fehler && (
        <div className="fehler" role="alert">
          <strong>{fehler}</strong>
          <p className="fehler-hinweis">Bitte versuche die HÜ neu zu generieren.</p>
        </div>
      )}

      {/* Schritt 2a: Editierbare Vorschau – Lehrperson prüft und speichert */}
      {ergebnis && !istGespeichert && (
        <section className="ergebnis">
          <div className="ergebnis-kopf">
            <h2>{fach} – {thema}</h2>
          </div>
          <VorschauEditor
            ergebnis={ergebnis}
            fach={fach}
            thema={thema}
            onGespeichert={(bearbeiteteDaten) => {
              // Ergebnis mit den bearbeiteten Daten aktualisieren, dann Link anzeigen
              setErgebnis((prev) => ({ ...prev, ...bearbeiteteDaten }))
              setIstGespeichert(true)
            }}
          />
        </section>
      )}

      {/* Schritt 2b: Freigeschaltete Vorschau + Schüler-Link + QR-Code */}
      {ergebnis && istGespeichert && (
        <section className="ergebnis">
          <div className="ergebnis-kopf">
            <h2>{fach} – {thema}</h2>
          </div>

          {/* Lesetext-Vorschau */}
          <div className="lesetext">
            <strong>Lesetext</strong>
            <p>{ergebnis.text}</p>
          </div>

          {/* Fragen-Vorschau – nur rendern wenn MC-Fragen vorhanden */}
          {Array.isArray(ergebnis.fragen) && ergebnis.fragen.length > 0 && (
            <>
              <p className="fragen-titel">Fragen (Vorschau)</p>
              {ergebnis.fragen.map((frage, i) => (
                <div key={i} className="frage">
                  <p className="fragetext">{i + 1}. {frage.frage}</p>
                  <ul className="antwortliste">
                    {Array.isArray(frage.antworten) && frage.antworten.map((antwort, j) => (
                      <li key={j} className="antwort-option vorschau">
                        <span className="buchstabe">{String.fromCharCode(65 + j)}</span>
                        {antwort}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {/* Lückentext-Vorschau – nur rendern wenn Lückentexte vorhanden */}
          {Array.isArray(ergebnis.lueckentexte) && ergebnis.lueckentexte.length > 0 && (
            <>
              <p className="fragen-titel">Lückentexte (Vorschau)</p>
              {ergebnis.lueckentexte.map((lt, i) => (
                <div key={i} className="frage">
                  <p className="fragetext">{i + 1}. {lt.satz.replace('___', '______')}</p>
                </div>
              ))}
            </>
          )}

          {/* Teilbarer Schüler-Link */}
          <div className="link-box">
            <p>Schüler-Link zum Teilen</p>
            <div className="link-zeile">
              <input
                className="link-text"
                type="text"
                readOnly
                value={`${window.location.origin}/hue/${ergebnis.id}`}
              />
              <button className="kopieren-btn" type="button" onClick={linkKopieren}>
                {kopiert ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
          </div>

          {/* QR-Code für Schüler-Zugang */}
          <div className="qr-box">
            <p>QR-Code für Schüler</p>
            <QRCodeCanvas
              id="hue-qr-code"
              value={`${window.location.origin}/hue/${ergebnis.id}`}
              size={256}
              level="M"
            />
            <button className="qr-download-btn" type="button" onClick={qrHerunterladen}>
              QR-Code als PNG herunterladen
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
