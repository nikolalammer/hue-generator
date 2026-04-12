import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import supabase from './lib/supabaseClient'
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

export default function Dashboard() {
  const [eintraege, setEintraege] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(null)
  const [filterFach, setFilterFach] = useState('Alle')
  const [filterThema, setFilterThema] = useState('')
  const [filterHueId, setFilterHueId] = useState(null)
  // null = Modal geschlossen, UUID = QR-Code für diese HÜ anzeigen
  const [qrHueId, setQrHueId] = useState(null)
  const navigate = useNavigate()

  // Abmelden und zur Login-Seite weiterleiten
  async function abmelden() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  useEffect(() => {
    async function laden() {
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
    laden()
  }, [])

  // Gefilterte Einträge berechnen
  const gefiltert = eintraege.filter((e) => {
    const fachPasst = filterFach === 'Alle' || e.fach === filterFach
    const themaPasst = e.thema.toLowerCase().includes(filterThema.toLowerCase())
    const huePasst = !filterHueId || e.hausuebung_id === filterHueId
    return fachPasst && themaPasst && huePasst
  })

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Lehrer-Dashboard</h1>
          <p>Übersicht aller abgegebenen Hausübungen</p>
        </div>
        <div className="dashboard-header-aktionen">
          <Link to="/" className="zurueck-link">← Zurück</Link>
          <button onClick={abmelden} className="abmelden-btn">Abmelden</button>
        </div>
      </header>

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
            <option value="Deutsch">Deutsch</option>
            <option value="Mathematik">Mathematik</option>
            <option value="Englisch">Englisch</option>
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
          <span className="dashboard-leer-icon" aria-hidden="true">📋</span>
          <p className="dashboard-leer-titel">
            {eintraege.length === 0 ? 'Noch keine Ergebnisse vorhanden' : 'Keine Einträge gefunden'}
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
                    <span className={`fach-badge fach-badge--${e.fach?.toLowerCase()}`}>{e.fach}</span>
                  </td>
                  <td>{e.thema}</td>
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
