# Aufgabolino Design-Migration · Claude Code Prompts

Dieses Dokument enthält drei separate Prompts für die schrittweise Migration von "90er Schulheft" zu "Memphis-Collage". Jede Stufe wird separat ausgeführt, committed, gepusht, gemergt und live getestet.

## Vorbereitung (einmalig)

Bevor du mit Stufe 1 startest, leg die Design-System-Referenz im Projekt ab. In der Konsole im Projektverzeichnis:

```bash
mkdir -p .claude/design
# Kopier die Datei AUFGABOLINO-DESIGN-SYSTEM.md da rein
# (manuell oder mit: cp ~/Downloads/AUFGABOLINO-DESIGN-SYSTEM.md .claude/design/)
```

Dann committen:
```bash
git add .claude/design/AUFGABOLINO-DESIGN-SYSTEM.md
git commit -m "docs: Design-System-Spec für Memphis-Collage-Migration"
git push
```

Jetzt hat Claude Code eine feste Referenz, auf die du in jedem Prompt verweisen kannst.

---

## STUFE 1 · Tokens + Schrift + Hintergrund

Ziel: Das Fundament wechseln, ohne Komponenten umzubauen. Nach dieser Stufe sieht die App anders aus, aber alle Komponenten funktionieren noch.

### Prompt für Claude Code:

```
Design-Migration Stufe 1: Tokens, Schrift, Hintergrund. 

Erstell einen neuen Branch `design/memphis-migration-tokens` von `main`.

WICHTIG: Lies zuerst KOMPLETT:
1. .claude/design/AUFGABOLINO-DESIGN-SYSTEM.md
2. /mnt/skills/public/frontend-design/SKILL.md (falls verfügbar, sonst überspringen)

Dann setz die neue Design-Grundlage um. KEINE Komponenten-Umbauten in dieser 
Stufe – nur Farben, Schrift und Hintergrund wechseln.

## Aufgaben

### 1. Google Fonts einbinden
In index.html die alten Google-Font-Imports (Bricolage Grotesque, Figtree, 
JetBrains Mono) durch diese ersetzen:

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">

### 2. CSS-Variablen komplett ersetzen
In src/index.css (oder wo auch immer die :root-Variablen liegen) die alten 
Tokens (--ink #1A3480, --hot #E11D74, --sun, --paper #FDF6E3, --lime) 
komplett ersetzen durch die Token-Definition aus dem Design-System-Dokument.

KEINE alten Variablen lassen – wenn irgendwo noch --hot oder --lime 
referenziert wird, muss das durch die neue Zuordnung ersetzt werden:
- --ink (altes Cobalt) → --plum für Headlines, --terracotta für primäre Aktion
- --hot (Magenta) → --terracotta
- --sun (Gelb) → --butter
- --paper → --cream (neuer Wert #F4EADA)
- --lime → --olive

Mach einen projektweiten `grep -r "var(--hot)"` etc. und ersetz alle 
Vorkommen sinnvoll basierend auf Kontext:
- "Primary CTA"-Kontexte: var(--terracotta) oder var(--plum)
- "Success/Richtig"-Kontexte: var(--olive)
- "Error/Falsch"-Kontexte: var(--coral)
- "Decoration/Highlight"-Kontexte: var(--butter)

### 3. Font-Defaults ersetzen
- Alle Vorkommen von 'Bricolage Grotesque' → 'Fraunces'
- Alle Vorkommen von 'Figtree' → 'DM Sans'
- Alle Vorkommen von 'JetBrains Mono' → 'DM Mono'
- font-family der Bodies: --font-body (DM Sans)
- font-family der Headings: --font-display (Fraunces)

### 4. Hintergrund umstellen
Body-Background setzen auf Cream mit den zwei Radial-Gradients aus dem 
Design-System-Dokument. Grain-Overlay (falls vorhanden) ENTFERNEN – 
gehört zum Risograph-Stil, nicht zu Memphis-Collage.

### 5. Alle harten Cobalt-Borders und Offset-Shadows entfernen
Grep im Projekt nach:
- `border: 2px solid` / `border: 3px solid` mit Cobalt-Ink
- `box-shadow:` mit harten Offset-Werten (z.B. "5px 5px 0" oder "8px 8px 0")

Ersetzen durch:
- Borders: `border: 1.5px solid transparent` (Default) oder `border: 1.5px solid rgba(43,33,24,0.12)` (Inputs)
- Shadows: var(--shadow-card) aus dem neuen System

Das Design wird sich jetzt deutlich verändern – Komponenten werden erstmal 
"nackter" aussehen ohne harte Borders. Das ist gewollt. Feinschliff kommt 
in Stufe 3.

### 6. NICHT anfassen in dieser Stufe
- Komponenten-Struktur (VorschauEditor, Generierungsformular etc. bleiben funktional gleich)
- Option-Button-Verhalten
- Routing, Supabase-Logic
- Logo-SVG (kommt später)
- Dekorative Formen / Shapes (kommen in Stufe 3)

### 7. Testen
Nach den Änderungen:
- npm run dev
- Mach Screenshots von:
  1. Login-Seite
  2. Generierungsformular (Lehrer)
  3. Dashboard
  4. Schüler-Lösungsansicht einer MC-Aufgabe
  5. VorschauEditor
- Gib mir die Screenshots im Chat als Output (base64 in /tmp), damit ich 
  den Zwischenstand beurteilen kann

### 8. Commit
Eine sauberer Commit: "refactor(design): Memphis-Collage Tokens, Schrift, 
Hintergrund – Stufe 1/3"

### 9. Deploy
- git push origin design/memphis-migration-tokens
- Erstell PR auf GitHub (mit `gh pr create` falls verfügbar, sonst gib mir 
  den Link zum Erstellen)
- Warte auf mein OK bevor du mergst

Los geht's. Start mit Schritt 1.
```

