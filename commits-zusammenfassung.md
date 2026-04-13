# Commit-Zusammenfassung – HÜ-Generator

Alle Commits chronologisch (älteste zuerst). Erstellt am 11.04.2026.

---

## 1. `ef54616` – Initial commit
**Datum:** 10.04.2026, 17:37  
**Autor:** nikolalammer

Leeres GitHub-Repository initialisiert (`.gitignore`, `LICENSE`, `README.md`).

---

## 2. `0a394f6` – Initial setup: Vite+React, Supabase, .gitignore
**Datum:** 10.04.2026, 17:58  
**Autor:** nikolalammer

Projekt-Grundstruktur aufgebaut:
- Vite + React Frontend eingerichtet
- Supabase-Abhängigkeit hinzugefügt
- `.gitignore` angepasst
- Grundlegendes App-Gerüst (`App.jsx`, `App.css`, `main.jsx`, `index.css`)
- Assets (`hero.png`, Icons)

**Geänderte Dateien:** `.gitignore`, `package.json`, `package-lock.json`, `eslint.config.js`, `index.html`, `vite.config.js`, `src/` (App, CSS, Assets)

---

## 3. `2df74fa` – Add CLAUDE.md project context
**Datum:** 10.04.2026, 18:06  
**Autor:** nikolalammer

`CLAUDE.md` angelegt – Projektbeschreibung, Tech Stack, wichtige Regeln und nächste Aufgaben für Claude Code dokumentiert.

**Geänderte Dateien:** `CLAUDE.md` (neu, 23 Zeilen)

---

## 4. `2ba4bdd` – Eingabeformular, Edge Function und Ergebnisspeicherung implementiert
**Datum:** 10.04.2026, 19:34  
**Autor:** nikolalammer  
**Co-Autor:** Claude Sonnet 4.6

Kern-Funktionalität der App implementiert:

- **Formular:** Fach-Dropdown (Deutsch/Mathematik/Englisch) + Thema-Freitext + "HÜ generieren"-Button
- **Edge Function** (`supabase/functions/generiere-hue/index.ts`):
  - Ruft Anthropic API (`claude-haiku-4-5`) serverseitig auf
  - Verwendet `tool_use` (Function Calling) für zuverlässiges JSON-Output
  - Österreichische Fachbegriffe im Prompt verankert (Nomen, Beistrich, ÖWB)
- **Schülernummer-Eingabe:** 1–40, Pflichtfeld vor dem Lösen
- **Multiple-Choice-Auswertung:** Farbmarkierung richtig/falsch nach Abgabe
- **Ergebnisse** werden in Supabase-Tabelle `ergebnisse` gespeichert
- **DB-Migration** (`supabase/migrations/20260410_ergebnisse.sql`): Tabelle mit Feldern `fach`, `thema`, `schueler_nummer`, `richtige_antworten`, `gesamt_fragen`, `prozent`; RLS für MVP deaktiviert
- `.env.example` als Vorlage für Umgebungsvariablen

**Geänderte Dateien:** `src/App.jsx`, `src/App.css`, `supabase/functions/generiere-hue/index.ts` (neu), `supabase/migrations/20260410_ergebnisse.sql` (neu), `.env.example` (neu)

---

## 5. `95c1a5f` – Lehrer-Dashboard mit Routing und Ergebnisübersicht
**Datum:** 10.04.2026, 19:36  
**Autor:** nikolalammer  
**Co-Autor:** Claude Sonnet 4.6

Lehrer-Dashboard und clientseitiges Routing hinzugefügt:

- **React Router:** Routen `/` (Schüler-App) und `/dashboard` (Lehrer-Dashboard)
- **Dashboard** (`src/Dashboard.jsx`):
  - Lädt alle Einträge aus Supabase-Tabelle `ergebnisse`
  - Filter nach Fach (Dropdown) und Thema (Freitext-Suche)
  - Tabelle: Datum (de-AT Format), Fach-Badge, Thema, Schülernummer, Richtig, Gesamt, Prozent
  - Prozent farblich markiert: grün (≥75%), gelb (≥50%), rot (<50%)
- **Navigation:** Dashboard-Link auf Hauptseite, Zurück-Link im Dashboard
- **`vercel.json`:** Konfiguration für clientseitiges Routing auf Vercel

