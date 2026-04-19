# Aufgabolino Design System · Memphis-Collage

Dieses Dokument ist die verbindliche Design-Referenz für Aufgabolino. Alle neuen UI-Arbeiten orientieren sich daran. Referenz-HTML: `aufgabolino-moodboard-1-memphis.html`.

---

## Konzept in einem Satz

**Warmes, literarisches Lernprodukt für österreichische Mittelschüler – mit verspielten geometrischen Elementen, die Charakter geben, ohne laut zu werden.**

## Was es NICHT ist
- Kein Duolingo-Klon (keine Herzen, keine Streak-Flammen als Kern-UI)
- Kein Schulheft-Retro (keine harten Cobalt-Borders mehr)
- Kein Neobrutalist (keine brutalen Offset-Shadows)
- Kein AI-Slop (keine lila Gradients, kein Inter, kein Space-Grotesk-Default)
- Kein Comic (keine bunten Illustrationen, keine Emojis als Deko)

## DNA
- **Italic-Display-Typo** als Signatur-Element (Fraunces)
- **Warme, erdige Palette** mit Cream als Grundton – niemals reinweißer Hintergrund
- **Runde dekorative Formen** am Bildrand, bewusst asymmetrisch, nie zentriert
- **Kartendesign ohne harte Kontraste** – Elevation durch weiche Schatten, nicht durch Borders
- **Belohnung durch Sprache, nicht durch Animation** – "2 richtig in Folge" statt 🔥-Explosion

---

## Design-Tokens (CSS Custom Properties)

```css
:root {
  /* Farben – Grundpalette */
  --cream: #F4EADA;          /* Grundton / Background */
  --paper: #FBF5E8;          /* Leicht hellere Variante */
  --surface: #FFFFFF;        /* Karten, Options */
  --ink: #2B2118;            /* Haupt-Textfarbe */
  --ink-soft: #5A4A3D;       /* Sekundär-Text */

  /* Akzent-Palette */
  --terracotta: #D2691E;     /* Primäre Aktion, Markierung */
  --olive: #556B2F;          /* Richtig, Bestätigung */
  --plum: #4A3444;           /* Headlines, Kontrast */
  --rose: #E8A5A5;           /* Dekoratives Element */
  --sky: #7BA7BC;            /* Info, sekundäre Akzente */
  --butter: #F2CE72;         /* Highlight, Tag-Background */
  --coral: #C85250;          /* Falsch, Fehler */

  /* Fach-Farben (ersetzen die alten Pill-Badges) */
  --subject-deutsch: #D2691E;      /* Terracotta */
  --subject-mathematik: #7BA7BC;   /* Sky */
  --subject-englisch: #556B2F;     /* Olive */
  --subject-geschichte: #4A3444;   /* Plum */
  --subject-biologie: #6B8E4E;     /* Muted-Olive */

  /* Typografie */
  --font-display: 'Fraunces', 'Instrument Serif', Georgia, serif;
  --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'DM Mono', 'JetBrains Mono', monospace;

  /* Radien */
  --r-sm: 8px;
  --r-md: 16px;
  --r-lg: 24px;
  --r-xl: 32px;
  --r-full: 9999px;

  /* Schatten – weich, nie hart */
  --shadow-sm: 0 2px 4px rgba(43,33,24,0.04);
  --shadow-md: 0 4px 12px rgba(43,33,24,0.08);
  --shadow-lg: 0 20px 60px rgba(43,33,24,0.12);
  --shadow-card: 0 2px 4px rgba(43,33,24,0.04), 0 20px 60px rgba(43,33,24,0.08);

  /* Transitions */
  --t-quick: 150ms cubic-bezier(.4,0,.2,1);
  --t-smooth: 300ms cubic-bezier(.4,0,.2,1);
}
```

---

## Typografie-System

### Schrift-Stack
- **Display / Headlines:** Fraunces (variable, Italic-Axes nutzen!)
- **Body / UI:** DM Sans (variable)
- **Mono / Labels:** DM Mono (optional, nur für Nummern/IDs/Kleinkram)

### Fraunces verwenden
Fraunces ist eine charakterstarke variable Serif mit Optical-Size- und Soft-Axes. Sie ist das Signatur-Element. Richtlinien:

- **Display-Headlines (Question-Text, Hero):** Fraunces 400, opsz:144, leicht italic (falls stilistisch passend), letter-spacing:-0.01em, line-height:1.25-1.3
- **Page-Titles:** Fraunces 500-600, oft italic, 28-36px
- **Section-Labels:** Fraunces Italic 400, 13-14px, uppercase, letter-spacing:0.15em
- **Accent-Numbers** (Fortschritt, Aufgaben-Nummer): Fraunces 300, Italic, groß (48-64px), letter-spacing:-0.03em
- **Body in Fraunces** nur für kurze, wichtige Texte – nie für längere UI-Texte

### DM Sans für Body
- **UI-Text, Buttons, Inputs:** DM Sans 400-500, 15-16px, line-height:1.5
- **Secondary-Text:** DM Sans 400, 13-14px, color:var(--ink-soft)