### Nach Stufe 1: Du testest live

1. PR mergen → Vercel deployt automatisch (~2 Min)
2. Öffne `hue-generator.vercel.app` und geh alle Screens durch
3. Prüf ob:
   - Der Cream-Background überall ist (nicht mehr #FDF6E3-gelblich)
   - Fraunces als Headline-Schrift erkennbar ist
   - Keine harten dunklen Borders mehr
   - Keine brutalen Offset-Shadows mehr
4. Wenn es hässlich wirkt: Das ist jetzt OK – Stufe 2 und 3 bringen das Design zurück zur Qualität.

---

## STUFE 2 · Komponenten neu aufbauen

Ziel: Alle interaktiven Komponenten auf den neuen Stil bringen – Buttons, Options, Inputs, Karten.

### Prompt für Claude Code:

```
Design-Migration Stufe 2: Komponenten. Branch main ist jetzt auf dem Stand 
von Stufe 1 (Tokens + Schrift gewechselt).

Erstell neuen Branch `design/memphis-migration-components` von `main`.

WICHTIG: 
- Lies .claude/design/AUFGABOLINO-DESIGN-SYSTEM.md nochmal komplett durch
- Die Komponenten-Spezifikationen dort sind verbindlich

## Aufgaben

### 1. Option-Buttons neu stylen
Betroffen: Multiple-Choice-Optionen in Schüler-View UND Lehrer-Vorschau.

Neue Spezifikation (aus Design-System):
- Background: var(--surface)
- Border: 1.5px solid transparent (im Default-State)
- Border-radius: var(--r-md) (16px)
- Padding: 16px 20px
- Font: DM Sans 500, 16px
- Marker (Buchstabe A/B/C/D links):
  • 32px x 32px, border-radius: 50%
  • Background: var(--cream)
  • Font: Fraunces Italic 600, 15px, color: var(--plum)
- Hover: border-color: var(--terracotta), transform: translateX(4px)
- Selected: border-color: var(--olive), background: #F9F3E5, marker wird olive mit cream text
- Correct (post-submit): border-olive, bg #EDF0DF, checkmark rechts in olive (kein Kreis)
- Incorrect (post-submit): border-coral (#C85250), bg leicht coral-getönt

### 2. Primary-Button (submit / weiter)
Alle Primary-Buttons (Submit-Forms, "Weiter", "HÜ generieren", "Prüfen"):
- Background: var(--plum)
- Color: var(--cream)
- Border: none
- Border-radius: var(--r-md)
- Padding: 18px 24px
- Font: Fraunces 500, 18px (leichte Italic möglich bei "Weiter")
- Width: 100% in Formularen
- Pfeil " →" am Ende (optional, nur bei "Weiter"/"Los")
- Hover: background var(--terracotta), translateY(-2px)

### 3. Secondary-Button
Alle sekundären Actions ("Abbrechen", "Zurück", "Neu generieren"):
- Background: transparent
- Color: var(--plum)
- Border: 1.5px solid var(--plum)
- Border-radius: var(--r-md)
- Padding: 14px 20px
- Font: DM Sans 600, 15px
- Hover: background var(--plum), color var(--cream)

### 4. Inputs + Textareas
Alle Input-Felder (Thema, Fokus, Klasse, Katalognummer):
- Background: var(--surface)
- Border: 1.5px solid rgba(43,33,24,0.12)
- Border-radius: var(--r-md)
- Padding: 14px 16px
- Font: DM Sans 500, 16px
- Color: var(--ink)
- Focus: border-color var(--terracotta), outline: 3px solid rgba(210,105,30,0.15)

Labels über Inputs:
- Font: Fraunces Italic 500, 13px
- Color: var(--olive)
- Letter-spacing: 0.15em
- Text-transform: uppercase
- Margin-bottom: 8px

### 5. Karten / Cards
Alle Card-artigen Container (Vorschau-Card, Dashboard-Entry, Login-Card):
- Background: var(--surface) oder var(--paper)
- Border-radius: var(--r-lg) (24px)
- Padding: 24-32px (bei Lehrer kompakter: 16-20px)
- Box-shadow: var(--shadow-card)
- KEINE Borders
- KEINE harten Offset-Shadows

### 6. Fach-Badges
Die bestehenden Pill-Badges für Fächer auf neue Logik umstellen:
- Deutsch: bg var(--butter) mit color var(--plum)
- Mathematik: bg rgba(123,167,188,0.2) mit color var(--sky) – oder direkt var(--sky) Text auf butter
- Englisch: bg rgba(85,107,47,0.15) mit color var(--olive)
- Font: Fraunces Italic 500, 14px
- Padding: 4px 12px
- Border-radius: var(--r-full)

### 7. Subject-Line (Kontext über Überschrift)
Auf der Schüler-View z.B. "DEUTSCH · UNREGELMÄSSIGE VERBEN":
- Font: Fraunces Italic 500, 13px
- Letter-spacing: 0.15em
- Text-transform: uppercase
- Color: var(--olive)

### 8. Progress-Indikator
Wenn es eine Progressbar für die Schüler-Lösung gibt: ERSETZE sie durch 
Dot-Row (siehe Design-System). Falls noch nicht vorhanden: add it.
- Row of Dots (je 8px, gap 6px)
- done: var(--olive), active: var(--terracotta) + scale(1.4), upcoming: rgba(43,33,24,0.15)

### 9. Logo
Logo "Aufgabolino" in Header neu stylen:
- Font: Fraunces 600 Italic, 22px
- Color: var(--plum)
- Letter-spacing: -0.02em
- Davor: ✱ (sechsstrahliger Unicode-Stern U+2731) in var(--terracotta), non-italic, margin-right: 6px

### 10. Feedback-Texte
Feedback-Meldungen nach Abgabe:
- "Richtig." / "Genau richtig." / "Gute Antwort." in Fraunces Italic 500, 18px, color var(--olive)
- "Nicht ganz." / "Noch nicht." in Fraunces Italic 500, 18px, color var(--coral)
- Erklärungstext danach: DM Sans 400, 15px, color var(--ink-soft)

KEINE Konfetti-Animationen mehr. Falls welche da sind: entfernen.
Eine sanfte Scale-Animation beim Korrekt-Feedback ist erlaubt (scale 1 → 1.03 → 1, 400ms).

### 11. NICHT anfassen
- Dekorative Formen / Shapes (Stufe 3)
- Logik, Routing, Supabase
- Page-Layouts / Wireframe (nur Component-Styling)

### 12. Testen & Screenshots
Wie Stufe 1: npm run dev, Screenshots von allen Hauptscreens. Gib die 
Screenshots aus.

### 13. Commit + Deploy
Commit: "refactor(design): Komponenten auf Memphis-Stil – Stufe 2/3"
Push + PR, warte auf mein OK vor Merge.

Los geht's. Eins nach dem anderen.
```

### Nach Stufe 2: Du testest live

Jetzt sollte alles schon deutlich charakterstärker wirken. Prüf besonders:
- Options auf der Schüler-View (MC): Fühlen sie sich richtig an?
- Hover-States: Gleitet das Translate:X ordentlich?
- Selected vs Correct State: Klar unterscheidbar?
- Labels mit Italic-Fraunces: Wirken sie edler als vorher?

---

## STUFE 3 · Dekorative Formen + Feinschliff + Micro-Motion

Ziel: Charakter und Atmosphäre hinzufügen. Das ist die Stufe, die das Design einzigartig macht.

### Prompt für Claude Code:

```
Design-Migration Stufe 3 (letzte): Dekorative Formen, Feinschliff, Motion.

Erstell neuen Branch `design/memphis-migration-polish` von `main`.

Lies nochmal das Design-System. Der Abschnitt "Dekorative Formen" ist jetzt 
das Hauptthema.

## Aufgaben

### 1. Dekorative Formen pro Screen
Füg auf jedem Haupt-Screen 2-4 dekorative Formen hinzu (siehe Design-System: 
Kreise, Quadrate, offene Kreise, Rauten in verschiedenen Farben).

Regeln:
- position: absolute, pointer-events: none, z-index: 0
- Asymmetrische Platzierung (nie zentriert, oft halb am Rand rausragend)
- Bei Lehrer: max 2 Formen, opacity 0.3-0.4, kleiner
- Bei Schüler: 3-4 Formen, opacity bis 0.7
- Formen dürfen nie über Buttons, Options, Inputs liegen

Pro Screen unterschiedliche Kombinationen – nicht überall dieselben 4 Formen 
rauskopieren. Referenz: aufgabolino-moodboard-1-memphis.html

### 2. Entry-Animationen (Page-Load-Reveal)
Auf Schüler-Lösungsansicht:
- Question-Header fadet hoch (translateY(8px) → 0, opacity 0 → 1, 400ms)
- Options erscheinen gestaffelt (je 60ms Delay dazwischen, selbe Animation)
- Submit-Button fadet zuletzt ein (nach Options)

Gesamte Load-Animation: max 500ms. Keep it quick.

Auf Lehrer-Dashboard:
- Cards in der Liste fadet gestaffelt ein (je 40ms Delay)

### 3. Feedback-Animation (nach Antwort)
Wenn die richtige Antwort enthüllt wird:
- Correct-Option macht sanftes Scale-Pulse (scale 1 → 1.03 → 1, 400ms cubic-bezier(.4,0,.2,1))
- Feedback-Text ("Richtig.") fadet ein mit leichtem translateY

### 4. Hover-Polish
Options haben bereits translateX(4px) im Hover (Stufe 2). Prüf:
- Transition sauber gesetzt (var(--t-quick) = 150ms)
- Buttons haben translateY(-2px) im Hover
- Inputs: Focus-Outline soft (3px rgba terracotta 0.15)

### 5. Logo-Stern animieren (optional)
Der ✱ im Logo kann beim Hover sanft rotieren (transform: rotate(90deg), 
400ms). Nur beim Logo-Hover, nicht ständig.

### 6. Micro-Details
- Scrollbar stylen (thin, in cream/terracotta)
- Selection-Color: background var(--butter), color var(--plum)
- Focus-Rings einheitlich auf alle interaktiven Elemente
- Disabled-States: opacity 0.5, cursor not-allowed

### 7. Leere States
Leere Dashboards, leere HÜ-Listen etc.:
- Große italic Fraunces-Headline "Noch nichts hier."
- Subtext in DM Sans, color ink-soft
- Illustration nur durch dekorative Formen, keine Icons/Bilder

### 8. Accessibility-Check
- Kontrast-Ratio für alle Text/Background-Kombinationen prüfen (WCAG AA min)
- Focus-Indikatoren sichtbar auf Tastatur-Navigation
- prefers-reduced-motion: disable entry-animations und feedback-scale

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 9. Final-Screenshots
Wie immer: alle Haupt-Screens screenshotten und zeigen.

### 10. Commit + Deploy
Commit: "feat(design): Formen, Motion, Feinschliff – Stufe 3/3 abgeschlossen"
Push + PR. Nach Merge ist die Migration durch.

Nach dem Merge: README.md updaten mit kurzem Hinweis auf das neue Design.

Los geht's.
```

### Nach Stufe 3: Endgültiger Live-Test

Jetzt ist das Design komplett migriert. Du testest:
- Macht es mir als Lehrer Freude das zu benutzen?
- Würde ein Fünftklässler das gerne öffnen?
- Wo hakt noch was?
- Kleinere Fixes jetzt als normale Bug-Commits auf main.

---

## Checkliste für dich

### Vor Stufe 1
- [ ] Teil A (Prompt-Qualität + Schwierigkeit) ist live und getestet
- [ ] AUFGABOLINO-DESIGN-SYSTEM.md liegt in `.claude/design/` im Projekt
- [ ] Die Datei ist gepusht auf main

### Nach Stufe 1
- [ ] Cream-Background sichtbar überall
- [ ] Fraunces ist als Headline-Font erkennbar
- [ ] Keine harten Cobalt-Borders mehr
- [ ] Keine brutalen Offset-Shadows mehr
- [ ] Design wirkt übergangsmäßig vielleicht nackt – OK, ist erwartet

### Nach Stufe 2
- [ ] Options haben Terracotta-Hover mit translateX
- [ ] Primary-Buttons in Plum mit Cream-Text, Italic-Fraunces
- [ ] Inputs haben Focus-Outline in Terracotta-transparent
- [ ] Fach-Badges sehen anders aus, nicht mehr blaue Pills
- [ ] Logo mit ✱-Stern vor Aufgabolino

### Nach Stufe 3
- [ ] Dekorative Formen subtil auf jedem Screen sichtbar
- [ ] Options-Ladeanimation beim ersten Öffnen
- [ ] Selection-Color im Text-Highlight stimmt
- [ ] prefers-reduced-motion respektiert

---

## Falls was schiefgeht

### "Das sieht jetzt schlimmer aus als vorher"
Normal nach Stufe 1. Stufe 2 + 3 bringen die Qualität zurück. Nicht abbrechen.

### "Claude Code hat zu viel geändert"
Reverte die problematischen Dateien mit `git checkout main -- path/to/file`, besprich mit mir was raus soll, neuer Durchgang.

### "Ich will wieder zurück zum alten Design"
Jede Stufe ist ein eigener Branch. Bis zum Merge kannst du einfach den PR schließen. Nach dem Merge: `git revert <commit-hash>` auf main.

### "Ich hätte Variante 3 (Soft Arcade) doch lieber gehabt"
Nach Stufe 1 ist Neurichtung möglich – die Tokens müssen nur andere Werte bekommen. Die Struktur bleibt.

---

## Version

v1.0 · 19. April 2026
