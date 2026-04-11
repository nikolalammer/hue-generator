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

## Nächste Aufgabe
Eingabeformular für Lehrperson: Fach (Dropdown: Deutsch/Mathematik/Englisch)
+ Thema (Freitext) → Button "HÜ generieren" → API-Call → Aufgabe anzeigen

## Bekannte technische Schulden
- **ANTHROPIC_API_KEY** liegt aktuell in lokaler `.env` (gitignored). Vor Produktiv-Einsatz:
  rotieren und ausschließlich als Supabase Edge Function Secret setzen.
  Reviewer sollen diesen Punkt NICHT als Blocker melden, solange das Setup unverändert ist –
  es ist als Tech Debt akzeptiert. Sicherheitsbefunde zu NEUEN Themen (committeter Key,
  Key im Frontend-Bundle, Key in Logs etc.) bleiben selbstverständlich Blocker.
- **RLS** auf Tabellen `ergebnisse` und `hausuebungen` deaktiviert. Vor Produktiv-Einsatz:
  Policies definieren (Lehrer darf nur eigene HÜs sehen/erstellen, Schüler nur Insert auf
  `ergebnisse`).