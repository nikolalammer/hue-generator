// Zentrale Fächerliste – einzige Quelle der Wahrheit für Lehrer-Formular,
// Dashboard-Filter und Fach-Badges. Bezeichnungen nach österreichischem
// Mittelschul-Lehrplan (Kurzformen für die UI).
// badge: CSS-Modifier für .fach-badge--<badge> (siehe Dashboard.css)
export const FAECHER = [
  { name: 'Deutsch', badge: 'deutsch' },
  { name: 'Mathematik', badge: 'mathematik' },
  { name: 'Englisch', badge: 'englisch' },
  { name: 'Geografie', badge: 'geografie' },
  { name: 'Geschichte', badge: 'geschichte' },
  { name: 'Biologie', badge: 'biologie' },
  { name: 'Physik', badge: 'physik' },
  { name: 'Chemie', badge: 'chemie' },
  { name: 'Digitale Grundbildung', badge: 'dgb' },
]

// CSS-Modifier zu einem Fachnamen (Fallback: generischer Badge-Stil)
export function fachBadge(fachName) {
  const fach = FAECHER.find((f) => f.name === fachName)
  return fach ? fach.badge : 'sonstig'
}
