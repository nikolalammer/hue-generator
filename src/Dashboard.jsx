import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './Dashboard.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

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
    return fachPasst && themaPasst
  })

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Lehrer-Dashboard</h1>
          <p>Übersicht aller abgegebenen Hausübungen</p>
        </div>
        <Link to="/" className="zurueck-link">← Zurück</Link>
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

        <div className="filter-info">
          {gefiltert.length} Eintrag{gefiltert.length !== 1 ? 'e' : ''}
        </div>
      </div>

      {/* Inhalte */}
      {laedt && <p className="dashboard-ladetext">Daten werden geladen...</p>}
      {fehler && <div className="dashboard-fehler">{fehler}</div>}

      {!laedt && !fehler && gefiltert.length === 0 && (
        <p className="dashboard-leer">Keine Einträge gefunden.</p>
      )}

      {!laedt && gefiltert.length > 0 && (
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
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((e) => (
                <tr key={e.id}>
                  <td className="datum-zelle">{formatDatum(e.erstellt_am)}</td>
                  <td><span className="fach-badge">{e.fach}</span></td>
                  <td>{e.thema}</td>
                  <td className="zahl-zelle">{e.schueler_nummer}</td>
                  <td className="zahl-zelle">{e.richtige_antworten}</td>
                  <td className="zahl-zelle">{e.gesamt_fragen}</td>
                  <td className="zahl-zelle">
                    <span className={`prozent-badge ${prozentKlasse(e.prozent)}`}>
                      {e.prozent} %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
