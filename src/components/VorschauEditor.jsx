import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { edgeFunctionAufrufen } from '../lib/edgeFunction'
import './VorschauEditor.css'

export default function VorschauEditor({ ergebnis, fach, thema, fokus, schwierigkeit, onGespeichert }) {
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
    wahrfalsch: Array.isArray(ergebnis.wahrfalsch)
      ? ergebnis.wahrfalsch.map((wf) => ({
          aussage: wf.aussage ?? '',
          wahr: wf.wahr === true,
        }))
      : [],
    zuordnung: Array.isArray(ergebnis.zuordnung)
      ? ergebnis.zuordnung.map((p) => ({
          begriff: p.begriff ?? '',
          partner: p.partner ?? '',
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

  // --- Wahr/Falsch: Aussage oder Wahrheitswert ändern ---
  function wahrfalschAendern(wfIndex, feld, wert) {
    setBearbeitet((prev) => ({
      ...prev,
      wahrfalsch: prev.wahrfalsch.map((wf, i) =>
        i === wfIndex ? { ...wf, [feld]: wert } : wf
      ),
    }))
  }

  // --- Zuordnung: Begriff oder Partner ändern ---
  function zuordnungAendern(zuIndex, feld, wert) {
    setBearbeitet((prev) => ({
      ...prev,
      zuordnung: prev.zuordnung.map((p, i) =>
        i === zuIndex ? { ...p, [feld]: wert } : p
      ),
    }))
  }

  // --- Einzelne Wahr/Falsch-Aussage neu generieren ---
  async function wahrfalschNeuGenerieren(index) {
    const key = `wf-${index}`
    setNeuGeneriertWird((prev) => new Set(prev).add(key))
    setNeuGenFehler((prev) => ({ ...prev, [key]: null }))

    try {
      const data = await edgeFunctionAufrufen(
        { fach, thema, fokus: fokus || undefined, schwierigkeit: schwierigkeit || 'leicht', einzelaufgabe: 'wf' },
        'Neu-Generierung fehlgeschlagen.'
      )
      if (!data.wahrfalsch) throw new Error('Neu-Generierung fehlgeschlagen.')

      setBearbeitet((prev) => ({
        ...prev,
        wahrfalsch: prev.wahrfalsch.map((wf, i) => (i === index ? { ...data.wahrfalsch } : wf)),
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

  // --- Einzelne MC-Frage neu generieren ---
  async function frageNeuGenerieren(index) {
    const key = `mc-${index}`
    setNeuGeneriertWird((prev) => new Set(prev).add(key))
    setNeuGenFehler((prev) => ({ ...prev, [key]: null }))

    try {
      const data = await edgeFunctionAufrufen(
        { fach, thema, fokus: fokus || undefined, schwierigkeit: schwierigkeit || 'leicht', einzelaufgabe: 'mc' },
        'Neu-Generierung fehlgeschlagen.'
      )
      if (!data.frage) throw new Error('Neu-Generierung fehlgeschlagen.')

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
      const data = await edgeFunctionAufrufen(
        { fach, thema, fokus: fokus || undefined, schwierigkeit: schwierigkeit || 'leicht', einzelaufgabe: 'lt' },
        'Neu-Generierung fehlgeschlagen.'
      )
      if (!data.lueckentext) throw new Error('Neu-Generierung fehlgeschlagen.')

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

      {/* Wahr/Falsch-Aussagen */}
      {bearbeitet.wahrfalsch.length > 0 && (
        <>
          <p className="editor-abschnitt-label">Wahr/Falsch-Aussagen</p>
          {bearbeitet.wahrfalsch.map((wf, wi) => (
            <div key={wi} className="editor-frageblock">
              <div className="editor-block-kopf">
                <p className="editor-frage-nummer">Aussage {wi + 1}</p>
                <button
                  type="button"
                  className="editor-neu-btn"
                  onClick={() => wahrfalschNeuGenerieren(wi)}
                  disabled={neuGeneriertWird.has(`wf-${wi}`)}
                  title="Diese Aussage durch die KI neu generieren"
                >
                  {neuGeneriertWird.has(`wf-${wi}`) ? '⏳ Generiert...' : '↻ Neu generieren'}
                </button>
              </div>
              {neuGenFehler[`wf-${wi}`] && (
                <div className="editor-neu-fehler">{neuGenFehler[`wf-${wi}`]}</div>
              )}
              <input
                className="editor-input"
                type="text"
                value={wf.aussage}
                onChange={(e) => wahrfalschAendern(wi, 'aussage', e.target.value)}
                aria-label={`Aussage ${wi + 1}`}
              />
              <div className="editor-antworten">
                <label className="editor-radio-label">
                  <input
                    type="radio"
                    name={`wf-${wi}`}
                    checked={wf.wahr === true}
                    onChange={() => wahrfalschAendern(wi, 'wahr', true)}
                    aria-label={`Aussage ${wi + 1} ist wahr`}
                  />
                  Wahr
                </label>
                <label className="editor-radio-label">
                  <input
                    type="radio"
                    name={`wf-${wi}`}
                    checked={wf.wahr === false}
                    onChange={() => wahrfalschAendern(wi, 'wahr', false)}
                    aria-label={`Aussage ${wi + 1} ist falsch`}
                  />
                  Falsch
                </label>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Zuordnungspaare */}
      {bearbeitet.zuordnung.length > 0 && (
        <>
          <p className="editor-abschnitt-label">Zuordnungspaare</p>
          {bearbeitet.zuordnung.map((paar, zi) => (
            <div key={zi} className="editor-frageblock">
              <p className="editor-frage-nummer">Paar {zi + 1}</p>
              <label className="editor-abschnitt-label" htmlFor={`zu-begriff-${zi}`}>
                Begriff
              </label>
              <input
                id={`zu-begriff-${zi}`}
                className="editor-input"
                type="text"
                value={paar.begriff}
                onChange={(e) => zuordnungAendern(zi, 'begriff', e.target.value)}
                aria-label={`Begriff ${zi + 1}`}
              />
              <label className="editor-abschnitt-label" htmlFor={`zu-partner-${zi}`}>
                Passender Partner
              </label>
              <input
                id={`zu-partner-${zi}`}
                className="editor-input"
                type="text"
                value={paar.partner}
                onChange={(e) => zuordnungAendern(zi, 'partner', e.target.value)}
                aria-label={`Partner ${zi + 1}`}
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
