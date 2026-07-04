-- Lösungen absichern: Anonyme Clients (Schüler) dürfen hausuebungen nicht mehr
-- direkt lesen, weil aufgaben_json die Lösungen enthält. Der Schüler-Flow läuft
-- ab jetzt komplett über die Edge Function (Service-Role, Modi "hole"/"auswerten").
--
-- Diese Migration ist selbsttragend: Sie aktiviert RLS explizit (die alten
-- MVP-Migrationen hatten es deaktiviert; auf der Live-DB wurde es später im
-- Dashboard aktiviert) und legt den kompletten Policy-Satz idempotent neu an.

ALTER TABLE hausuebungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ergebnisse ENABLE ROW LEVEL SECURITY;

-- hausuebungen: nur eingeloggte Lehrpersonen lesen/schreiben.
-- Schüler-Zugriff läuft ausschließlich über die Edge Function (Service-Role).
DROP POLICY IF EXISTS "Public read hausuebungen" ON hausuebungen;
DROP POLICY IF EXISTS "Authenticated read hausuebungen" ON hausuebungen;
CREATE POLICY "Authenticated read hausuebungen"
  ON hausuebungen FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert hausuebungen" ON hausuebungen;
CREATE POLICY "Authenticated insert hausuebungen"
  ON hausuebungen FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ohne diese Policy würde der VorschauEditor-Speichern-Flow der Lehrperson
-- unter RLS still fehlschlagen (0 Zeilen matchen, kein Fehler).
DROP POLICY IF EXISTS "Authenticated update hausuebungen" ON hausuebungen;
CREATE POLICY "Authenticated update hausuebungen"
  ON hausuebungen FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated delete hausuebungen" ON hausuebungen;
CREATE POLICY "Authenticated delete hausuebungen"
  ON hausuebungen FOR DELETE
  TO authenticated
  USING (true);

-- ergebnisse: Schüler schreiben nicht mehr direkt (Edge Function speichert mit
-- Service-Role) und dürfen fremde Ergebnisse nicht lesen. Lehrer lesen weiter.
DROP POLICY IF EXISTS "Public read ergebnisse" ON ergebnisse;
DROP POLICY IF EXISTS "Public insert ergebnisse" ON ergebnisse;
DROP POLICY IF EXISTS "Authenticated read ergebnisse" ON ergebnisse;
CREATE POLICY "Authenticated read ergebnisse"
  ON ergebnisse FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated update ergebnisse" ON ergebnisse;
CREATE POLICY "Authenticated update ergebnisse"
  ON ergebnisse FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated delete ergebnisse" ON ergebnisse;
CREATE POLICY "Authenticated delete ergebnisse"
  ON ergebnisse FOR DELETE
  TO authenticated
  USING (true);