**Geänderte Dateien:** `src/Dashboard.jsx` (neu), `src/Dashboard.css` (neu), `src/main.jsx`, `src/App.jsx`, `src/App.css`, `package.json`, `package-lock.json`, `vercel.json` (neu)

---

## 6. `3d1a749` – .claude/ zu .gitignore hinzufügen
**Datum:** 10.04.2026, 19:44  
**Autor:** nikolalammer  
**Co-Autor:** Claude Sonnet 4.6

Claude-Code-Konfigurationsordner (`.claude/`) vom Git-Tracking ausgeschlossen.

**Geänderte Dateien:** `.gitignore` (1 Zeile hinzugefügt)

---

## 7. `5a7c496` – Supabase Magic-Link-Auth für Lehrer-Dashboard einbauen
**Datum:** 11.04.2026  
**Branch:** `feature/dashboard-auth`  
**Autor:** nikolalammer  
**Co-Autor:** Claude Sonnet 4.6

Supabase Auth (Magic Link via E-Mail) für das Lehrer-Dashboard implementiert:

- **`src/lib/supabaseClient.js`** (neu): Zentraler Supabase-Client, von allen Komponenten gemeinsam genutzt – kein doppeltes `createClient` mehr
- **`src/pages/LoginPage.jsx` + `LoginPage.css`** (neu): Login-Formular mit E-Mail-Feld, Button „Magic Link senden", Bestätigungsmeldung nach Absenden. Nutzt `supabase.auth.signInWithOtp()` mit `emailRedirectTo: window.location.origin + '/dashboard'`
- **`src/components/ProtectedRoute.jsx`** (neu): Auth-Guard-Komponente, hört auf `onAuthStateChange` (INITIAL_SESSION-Event), zeigt Ladezustand, leitet bei fehlender Session auf `/login` um
- **`src/main.jsx`**: Neue Route `/login`, Route `/dashboard` in `<ProtectedRoute>` eingebettet
- **`src/Dashboard.jsx`**: Logout-Button mit `supabase.auth.signOut()` + Redirect auf `/login`
- **`src/Dashboard.css`**: Styles für Header-Aktionen und Logout-Button

**Geänderte Dateien:** `src/lib/supabaseClient.js` (neu), `src/pages/LoginPage.jsx` (neu), `src/pages/LoginPage.css` (neu), `src/components/ProtectedRoute.jsx` (neu), `src/main.jsx`, `src/Dashboard.jsx`, `src/Dashboard.css`

---

## 8. `304e4b4` – Review-Findings beheben: Auth-Sicherheit und Code-Qualität
**Datum:** 11.04.2026  
**Branch:** `feature/dashboard-auth`  
**Autor:** nikolalammer  
**Co-Autor:** Claude Sonnet 4.6

Fünf Findings aus dem Code-Review behoben:

- **`.env`**: `VITE_ANTHROPIC_API_KEY` → `ANTHROPIC_API_KEY` (kein `VITE_`-Prefix mehr, wird nicht ins Browser-Bundle eingebettet)
- **`LoginPage.jsx`**: Hardcodierte E-Mail-Adresse als State-Initialwert entfernt → `useState('')`
- **`ProtectedRoute.jsx`**: Race Condition behoben – redundanter `getSession()`-Aufruf entfernt, ausschließlich `onAuthStateChange` mit INITIAL_SESSION-Event
- **`ProtectedRoute.css`** (neu): Inline-Styles des Lade-Spinners in CSS-Klasse `.lade-anzeige` ausgelagert
- **`LoginPage.jsx`**: `emailRedirectTo: window.location.origin + '/dashboard'` gesetzt – Magic Link führt direkt aufs Dashboard

**Geänderte Dateien:** `.env`, `src/pages/LoginPage.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/ProtectedRoute.css` (neu)

---

## Session-Notiz (11.04.2026)

**Wichtig:** Anthropic API-Key muss rotiert werden (wurde im Review-Prozess im Klartext gelesen). Neuen Key ausschließlich in den Supabase Edge Function Secrets hinterlegen (`Deno.env.get('ANTHROPIC_API_KEY')`), niemals lokal in einer Datei.

Supabase Auth-Einstellungen (URL Configuration) müssen gesetzt werden:
- Site URL: `http://localhost:5173` (lokal) / Vercel-URL (Produktion)
- Redirect URLs: beide Umgebungen eintragen

