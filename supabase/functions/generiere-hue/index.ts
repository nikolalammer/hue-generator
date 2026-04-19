// Supabase Edge Function: Hausübung via Anthropic API generieren
// Der API-Key wird als Supabase-Secret gespeichert (nie im Frontend)
// Verwendet tool_use (function calling) für zuverlässiges JSON-Output

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // fokus: optionaler Lehrer-Hinweis der als harte Vorgabe in den Prompt einfließt
    // schwierigkeit: "leicht" | "mittel" | "schwer" (default: "leicht")
    const {
      fach,
      thema,
      fokus,
      aufgabentyp = 'mc',
      umfang = 'mittel',
      schwierigkeit = 'leicht',
      einzelaufgabe,
    } = await req.json();

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

    // Einzelaufgabe-Modus: genau 1 Frage neu generieren, ohne in DB zu speichern
    if (einzelaufgabe === 'mc' || einzelaufgabe === 'lt') {
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
      } : {
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
      };

      const einzelPrompt = einzelaufgabe === 'mc'
        ? `Erstelle eine neue Multiple-Choice-Frage für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".${fokusAbschnitt}Genau 4 Antwortmöglichkeiten, "korrekt" ist der Index 0-3 der richtigen Antwort. Schwierigkeit: ${schwierigkeitText}`
        : `Erstelle eine neue Lückentext-Aufgabe für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".${fokusAbschnitt}Satz mit genau einer Lücke als ___, "antwort" ist das erwartete Wort. Schwierigkeit: ${schwierigkeitText}`;

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

      const returnKey = einzelaufgabe === 'mc' ? 'frage' : 'lueckentext';
      return new Response(JSON.stringify({ [returnKey]: einzelResult.input }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aufgabenanzahl je nach Umfang
    const anzahlMap: Record<string, { mc: number; lt: number }> = {
      kurz:   { mc: 2, lt: 1 },
      mittel: { mc: 3, lt: 2 },
      lang:   { mc: 5, lt: 3 },
    };
    const anzahl = anzahlMap[umfang] ?? anzahlMap['mittel'];

    const mcAnzahl = aufgabentyp === 'mc' ? anzahl.mc + anzahl.lt
      : aufgabentyp === 'lueckentext' ? 0
      : anzahl.mc;
    const ltAnzahl = aufgabentyp === 'lueckentext' ? anzahl.mc + anzahl.lt
      : aufgabentyp === 'mc' ? 0
      : anzahl.lt;

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
        },
        required: ['text', 'fragen', 'lueckentexte'],
      },
    };

    const umfangHinweis = umfang === 'kurz' ? 'kurze Hausübung (ca. 5 Minuten)'
      : umfang === 'lang' ? 'lange Hausübung (ca. 15 Minuten)'
      : 'mittellange Hausübung (ca. 10 Minuten)';

    const typAnweisung = aufgabentyp === 'mc'
      ? `Erstelle EXAKT ${mcAnzahl} Multiple-Choice-Fragen (fragen) und 0 Lückentexte (lueckentexte als leeres Array []). Jede Frage hat genau 4 Antwortmöglichkeiten.`
      : aufgabentyp === 'lueckentext'
        ? `Erstelle 0 Multiple-Choice-Fragen (fragen als leeres Array []) und EXAKT ${ltAnzahl} Lückentext-Aufgaben (lueckentexte). Jeder Satz enthält genau eine Lücke als ___.`
        : `Erstelle EXAKT ${mcAnzahl} Multiple-Choice-Fragen (fragen) und EXAKT ${ltAnzahl} Lückentext-Aufgaben (lueckentexte). Jeder Lückentext-Satz enthält genau eine Lücke als ___.`;

    const prompt = `Erstelle eine ${umfangHinweis} für österreichische Mittelschüler im Fach "${fach}" zum Thema "${thema}".
${fokusAbschnitt}
SCHWIERIGKEITSGRAD: ${schwierigkeitText}

${typAnweisung}

Lesetext: 5-8 Sätze, altersgerecht (10–14 Jahre).
MC-Fragen: je genau 4 Antwortmöglichkeiten, "korrekt" ist der Index (0-3) der richtigen Antwort.
Lückentexte: Satz mit ___ als Lücke, "antwort" ist das erwartete Wort/die erwartete Phrase.

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
