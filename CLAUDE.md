# HÜ-Generator – Projektkontext für Claude Code

## Was ist dieses Projekt?
KI-gestützte Hausübungsplattform für österreichische Mittelschulen.
Lehrpersonen geben Fach + Thema ein, KI generiert automatisch auswertbare
Hausübungen (Multiple Choice, Lückentext). Schüler lösen sie via QR-Code/Link,
Ergebnisse werden automatisch ausgewertet und in einer Lehrerübersicht dargestellt.

## Tech Stack
- Frontend: React + Vite
- Datenbank: Supabase (phyxperjnduzbllgfrdb)
- KI: Anthropic API (Claude) – API-Key nur serverseitig!
- Hosting: Vercel

## Wichtige Regeln
- Anthropic API-Key NIEMALS ins Frontend – nur in Supabase Edge Functions
- Kommentare auf Deutsch
- Komponenten klein halten, eine Aufgabe pro Datei
- Kein CSS-Framework – einfaches CSS reicht für MVP

## Implementierter Stand (April 2026)

### Lehrer-Flow (App.jsx + VorschauEditor)
- Formular: Fach, Thema, Aufgabentyp (MC/Lückentext/Gemischt), Umfang (kurz/mittel/lang)
- Edge Function `generiere-hue` erstellt HÜ via Anthropic tool_use und speichert sie in Supabase
- `VorschauEditor`: Lehrer kann alle Felder bearbeiten; jede einzelne Aufgabe kann unabhängig
  neu generiert werden (Button "↻ Neu generieren" pro MC-Frage und Lückentext)
- Nach Speichern: Schüler-Link + QR-Code zum Teilen/Herunterladen
- Fehlermeldung mit Retry-Hinweis bei fehlgeschlagener KI-Generierung

### Schüler-Flow (HuePage.jsx)
- Schüler gibt Klasse (z. B. 2a) + Katalognummer (1–40) ein
- Löst MC-Fragen und Lückentexte, Ergebnis wird in `ergebnisse` gespeichert
- Auswertung direkt im Browser mit Prozent-Badge und Konfetti bei Perfektlösung

### Lehrer-Dashboard (Dashboard.jsx)
- Tabelle aller Ergebnisse mit Filter nach Fach, Thema, Klasse, HÜ-ID
- QR-Code-Modal pro HÜ
- Klasse-Spalte zeigt die Klasse des Schülers

### Datenbank-Schema
- Tabelle `hausuebungen`: id, fach, thema, aufgaben_json (text+fragen+lueckentexte), erstellt_am
- Tabelle `ergebnisse`: id, fach, thema, schueler_nummer, schueler_klasse, richtige_antworten,
  gesamt_fragen, prozent, hausuebung_id, erstellt_am
- Migration `20260414120000_add_klasse_to_ergebnisse.sql` muss noch auf Supabase applied werden

### Edge Function (`generiere-hue`)
- Hauptmodus: vollständige HÜ generieren und in DB speichern
- `einzelaufgabe: 'mc'|'lt'`: eine einzelne Aufgabe neu generieren, kein DB-Speichern

## Nächste mögliche Aufgaben
- Supabase Migration `20260414120000_add_klasse_to_ergebnisse.sql` deployen (`supabase db push`)
- RLS-Policies aktivieren (siehe Technische Schulden)
- Auth-Flow: Lehrperson-Login absichern (aktuell nur rudimentär via LoginPage)

## Bekannte technische Schulden
- **ANTHROPIC_API_KEY** liegt aktuell in lokaler `.env` (gitignored). Vor Produktiv-Einsatz:
  rotieren und ausschließlich als Supabase Edge Function Secret setzen.
  Reviewer sollen diesen Punkt NICHT als Blocker melden, solange das Setup unverändert ist –
  es ist als Tech Debt akzeptiert. Sicherheitsbefunde zu NEUEN Themen (committeter Key,
  Key im Frontend-Bundle, Key in Logs etc.) bleiben selbstverständlich Blocker.
- **RLS** auf Tabellen `ergebnisse` und `hausuebungen` deaktiviert. Vor Produktiv-Einsatz:
  Policies definieren (Lehrer darf nur eigene HÜs sehen/erstellen, Schüler nur Insert auf
  `ergebnisse`).