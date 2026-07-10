// Dekorative Memphis-Formen am Seitenrand (Design-System: max 3-4 Formen
// Schüler, max 2 Lehrer, asymmetrisch, nie über UI-Elementen).
// Liegt als fixe Ebene hinter dem Inhalt (z-index 0, pointer-events: none);
// der Seiteninhalt muss darüber liegen (position: relative + z-index 1).
import './DekoFormen.css'

// Pro Screen eine eigene Formen-Kombination – bewusst nicht überall dieselbe
const VARIANTEN = {
  // Schüler: verspielter, kräftigere Opacity
  schueler: [
    { klasse: 'deko-kreis deko-butter', style: { width: 140, height: 140, top: '4%', left: -60, opacity: 0.55 } },
    { klasse: 'deko-kreis-offen deko-terracotta', style: { width: 90, height: 90, top: '30%', right: -35, opacity: 0.5 } },
    { klasse: 'deko-raute deko-sky', style: { width: 40, height: 40, bottom: '18%', left: '6%', opacity: 0.45 } },
    { klasse: 'deko-quadrat deko-rose', style: { width: 56, height: 56, bottom: '6%', right: '10%', opacity: 0.6, transform: 'rotate(12deg)' } },
  ],
  // Login: einladend, mittig-symmetriefrei
  login: [
    { klasse: 'deko-kreis deko-butter', style: { width: 160, height: 160, top: '12%', right: -70, opacity: 0.5 } },
    { klasse: 'deko-kreis-offen deko-olive', style: { width: 70, height: 70, bottom: '20%', left: '8%', opacity: 0.4 } },
    { klasse: 'deko-raute deko-rose', style: { width: 34, height: 34, top: '22%', left: '14%', opacity: 0.5 } },
  ],
  // Lehrer-Formular: ruhig, klein, niedrige Opacity
  lehrer: [
    { klasse: 'deko-kreis deko-butter', style: { width: 110, height: 110, top: '8%', left: -50, opacity: 0.35 } },
    { klasse: 'deko-kreis-offen deko-terracotta', style: { width: 64, height: 64, bottom: '12%', right: -24, opacity: 0.3 } },
  ],
  // Dashboard: am dichtesten – nur zwei sehr dezente Formen
  dashboard: [
    { klasse: 'deko-raute deko-sky', style: { width: 30, height: 30, top: '10%', right: '4%', opacity: 0.35 } },
    { klasse: 'deko-kreis deko-rose', style: { width: 90, height: 90, bottom: '8%', left: -40, opacity: 0.3 } },
  ],
}

export default function DekoFormen({ variante }) {
  const formen = VARIANTEN[variante] ?? []
  return (
    <div className="deko-ebene" aria-hidden="true">
      {formen.map((form, i) => (
        <span key={i} className={`deko-form ${form.klasse}`} style={form.style} />
      ))}
    </div>
  )
}
