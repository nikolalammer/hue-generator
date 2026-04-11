// Zentraler Supabase-Client – wird in allen Komponenten importiert
// Der Anon-Key ist für das Frontend bestimmt und kann hier sicher verwendet werden
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