---

## Session 12.04.2026 – Design-Overhaul + Aufgabolino-v2

### Branch: `design/visual-overhaul` (von main abgezweigt nach PR-Merge #1–#3)

---

## 9. `7237b77` – design: Farb- und Typografie-System in index.css einführen
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Vollständiges Design-System als CSS Custom Properties in `src/index.css` eingeführt:

- **Primärfarbe:** Bernstein `#D97706` (`--primary-500`) – war ursprünglich Teal, nach Farbpaletten-Tausch Bernstein
- **Sekundärfarbe:** Teal `#2D7D7B` (`--secondary-500`) – für Outline-Buttons und Dekorationselemente
- **Hintergrund:** Warm Cream `#FAF8F3` (`--bg`)
- **Typografie:** Inter (UI-Font, `--font-sans`) + Lora (Headings, `--font-heading`)
- **8px-Spacing-Grid:** `--space-1` bis `--space-16`
- **Semantische Farbvariablen:** Fehler, Erfolg, Warnung, Neutral-Palette (50–900) mit warmem Sepia-Ton
- CSS-Reset (box-sizing, Margin-Reset, Body-Font), Basis-Typografie, Button-Basisklassen

**Geänderte Dateien:** `src/index.css` (vollständige Neuerstellung)

---

## 10. `468c010` – design: Login-Seite überarbeiten
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Login-Seite neu gestaltet:

- Brand-Block: Buchstapel-Icon, Titel „Aufgabolino", Untertitel „Lehrer-Login"
- Formular-Card mit Schatten, Eingabefelder mit 44px Touch-Targets
- Success-State: grüner ✓-Kreis mit Bestätigungstext
- Magic-Link-Button mit Bernstein-Primary-Styling

**Geänderte Dateien:** `src/pages/LoginPage.jsx`, `src/pages/LoginPage.css`

---

## 11. `8d12c6b` – design: Lehrer-Hauptseite überarbeiten
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Lehrer-Hauptseite (App.jsx) und App.css überarbeitet:

- Header: zentrierter Textblock + Dashboard-Link als Teal-Outline-Button
- Formular als Card (max-width 560px), alle Inputs/Selects einheitlich gestylt
- Lesetext-Card: Teal-Linksrand als dekorativer Akzent
- Generieren-Button: Bernstein-Primary mit Hover-Lift
- Ladeindikator: Bernstein-Spinner

**Geänderte Dateien:** `src/App.jsx`, `src/App.css`

---

## 12. `0745a34` – design: Schüler-HÜ-Seite überarbeiten
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

HuePage (`/hue/:id`) komplett neu gestaltet:

- **Skeleton Loading:** 3 Skeleton-Cards statt einfachem Spinner
- **MC-Antworten:** Große Karten (min. 48px), Buchstabe als farbiges Badge
- **Lückentext-Input:** Unterstrich-Stil (Teal border-bottom, kein border-box)
- **Ergebnis:** Kreisförmiges Prozent-Badge + Originaltext „X von Y Fragen richtig"

**Geänderte Dateien:** `src/pages/HuePage.jsx`, `src/pages/HuePage.css`

---

## 13. `916a38a` – design: Dashboard überarbeiten
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Dashboard neu gestaltet:

- **Empty State:** Icon, Titel, Hinweis-Text statt rohem „Keine Einträge"
- **Fach-Badges:** Farbcodiert (Deutsch = lila, Mathematik = blau, Englisch = orange)
- **QR-Button:** Auf 44×44px Touch-Target vergrößert
- **Abmelden-Button:** min-height: 44px
- **Mobile:** Scroll-Hinweis unter Tabelle

**Geänderte Dateien:** `src/Dashboard.jsx`, `src/Dashboard.css`

---

## 14. `77e155b` – design: Mobile-Optimierungen und ProtectedRoute
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Letzte Mobile-Feinschliffe und ProtectedRoute-Styling:

- Responsive Breakpoints durchgängig überprüft
- ProtectedRoute Lade-Spinner in neues Design-System eingebunden

**Geänderte Dateien:** `src/components/ProtectedRoute.jsx`, `src/components/ProtectedRoute.css`

---

