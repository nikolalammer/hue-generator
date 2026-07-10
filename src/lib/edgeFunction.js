// Gemeinsamer Aufruf der generiere-hue Edge Function (alle Modi).
// Kapselt URL, Auth-Header und robustes Fehler-Parsing an einer Stelle.
import supabase from './supabaseClient'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

// Eingeloggte Lehrpersonen schicken ihr User-Token mit (die Generierung ist
// serverseitig login-pflichtig). Schüler ohne Session nutzen den Anon-Key –
// der reicht für die Modi "hole" und "auswerten".
async function authToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
}

// Wirft bei Fehlern eine Error mit deutscher Meldung (Server-Meldung wenn vorhanden)
export async function edgeFunctionAufrufen(body, fallbackFehler = 'Anfrage fehlgeschlagen.') {
  const token = await authToken()
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
