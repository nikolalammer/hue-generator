-- Neue Tabelle: Hausübungen persistent speichern
-- TODO: RLS-Policies für Produktion notwendig (Lehrer darf nur eigene HÜs sehen/erstellen)
CREATE TABLE hausuebungen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  erstellt_am timestamptz DEFAULT now(),
  fach text NOT NULL,
  thema text NOT NULL,
  aufgaben_json jsonb NOT NULL,
  erstellt_von uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS für MVP deaktiviert
ALTER TABLE hausuebungen DISABLE ROW LEVEL SECURITY;

-- ergebnisse-Tabelle um hausuebung_id erweitern
ALTER TABLE ergebnisse
  ADD COLUMN hausuebung_id uuid REFERENCES hausuebungen(id) ON DELETE SET NULL;