## 15. `650dc56` – design: Review-Findings beheben
**Datum:** 12.04.2026  
**Branch:** `design/visual-overhaul`  
**Co-Autor:** Claude Sonnet 4.6

Review-Findings aus Code-Review behoben:

- QR-Button: `min-height: 44px; min-width: 44px` (war 28px – zu klein für Mobile)
- Abmelden-Button: explizites `min-height: 44px`
- Ergebnis-Zusammenfassung: Originaltext beibehalten, Prozent-Wert als separates kreisförmiges Badge

**Geänderte Dateien:** `src/Dashboard.css`, `src/pages/HuePage.jsx`, `src/pages/HuePage.css`

---

### Branch: `feature/aufgabolino-v2` (von `design/visual-overhaul` abgezweigt)

---

## 16. `88a20d2` – fix: Mobile-Crash bei Lehrer-Vorschau
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Crash auf Lehrer-Hauptseite behoben (`ergebnis.fragen.map is not a function`):

- **Root Cause:** Bei `aufgabentyp = 'lueckentext'` gibt die AI manchmal `fragen: null` zurück statt `fragen: []`, obwohl im tool_use-Schema als required definiert
- **Fix:** `Array.isArray(ergebnis.fragen) && ergebnis.fragen.length > 0` als Guard für MC-Abschnitt; analog für `frage.antworten` und `ergebnis.lueckentexte`
- Der Crash erschien als „Mobile-spezifisch" weil MC auf Desktop, Lückentext auf Mobile getestet wurde

**Geänderte Dateien:** `src/App.jsx`

---

## 17. `543cd57` – fix: veralteten Kommentar aktualisieren
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Kommentar `// data = { id, text, fragen }` in App.jsx aktualisiert auf `{ id, text, fragen, lueckentexte }`.

**Geänderte Dateien:** `src/App.jsx`

---

## 18. `2f81e06` – feat: Umbenennung HUE-Generator → Aufgabolino
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

App umbenannt:

- `index.html`: `<title>Aufgabolino</title>`, `<meta name="description">`, `lang="de"`
- `src/App.jsx`: H1 „Aufgabolino", Untertitel „KI-Hausübungen für die Mittelschule"
- `README.md`: Vollständig neu geschrieben (war Vite-Template-Default)

**Geänderte Dateien:** `index.html`, `src/App.jsx`, `README.md`

---

## 19. `1b142a5` – design: Wärmere Farbpalette – Bernstein primary, Teal secondary
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Farbpaletten-Tausch durchgeführt (Bernstein als Primary, Teal als Secondary):

- `--primary-*`: Bernstein-Töne (`#D97706` als 500)
- `--secondary-*`: Teal-Töne (`#2D7D7B` als 500)
- `--bg`: Warm Cream `#FAF8F3`
- Alle RGBA-Schatten-Werte von Teal `rgba(45,125,123,...)` auf Bernstein `rgba(217,119,6,...)` umgestellt
- Dekorationselemente (Lesetext-Rand, Lückentext-Unterstrich, Outline-Buttons) bleiben Teal

**Geänderte Dateien:** `src/index.css`, `src/App.css`, `src/pages/HuePage.css`, `src/pages/LoginPage.css`, `src/Dashboard.css`

---

## 20. `b5ba289` – design: Dashboard-Button-Abstand fixen – Flexbox-Header
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Header-Layout auf Lehrer-Hauptseite korrigiert:

- `.header`: Flexbox mit `justify-content: space-between`
- `.header-mitte`: `flex: 1; text-align: center` – Textblock zentriert
- `.dashboard-link`: `flex-shrink: 0` – Button klebt rechts oben
- Mobile (≤480px): `flex-wrap: wrap`, Header-Mitte nimmt volle Breite

**Geänderte Dateien:** `src/App.jsx`, `src/App.css`

---

## 21. `6c62a73` – feat: HÜ-Länge wählbar (kurz/mittel/lang)
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Neues Formularfeld „Umfang" und Edge Function angepasst:

- **Frontend:** Dropdown `kurz / mittel / lang`, State `umfang` (default: 'mittel'), wird im Fetch-Body mitgeschickt
- **Edge Function:** `umfang`-Parameter eingelesen, `anzahlMap` mit Aufgaben-Counts:
  - kurz: 2 MC + 1 LT (~3 gesamt)
  - mittel: 3 MC + 2 LT (~5 gesamt, backward-compatible Default)
  - lang: 5 MC + 3 LT (~8 gesamt)
