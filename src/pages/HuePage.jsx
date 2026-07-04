// Schüler-Ansicht: HÜ per Link abrufen und lösen
// Wichtig: Die Lösungen kommen NIE vor der Abgabe in den Browser.
// Laden und Auswerten laufen über die Edge Function (Modi "hole" und "auswerten").
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { edgeFunctionAufrufen } from '../lib/edgeFunction'
import './HuePage.css'

export default function HuePage() {
  const { id } = useParams()

  // Lade-Zustände
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)

  // HÜ-Daten (ohne Lösungen!) aus der Edge Function
  const [fach, setFach] = useState('')
  const [thema, setThema] = useState('')
  const [text, setText] = useState('')
  const [fragen, setFragen] = useState([])
  // Lückentext-Aufgaben (nur Sätze, keine Antworten)
  const [lueckentexte, setLueckentexte] = useState([])
  // Wahr/Falsch-Aussagen (nur Aussagen, keine Wahrheitswerte)
  const [wahrfalsch, setWahrfalsch] = useState([])
  // Zuordnung: { begriffe: [...], partner: [gemischt] } oder null
  const [zuordnung, setZuordnung] = useState(null)

  // Schüler-Flow
  const [schuelerNummer, setSchuelerNummer] = useState('')
  const [schuelerKlasse, setSchuelerKlasse] = useState('')
  const [klasseNummernFehler, setKlasseNummernFehler] = useState(null)
  const [nummerBestaetigt, setNummerBestaetigt] = useState(false)
  const [ausgewaehlt, setAusgewaehlt] = useState([])
  // Lückentext-Eingaben der Schüler (ein String pro Lückentext)
  const [lueckenAntworten, setLueckenAntworten] = useState([])
  // Wahr/Falsch-Auswahl (true | false | null pro Aussage)
  const [wfAntworten, setWfAntworten] = useState([])
  // Zuordnungs-Auswahl (gewählter Partner-Text pro Begriff, '' = offen)
  const [zuAntworten, setZuAntworten] = useState([])
  // auswertung: null bis zur Abgabe, danach { richtig, gesamt, prozent, mcLoesungen, ltLoesungen }
  const [auswertung, setAuswertung] = useState(null)
  const [sendet, setSendet] = useState(false)
  const [speichernFehler, setSpeichernFehler] = useState(null)

  const ausgewertet = auswertung !== null

  // HÜ beim ersten Laden über die Edge Function holen (liefert keine Lösungen aus)
  useEffect(() => {
    async function laden() {
      try {
        const data = await edgeFunctionAufrufen({ hole: id }, 'Diese Hausübung wurde nicht gefunden.')

        setFach(data.fach || '')
        setThema(data.thema || '')
        setText(data.text || '')
        const geladeneFragen = Array.isArray(data.fragen) ? data.fragen : []
        setFragen(geladeneFragen)
        setAusgewaehlt(new Array(geladeneFragen.length).fill(null))
        const lts = Array.isArray(data.lueckentexte) ? data.lueckentexte : []
        setLueckentexte(lts)
        setLueckenAntworten(new Array(lts.length).fill(''))
        const wfs = Array.isArray(data.wahrfalsch) ? data.wahrfalsch : []
        setWahrfalsch(wfs)
        setWfAntworten(new Array(wfs.length).fill(null))
        const zu = data.zuordnung && Array.isArray(data.zuordnung.begriffe) ? data.zuordnung : null
        setZuordnung(zu)
        setZuAntworten(new Array(zu ? zu.begriffe.length : 0).fill(''))
      } catch (err) {
        setFehler(err.message || 'Diese Hausübung wurde nicht gefunden.')
      } finally {
        setLaedt(false)
      }
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

  // Auswertung passiert serverseitig – der Browser kennt die Lösungen erst danach
  async function auswerten() {
    // sendet verhindert doppelten Submit (Button ist disabled bis Antwort da)
    setSendet(true)
    setSpeichernFehler(null)

    try {
      const data = await edgeFunctionAufrufen({
        auswerten: {
          hausuebung_id: id,
          schueler_klasse: schuelerKlasse.trim().toLowerCase(),
          schueler_nummer: parseInt(schuelerNummer, 10),
          mcAntworten: ausgewaehlt,
          ltAntworten: lueckenAntworten,
          wfAntworten,
          zuAntworten,
        },
      }, 'Ergebnis konnte nicht gespeichert werden.')

      // Erst nach erfolgreichem Speichern anzeigen
      setAuswertung(data)
    } catch (err) {
      console.error('Auswertungs-Fehler:', err)
      setSpeichernFehler(err.message || 'Ergebnis konnte nicht gespeichert werden.')
    } finally {
      setSendet(false)
    }
  }

  // Lückentext-Korrektheit kommt fertig bewertet vom Server (ltKorrekt-Array).
  // Defensiv gegen Index-Verschiebung, falls die Lehrperson die HÜ zwischenzeitlich geändert hat.
  function lueckeKorrekt(i) {
    return auswertung?.ltKorrekt?.[i] === true
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
          {fragen.length > 0 && <p className="fragen-titel">Fragen</p>}
          {fragen.map((frage, i) => (
            <div key={i} className="frage">
              <p className="fragetext">{i + 1}. {frage.frage}</p>
              <ul className="antwortliste">
                {frage.antworten.map((antwort, j) => {
                  const gewaehlt = ausgewaehlt[i] === j
                  const korrekt = ausgewertet && j === auswertung.mcLoesungen[i]
                  const falsch = ausgewertet && gewaehlt && j !== auswertung.mcLoesungen[i]
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
                          ausgewertet ? (lueckeKorrekt(i) ? 'korrekt' : 'falsch') : '',
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
                        size={14}
                      />
                      {teile[1]}
                    </span>
                    {ausgewertet && (
                      <span className={`luecken-korrektur ${lueckeKorrekt(i) ? 'korrekt' : 'falsch'}`}>
                        {lueckeKorrekt(i) ? '✓' : `✗ Richtig: ${auswertung.ltLoesungen?.[i] ?? '–'}`}
                      </span>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Wahr/Falsch-Aussagen */}
          {wahrfalsch.length > 0 && (
            <>
              <p className="fragen-titel">Wahr oder falsch?</p>
              {wahrfalsch.map((wf, i) => (
                <div key={i} className="frage">
                  <p className="fragetext">{i + 1}. {wf.aussage}</p>
                  <ul className="antwortliste wf-antwortliste">
                    {[true, false].map((wert) => {
                      const gewaehlt = wfAntworten[i] === wert
                      const korrekt = ausgewertet && auswertung.wfLoesungen?.[i] === wert
                      const falsch = ausgewertet && gewaehlt && auswertung.wfLoesungen?.[i] !== wert
                      return (
                        <li
                          key={String(wert)}
                          className={[
                            'antwort-option',
                            gewaehlt && !ausgewertet ? 'gewaehlt' : '',
                            korrekt ? 'korrekt' : '',
                            falsch ? 'falsch' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => {
                            if (ausgewertet) return
                            const neu = [...wfAntworten]
                            neu[i] = wert
                            setWfAntworten(neu)
                          }}
                        >
                          <span className="buchstabe">{wert ? 'W' : 'F'}</span>
                          {wert ? 'Wahr' : 'Falsch'}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}

          {/* Zuordnung: jedem Begriff den passenden Partner zuweisen */}
          {zuordnung && zuordnung.begriffe.length > 0 && (
            <>
              <p className="fragen-titel">Zuordnung – was passt zusammen?</p>
              <div className="frage zuordnung-block">
                {zuordnung.begriffe.map((begriff, i) => {
                  const korrekt = ausgewertet && auswertung.zuKorrekt?.[i] === true
                  return (
                    <div key={i} className="zuordnung-zeile">
                      <span className="zuordnung-begriff">{begriff}</span>
                      <select
                        className={[
                          'zuordnung-select',
                          ausgewertet ? (korrekt ? 'korrekt' : 'falsch') : '',
                        ].filter(Boolean).join(' ')}
                        value={zuAntworten[i]}
                        disabled={ausgewertet}
                        onChange={(e) => {
                          const neu = [...zuAntworten]
                          neu[i] = e.target.value
                          setZuAntworten(neu)
                        }}
                        aria-label={`Partner für ${begriff} wählen`}
                      >
                        <option value="">– bitte wählen –</option>
                        {zuordnung.partner.map((p, j) => (
                          <option key={j} value={p}>{p}</option>
                        ))}
                      </select>
                      {ausgewertet && (
                        <span className={`luecken-korrektur ${korrekt ? 'korrekt' : 'falsch'}`}>
                          {korrekt ? '✓' : `✗ Richtig: ${auswertung.zuLoesungen?.[i] ?? '–'}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Auswerten-Button – alle Aufgabentypen müssen beantwortet sein */}
          {(() => {
            const offen =
              ausgewaehlt.filter((a) => a === null).length +
              lueckenAntworten.filter((a) => a.trim() === '').length +
              wfAntworten.filter((a) => a === null).length +
              zuAntworten.filter((a) => a === '').length
            return (
              <button
                type="button"
                className="auswerten-btn"
                onClick={auswerten}
                disabled={ausgewertet || sendet || offen > 0}
              >
                {sendet
                  ? 'Wird ausgewertet...'
                  : offen > 0
                    ? `Noch ${offen} Aufgabe(n) offen`
                    : 'Auswerten'}
              </button>
            )
          })()}

          {/* Ergebnis-Zusammenfassung – Prozent-Badge + Originaltext */}
          {ausgewertet && (() => {
            const { richtig, gesamt, prozent } = auswertung
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
