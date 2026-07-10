import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import supabase from './lib/supabaseClient'
import { FAECHER, fachBadge } from './lib/faecher'
import DekoFormen from './components/DekoFormen'
import './Dashboard.css'

// Prozent-Farbe: grün ab 75%, gelb ab 50%, rot darunter
function prozentKlasse(prozent) {
  if (prozent >= 75) return 'prozent-gut'
  if (prozent >= 50) return 'prozent-mittel'
  return 'prozent-schlecht'
}

// Datum im österreichischen Format: dd.mm.yyyy hh:mm
function formatDatum(iso) {
  const d = new Date(iso)
  return d.toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Gesamtzahl der Aufgaben einer HÜ aus dem aufgaben_json ableiten
function aufgabenAnzahl(aufgabenJson) {
  if (!aufgabenJson || typeof aufgabenJson !== 'object') return 0
  return ['fragen', 'lueckentexte', 'wahrfalsch', 'zuordnung'].reduce(
    (summe, key) => summe + (Array.isArray(aufgabenJson[key]) ? aufgabenJson[key].length : 0),
    0
  )
}

export default function Dashboard() {
  // Aktiver Tab: Ergebnisse (Abgaben) oder Hausübungen (Verwaltung)
  // /dashboard#uebungen ist als Deep-Link direkt erreichbar
  const [tab, setTab] = useState(
    window.location.hash === '#uebungen' ? 'uebungen' : 'ergebnisse'
  )

  // --- Ergebnisse ---
  const [eintraege, setEintraege] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)
  const [filterFach, setFilterFach] = useState('Alle')
  const [filterThema, setFilterThema] = useState('')
  const [filterKlasse, setFilterKlasse] = useState('')
  const [filterHueId, setFilterHueId] = useState(null)

  // --- Hausübungen ---
  const [hues, setHues] = useState([])
  const [huesLaedt, setHuesLaedt] = useState(true)
  const [huesFehler, setHuesFehler] = useState(null)
  // ID der HÜ, die gerade gelöscht wird (Button-Spinner/Disable)
  const [loeschtId, setLoeschtId] = useState(null)
  // ID der HÜ, deren Link gerade kopiert wurde ("Kopiert!"-Feedback)
  const [kopiertId, setKopiertId] = useState(null)

  // null = Modal geschlossen, UUID = QR-Code für diese HÜ anzeigen
  const [qrHueId, setQrHueId] = useState(null)
  const navigate = useNavigate()

  // Abmelden und zur Login-Seite weiterleiten
  async function abmelden() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  useEffect(() => {
    // Ergebnisse und Hausübungen parallel laden
    async function ergebnisseLaden() {
      const { data, error } = await supabase
        .from('ergebnisse')
        .select('*')
        .order('erstellt_am', { ascending: false })

      if (error) {
        setFehler('Daten konnten nicht geladen werden.')
        console.error(error)
      } else {
        setEintraege(data)
      }
      setLaedt(false)
    }

    async function huesLaden() {
      const { data, error } = await supabase
        .from('hausuebungen')
        .select('id, erstellt_am, fach, thema, aufgaben_json')
        .order('erstellt_am', { ascending: false })

      if (error) {
        setHuesFehler('Hausübungen konnten nicht geladen werden.')
        console.error(error)
      } else {
        setHues(data)
      }
      setHuesLaedt(false)
    }

    ergebnisseLaden()
    huesLaden()
  }, [])

  // Schüler-Link einer HÜ in die Zwischenablage kopieren
  async function linkKopieren(hueId) {
    const link = `${window.location.origin}/hue/${hueId}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Fallback für ältere Browser
      const eingabe = document.createElement('input')
      eingabe.value = link
      document.body.appendChild(eingabe)
      eingabe.select()
      document.execCommand('copy')
      document.body.removeChild(eingabe)
    }
    setKopiertId(hueId)
    setTimeout(() => setKopiertId(null), 2000)
  }

  // HÜ löschen – Ergebnisse bleiben erhalten (hausuebung_id wird NULL)
  async function hueLoeschen(hue) {
    const abgaben = eintraege.filter((e) => e.hausuebung_id === hue.id).length
    const frage = abgaben > 0
      ? `Hausübung "${hue.fach} – ${hue.thema}" löschen?\n\nDer Schüler-Link funktioniert danach nicht mehr. Die ${abgaben} vorhandene(n) Ergebnisse bleiben im Dashboard erhalten.`
      : `Hausübung "${hue.fach} – ${hue.thema}" löschen?\n\nDer Schüler-Link funktioniert danach nicht mehr.`
    if (!window.confirm(frage)) return

    setLoeschtId(hue.id)
    setHuesFehler(null)
    const { error } = await supabase.from('hausuebungen').delete().eq('id', hue.id)
    setLoeschtId(null)

    if (error) {
      setHuesFehler(`Löschen fehlgeschlagen: ${error.message}`)
      return
    }
    setHues((prev) => prev.filter((h) => h.id !== hue.id))
    if (filterHueId === hue.id) setFilterHueId(null)
  }

  // Vom Abgaben-Zähler einer HÜ direkt zu den gefilterten Ergebnissen springen
  function zuErgebnissen(hueId) {
    setFilterHueId(hueId)
    setTab('ergebnisse')
  }

  // Gefilterte Einträge berechnen
  const gefiltert = eintraege.filter((e) => {
    const fachPasst = filterFach === 'Alle' || e.fach === filterFach
    const themaPasst = e.thema.toLowerCase().includes(filterThema.toLowerCase())
    const klassePasst = !filterKlasse || (e.schueler_klasse || '').toLowerCase().includes(filterKlasse.toLowerCase())
    const huePasst = !filterHueId || e.hausuebung_id === filterHueId
    return fachPasst && themaPasst && klassePasst && huePasst
  })

  return (
    <div className="dashboard-container">
      <DekoFormen variante="dashboard" />
      <header className="dashboard-header">
        <div>
          <h1>Lehrer-Dashboard</h1>
          <p>Hausübungen und Ergebnisse im Überblick</p>
        </div>
        <div className="dashboard-header-aktionen">
          <Link to="/" className="zurueck-link">← Neue HÜ</Link>
          <button onClick={abmelden} className="abmelden-btn">Abmelden</button>
        </div>
      </header>

      {/* Tab-Umschalter */}
      <div className="dashboard-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'ergebnisse'}
          className={`dashboard-tab ${tab === 'ergebnisse' ? 'aktiv' : ''}`}
          onClick={() => setTab('ergebnisse')}
        >
          Ergebnisse
        </button>
        <button
          role="tab"
          aria-selected={tab === 'uebungen'}
          className={`dashboard-tab ${tab === 'uebungen' ? 'aktiv' : ''}`}
          onClick={() => setTab('uebungen')}
        >
          Hausübungen {!huesLaedt && `(${hues.length})`}
        </button>
      </div>

      {/* ===================== Tab: Ergebnisse ===================== */}
      {tab === 'ergebnisse' && (
        <>
          {/* Filter */}
          <div className="filter-leiste">
            <div className="filter-feld">
              <label htmlFor="filter-fach">Fach</label>
              <select
                id="filter-fach"
                value={filterFach}
                onChange={(e) => setFilterFach(e.target.value)}
              >
                <option value="Alle">Alle Fächer</option>
                {FAECHER.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-feld">
              <label htmlFor="filter-thema">Thema</label>
              <input
                id="filter-thema"
                type="text"
                placeholder="Thema suchen..."
                value={filterThema}
                onChange={(e) => setFilterThema(e.target.value)}
              />
            </div>

            <div className="filter-feld">
              <label htmlFor="filter-klasse">Klasse</label>
              <input
                id="filter-klasse"
                type="text"
                placeholder="z. B. 2a"
                value={filterKlasse}
                onChange={(e) => setFilterKlasse(e.target.value)}
                maxLength={3}
              />
            </div>

            {/* Aktiver HÜ-Filter als Badge mit Zurücksetzen-Button */}
            {filterHueId && (
              <span className="hue-filter-aktiv">
                HÜ: {filterHueId.substring(0, 8)}...
                <button onClick={() => setFilterHueId(null)} aria-label="Filter zurücksetzen">×</button>
              </span>
            )}

            <div className="filter-info">
              {gefiltert.length} Eintrag{gefiltert.length !== 1 ? 'e' : ''}
            </div>
          </div>

          {/* Inhalte */}
          {laedt && <p className="dashboard-ladetext">Daten werden geladen...</p>}
          {fehler && <div className="dashboard-fehler">{fehler}</div>}

          {!laedt && !fehler && gefiltert.length === 0 && (
            <div className="dashboard-leer">
              <p className="dashboard-leer-titel">
                {eintraege.length === 0 ? 'Noch nichts hier.' : 'Keine Einträge gefunden.'}
              </p>
              <p className="dashboard-leer-hinweis">
                {eintraege.length === 0
                  ? 'Sobald Schüler eine HÜ abgeben, erscheinen ihre Ergebnisse hier.'
                  : 'Passe die Filter an, um andere Einträge anzuzeigen.'}
              </p>
            </div>
          )}

          {!laedt && gefiltert.length > 0 && (
            <>
            <p className="tabelle-scroll-hinweis">← Tabelle horizontal scrollen →</p>
            <div className="tabelle-wrapper">
              <table className="ergebnis-tabelle">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Fach</th>
                    <th>Thema</th>
                    <th>Klasse</th>
                    <th>Nr.</th>
                    <th>Richtig</th>
                    <th>Gesamt</th>
                    <th>Prozent</th>
                    <th>HÜ</th>
                    <th>QR</th>
                  </tr>
                </thead>
                <tbody>
                  {gefiltert.map((e) => (
                    <tr key={e.id}>
                      <td className="datum-zelle">{formatDatum(e.erstellt_am)}</td>
                      <td>
                        <span className={`fach-badge fach-badge--${fachBadge(e.fach)}`}>{e.fach}</span>
                      </td>
                      <td>{e.thema}</td>
                      <td className="klasse-zelle">{e.schueler_klasse || '–'}</td>
                      <td className="zahl-zelle">{e.schueler_nummer}</td>
                      <td className="zahl-zelle">{e.richtige_antworten}</td>
                      <td className="zahl-zelle">{e.gesamt_fragen}</td>
                      <td className="zahl-zelle">
                        <span className={`prozent-badge ${prozentKlasse(e.prozent)}`}>
                          {e.prozent} %
                        </span>
                      </td>
                      {/* HÜ-ID: klickbar zum Filtern, zeigt erste 8 Zeichen */}
                      <td
                        className="hue-id-zelle"
                        onClick={() => e.hausuebung_id && setFilterHueId(e.hausuebung_id)}
                        title={e.hausuebung_id || ''}
                      >
                        {e.hausuebung_id ? `${e.hausuebung_id.substring(0, 8)}...` : '–'}
                      </td>
                      <td>
                        {e.hausuebung_id && (
                          <button
                            className="qr-zeigen-btn"
                            type="button"
                            onClick={() => setQrHueId(e.hausuebung_id)}
                          >
                            QR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}

      {/* ===================== Tab: Hausübungen ===================== */}
      {tab === 'uebungen' && (
        <>
          {huesLaedt && <p className="dashboard-ladetext">Hausübungen werden geladen...</p>}
          {huesFehler && <div className="dashboard-fehler">{huesFehler}</div>}

          {!huesLaedt && hues.length === 0 && !huesFehler && (
            <div className="dashboard-leer">
              <p className="dashboard-leer-titel">Noch nichts hier.</p>
              <p className="dashboard-leer-hinweis">
                Erstelle deine erste Hausübung über „Neue HÜ" – sie erscheint dann in dieser Liste.
              </p>
            </div>
          )}

          {!huesLaedt && hues.length > 0 && (
            <div className="hue-liste">
              {hues.map((hue) => {
                const abgaben = eintraege.filter((e) => e.hausuebung_id === hue.id).length
                const anzahl = aufgabenAnzahl(hue.aufgaben_json)
                return (
                  <div key={hue.id} className="hue-karte">
                    <div className="hue-karte-info">
                      <div className="hue-karte-kopf">
                        <span className={`fach-badge fach-badge--${fachBadge(hue.fach)}`}>{hue.fach}</span>
                        <span className="hue-karte-datum">{formatDatum(hue.erstellt_am)}</span>
                      </div>
                      <p className="hue-karte-thema">{hue.thema}</p>
                      <p className="hue-karte-meta">
                        {anzahl} Aufgabe{anzahl !== 1 ? 'n' : ''}
                        {' · '}
                        <button
                          type="button"
                          className="hue-karte-abgaben"
                          onClick={() => zuErgebnissen(hue.id)}
                          disabled={abgaben === 0}
                          title={abgaben > 0 ? 'Ergebnisse dieser HÜ anzeigen' : 'Noch keine Abgaben'}
                        >
                          {abgaben} Abgabe{abgaben !== 1 ? 'n' : ''}
                        </button>
                      </p>
                    </div>
                    <div className="hue-karte-aktionen">
                      <button
                        type="button"
                        className="hue-aktion-btn"
                        onClick={() => linkKopieren(hue.id)}
                      >
                        {kopiertId === hue.id ? 'Kopiert!' : 'Link kopieren'}
                      </button>
                      <button
                        type="button"
                        className="hue-aktion-btn"
                        onClick={() => setQrHueId(hue.id)}
                      >
                        QR
                      </button>
                      <a
                        className="hue-aktion-btn"
                        href={`/hue/${hue.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Öffnen
                      </a>
                      <button
                        type="button"
                        className="hue-aktion-btn hue-aktion-loeschen"
                        onClick={() => hueLoeschen(hue)}
                        disabled={loeschtId === hue.id}
                      >
                        {loeschtId === hue.id ? 'Löscht...' : 'Löschen'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* QR-Code Modal */}
      {qrHueId && (
        <div className="modal-overlay" onClick={() => setQrHueId(null)}>
          <div className="modal-inhalt" onClick={(e) => e.stopPropagation()}>
            <button className="modal-schliessen" onClick={() => setQrHueId(null)}>×</button>
            <p>Schüler-Link QR-Code</p>
            <QRCodeCanvas
              id="dashboard-qr-code"
              value={`${window.location.origin}/hue/${qrHueId}`}
              size={200}
              level="M"
            />
            <p className="modal-link-text">/hue/{qrHueId.substring(0, 8)}...</p>
          </div>
        </div>
      )}
    </div>
  )
}
