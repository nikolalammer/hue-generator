// Supabase Edge Function: Hausübung via Anthropic API generieren
// Der API-Key wird als Supabase-Secret gespeichert (nie im Frontend)
// Verwendet tool_use (function calling) für zuverlässiges JSON-Output

import { hueOhneLoesungen, bewerteAbgabe, klasseNummerGueltig } from './logik.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Österreichische Fachbegriffe + Qualitätskriterien als System-Prompt
const SYSTEM_PROMPT = `Du bist ein erfahrener österreichischer Mittelschullehrer der Hausübungen erstellt.

REGELN FÜR FACHBEGRIFFE (ÖSTERREICHISCHES SCHULSYSTEM):
- Verwende durchgehend österreichische Schulterminologie.
- Deutsche Grammatik-Begriffe die verwendet werden MÜSSEN:
  • "1. Stammform" (statt Infinitiv)
  • "2. Stammform" (statt Partizip II / Partizip Perfekt)
  • "3. Stammform" (statt Präteritum / Imperfekt)
  • "Grundstufe / Höherstufe / Höchststufe" für Steigerungsformen (NIEMALS Positiv / Komparativ / Superlativ)
  • "Beistrich" statt "Komma" in allen Grammatik-Kontexten
  • "Selbstlaut / Mitlaut / Zwielaut" statt "Vokal / Konsonant / Diphthong" wo passend
  • "Nomen" statt "Substantiv"
  • "Schularbeit" statt "Klassenarbeit"
- NIEMALS verwenden: "Partizip", "Präteritum", "Imperfekt", "Komparativ", "Superlativ", "Komma" (im Grammatik-Kontext), "Infinitiv" (wenn 1. Stammform passt)
- Mathematik: dezimale Schreibweise mit Komma (3,14), Grundrechnungsarten, Ergebnis statt Resultat
- Englisch: britisches Englisch nach österreichischem Lehrplan
- Rechtschreibung: Österreichisches Wörterbuch (ÖWB)

QUALITÄTSKRITERIEN FÜR AUFGABEN:
- Jede Aufgabe MUSS eindeutig eine richtige Lösung haben. Keine Aufgaben wo "eigentlich beides geht".
- Aufgaben dürfen sich INHALTLICH nicht wiederholen. Wenn schon eine Aufgabe zu einem Verb oder Begriff gestellt wurde, nicht noch eine zum gleichen.
- Bei Multiple Choice: Distraktoren (falsche Antworten) müssen plausibel sein, aber eindeutig falsch. KEINE offensichtlich absurden Optionen.
- Bei Lückentext: Die Lücke muss aus dem Satzkontext eindeutig lösbar sein. Keine Lücken wo mehrere Wörter passen würden.
- Schwierigkeit altersgerecht für 10–14-Jährige (Mittelschule, 5.–8. Schulstufe).
- Sprache: einfach, kurze Sätze, keine Fachsprache außer wenn sie gelehrt werden soll.`;

// Service-Role-Zugriff auf die eigene Datenbank (einmal pro Isolate auswerten)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
};

// Einheitliche JSON-Antwort mit CORS-Headern
function jsonAntwort(daten: unknown, status = 200): Response {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Prüft ob der Aufrufer eine eingeloggte Lehrperson ist (User-JWT, nicht nur Anon-Key).
// Die Generierung kostet Anthropic-Guthaben – der reine Anon-Key aus dem
// Frontend-Bundle darf sie deshalb nicht auslösen. Gibt die User-ID zurück oder null.
async function eingeloggteLehrperson(req: Request): Promise<string | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      'Authorization': `Bearer ${jwt}`,
    },
  });
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  const user = await res.json();
  return typeof user?.id === 'string' ? user.id : null;
}

