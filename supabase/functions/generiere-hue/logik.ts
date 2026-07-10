// Reine Logik der Edge Function – bewusst ohne Deno-/Netzwerk-Abhängigkeiten,
// damit sie mit `deno test` isoliert getestet werden kann.

export interface AufgabenJson {
  text?: string;
  fragen?: unknown[];
  lueckentexte?: unknown[];
  wahrfalsch?: unknown[];
  zuordnung?: unknown[];
}

export interface Abgabe {
  mcAntworten?: unknown[];
  ltAntworten?: unknown[];
  wfAntworten?: unknown[];
  zuAntworten?: unknown[];
}

// Fisher-Yates-Mischen (Math.random via sort wäre verzerrt)
export function mischen<T>(arr: T[]): T[] {
  const kopie = [...arr];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Klasse ("2a") und Katalognummer (1-40) validieren
export function klasseNummerGueltig(klasse: string, nummer: number): boolean {
  return /^\d[a-z]$/.test(klasse) && nummer >= 1 && nummer <= 40;
}

// Schüler-Ansicht der HÜ: alles was der Browser VOR der Abgabe sehen darf.
// Lösungen (korrekt-Index, Antworten, Wahrheitswerte, Paarungen) bleiben draußen.
export function hueOhneLoesungen(aufgaben: AufgabenJson) {
  const zuordnung = Array.isArray(aufgaben.zuordnung) ? aufgaben.zuordnung : [];
  return {
    text: aufgaben.text ?? '',
    fragen: (Array.isArray(aufgaben.fragen) ? aufgaben.fragen : []).map(
      (f) => {
        const frage = f as { frage?: string; antworten?: string[] };
        return { frage: frage.frage ?? '', antworten: frage.antworten ?? [] };
      }
    ),
    lueckentexte: (Array.isArray(aufgaben.lueckentexte) ? aufgaben.lueckentexte : []).map(
      (lt) => ({ satz: (lt as { satz?: string }).satz ?? '' })
    ),
    // Wahr/Falsch: nur die Aussagen, nicht die Wahrheitswerte
    wahrfalsch: (Array.isArray(aufgaben.wahrfalsch) ? aufgaben.wahrfalsch : []).map(
      (wf) => ({ aussage: (wf as { aussage?: string }).aussage ?? '' })
    ),
    // Zuordnung: Begriffe in Originalreihenfolge, Partner GEMISCHT –
    // die Reihenfolge darf die richtige Paarung nicht verraten
    zuordnung: zuordnung.length > 0
      ? {
          begriffe: zuordnung.map((p) => String((p as { begriff?: string })?.begriff ?? '')),
          partner: mischen(zuordnung.map((p) => String((p as { partner?: string })?.partner ?? ''))),
        }
      : null,
  };
}

// Schülerantworten serverseitig bewerten.
// MC: Index-Vergleich | Lückentext: case-insensitiv, Whitespace-trim, Umlaute strikt
// Wahr/Falsch: Boolean-Vergleich | Zuordnung: exakter Partner-Text (kommt aus unseren Optionen).
// Defensiv gegen unvollständige aufgaben_json (Lehrer kann sie frei editieren).
export function bewerteAbgabe(aufgaben: AufgabenJson, abgabe: Abgabe) {
  const fragen = Array.isArray(aufgaben.fragen) ? aufgaben.fragen : [];
  const lueckentexte = Array.isArray(aufgaben.lueckentexte) ? aufgaben.lueckentexte : [];
  const wahrfalsch = Array.isArray(aufgaben.wahrfalsch) ? aufgaben.wahrfalsch : [];
  const zuordnung = Array.isArray(aufgaben.zuordnung) ? aufgaben.zuordnung : [];

  const mcAntworten = Array.isArray(abgabe.mcAntworten) ? abgabe.mcAntworten : [];
  const ltAntworten = Array.isArray(abgabe.ltAntworten) ? abgabe.ltAntworten : [];
  const wfAntworten = Array.isArray(abgabe.wfAntworten) ? abgabe.wfAntworten : [];
  const zuAntworten = Array.isArray(abgabe.zuAntworten) ? abgabe.zuAntworten : [];

  const mcLoesungen = fragen.map((f) => (f as { korrekt?: number })?.korrekt ?? -1);
  const ltLoesungen = lueckentexte.map((lt) => String((lt as { antwort?: string })?.antwort ?? ''));
  const ltKorrekt = ltLoesungen.map(
    (antwort, i) =>
      String(ltAntworten[i] ?? '').trim().toLowerCase() === antwort.trim().toLowerCase()
  );
  const wfLoesungen = wahrfalsch.map((wf) => (wf as { wahr?: boolean })?.wahr === true);
  const zuLoesungen = zuordnung.map((p) => String((p as { partner?: string })?.partner ?? ''));
  const zuKorrekt = zuLoesungen.map(
    (partner, i) => String(zuAntworten[i] ?? '') === partner
  );

  const richtigMC = mcLoesungen.filter((korrekt, i) => mcAntworten[i] === korrekt).length;
  const richtigLT = ltKorrekt.filter(Boolean).length;
  const richtigWF = wfLoesungen.filter((wahr, i) => wfAntworten[i] === wahr).length;
  const richtigZU = zuKorrekt.filter(Boolean).length;

  const richtig = richtigMC + richtigLT + richtigWF + richtigZU;
  const gesamt = fragen.length + lueckentexte.length + wahrfalsch.length + zuordnung.length;
  const prozent = gesamt > 0 ? Math.round((richtig / gesamt) * 100) : 0;

  return {
    richtig, gesamt, prozent,
    mcLoesungen, ltLoesungen, ltKorrekt,
    wfLoesungen, zuLoesungen, zuKorrekt,
  };
}