- `typAnweisung` nutzt dynamische Zählwerte aus `anzahlMap`

**Geänderte Dateien:** `src/App.jsx`, `src/App.css`, `supabase/functions/generiere-hue/index.ts`

---

## 22. `6e00749` – feat: Thema-Eingabe als auto-wachsende Textarea
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Neue Komponente `AutoGrowTextarea` erstellt:

- Textarea wächst automatisch mit dem Inhalt (via `scrollHeight` in `useEffect`)
- `rows={1}` als Startgröße, `max-height` bei ca. 8 Zeilen
- Strg+Enter (oder Cmd+Enter) submitter das Formular via `requestSubmit()` (Fallback: `form.submit()` für Safari <16)
- Ersetzt `<input type="text">` im Thema-Feld in App.jsx

**Geänderte Dateien:** `src/components/AutoGrowTextarea.jsx` (neu), `src/App.jsx`, `src/App.css`

---

## 23. `87203ae` – feat: Editierbare Lehrer-Vorschau vor Link-Freischaltung
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Neuer Schritt im Lehrer-Flow: editierbare Vorschau vor Schüler-Link-Freischaltung:

- **`VorschauEditor`-Komponente** (neu): Zeigt generierten Lesetext, MC-Fragen und Lückentexte als bearbeitbare Felder. Lehrer kann alles anpassen.
  - Lesetext: Textarea
  - MC-Fragen: Fragetext + 4 Antwort-Inputs + Radio-Button für korrekte Antwort
  - Lückentexte: Satz-Input + Antwort-Input
  - Speichern: `supabase.update({ aufgaben_json: bearbeitet }).eq('id', ergebnis.id)`, Guard gegen Doppel-Submit
- **App.jsx-UX-Flow:**
  - `ergebnis && !istGespeichert` → VorschauEditor
  - `ergebnis && istGespeichert` → Read-only-Vorschau + Schüler-Link + QR-Code
  - `onGespeichert`-Callback aktualisiert `ergebnis`-State und setzt `istGespeichert = true`

**Geänderte Dateien:** `src/components/VorschauEditor.jsx` (neu), `src/components/VorschauEditor.css` (neu), `src/App.jsx`

---

## 24. `4ba8841` – fix: Review-Findings beheben
**Datum:** 12.04.2026  
**Branch:** `feature/aufgabolino-v2`  
**Co-Autor:** Claude Sonnet 4.6

Drei Findings aus Code-Review behoben:

- **AutoGrowTextarea:** `requestSubmit()`-Fallback auf `form.submit()` für Safari <16 (`typeof form.requestSubmit === 'function'` Check)
- **VorschauEditor:** Guard `if (speichert || gespeichert) return` gegen Doppel-Submit
- **App.jsx:** Button-Label „HUE generieren" → „Hausübung generieren"

**Geänderte Dateien:** `src/components/AutoGrowTextarea.jsx`, `src/components/VorschauEditor.jsx`, `src/App.jsx`

---

## Projektstand nach letztem Commit (12.04.2026)

| Feature | Status |
|---|---|
| Eingabeformular (Fach + Thema + Aufgabentyp) | fertig |
| Anthropic Edge Function mit tool_use | fertig |
| Multiple-Choice-Auswertung | fertig |
| Lückentext-Aufgaben | fertig |
| Schülernummer-Eingabe | fertig |
| Ergebnisse in Supabase speichern | fertig |
| Lehrer-Dashboard mit Filter + Fach-Badges | fertig |
| Clientseitiges Routing (React Router) | fertig |
| Vercel-Konfiguration | fertig |
| Authentifizierung (Dashboard, Magic Link) | fertig |
| QR-Code für Schüler-Zugang + PNG-Download | fertig |
| HÜ persistent speichern und per Link teilen | fertig |
| Vollständiges Design-System (Aufgabolino-Brand) | fertig |
| Skeleton Loading (HuePage) | fertig |
| Umfang wählbar (kurz/mittel/lang) | fertig |
| Auto-wachsende Textarea (Thema-Eingabe) | fertig |
| Editierbare Lehrer-Vorschau (VorschauEditor) | fertig |
| Branch feature/aufgabolino-v2 gepusht | **noch offen** |