### Größen-Skala
```
xs:   11px  (Tags, Meta)
sm:   13px  (Secondary, Hints)
base: 16px  (Body-Default)
lg:   18px  (Emphasis Body)
xl:   22px  (Small Headline)
2xl:  28px  (Question Text)
3xl:  36px  (Page Title)
4xl:  48px  (Hero)
5xl:  64px  (Display Number)
```

---

## Komponenten-Bibliothek

### Karten (Card)
```
background: var(--surface) ODER var(--paper)
border-radius: var(--r-lg)  (24px)
padding: 24-32px
box-shadow: var(--shadow-card)
border: KEINE – Elevation kommt nur durch Schatten
```

Optional: Dekorative Form **außerhalb** der Karte, die leicht hinter die Karte greift, um visuelles Interesse zu schaffen.

### Option-Buttons (für MC, Wahr/Falsch, Zuordnung)
```
background: var(--surface)
border: 1.5px solid transparent
border-radius: var(--r-md)  (16px)
padding: 16px 20px
font: DM Sans 500, 16px
color: var(--ink)

Marker (links, Buchstabe A/B/C/D):
  width/height: 32px
  border-radius: 50%
  background: var(--cream)
  color: var(--plum)
  font: Fraunces Italic 600, 15px

Hover:
  border-color: var(--terracotta)
  transform: translateX(4px)
  transition: var(--t-quick)

Selected:
  border-color: var(--olive)
  background: #F9F3E5  (leicht getönt)
  marker-background: var(--olive)
  marker-color: var(--cream)

Correct (nach Abgabe):
  border-color: var(--olive)
  background: #EDF0DF
  checkmark rechts: var(--olive), ohne Kreis

Incorrect (nach Abgabe):
  border-color: var(--coral)
  background: #FAEBE7
  x-marker rechts: var(--coral)
```

### Primärer Button (CTA)
```
background: var(--plum)
color: var(--cream)
border: none
border-radius: var(--r-md)  (16px)
padding: 18px 24px
font: Fraunces 500, 18px (slight italic optional)
width: 100% (fullwidth in Formularen)
nachgestellter Pfeil " →" im Italic

Hover:
  background: var(--terracotta)
  transform: translateY(-2px)
  transition: var(--t-quick)

Active:
  transform: translateY(0)
```

### Sekundärer Button
```
background: transparent
color: var(--plum)
border: 1.5px solid var(--plum)
border-radius: var(--r-md)
padding: 14px 20px
font: DM Sans 600, 15px

Hover:
  background: var(--plum)
  color: var(--cream)
```

### Input / Textarea
```
background: var(--surface)
border: 1.5px solid rgba(43,33,24,0.12)
border-radius: var(--r-md)
padding: 14px 16px
font: DM Sans 500, 16px
color: var(--ink)

Focus:
  border-color: var(--terracotta)
  outline: 3px solid rgba(210,105,30,0.15)
  outline-offset: 0

Label darüber:
  font: Fraunces Italic 500, 13px
  color: var(--olive)
  letter-spacing: 0.15em
  text-transform: uppercase
  margin-bottom: 8px
```

### Fach-Badges / Tags
```
display: inline-block
background: var(--butter) (oder entsprechende Fach-Farbe mit Alpha 0.2)
color: var(--plum)
font: Fraunces Italic 500, 14px
padding: 4px 12px
border-radius: var(--r-full)
```

### Subject-Line (Kontext-Label über Überschrift)
```
font: Fraunces Italic 500, 13px
letter-spacing: 0.15em
text-transform: uppercase
color: var(--olive)
```

### Progress-Indikator (Schüler)
Keine Progressbar – stattdessen **Dot-Row**:
```
5 Punkte, je 8px, gap:6px
done: background var(--olive)
active: background var(--terracotta), transform: scale(1.4)
upcoming: background rgba(43,33,24,0.15)
```

### Logo
```
font: Fraunces 600 Italic, 22px
color: var(--plum)
letter-spacing: -0.02em

Vorangestellt:
  ✱ (sechsstrahliger Stern)
  color: var(--terracotta)
  non-italic
  margin-right: 6px
```

---

## Dekorative Formen (optional, kontextabhängig)

Geometrische Formen außerhalb der Hauptfläche, pro Seite max. 3-4 Formen. Sparsam einsetzen.

Beispiele (alle absolut positioniert, pointer-events:none):
- Großer Kreis (120px) in `--butter`, opacity 0.5, am Rand halb rausragend
- Kleineres Quadrat (60px, leicht rotiert 12deg), `--rose`
- Offener Kreis (3px Border, 80px), `--terracotta`
- Kleine Raute (40px, rotated 45deg), `--sky`

### Regeln:
- **Lehrer-Ansicht:** Maximal 1-2 Formen, kleiner, niedrigere Opacity (0.3-0.4)
- **Schüler-Ansicht:** 3-4 Formen, bis zu 0.7 Opacity
- Formen dürfen nie über wichtigen UI-Elementen liegen
- Keine Formen auf Inputs, Buttons oder Options

---

## Hintergründe

