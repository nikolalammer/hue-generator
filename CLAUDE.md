# Aufgabolino – Projektkontext für Claude Code

## Was ist das Projekt?
KI-gestützte Hausübungsplattform für österreichische Mittelschulen (MS Eberschwang,
5.–8. Schulstufe). Lehrer generieren Hausübungen per Anthropic-KI, Schüler lösen sie
via Link/QR-Code, Auswertung serverseitig, Ergebnisse im Lehrer-Dashboard.
Zielgruppe später auch Kollegen der Region (ARGE DGB Innviertel) – robust,
verständlich, DSGVO-konform.

## Stack
- Frontend: React + Vite, plain CSS (kein Framework), Deutsch inkl. Code-Kommentaren
- Supabase `phyxperjnduzbllgfrdb` (Postgres + Auth + Edge Function `generiere-hue`)
- Anthropic API (claude-haiku) nur in der Edge Function, Key in Supabase Secrets
- Hosting: Vercel (Auto-Deploy von `main` auf GitHub)
- Design-System: Memphis-Collage – verbindliche Spec in `docs/design/AUFGABOLINO-DESIGN-SYSTEM.md`

## Architektur-Grundsätze (nicht aufweichen)
- **Lösungen bleiben serverseitig:** Schüler-Flow läuft komplett über die Edge Function
  (Modus `hole` liefert Aufgaben ohne Lösungen, `auswerten` bewertet serverseitig).
  Kein direkter `hausuebungen`-Read aus dem Schüler-Kontext.
- **Generierung ist login-pflichtig** (User-JWT-Check in der Edge Function) – der
  Anon-Key darf keine Anthropic-Kosten auslösen. Self-Signup ist deaktiviert
  (Supabase `disable_signup` + `shouldCreateUser: false`); neue Lehrer-Accounts
  werden im Supabase-Dashboard eingeladen.
- **RLS bleibt aktiv** auf `hausuebungen` und `ergebnisse`. Update/Delete auf
  `hausuebungen` nur für die besitzende Lehrperson (`erstellt_von`) bzw. Alt-Daten.
- Schüler nur pseudonym (Klasse + Katalognummer 1–40), keine Namen speichern.
- Reine Auswertungs-/Ausliefer-Logik liegt testbar in
  `supabase/functions/generiere-hue/logik.ts` (ohne Deno-APIs).

## Tests & Checks (vor jedem Commit)
- `npm run lint` und `npm run build` müssen grün sein
- `npm test` – Deno-Tests der Logik (läuft ohne Supabase)
- `npm run test:ui <hue-id>` – Puppeteer-Smoke-Test des Schüler-Flows
  (braucht `npm run dev` und eine existierende HÜ-ID)
- Nach größeren Etappen: `/code-review` als Review-Checkpoint

## Konventionen
- Feature-Branches (`feature/…`, `fix/…`, `design/…`), Merge in `main` mit `--no-ff`
- Deutsche Commit-Messages, Co-Author-Trailer für Claude
- Migrationen: neue Datei in `supabase/migrations/` (YYYYMMDD_name.sql), nie bestehende ändern
- Edge Function deployen: `npx supabase functions deploy generiere-hue --project-ref phyxperjnduzbllgfrdb`
  (Access-Token liegt im Windows Credential Manager unter `Supabase CLI:supabase`)
- Fächerliste zentral in `src/lib/faecher.js`

## Was NICHT autonom passieren soll
- Git Push zu GitHub (triggert Vercel-Produktions-Deploy)
- `supabase db push` (Migrationen in Produktion)
- Diese Schritte ankündigen und auf Bestätigung warten, auch im skip-permissions Modus.

## Stand Juli 2026
Umgesetzt: vier Aufgabentypen (MC, Lückentext, Wahr/Falsch, Zuordnung), Fokus-Feld +
Schwierigkeit, editierbare Vorschau mit Einzel-Neu-Generierung, serverseitige
Auswertung ohne Lösungs-Leak, Dashboard mit Ergebnis-Filtern und HÜ-Verwaltung
(Link/QR/Löschen, Deep-Link `/dashboard#uebungen`), 9 Fächer, Design-Migration
Memphis-Collage Stufe 1–3 komplett, Security-Härtung (Login-Pflicht Generierung,
kein Self-Signup, Besitz-RLS, Redirect-Allowlist).

Offen (siehe auch Backlog in `aufgabolino-projektkontext.md`): Deploy-Abgleich
main → GitHub/Vercel + `supabase db push` (wartet auf Bestätigung), Maskottchen,
Domain aufgabolino.at, CSV-Export, Statistik pro Schüler.