// Hausübung per ID mit Service-Role aus der DB laden (null wenn nicht gefunden)
async function hausuebungLaden(id: string): Promise<{
  id: string;
  fach: string;
  thema: string;
  aufgaben_json: {
    text?: string;
    fragen?: unknown[];
    lueckentexte?: unknown[];
    wahrfalsch?: unknown[];
    zuordnung?: unknown[];
  };
} | null> {
  // UUID-Format prüfen bevor die ID in die REST-URL eingebaut wird
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/hausuebungen?id=eq.${id}&select=id,fach,thema,aufgaben_json`,
    { headers: SERVICE_HEADERS }
  );
  if (!res.ok) {
    console.error('Supabase Lade-Fehler:', await res.text());
    return null;
  }
  const zeilen = await res.json();
  return Array.isArray(zeilen) && zeilen.length > 0 ? zeilen[0] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // fokus: optionaler Lehrer-Hinweis der als harte Vorgabe in den Prompt einfließt
    // schwierigkeit: "leicht" | "mittel" | "schwer" (default: "leicht")
    const body = await req.json();
    const {
      fach,
      thema,
      fokus,
      aufgabentyp = 'mc',
      umfang = 'mittel',
      schwierigkeit = 'leicht',
      einzelaufgabe,
    } = body;

    // --- Modus "hole": HÜ für die Schüler-Ansicht laden – OHNE Lösungen ---
    // Die Lösungen (korrekt-Index, Lückentext-Antworten) dürfen den Server erst
    // nach der Abgabe verlassen, sonst können Schüler sie im Browser auslesen.
    if (typeof body.hole === 'string') {
      const hue = await hausuebungLaden(body.hole);
      if (!hue) {
        return jsonAntwort({ fehler: 'Diese Hausübung wurde nicht gefunden.' }, 404);
      }
      return jsonAntwort({
        fach: hue.fach ?? '',
        thema: hue.thema ?? '',
        ...hueOhneLoesungen(hue.aufgaben_json ?? {}),
      });
    }

    // --- Modus "auswerten": Schülerantworten serverseitig bewerten und speichern ---
    if (body.auswerten && typeof body.auswerten === 'object') {
      const {
        hausuebung_id,
        schueler_klasse,
        schueler_nummer,
        mcAntworten = [],
        ltAntworten = [],
        wfAntworten = [],
        zuAntworten = [],
      } = body.auswerten;

      const nummer = parseInt(schueler_nummer, 10);
      const klasse = String(schueler_klasse ?? '').trim().toLowerCase();
      if (!klasseNummerGueltig(klasse, nummer)) {
        return jsonAntwort({ fehler: 'Ungültige Klasse oder Katalognummer.' }, 400);
      }

      const hue = await hausuebungLaden(String(hausuebung_id ?? ''));
      if (!hue) {
        return jsonAntwort({ fehler: 'Diese Hausübung wurde nicht gefunden.' }, 404);
      }

      const bewertung = bewerteAbgabe(hue.aufgaben_json ?? {}, {
        mcAntworten, ltAntworten, wfAntworten, zuAntworten,
      });
      const { richtig, gesamt, prozent } = bewertung;

      // Ergebnis mit Service-Role speichern (Schüler brauchen kein Insert-Recht mehr)
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ergebnisse`, {
        method: 'POST',
        headers: { ...SERVICE_HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          fach: hue.fach,
          thema: hue.thema,
          schueler_nummer: nummer,
          schueler_klasse: klasse,
          richtige_antworten: richtig,
          gesamt_fragen: gesamt,
          prozent,
          hausuebung_id: hue.id,
        }),
      });

      if (!insertRes.ok) {
        const insertFehler = await insertRes.text();
        console.error('Supabase Ergebnis-Speicher-Fehler:', insertFehler);
        return jsonAntwort({ fehler: 'Ergebnis konnte nicht gespeichert werden.' }, 500);
      }
      // Body konsumieren, sonst hält Deno die Verbindung offen (return=minimal ist leer)
      await insertRes.body?.cancel();

      // Erst NACH erfolgreichem Speichern die Lösungen fürs Feedback zurückgeben.
      // Die Korrekt-Arrays kommen mit, damit der Client die Bewertung nicht nachrechnet.
      return jsonAntwort(bewertung);
    }

    // --- Ab hier: Generierungs-Modi (kosten Anthropic-Guthaben) ---
    // Nur für eingeloggte Lehrpersonen; Schüler-Modi (hole/auswerten) sind oben schon behandelt.
    const lehrerId = await eingeloggteLehrperson(req);
    if (!lehrerId) {
      return jsonAntwort({ fehler: 'Bitte melde dich als Lehrperson an, um Hausübungen zu generieren.' }, 401);
    }

    if (!fach || !thema) {
      return new Response(
        JSON.stringify({ fehler: 'Fach und Thema sind erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ fehler: 'API-Key nicht konfiguriert.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Schwierigkeitsgrad-Text für den Prompt
    const schwierigkeitText = schwierigkeit === 'schwer'
      ? 'SCHWER: Herausfordernde Begriffe, auch Stolperfallen und typische Fehlerquellen einbauen, Transferleistung erforderlich. Level: 8. Klasse / Vorbereitung weiterführende Schule. Bei MC: Distraktoren sehr nah an der richtigen Lösung. Bei Lückentext: auch ähnliche Wörter unterscheiden (z.B. das/dass, wieder/wider, seit/seid).'
      : schwierigkeit === 'mittel'
        ? 'MITTEL: Erweiterter Wortschatz, zusammengesetzte Sätze, leichte Transferleistung nötig. Level: 6.–7. Klasse.'
        : 'LEICHT: Grundwortschatz, einfache Satzstrukturen, direkt aus dem Thema erschließbar. Level: Beginn 5. Klasse.';

    // Fokus-Vorgabe falls gesetzt
    const fokusAbschnitt = fokus && fokus.trim()
      ? `\nZWINGENDE INHALTLICHE VORGABE VOM LEHRER: ${fokus.trim()}. Diese Vorgabe MUSS in jeder einzelnen Aufgabe berücksichtigt werden. Wenn die Vorgabe widerspricht was sonst im Thema steht, hat die Vorgabe Vorrang.\n`
      : '';

    // Einzelaufgabe-Modus: genau 1 Aufgabe neu generieren, ohne in DB zu speichern
    if (einzelaufgabe === 'mc' || einzelaufgabe === 'lt' || einzelaufgabe === 'wf') {
      const einzelTool = einzelaufgabe === 'mc' ? {
        name: 'frage_erstellen',
        description: 'Erstellt eine einzelne Multiple-Choice-Frage.',
        input_schema: {
          type: 'object',
          properties: {
            frage: { type: 'string' },
            antworten: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
            korrekt: { type: 'integer', description: 'Index 0-3 der richtigen Antwort.' },
          },
          required: ['frage', 'antworten', 'korrekt'],
        },
      } : einzelaufgabe === 'lt' ? {
        name: 'lueckentext_erstellen',
        description: 'Erstellt eine einzelne Lückentext-Aufgabe.',
        input_schema: {
          type: 'object',
          properties: {
            satz: { type: 'string', description: 'Satz mit genau einer Lücke als ___.' },
            antwort: { type: 'string', description: 'Erwartete Antwort.' },
          },
          required: ['satz', 'antwort'],
        },
      } : {
        name: 'wahrfalsch_erstellen',
        description: 'Erstellt eine einzelne Wahr/Falsch-Aussage.',
        input_schema: {
          type: 'object',
          properties: {
            aussage: { type: 'string', description: 'Eine eindeutig wahre oder eindeutig falsche Aussage.' },
            wahr: { type: 'boolean', description: 'true wenn die Aussage stimmt, false wenn nicht.' },
          },
          required: ['aussage', 'wahr'],
        },
      };

      const einzelPrompt = einzelaufgabe === 'mc'
        ? `Erstelle eine neue Multiple-Choice-Frage für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".${fokusAbschnitt}Genau 4 Antwortmöglichkeiten, "korrekt" ist der Index 0-3 der richtigen Antwort. Schwierigkeit: ${schwierigkeitText}`
        : einzelaufgabe === 'lt'
          ? `Erstelle eine neue Lückentext-Aufgabe für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".${fokusAbschnitt}Satz mit genau einer Lücke als ___, "antwort" ist das erwartete Wort. Schwierigkeit: ${schwierigkeitText}`
          : `Erstelle eine neue Wahr/Falsch-Aussage für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".${fokusAbschnitt}Die Aussage muss eindeutig wahr ODER eindeutig falsch sein, entscheide zufällig welches von beiden. Schwierigkeit: ${schwierigkeitText}`;

      const einzelResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          tools: [einzelTool],
          tool_choice: { type: 'tool', name: einzelTool.name },
          messages: [{ role: 'user', content: einzelPrompt }],
        }),
      });

      if (!einzelResponse.ok) {
        const fehler = await einzelResponse.text();
        console.error('Anthropic Einzelaufgabe Fehler:', fehler);
        throw new Error('KI-Generierung fehlgeschlagen.');
      }

      const einzelDaten = await einzelResponse.json();
      const einzelResult = einzelDaten.content.find((c: { type: string }) => c.type === 'tool_use');
      if (!einzelResult) throw new Error('Kein Ergebnis von der KI.');

      const returnKey = einzelaufgabe === 'mc' ? 'frage' : einzelaufgabe === 'lt' ? 'lueckentext' : 'wahrfalsch';
      return new Response(JSON.stringify({ [returnKey]: einzelResult.input }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aufgabenanzahl je nach Umfang
    const anzahlMap: Record<string, { mc: number; lt: number; zu: number }> = {
      kurz:   { mc: 2, lt: 1, zu: 4 },
      mittel: { mc: 3, lt: 2, zu: 6 },
      lang:   { mc: 5, lt: 3, zu: 8 },
    };
    const anzahl = anzahlMap[umfang] ?? anzahlMap['mittel'];
    const gesamtZahl = anzahl.mc + anzahl.lt;

    // Verteilung je Aufgabentyp. "gemischt" bleibt bewusst MC + Lückentext
    // (wie bisher) – Wahr/Falsch und Zuordnung sind eigenständige Typen.
    let mcAnzahl = 0, ltAnzahl = 0, wfAnzahl = 0, zuAnzahl = 0;
    if (aufgabentyp === 'mc') mcAnzahl = gesamtZahl;
    else if (aufgabentyp === 'lueckentext') ltAnzahl = gesamtZahl;
    else if (aufgabentyp === 'wahrfalsch') wfAnzahl = gesamtZahl;
    else if (aufgabentyp === 'zuordnung') zuAnzahl = anzahl.zu;
    else { mcAnzahl = anzahl.mc; ltAnzahl = anzahl.lt; }

    const hausübungTool = {
      name: 'hausaufgabe_erstellen',
      description: 'Erstellt eine Hausübung für österreichische Mittelschüler.',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Informativer Lesetext mit 5-8 Sätzen passend zu Fach und Thema.',
          },
          fragen: {
            type: 'array',
            description: `Multiple-Choice-Fragen – exakt ${mcAnzahl} Stück.`,
            minItems: mcAnzahl,
            maxItems: mcAnzahl,
            items: {
              type: 'object',
              properties: {
                frage: { type: 'string' },
                antworten: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 4,
                  maxItems: 4,
                },
                korrekt: { type: 'integer', description: 'Index 0-3 der richtigen Antwort.' },
              },
              required: ['frage', 'antworten', 'korrekt'],
            },
          },
          lueckentexte: {
            type: 'array',
            description: `Lückentext-Aufgaben – exakt ${ltAnzahl} Stück.`,
            minItems: ltAnzahl,
            maxItems: ltAnzahl,
            items: {
              type: 'object',
              properties: {
                satz: {
                  type: 'string',
                  description: 'Satz mit genau einer Lücke markiert als ___.',
                },
                antwort: {
                  type: 'string',
                  description: 'Erwartete Antwort (case-insensitiv verglichen, Umlaute strikt).',
                },
              },
              required: ['satz', 'antwort'],
            },
          },
          wahrfalsch: {
            type: 'array',
            description: `Wahr/Falsch-Aussagen – exakt ${wfAnzahl} Stück. Ungefähr die Hälfte wahr, die Hälfte falsch, in zufälliger Reihenfolge.`,
            minItems: wfAnzahl,
            maxItems: wfAnzahl,
            items: {
              type: 'object',
              properties: {
                aussage: {
                  type: 'string',
                  description: 'Eine eindeutig wahre oder eindeutig falsche Aussage.',
                },
                wahr: {
                  type: 'boolean',
                  description: 'true wenn die Aussage stimmt, false wenn nicht.',
                },
              },
              required: ['aussage', 'wahr'],
            },
          },
          zuordnung: {
            type: 'array',
            description: `Zuordnungspaare – exakt ${zuAnzahl} Stück. Jeder Begriff hat genau einen eindeutig passenden Partner; kein Partner darf zu mehreren Begriffen passen.`,
            minItems: zuAnzahl,
            maxItems: zuAnzahl,
            items: {
              type: 'object',
              properties: {
                begriff: {
                  type: 'string',
                  description: 'Begriff auf der linken Seite (z. B. Fachbegriff, Wort).',
                },
                partner: {
                  type: 'string',
                  description: 'Eindeutig passender Partner (z. B. Definition, Beispiel, Übersetzung).',
                },
              },
              required: ['begriff', 'partner'],
            },
          },
        },
        required: ['text', 'fragen', 'lueckentexte', 'wahrfalsch', 'zuordnung'],
      },
    };

    const umfangHinweis = umfang === 'kurz' ? 'kurze Hausübung (ca. 5 Minuten)'
      : umfang === 'lang' ? 'lange Hausübung (ca. 15 Minuten)'
      : 'mittellange Hausübung (ca. 10 Minuten)';

    // Anweisung nennt für JEDEN Array-Typ die exakte Anzahl (0 = leeres Array),
    // damit das Modell keine ungewollten Aufgaben dazu erfindet
    const typAnweisung = `Erstelle EXAKT: ${mcAnzahl} Multiple-Choice-Fragen (fragen), ${ltAnzahl} Lückentext-Aufgaben (lueckentexte), ${wfAnzahl} Wahr/Falsch-Aussagen (wahrfalsch) und ${zuAnzahl} Zuordnungspaare (zuordnung). Arrays mit Anzahl 0 als leeres Array [] zurückgeben.`;

    const prompt = `Erstelle eine ${umfangHinweis} für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".
${fokusAbschnitt}
SCHWIERIGKEITSGRAD: ${schwierigkeitText}

${typAnweisung}

Lesetext: 5-8 Sätze, altersgerecht (10–14 Jahre).
MC-Fragen: je genau 4 Antwortmöglichkeiten, "korrekt" ist der Index (0-3) der richtigen Antwort.
Lückentexte: Satz mit ___ als Lücke, "antwort" ist das erwartete Wort/die erwartete Phrase.
Wahr/Falsch: eindeutig entscheidbare Aussagen, ca. halb wahr / halb falsch, zufällig gereiht.
Zuordnung: Begriff-Partner-Paare, jeder Partner passt nur zu genau einem Begriff.

Rufe das Tool "hausaufgabe_erstellen" auf.`;

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [hausübungTool],
        tool_choice: { type: 'tool', name: 'hausaufgabe_erstellen' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const fehler = await anthropicResponse.text();
      console.error('Anthropic API Fehler:', fehler);
      return new Response(
        JSON.stringify({ fehler: 'KI-Generierung fehlgeschlagen.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicDaten = await anthropicResponse.json();

    const toolResult = anthropicDaten.content.find((c: { type: string }) => c.type === 'tool_use');
    if (!toolResult) {
      console.error('Kein tool_use Block in Antwort:', JSON.stringify(anthropicDaten));
      throw new Error('Kein tool_use Block gefunden.');
    }

    const hausübung = toolResult.input;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const dbRes = await fetch(`${supabaseUrl}/rest/v1/hausuebungen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        fach,
        thema,
        aufgaben_json: hausübung,
        erstellt_von: lehrerId,
      }),
    });

    if (!dbRes.ok) {
      const dbFehler = await dbRes.text();
      console.error('Supabase Speicher-Fehler:', dbFehler);
      throw new Error('HÜ konnte nicht gespeichert werden.');
    }

    const [gespeichert] = await dbRes.json();

    return new Response(JSON.stringify({ ...hausübung, id: gespeichert.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (fehler) {
    console.error('Unerwarteter Fehler:', fehler);
    return new Response(
      JSON.stringify({ fehler: 'Interner Serverfehler.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
