// Schützt Routen vor unangemeldeten Nutzern
// Prüft die aktive Session und leitet bei fehlender Anmeldung auf /login um
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'

export default function ProtectedRoute({ children }) {
  // null = noch nicht geprüft, false = nicht eingeloggt, true = eingeloggt
  const [sitzungStatus, setSitzungStatus] = useState(null)

  useEffect(() => {
    // Aktuelle Session beim Laden einmalig prüfen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSitzungStatus(session !== null)
    })

    // Auf Auth-Statusänderungen reagieren (z. B. nach Magic-Link-Klick)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ereignis, session) => {
      setSitzungStatus(session !== null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Ladezustand: noch keine Antwort von Supabase
  if (sitzungStatus === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#64748b',
        fontSize: '15px',
      }}>
        Wird geladen...
      </div>
    )
  }

  // Nicht eingeloggt → zur Login-Seite
  if (!sitzungStatus) {
    return <Navigate to="/login" replace />
  }

  // Eingeloggt → geschützte Komponente rendern
  return children
}
