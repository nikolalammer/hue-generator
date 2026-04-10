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