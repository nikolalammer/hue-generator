# Aufgabolino

KI-gestützte Hausübungsplattform für österreichische Mittelschulen.

Lehrpersonen geben Fach + Thema ein, die KI generiert automatisch auswertbare
Hausübungen (Multiple Choice, Lückentext). Schüler lösen sie via QR-Code oder
direktem Link, Ergebnisse werden automatisch ausgewertet und im Lehrer-Dashboard
dargestellt.

## Tech Stack

- **Frontend:** React + Vite
- **Datenbank:** Supabase
- **KI:** Anthropic API (Claude Haiku)
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

## Features

- HÜ-Generierung per KI (Multiple Choice, Lückentext, Gemischt)
- Wählbarer Umfang (kurz / mittel / lang)
- Editierbare Vorschau vor dem Freischalten
- Teilbarer Schüler-Link + QR-Code
- Lehrer-Dashboard mit Ergebnisübersicht und Filter
- Magic-Link-Login für Lehrpersonen
