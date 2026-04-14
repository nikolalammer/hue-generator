// Schüler-Ansicht: HÜ per Link abrufen und lösen
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import './HuePage.css'

export default function HuePage() {
  const { id } = useParams()

  // Lade-Zustände
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)

  // HÜ-Daten aus der Datenbank
  const [fach, setFach] = useState('')
  const [thema, setThema] = useState('')
  const [text, setText] = useState('')
  const [fragen, setFragen] = useState([])
  // Lückentext-Aufgaben aus aufgaben_json
  const [lueckentexte, setLueckentexte] = useState([])

  // Schüler-Flow
  const [schuelerNummer, setSchuelerNummer] = useState('')
  const [schuelerKlasse, setSchuelerKlasse] = useState('')
  const [klasseNummernFehler, setKlasseNummernFehler] = useState(null)
  const [nummerBestaetigt, setNummerBestaetigt] = useState(false)
  const [ausgewaehlt, setAusgewaehlt] = useState([])
  // Lückentext-Eingaben der Schüler (ein String pro Lückentext)
  const [lueckenAntworten, setLueckenAntworten] = useState([])
  const [ausgewertet, setAusgewertet] = useState(false)
  const [sendet, setSendet] = useState(false)
  const [speichernFehler, setSpeichernFehler] = useState(null)

  // HÜ beim ersten Laden aus Supabase holen
  useEffect(() => {
    async function laden() {
      const { data, error } = await supabase
        .from('hausuebungen')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setFehler('Diese Hausübung wurde nicht gefunden.')
        setLaedt(false)
        return
      }

      // aufgaben_json enthält { text, fragen, lueckentexte? }
      setFach(data.fach || '')
      setThema(data.thema || '')
      setText(data.aufgaben_json.text)
      setFragen(data.aufgaben_json.fragen)
      setAusgewaehlt(new Array(data.aufgaben_json.fragen.length).fill(null))
      // Lückentexte aus aufgaben_json laden (leer wenn kein Lückentext)
      const lts = data.aufgaben_json.lueckentexte || []
      setLueckentexte(lts)
      setLueckenAntworten(new Array(lts.length).fill(''))
      setLaedt(false)
    }

    laden()
  }, [id])

  // Klasse und Katalognummer bestätigen
  function nummerBestaetigen(e) {
    e.preventDefault()
    setKlasseNummernFehler(null)

    const num = parseInt(schuelerNummer, 10)
    const klasseGueltig = /^\d[a-zA-Z]$/.test(schuelerKlasse.trim())
    const nummerGueltig = num >= 1 && num <= 40

    if (!klasseGueltig) {
      setKlasseNummernFehler('Bitte gib eine gültige Klasse ein (z. B. 2a, 3b).')
      return
    }
    if (!nummerGueltig) {
      setKlasseNummernFehler('Die Katalognummer muss zwischen 1 und 40 liegen.')
      return
    }
    setNummerBestaetigt(true)
  }

  // Auswertung und Speicherung in Supabase
  async function auswerten() {
    // sendet verhindert doppelten Submit (Button ist disabled bis Antwort da)
    setSendet(true)
    setSpeichernFehler(null)

    // MC-Auswertung
    const richtigMC = fragen.filter((f, i) => ausgewaehlt[i] === f.korrekt).length
    // Lückentext-Auswertung: case-insensitive, trim, Umlaute strikt
    const richtigLT = lueckentexte.filter((lt, i) =>
      lueckenAntworten[i].trim().toLowerCase() === lt.antwort.trim().toLowerCase()
    ).length
    const richtig = richtigMC + richtigLT
    const gesamt = fragen.length + lueckentexte.length
    const prozent = Math.round((richtig / gesamt) * 100)

    // Ergebnis mit hausuebung_id und Klasse speichern
    const { error } = await supabase.from('ergebnisse').insert({
      fach,
      thema,
      schueler_nummer: parseInt(schuelerNummer, 10),
      schueler_klasse: schuelerKlasse.trim().toLowerCase(),
      richtige_antworten: richtig,
      gesamt_fragen: gesamt,
      prozent,
      hausuebung_id: id,
    })

    if (error) {
      console.error('Supabase Fehler:', error)
      setSpeichernFehler('Ergebnis konnte nicht gespeichert werden.')
      setSendet(false)
      return
    }

    // Erst nach erfolgreichem Speichern anzeigen
    setAusgewertet(true)
    setSendet(false)
  }

  // Ladezustand – Skeleton-Platzhalter
  if (laedt) {
    return (
      <div className="hue-container">
        <div className="hue-ladeindikator">
          <div className="hue-skeleton-card">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" style={{ width: '65%' }} />
          </div>
          <div className="hue-skeleton-card">
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
          </div>
        </div>
      </div>
    )
  }

  // Fehlerzustand (z. B. HÜ nicht gefunden)
  if (fehler) {
    return (
      <div className="hue-container">
        <div className="hue-fehler">{fehler}</div>
      </div>
    )
  }

  return (
    <div className="hue-container">
      <header className="hue-header">
        <h1>Aufgabolino</h1>
        <p>{fach} – {thema}</p>
      </header>

      {/* Schritt 1: Klasse und Katalognummer eingeben */}
      {!nummerBestaetigt && (
        <form className="nummern-formular" onSubmit={nummerBestaetigen}>
          <div className="nummern-felder">
            <div className="nummern-feld">
              <label htmlFor="klasse">Deine Klasse</label>
              <input
                id="klasse"
                type="text"
                placeholder="z. B. 2a"
                value={schuelerKlasse}
                onChange={(e) => setSchuelerKlasse(e.target.value)}
                required
                autoFocus
                maxLength={3}
                className="klasse-input"
              />
            </div>
            <div className="nummern-feld">
              <label htmlFor="nummer">Katalognummer</label>
              <input
                id="nummer"
                type="number"
                min="1"
                max="40"
                placeholder="1 – 40"
                value={schuelerNummer}
                onChange={(e) => setSchuelerNummer(e.target.value)}
                required
                className="katalog-input"
              />
            </div>
          </div>
          {klasseNummernFehler && (
            <p className="nummern-fehler">{klasseNummernFehler}</p>
          )}
          <button type="submit" className="nummern-weiter-btn">Weiter</button>
        </form>
      )}

      {/* Schritt 2: Hausübung lösen */}
      {nummerBestaetigt && (
        <section className="ergebnis">
          {/* Lesetext */}
          <div className="lesetext">
            <strong>Lesetext</strong>
            <p>{text}</p>
          </div>

          {/* Fragen (klickbar) */}
          <p className="fragen-titel">Fragen</p>
          {fragen.map((frage, i) => (
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

          {/* Lückentext-Aufgaben */}
          {lueckentexte.length > 0 && (
            <>
              <p className="fragen-titel">Lückentexte</p>
              {lueckentexte.map((lt, i) => {
                const teile = lt.satz.split('___')
                return (
                  <div key={i} className="frage lueckentext-frage">
                    <span className="fragetext">
                      {teile[0]}
                      <input
                        className={[
                          'luecken-input',
                          ausgewertet
                            ? lueckenAntworten[i].trim().toLowerCase() === lt.antwort.trim().toLowerCase()
                              ? 'korrekt'
                              : 'falsch'
                            : '',
                        ].filter(Boolean).join(' ')}
                        type="text"
                        value={lueckenAntworten[i]}
                        onChange={(e) => {
                          if (ausgewertet) return
                          const neu = [...lueckenAntworten]
                          neu[i] = e.target.value
                          setLueckenAntworten(neu)
                        }}
                        disabled={ausgewertet}
                        placeholder="Antwort..."
                        size={Math.max(10, (lt.antwort.length + 4))}
                      />
                      {teile[1]}
                    </span>
                    {ausgewertet && (
                      <span className={`luecken-korrektur ${lueckenAntworten[i].trim().toLowerCase() === lt.antwort.trim().toLowerCase() ? 'korrekt' : 'falsch'}`}>
                        {lueckenAntworten[i].trim().toLowerCase() === lt.antwort.trim().toLowerCase()
                          ? '✓'
                          : `✗ Richtig: ${lt.antwort}`}
                      </span>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Auswerten-Button – auch Lückentexte müssen ausgefüllt sein */}
          <button
            type="button"
            className="auswerten-btn"
            onClick={auswerten}
            disabled={ausgewertet || sendet || ausgewaehlt.some((a) => a === null) || lueckenAntworten.some((a) => a.trim() === '')}
          >
            {sendet
              ? 'Wird gespeichert...'
              : (ausgewaehlt.some((a) => a === null) || lueckenAntworten.some((a) => a.trim() === ''))
                ? `Noch ${ausgewaehlt.filter((a) => a === null).length + lueckenAntworten.filter((a) => a.trim() === '').length} Aufgabe(n) offen`
                : 'Auswerten'}
          </button>

          {/* Ergebnis-Zusammenfassung – Prozent-Badge + Originaltext */}
          {ausgewertet && (() => {
            const richtig = fragen.filter((f, i) => ausgewaehlt[i] === f.korrekt).length
              + lueckentexte.filter((lt, i) => lueckenAntworten[i].trim().toLowerCase() === lt.antwort.trim().toLowerCase()).length
            const gesamt = fragen.length + lueckentexte.length
            const prozent = Math.round((richtig / gesamt) * 100)
            const istPerfekt = richtig === gesamt
            return (
              <div className={`ergebnis-zusammenfassung-wrapper ${istPerfekt ? 'perfekt' : ''}`}>
                <div className={`ergebnis-prozent ${istPerfekt ? 'perfekt' : ''}`}>
                  {prozent} %
                </div>
                <div className={`ergebnis-zusammenfassung ${istPerfekt ? 'perfekt' : ''}`}>
                  {istPerfekt
                    ? `Perfekt! Alle ${gesamt} Fragen richtig!`
                    : `${richtig} von ${gesamt} Fragen richtig`}
                </div>
              </div>
            )
          })()}

          {speichernFehler && <div className="hue-fehler">{speichernFehler}</div>}
        </section>
      )}
    </div>
  )
}
