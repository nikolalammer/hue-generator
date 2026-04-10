import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Supabase-Client (Anon-Key ist sicher im Frontend verwendbar)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// URL der Edge Function
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

export default function App() {
  const [fach, setFach] = useState('Deutsch')
  const [thema, setThema] = useState('')
  const [ergebnis, setErgebnis] = useState(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [ausgewaehlt, setAusgewaehlt] = useState([])
  const [ausgewertet, setAusgewertet] = useState(false)
  const [schuelerNummer, setSchuelerNummer] = useState('')
  const [nummerBestaetigt, setNummerBestaetigt] = useState(false)
  const [speichernFehler, setSpeichernFehler] = useState(null)

  async function generieren(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)
    setErgebnis(null)
    setAusgewertet(false)
    setNummerBestaetigt(false)
    setSchuelerNummer('')

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
      setErgebnis(data)
      setAusgewaehlt(new Array(data.fragen.length).fill(null))
    } catch (err) {
      setFehler(err.message)
    } finally {
      setLaedt(false)
    }
  }

  function nummerBestaetigen(e) {
    e.preventDefault()
    const num = parseInt(schuelerNummer, 10)
    if (num >= 1 && num <= 40) {
      setNummerBestaetigt(true)
    }
  }

  async function auswerten() {
    setAusgewertet(true)
    setSpeichernFehler(null)

    const richtig = ergebnis.fragen.filter((f, i) => ausgewaehlt[i] === f.korrekt).length
    const gesamt = ergebnis.fragen.length
    const prozent = Math.round((richtig / gesamt) * 100)

    // Ergebnis in Supabase speichern
    const { error } = await supabase.from('ergebnisse').insert({
      fach,
      thema,
      schueler_nummer: parseInt(schuelerNummer, 10),
      richtige_antworten: richtig,
      gesamt_fragen: gesamt,
      prozent,
    })

    if (error) {
      console.error('Supabase Fehler:', error)
      setSpeichernFehler('Ergebnis konnte nicht gespeichert werden.')
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

      {/* Schritt 2: Schülernummer eingeben */}
      {ergebnis && !nummerBestaetigt && (
        <form className="nummern-formular" onSubmit={nummerBestaetigen}>
          <label htmlFor="nummer">Deine Nummer in der Klassenliste</label>
          <div className="nummern-eingabe">
            <input
              id="nummer"
              type="number"
              min="1"
              max="40"
              placeholder="1 – 40"
              value={schuelerNummer}
              onChange={(e) => setSchuelerNummer(e.target.value)}
              required
            />
            <button type="submit">Weiter</button>
          </div>
        </form>
      )}

      {/* Schritt 3: Hausübung lösen */}
      {ergebnis && nummerBestaetigt && (
        <section className="ergebnis">
          <h2>{fach} - {thema}</h2>

          <div className="lesetext">
            <strong>Lesetext</strong>
            <p>{ergebnis.text}</p>
          </div>

          <p className="fragen-titel">Fragen</p>
          {ergebnis.fragen.map((frage, i) => (
            <div key={i} className="frage">
              <p className="fragetext">{i + 1}. {frage.frage}</p>
              <ul className="antwortliste">
                {frage.antworten.map((antwort, j) => {
                  const gewaehlt = ausgewaehlt[i] === j
                  const korrekt = ausgewertet && j === frage.korrekt
                  const falsch = ausgewertet && gewaehlt && j !== frage.korrekt
                  return (
                    <li
                      key={j}
                      className={[
                        'antwort-option',
                        gewaehlt && !ausgewertet ? 'gewaehlt' : '',
                        korrekt ? 'korrekt' : '',
                        falsch ? 'falsch' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (ausgewertet) return
                        const neu = [...ausgewaehlt]
                        neu[i] = j
                        setAusgewaehlt(neu)
                      }}
                    >
                      <span className="buchstabe">{String.fromCharCode(65 + j)}</span>
                      {antwort}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <button
            type="button"
            className="auswerten-btn"
            onClick={auswerten}
            disabled={ausgewertet || ausgewaehlt.some((a) => a === null)}
          >
            {ausgewaehlt.some((a) => a === null)
              ? `Noch ${ausgewaehlt.filter((a) => a === null).length} Frage(n) offen`
              : 'Auswerten'}
          </button>

          {ausgewertet && (() => {
            const richtig = ergebnis.fragen.filter((f, i) => ausgewaehlt[i] === f.korrekt).length
            const gesamt = ergebnis.fragen.length
            return (
              <div className={`ergebnis-zusammenfassung ${richtig === gesamt ? 'perfekt' : ''}`}>
                {richtig === gesamt
                  ? `Perfekt! Alle ${gesamt} Fragen richtig!`
                  : `${richtig} von ${gesamt} Fragen richtig`}
              </div>
            )
          })()}

          {speichernFehler && <div className="fehler">{speichernFehler}</div>}
        </section>
      )}
    </div>
  )
}
