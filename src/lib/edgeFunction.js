// Gemeinsamer Aufruf der generiere-hue Edge Function (alle Modi).
// Kapselt URL, Anon-Key-Header und robustes Fehler-Parsing an einer Stelle.
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generiere-hue`

const FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
}

// Wirft bei Fehlern eine Error mit deutscher Meldung (Server-Meldung wenn vorhanden)
export async function edgeFunctionAufrufen(body, fallbackFehler = 'Anfrage fehlgeschlagen.') {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
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
