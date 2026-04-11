// Supabase Edge Function: Hausübung via Anthropic API generieren
// Der API-Key wird als Supabase-Secret gespeichert (nie im Frontend)
// Verwendet tool_use (function calling) für zuverlässiges JSON-Output

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS-Header für den Frontend-Zugriff
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool-Definition erzwingt strukturiertes JSON – kein Markdown möglich
// Unterstützt MC-Fragen, Lückentexte und gemischte Aufgaben
const HAUSÜBUNG_TOOL = {
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
        description: 'Multiple-Choice-Fragen (leer wenn Typ "lueckentext").',
        items: {
          type: 'object',
          properties: {
            frage: { type: 'string' },
            antworten: { type: 'array', items: { type: 'string' } },
            korrekt: { type: 'integer', description: 'Index 0-3 der richtigen Antwort.' },
          },
          required: ['frage', 'antworten', 'korrekt'],
        },
      },
      lueckentexte: {
        type: 'array',
        description: 'Lückentext-Aufgaben (leer wenn Typ "mc").',
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

Deno.serve(async (req: Request) => {
  // OPTIONS-Preflight-Request direkt beantworten
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // aufgabentyp: "mc" | "lueckentext" | "gemischt", default "mc"
    const { fach, thema, aufgabentyp = 'mc' } = await req.json();

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

    // Aufgabentyp-spezifische Anweisung
    const typAnweisung = aufgabentyp === 'mc'
      ? 'Erstelle genau 3 Multiple-Choice-Fragen (fragen) und 0 Lückentexte (lueckentexte als leeres Array).'
      : aufgabentyp === 'lueckentext'
        ? 'Erstelle 0 Multiple-Choice-Fragen (fragen als leeres Array) und genau 3 Lückentext-Aufgaben (lueckentexte). Jeder Satz enthält genau eine Lücke als ___.'
        : 'Erstelle 2 Multiple-Choice-Fragen (fragen) und 2 Lückentext-Aufgaben (lueckentexte). Jeder Lückentext-Satz enthält genau eine Lücke als ___.';

    // Prompt – österreichischer Lehrplan, Fachbegriffe explizit vorgegeben
    const prompt = `Erstelle eine Hausübung für österreichische Mittelschüler (AHS/NMS) im Fach "${fach}" zum Thema "${thema}".

Österreichische Fachbegriffe verwenden:
- Deutsch: Nomen (nicht Substantiv), Beistrich (nicht Komma), Schularbeit (nicht Klassenarbeit)
- Mathematik: dezimale Schreibweise mit Komma (3,14), Grundrechnungsarten
- Englisch: britisches Englisch nach österreichischem Lehrplan
- Rechtschreibung: Österreichisches Wörterbuch (ÖWB)

${typAnweisung}

Lesetext: 5-8 Sätze, altersgerecht (10-14 Jahre).
MC-Fragen: je genau 4 Antwortmöglichkeiten, "korrekt" ist der Index (0-3) der richtigen Antwort.
Lückentexte: Satz mit ___ als Lücke, "antwort" ist das erwartete Wort/die erwartete Phrase.

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
        max_tokens: 1024,
        tools: [HAUSÜBUNG_TOOL],
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