### Haupt-Background
```css
background: var(--cream);
background-image:
  radial-gradient(circle at 20% 15%, rgba(210,105,30,0.08), transparent 40%),
  radial-gradient(circle at 85% 70%, rgba(123,167,188,0.1), transparent 40%);
```

Zwei subtile Radial-Gradients erzeugen atmosphärische Wärme, ohne aufdringlich zu wirken.

### Kein Grain-Overlay
Bewusster Verzicht auf Paper-Grain – das gehört zum Risograph-Stil, nicht zu Memphis-Collage.

### Optional: Papierlinien auf Arbeitsoberflächen
Auf dem Generierungs-Formular (Lehrer) kann dezent eine Papierstruktur mit `repeating-linear-gradient` angedeutet werden – aber sehr leise (opacity 0.04).

---

## Feedback-Patterns

### Richtige Antwort
- Option wird olive umrandet, background leicht olive-getönt
- Checkmark rechts in Option, ohne Animation
- Begleittext: "Richtig." in Fraunces Italic
- Erklärung erscheint darunter in DM Sans

### Falsche Antwort
- Gewählte Option: coral umrandet, background leicht coral-getönt
- Korrekte Option wird zusätzlich olive markiert
- Begleittext: "Nicht ganz." in Fraunces Italic
- Erklärung erscheint darunter

### Belohnungssprache (statt Animation)
- "Gute Antwort." / "Genau richtig." / "2 richtig in Folge."
- Fraunces Italic, klein, color: var(--olive)
- Keine Konfetti, keine bouncing Elements
- Maximal eine sanfte Scale-Animation (scale 1 → 1.03 → 1) beim Korrekt-Feedback

---

## Motion-System

Zurückhaltend. Bewegung nur wo sie Bedeutung trägt.

### Erlaubte Animationen:
- **Hover-Transitions** auf Options und Buttons (150ms ease)
- **Page-Load-Reveal** mit gestaffelten fade-in-up (20ms Versatz zwischen Elementen, max 500ms Gesamtdauer)
- **Feedback-Scale** nach Korrekt (1 → 1.03 → 1, 400ms)

### Verboten:
- Blobs im Hintergrund animieren (gehört zu Soft Arcade, nicht hier)
- Confetti, Partikel, Exploding-Elements
- Dauerhaft laufende Animationen (drehende Sterne etc.)
- Bouncing-Buttons

---

## Lehrer-Ansicht – "Gleicher Stil, ruhiger"

### Unterschiede zur Schüler-Ansicht:
- **Formen:** Max 2 Formen, Opacity 0.3-0.4
- **Farben:** Terrakotta und Olive dominieren, weniger Rose/Butter
- **Fraunces-Nutzung:** Display-Größen bleiben, aber weniger Italic-Einsatz
- **Dichte:** Höher – mehr Info pro Screen, kompaktere Karten (16-20px Padding statt 24-32px)
- **Mono-Font:** Mehr Einsatz für technische Details (IDs, Counts, Datumsangaben)
- **Kein Progress-Dot-Row:** Lehrer haben keinen Fortschritt
- **Dashboard-Karten:** Gleiches Card-Prinzip (weich, rund, weißer Surface auf Cream), aber Listen-artig

### Beispiele Lehrer-UI:
- Generierungsformular: Cream-Background, eine große weiße Karte in der Mitte, darin die Form-Felder
- Dashboard: Liste von HÜs als Karten (weiß, rounded-lg), dünne Trennlinien in rgba(43,33,24,0.08)
- Filter: Pill-Buttons mit Italic-Labels

---

## Dos und Don'ts

### DO:
- Italic-Fraunces mutig einsetzen, besonders für Zahlen und Sub-Labels
- Cream als Grundton konsequent durchziehen
- Weiche Schatten für Elevation
- Dekorative Formen asymmetrisch, nie zentriert
- Deutsch-Texte mit Liebe setzen (keine abgeschnittenen Placeholder mehr)
- Fach-Farben konsistent durch Cards, Badges und Akzente
- Whitespace großzügig

### DON'T:
- Harte schwarze Borders setzen
- Reinweiße Backgrounds verwenden
- Inter / Roboto / Space Grotesk als Default
- Offset-Shadow wie in Neobrutalism
- Emojis als UI-Deko (nur situativ, z.B. in Lehrer-Text)
- Gradients über ganze Flächen (nur als subtile Radial im Hintergrund)
- Animationen die nur der Animation wegen existieren
- Zu viele Formen auf einer Seite (max 4 Schüler, max 2 Lehrer)

---

## Referenzen & Inspiration

- Moodboard: `aufgabolino-moodboard-1-memphis.html`
- Ähnliche Produkte: Ableton (Warmth), Readymag (Typografie), Are.na (Zurückhaltung)
- Fonts: Fraunces (Google Fonts), DM Sans, DM Mono
- Farbpalette-Referenzen: Ettore Sottsass (gedämpft), vintage italienische Schulbücher der 70er

---

## Versionierung

**v1.0** · 19. April 2026 · Initial nach Moodboard-Auswahl (Memphis-Collage)
