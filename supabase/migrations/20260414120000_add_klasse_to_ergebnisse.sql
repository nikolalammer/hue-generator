-- Klasse (z.B. "2a", "3b") zum Schüler-Ergebnis hinzufügen
-- Bestehende Zeilen bekommen NULL – das ist akzeptabel für historische Daten
ALTER TABLE ergebnisse
  ADD COLUMN IF NOT EXISTS schueler_klasse text;
