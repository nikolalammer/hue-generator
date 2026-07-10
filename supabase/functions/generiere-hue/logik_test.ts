// Tests für die reine Edge-Function-Logik: deno test supabase/functions/generiere-hue/logik_test.ts
import { assertEquals, assert, assertFalse } from 'jsr:@std/assert@1';
import { mischen, klasseNummerGueltig, hueOhneLoesungen, bewerteAbgabe } from './logik.ts';

const beispielHue = {
  text: 'Ein Lesetext.',
  fragen: [
    { frage: 'Frage 1?', antworten: ['A', 'B', 'C', 'D'], korrekt: 2 },
    { frage: 'Frage 2?', antworten: ['A', 'B', 'C', 'D'], korrekt: 0 },
  ],
  lueckentexte: [
    { satz: 'Der Hund ___ laut.', antwort: 'bellt' },
    { satz: 'Wien liegt an der ___.', antwort: 'Donau' },
  ],
  wahrfalsch: [
    { aussage: 'Die Erde ist rund.', wahr: true },
    { aussage: 'Katzen können fliegen.', wahr: false },
  ],
  zuordnung: [
    { begriff: 'Nomen', partner: 'Haus' },
    { begriff: 'Verb', partner: 'laufen' },
    { begriff: 'Adjektiv', partner: 'schnell' },
  ],
};

Deno.test('hueOhneLoesungen entfernt alle Lösungen', () => {
  const ohne = hueOhneLoesungen(beispielHue);

  assertEquals(ohne.text, 'Ein Lesetext.');
  // MC: kein korrekt-Feld
  for (const f of ohne.fragen) {
    assertFalse('korrekt' in f);
    assertEquals(f.antworten.length, 4);
  }
  // Lückentext: keine Antwort
  for (const lt of ohne.lueckentexte) {
    assertFalse('antwort' in lt);
  }
  // Wahr/Falsch: kein Wahrheitswert
  for (const wf of ohne.wahrfalsch) {
    assertFalse('wahr' in wf);
  }
  // Zuordnung: Begriffe und Partner getrennt, gleiche Mengen
  assert(ohne.zuordnung !== null);
  assertEquals(ohne.zuordnung!.begriffe, ['Nomen', 'Verb', 'Adjektiv']);
  assertEquals([...ohne.zuordnung!.partner].sort(), ['Haus', 'laufen', 'schnell'].sort());
});

Deno.test('hueOhneLoesungen kommt mit leerer/kaputter HÜ zurecht', () => {
  const ohne = hueOhneLoesungen({});
  assertEquals(ohne.fragen, []);
  assertEquals(ohne.lueckentexte, []);
  assertEquals(ohne.wahrfalsch, []);
  assertEquals(ohne.zuordnung, null);
});

Deno.test('bewerteAbgabe: alles richtig ergibt 100 %', () => {
  const ergebnis = bewerteAbgabe(beispielHue, {
    mcAntworten: [2, 0],
    ltAntworten: ['bellt', 'Donau'],
    wfAntworten: [true, false],
    zuAntworten: ['Haus', 'laufen', 'schnell'],
  });
  assertEquals(ergebnis.gesamt, 9);
  assertEquals(ergebnis.richtig, 9);
  assertEquals(ergebnis.prozent, 100);
});

Deno.test('bewerteAbgabe: Lückentext case-insensitiv und mit Trim, Umlaute strikt', () => {
  const ergebnis = bewerteAbgabe(
    { lueckentexte: [{ satz: 'a ___', antwort: 'Bäume' }, { satz: 'b ___', antwort: 'Donau' }] },
    { ltAntworten: ['  bäume ', 'Donav'] }
  );
  assertEquals(ergebnis.ltKorrekt, [true, false]);
  assertEquals(ergebnis.richtig, 1);
});

Deno.test('bewerteAbgabe: falsche und fehlende Antworten zählen nicht', () => {
  const ergebnis = bewerteAbgabe(beispielHue, {
    mcAntworten: [1],            // Frage 1 falsch, Frage 2 unbeantwortet
    ltAntworten: [],
    wfAntworten: [false, false], // erste falsch, zweite richtig
    zuAntworten: ['laufen'],     // falsch zugeordnet
  });
  assertEquals(ergebnis.richtig, 1);
  assertEquals(ergebnis.gesamt, 9);
  assertEquals(ergebnis.prozent, Math.round((1 / 9) * 100));
});

Deno.test('bewerteAbgabe: leere HÜ ergibt 0 % ohne Division durch null', () => {
  const ergebnis = bewerteAbgabe({}, {});
  assertEquals(ergebnis.gesamt, 0);
  assertEquals(ergebnis.prozent, 0);
});

Deno.test('bewerteAbgabe: manipulative Antwort-Typen werten nicht als richtig', () => {
  // Schüler könnte per DevTools z. B. Strings statt Zahlen/Booleans schicken
  const ergebnis = bewerteAbgabe(beispielHue, {
    mcAntworten: ['2', '0'],
    wfAntworten: ['true', 'false'],
    zuAntworten: [{}, [], null],
  });
  assertEquals(ergebnis.richtig, 0);
});

Deno.test('klasseNummerGueltig prüft Format und Bereich', () => {
  assert(klasseNummerGueltig('2a', 1));
  assert(klasseNummerGueltig('4d', 40));
  assertFalse(klasseNummerGueltig('2A', 5));   // wird vorher lowercased
  assertFalse(klasseNummerGueltig('10a', 5));
  assertFalse(klasseNummerGueltig('2a', 0));
  assertFalse(klasseNummerGueltig('2a', 41));
  assertFalse(klasseNummerGueltig('', 5));
  assertFalse(klasseNummerGueltig('2a', NaN));
});

Deno.test('mischen erhält alle Elemente', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const gemischt = mischen(arr);
  assertEquals(gemischt.length, arr.length);
  assertEquals([...gemischt].sort(), [...arr].sort());
  // Original bleibt unverändert
  assertEquals(arr, [1, 2, 3, 4, 5, 6, 7, 8]);
});
