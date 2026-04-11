import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

// URL der Edge Function
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

export default function App() {
  const [fach, setFach] = useState('Deutsch')
  const [thema, setThema] = useState('')
  // ergebnis enthält jetzt { id, text, fragen } – id ist die UUID der gespeicherten HÜ
  const [ergebnis, setErgebnis] = useState(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [kopiert, setKopiert] = useState(false)

  async function generieren(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)
    setErgebnis(null)
    setKopiert(false)

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fach, thema }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.fehler || 'Generierung fehlgeschlagen.')
      // data = { id, text, fragen }
      setErgebnis(data)
    } catch (err) {
      setFehler(err.message)
    } finally {
      setLaedt(false)
    }
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
        <Link to="/dashboard" className="dashboard-link">Dashboard</Link>
        <h1>HUE-Generator</h1>
        <p>KI-generierte Hausübungen für die Mittelschule</p>
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
          <input
            id="thema"
            type="text"
            placeholder="z. B. Adjektive, Bruchrechnung, Simple Past"
            value={thema}
            onChange={(e) => setThema(e.target.value)}
            required
          />
        </div>

        <button className="generieren-btn" type="submit" disabled={laedt}>
          {laedt ? 'Wird generiert...' : 'HUE generieren'}
        </button>
      </form>

      {laedt && (
        <div className="ladeindikator">
          <span className="spinner" aria-hidden="true" />
          KI generiert deine Hausübung...
        </div>
      )}

      {fehler && <div className="fehler">{fehler}</div>}

      {/* Schritt 2: Vorschau + teilbarer Link */}
      {ergebnis && (
        <section className="ergebnis">
          <h2>{fach} – {thema}</h2>

          {/* Lesetext-Vorschau */}
          <div className="lesetext">
            <strong>Lesetext</strong>
            <p>{ergebnis.text}</p>
          </div>

          {/* Fragen-Vorschau (nur lesen, nicht klickbar) */}
          <p className="fragen-titel">Fragen (Vorschau)</p>
          {ergebnis.fragen.map((frage, i) => (
            <div key={i} className="frage">
              <p className="fragetext">{i + 1}. {frage.frage}</p>
              <ul className="antwortliste">
                {frage.antworten.map((antwort, j) => (
                  <li key={j} className="antwort-option vorschau">
                    <span className="buchstabe">{String.fromCharCode(65 + j)}</span>
                    {antwort}
                  </li>
                ))}
              </ul>
            </div>
          ))}

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
        </section>
      )}
    </div>
  )
}
