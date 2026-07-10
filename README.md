# Aufgabolino

KI-gestützte Hausübungsplattform für österreichische Mittelschulen (5.–8. Schulstufe).

Lehrpersonen geben Fach + Thema ein, die KI generiert automatisch auswertbare
Hausübungen mit österreichischer Schulterminologie. Schüler lösen sie via QR-Code
oder direktem Link, Ergebnisse werden serverseitig ausgewertet und im
Lehrer-Dashboard dargestellt.

## Tech Stack

- **Frontend:** React + Vite, Design-System „Memphis-Collage" (siehe `docs/design/`)
- **Datenbank & Auth:** Supabase (Postgres, RLS, Magic-Link-Login)
- **KI:** Anthropic API (Claude Haiku) über Supabase Edge Function – der API-Key
  verlässt nie den Server
- **Hosting:** Vercel

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Benötigte Umgebungsvariablen in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Tests

```bash
npm test          # Deno-Tests der Auswertungslogik (Edge Function)
npm run test:ui   # UI-Smoke-Test des Schüler-Flows (braucht laufenden Dev-Server + Edge)
```

## Features

- HÜ-Generierung per KI: Multiple Choice, Lückentext, Wahr/Falsch, Zuordnung, Gemischt
- Fokus-Feld, wählbarer Umfang (kurz/mittel/lang) und Schwierigkeitsgrad
- Editierbare Vorschau mit Neu-Generierung einzelner Aufgaben vor dem Freischalten
- Teilbarer Schüler-Link + QR-Code (PNG-Download)
- Schüler-Auswertung serverseitig – Lösungen erreichen den Browser erst nach Abgabe
- Lehrer-Dashboard: Ergebnisübersicht mit Filtern + Hausübungs-Verwaltung
  (Link/QR wiederfinden, öffnen, löschen)
- Magic-Link-Login für Lehrpersonen (ohne Self-Signup), Generierung login-pflichtig

## Sicherheit

- Anthropic-Key nur als Supabase Edge Function Secret
- RLS aktiv auf `hausuebungen` und `ergebnisse`; Schüler-Zugriffe laufen
  ausschließlich über die Edge Function (Modi `hole`/`auswerten`)
- Schüler werden nur pseudonym erfasst (Klasse + Katalognummer, keine Namen)

## Design

Das visuelle System „Memphis-Collage" (Fraunces/DM Sans, Cream/Terracotta/Olive/
Plum/Butter, weiche Schatten, dekorative Formen) ist in
`docs/design/AUFGABOLINO-DESIGN-SYSTEM.md` verbindlich dokumentiert.
