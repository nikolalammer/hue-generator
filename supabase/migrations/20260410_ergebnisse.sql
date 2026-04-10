-- Tabelle für Schülerergebnisse
CREATE TABLE ergebnisse (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  erstellt_am timestamptz DEFAULT now(),
  fach text NOT NULL,
  thema text NOT NULL,
  schueler_nummer integer NOT NULL,
  richtige_antworten integer NOT NULL,
  gesamt_fragen integer NOT NULL,
  prozent integer NOT NULL
);

-- RLS für MVP deaktiviert
ALTER TABLE ergebnisse DISABLE ROW LEVEL SECURITY;
