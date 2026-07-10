// Gemeinsamer Aufruf der generiere-hue Edge Function (alle Modi).
// Kapselt URL, Auth-Header und robustes Fehler-Parsing an einer Stelle.
import supabase from './supabaseClient'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

// Eingeloggte Lehrpersonen schicken ihr User-Token mit (die Generierung ist
// serverseitig login-pflichtig). Die Schüler-Modi "hole" und "auswerten"
// gehen bewusst IMMER mit dem Anon-Key raus: Sie brauchen keinen Login, und
// eine liegengebliebene (abgelaufene) Lehrer-Session im selben Browser darf
// einen Schüler-Link nicht mit 401 brechen.
async function authToken(body) {
  if ('hole' in body || 'auswerten' in body) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
}

// Wirft bei Fehlern eine Error mit deutscher Meldung (Server-Meldung wenn vorhanden)
export async function edgeFunctionAufrufen(body, fallbackFehler = 'Anfrage fehlgeschlagen.') {
  const token = await authToken(body)
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  // Antwort kann bei Gateway-/Cold-Start-Fehlern auch Nicht-JSON sein
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error((data && data.fehler) || fallbackFehler)
  }
  return data ?? {}
}
