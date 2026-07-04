-- Lösungen absichern: Anonyme Clients (Schüler) dürfen hausuebungen nicht mehr
-- direkt lesen, weil aufgaben_json die Lösungen enthält. Der Schüler-Flow läuft
-- ab jetzt komplett über die Edge Function (Service-Role, Modi "hole"/"auswerten").
DROP POLICY IF EXISTS "Public read hausuebungen" ON hausuebungen;
CREATE POLICY "Authenticated read hausuebungen"
  ON hausuebungen FOR SELECT
  TO authenticated
  USING (true);

-- ergebnisse: Schüler schreiben nicht mehr direkt (Edge Function speichert mit
-- Service-Role) und dürfen fremde Ergebnisse nicht lesen. Lehrer lesen weiter.
DROP POLICY IF EXISTS "Public read ergebnisse" ON ergebnisse;
DROP POLICY IF EXISTS "Public insert ergebnisse" ON ergebnisse;
CREATE POLICY "Authenticated read ergebnisse"
  ON ergebnisse FOR SELECT
  TO authenticated
  USING (true);
