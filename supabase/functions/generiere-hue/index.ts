// Supabase Edge Function: Hausübung via Anthropic API generieren
// Der API-Key wird als Supabase-Secret gespeichert (nie im Frontend)
// Verwendet tool_use (function calling) für zuverlässiges JSON-Output

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS-Header für den Frontend-Zugriff
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool-Schema wird dynamisch im Handler aufgebaut (mit exakten minItems/maxItems je Umfang/Typ)

Deno.serve(async (req: Request) => {
  // OPTIONS-Preflight-Request direkt beantworten
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // aufgabentyp: "mc" | "lueckentext" | "gemischt", default "mc"
    // umfang: "kurz" (3 Aufgaben) | "mittel" (5 Aufgaben, default) | "lang" (8 Aufgaben)
    // einzelaufgabe: "mc" | "lt" – eine einzelne Aufgabe neu generieren (kein DB-Speichern)
    const { fach, thema, aufgabentyp = 'mc', umfang = 'mittel', einzelaufgabe } = await req.json();

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
        ? `Erstelle eine neue Multiple-Choice-Frage für österreichische Mittelschüler (AHS/NMS) im Fach "${fach}" zum Thema "${thema}". Genau 4 Antwortmöglichkeiten, "korrekt" ist der Index 0-3 der richtigen Antwort. Österreichische Fachbegriffe verwenden.`
        : `Erstelle eine neue Lückentext-Aufgabe für österreichische Mittelschüler (AHS/NMS) im Fach "${fach}" zum Thema "${thema}". Satz mit genau einer Lücke als ___, "antwort" ist das erwartete Wort. Österreichische Fachbegriffe verwenden.`;

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
      kurz:   { mc: 2, lt: 1 },  // ~3 Aufgaben gesamt
      mittel: { mc: 3, lt: 2 },  // ~5 Aufgaben gesamt
      lang:   { mc: 5, lt: 3 },  // ~8 Aufgaben gesamt
    };
    const anzahl = anzahlMap[umfang] ?? anzahlMap['mittel'];

    // Exakte Anzahl je Typ berechnen – MC und LT getrennt
    const mcAnzahl = aufgabentyp === 'mc' ? anzahl.mc + anzahl.lt
      : aufgabentyp === 'lueckentext' ? 0
      : anzahl.mc;
    const ltAnzahl = aufgabentyp === 'lueckentext' ? anzahl.mc + anzahl.lt
      : aufgabentyp === 'mc' ? 0
      : anzahl.lt;

    // Dynamisches Tool-Schema mit minItems/maxItems erzwingt exakte Aufgabenanzahl
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

    // Umfang-Kontext für den Prompt
    const umfangHinweis = umfang === 'kurz' ? 'kurze Hausübung (ca. 5 Minuten, einfachere Aufgaben)'
      : umfang === 'lang' ? 'lange Hausübung (ca. 15 Minuten, anspruchsvollere und vielfältigere Aufgaben)'
      : 'mittellange Hausübung (ca. 10 Minuten)';

    // Explizite Anzahl-Anweisung – Modell MUSS exakt diese Anzahl liefern
    const typAnweisung = aufgabentyp === 'mc'
      ? `Erstelle EXAKT ${mcAnzahl} Multiple-Choice-Fragen (fragen) und 0 Lückentexte (lueckentexte als leeres Array []). Nicht mehr, nicht weniger als ${mcAnzahl} MC-Fragen. Jede Frage hat genau 4 Antwortmöglichkeiten.`
      : aufgabentyp === 'lueckentext'
        ? `Erstelle 0 Multiple-Choice-Fragen (fragen als leeres Array []) und EXAKT ${ltAnzahl} Lückentext-Aufgaben (lueckentexte). Nicht mehr, nicht weniger als ${ltAnzahl} Lückentexte. Jeder Satz enthält genau eine Lücke als ___.`
        : `Erstelle EXAKT ${mcAnzahl} Multiple-Choice-Fragen (fragen) und EXAKT ${ltAnzahl} Lückentext-Aufgaben (lueckentexte). Genau diese Anzahl, nicht mehr, nicht weniger. Jeder Lückentext-Satz enthält genau eine Lücke als ___.`;

    // Prompt – österreichischer Lehrplan, Fachbegriffe explizit vorgegeben
    const prompt = `Erstelle eine ${umfangHinweis} für österreichische Mittelschüler (AHS/NMS) im Fach "${fach}" zum Thema "${thema}".

Österreichische Fachbegriffe verwenden:
- Deutsch: Nomen (nicht Substantiv), Beistrich (nicht Komma), Schularbeit (nicht Klassenarbeit)
- Mathematik: dezimale Schreibweise mit Komma (3,14), Grundrechnungsarten
- Englisch: britisches Englisch nach österreichischem Lehrplan
- Rechtschreibung: Österreichisches Wörterbuch (ÖWB)

${typAnweisung}

Lesetext: 5-8 Sätze, altersgerecht (10-14 Jahre).
MC-Fragen: je genau 4 Antwortmöglichkeiten, "korrekt" ist der Index (0-3) der richtigen Antwort.
Lückentexte: Satz mit ___ als Lücke, "antwort" ist das erwartete Wort/die erwartete Phrase.

WICHTIG: Das Tool-Schema erzwingt exakt ${mcAnzahl} MC-Fragen und ${ltAnzahl} Lückentexte.
Rufe das Tool "hausaufgabe_erstellen" mit den Inhalten auf.`;

    // Anfrage an die Anthropic API mit tool_use
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        // 2048 Tokens reichen auch für lang (8 Aufgaben) sicher aus
        max_tokens: 2048,
        tools: [hausübungTool],
        // tool_choice erzwingt dass das Modell genau dieses Tool aufruft
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

    // tool_use Block aus der Antwort extrahieren
    const toolResult = anthropicDaten.content.find((c: { type: string }) => c.type === 'tool_use');
    if (!toolResult) {
      console.error('Kein tool_use Block in Antwort:', JSON.stringify(anthropicDaten));
      throw new Error('Kein tool_use Block gefunden.');
    }

    // toolResult.input ist bereits ein JS-Objekt – kein JSON.parse nötig
    const hausübung = toolResult.input;

    // HÜ in Supabase speichern – SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY
    // sind in Edge Functions automatisch verfügbar
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

    // ID + generierte Daten zurückgeben
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
