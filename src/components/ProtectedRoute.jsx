// Schützt Routen vor unangemeldeten Nutzern
// Reagiert auf Auth-Events via onAuthStateChange – kein separates getSession() nötig,
// da das INITIAL_SESSION-Event den initialen Zustand zuverlässig liefert
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import './ProtectedRoute.css'

export default function ProtectedRoute({ children }) {
  // Ladezustand: true solange noch kein Auth-Event von Supabase eingetroffen ist
  const [laden, setLaden] = useState(true)
  const [eingeloggt, setEingeloggt] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // onAuthStateChange liefert beim ersten Aufruf immer ein INITIAL_SESSION-Event
    // und ersetzt damit den separaten getSession()-Aufruf vollständig
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ereignis, session) => {
      setEingeloggt(session !== null)
      setLaden(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Ladezustand: noch kein Auth-Event von Supabase erhalten
  if (laden) {
    return <div className="lade-anzeige">Wird geladen...</div>
  }

  // Nicht eingeloggt → zur Login-Seite; Ziel merken, damit der Magic Link
  // wieder auf der ursprünglich angeforderten Seite landet
  if (!eingeloggt) {
    return <Navigate to="/login" replace state={{ von: location.pathname }} />
  }

  // Eingeloggt → geschützte Komponente rendern
  return children
}
