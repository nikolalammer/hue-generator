import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import './VorschauEditor.css'

// URL der Edge Function – wird auch für Einzelaufgaben-Regenerierung genutzt
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

/**
 * VorschauEditor – Lehrer kann generierte HÜ prüfen und bearbeiten,
 * bevor der Schüler-Link freigeschaltet wird.
 *
 * Props:
 *   ergebnis      {id, text, fragen, lueckentexte}
 *   fach          string
 *   thema         string
 *   onGespeichert function(bearbeiteteDaten) – wird nach Speichern aufgerufen
 */
export default function VorschauEditor({ ergebnis, fach, thema, onGespeichert }) {
  // Tiefer Klon damit der lokale State unabhängig vom Parent-State ist
  const [bearbeitet, setBearbeitet] = useState(() => ({
    text: ergebnis.text ?? '',
    fragen: Array.isArray(ergebnis.fragen)
      ? ergebnis.fragen.map((f) => ({
          frage: f.frage ?? '',
          antworten: Array.isArray(f.antworten) ? [...f.antworten] : [],
          korrekt: f.korrekt ?? 0,
        }))
      : [],
    lueckentexte: Array.isArray(ergebnis.lueckentexte)
      ? ergebnis.lueckentexte.map((lt) => ({
          satz: lt.satz ?? '',
          antwort: lt.antwort ?? '',
        }))
      : [],
  }))

  const [speichert, setSpeichert] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)
  const [fehler, setFehler] = useState(null)

  // Lädt-Zustand je Aufgabe: 'mc-0', 'lt-1', etc.
  const [neuGeneriertWird, setNeuGeneriertWird] = useState(new Set())
  // Fehler je Aufgabe
  const [neuGenFehler, setNeuGenFehler] = useState({})

  // --- Lesetext ändern ---
  function textAendern(e) {
    const wert = e.target.value
    setBearbeitet((prev) => ({ ...prev, text: wert }))
  }

  // --- MC-Frage-Text ändern ---
  function frageTextAendern(frageIndex, wert) {
    setBearbeitet((prev) => {
      const neueFragen = prev.fragen.map((f, i) =>
        i === frageIndex ? { ...f, frage: wert } : f
      )
      return { ...prev, fragen: neueFragen }
    })
  }

  // --- Antwort-Text einer MC-Frage ändern ---
  function antwortTextAendern(frageIndex, antwortIndex, wert) {
    setBearbeitet((prev) => {
      const neueFragen = prev.fragen.map((f, i) => {
        if (i !== frageIndex) return f
        const neueAntworten = f.antworten.map((a, j) =>
          j === antwortIndex ? wert : a
        )
        return { ...f, antworten: neueAntworten }
      })
      return { ...prev, fragen: neueFragen }
    })
  }

  // --- Korrekter Antwort-Index einer MC-Frage ändern ---
  function korrektAendern(frageIndex, antwortIndex) {
    setBearbeitet((prev) => {
      const neueFragen = prev.fragen.map((f, i) =>
        i === frageIndex ? { ...f, korrekt: antwortIndex } : f
      )
      return { ...prev, fragen: neueFragen }
    })
  }

  // --- Lückentext-Satz ändern ---
  function lueckentextSatzAendern(ltIndex, wert) {
    setBearbeitet((prev) => {
      const neueLueckentexte = prev.lueckentexte.map((lt, i) =>
        i === ltIndex ? { ...lt, satz: wert } : lt
      )
      return { ...prev, lueckentexte: neueLueckentexte }
    })
  }

  // --- Lückentext-Antwort ändern ---
  function lueckentextAntwortAendern(ltIndex, wert) {
    setBearbeitet((prev) => {
      const neueLueckentexte = prev.lueckentexte.map((lt, i) =>
        i === ltIndex ? { ...lt, antwort: wert } : lt
      )
      return { ...prev, lueckentexte: neueLueckentexte }
    })
  }

  // --- Einzelne MC-Frage neu generieren ---
  async function frageNeuGenerieren(index) {
    const key = `mc-${index}`
    setNeuGeneriertWird((prev) => new Set(prev).add(key))
    setNeuGenFehler((prev) => ({ ...prev, [key]: null }))

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fach, thema, einzelaufgabe: 'mc' }),
      })
      const data = await res.json()
      if (!res.ok || !data.frage) throw new Error(data.fehler || 'Neu-Generierung fehlgeschlagen.')

      setBearbeitet((prev) => ({
        ...prev,
        fragen: prev.fragen.map((f, i) => (i === index ? { ...data.frage } : f)),
      }))
    } catch (err) {
      setNeuGenFehler((prev) => ({ ...prev, [key]: err.message }))
    } finally {
      setNeuGeneriertWird((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // --- Einzelnen Lückentext neu generieren ---
  async function lueckentextNeuGenerieren(index) {
    const key = `lt-${index}`
    setNeuGeneriertWird((prev) => new Set(prev).add(key))
    setNeuGenFehler((prev) => ({ ...prev, [key]: null }))

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fach, thema, einzelaufgabe: 'lt' }),
      })
      const data = await res.json()
      if (!res.ok || !data.lueckentext) throw new Error(data.fehler || 'Neu-Generierung fehlgeschlagen.')

      setBearbeitet((prev) => ({
        ...prev,
        lueckentexte: prev.lueckentexte.map((lt, i) => (i === index ? { ...data.lueckentext } : lt)),
      }))
    } catch (err) {
      setNeuGenFehler((prev) => ({ ...prev, [key]: err.message }))
    } finally {
      setNeuGeneriertWird((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // --- Speichern: Supabase update() ---
  async function speichern() {
    // Guard: kein Doppel-Submit, kein nochmaliges Schreiben nach Erfolg
    if (speichert || gespeichert) return
    setSpeichert(true)
    setFehler(null)

    const { error } = await supabase
      .from('hausuebungen')
      .update({ aufgaben_json: bearbeitet })
      .eq('id', ergebnis.id)

    setSpeichert(false)

    if (error) {
      setFehler(`Speichern fehlgeschlagen: ${error.message}`)
      return
    }

    setGespeichert(true)
    onGespeichert(bearbeitet)
  }

  return (
    <div>
      {/* Hinweis für die Lehrperson */}
      <div className="vorschau-hinweis">
        <p>
          Bitte überprüfe die Aufgaben und speichere, dann erhältst du den Schüler-Link.
          Du kannst alle Felder direkt bearbeiten.
        </p>
      </div>

      {/* Lesetext */}
      <div className="editor-lesetext-block">
        <p className="editor-abschnitt-label">Lesetext</p>
        <textarea
          className="editor-textarea"
          value={bearbeitet.text}
          onChange={textAendern}
          aria-label="Lesetext bearbeiten"
        />
      </div>

      {/* MC-Fragen */}
      {bearbeitet.fragen.length > 0 && (
        <>
          <p className="editor-abschnitt-label">Multiple-Choice-Fragen</p>
          {bearbeitet.fragen.map((frage, fi) => (
            <div key={fi} className="editor-frageblock">
              <div className="editor-block-kopf">
                <p className="editor-frage-nummer">Frage {fi + 1}</p>
                <button
                  type="button"
                  className="editor-neu-btn"
                  onClick={() => frageNeuGenerieren(fi)}
                  disabled={neuGeneriertWird.has(`mc-${fi}`)}
                  title="Diese Frage durch die KI neu generieren"
                >
                  {neuGeneriertWird.has(`mc-${fi}`) ? '⏳ Generiert...' : '↻ Neu generieren'}
                </button>
              </div>
              {neuGenFehler[`mc-${fi}`] && (
                <div className="editor-neu-fehler">{neuGenFehler[`mc-${fi}`]}</div>
              )}
              <input
                className="editor-input"
                type="text"
                value={frage.frage}
                onChange={(e) => frageTextAendern(fi, e.target.value)}
                aria-label={`Fragetext ${fi + 1}`}
              />

              <div className="editor-antworten">
                {Array.isArray(frage.antworten) && frage.antworten.map((antwort, ai) => (
                  <div key={ai} className="editor-antwort-zeile">
                    {/* Radio: welche Antwort ist korrekt */}
                    <label className="editor-radio-label">
                      <input
                        type="radio"
                        name={`korrekt-${fi}`}
                        checked={frage.korrekt === ai}
                        onChange={() => korrektAendern(fi, ai)}
                        aria-label={`Antwort ${String.fromCharCode(65 + ai)} als korrekt markieren`}
                      />
                      Richtig
                    </label>
                    <span className="editor-buchstabe">{String.fromCharCode(65 + ai)}</span>
                    <input
                      className="editor-input"
                      type="text"
                      value={antwort}
                      onChange={(e) => antwortTextAendern(fi, ai, e.target.value)}
                      aria-label={`Antwort ${String.fromCharCode(65 + ai)} zu Frage ${fi + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Lückentexte */}
      {bearbeitet.lueckentexte.length > 0 && (
        <>
          <p className="editor-abschnitt-label">Lückentexte</p>
          {bearbeitet.lueckentexte.map((lt, li) => (
            <div key={li} className="editor-lueckentext-block">
              <div className="editor-block-kopf">
                <p className="editor-frage-nummer">Lückentext {li + 1}</p>
                <button
                  type="button"
                  className="editor-neu-btn"
                  onClick={() => lueckentextNeuGenerieren(li)}
                  disabled={neuGeneriertWird.has(`lt-${li}`)}
                  title="Diesen Lückentext durch die KI neu generieren"
                >
                  {neuGeneriertWird.has(`lt-${li}`) ? '⏳ Generiert...' : '↻ Neu generieren'}
                </button>
              </div>
              {neuGenFehler[`lt-${li}`] && (
                <div className="editor-neu-fehler">{neuGenFehler[`lt-${li}`]}</div>
              )}
              <label className="editor-abschnitt-label" htmlFor={`lt-satz-${li}`}>
                Satz (Lücke als ___ markiert)
              </label>
              <input
                id={`lt-satz-${li}`}
                className="editor-input"
                type="text"
                value={lt.satz}
                onChange={(e) => lueckentextSatzAendern(li, e.target.value)}
                aria-label={`Satz zu Lückentext ${li + 1}`}
              />
              <label className="editor-abschnitt-label" htmlFor={`lt-antwort-${li}`}>
                Korrekte Antwort
              </label>
              <input
                id={`lt-antwort-${li}`}
                className="editor-input"
                type="text"
                value={lt.antwort}
                onChange={(e) => lueckentextAntwortAendern(li, e.target.value)}
                aria-label={`Antwort zu Lückentext ${li + 1}`}
              />
            </div>
          ))}
        </>
      )}

      {/* Speichern-Button */}
      <button
        className="editor-speichern-btn"
        type="button"
        onClick={speichern}
        disabled={speichert}
      >
        {speichert ? 'Wird gespeichert...' : 'Speichern & Link freischalten'}
      </button>

      {/* Fehlermeldung */}
      {fehler && <div className="editor-fehler">{fehler}</div>}

      {/* Erfolgs-Bestätigung */}
      {gespeichert && (
        <div className="editor-gespeichert">
          Aufgaben erfolgreich gespeichert. Der Schüler-Link ist nun aktiv.
        </div>
      )}
    </div>
  )
}
