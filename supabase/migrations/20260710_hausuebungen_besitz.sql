-- Besitz-Semantik für hausuebungen: erstellt_von wird seit Juli 2026 von der
-- Edge Function mit der Lehrer-User-ID befüllt. Update/Delete dürfen ab jetzt
-- nur noch die eigene Lehrperson (oder Alt-Daten ohne Besitzer) treffen –
-- vorher konnte jeder authenticated-User fremde HÜs ändern/löschen.
-- SELECT bleibt bewusst für alle Lehrpersonen offen (gemeinsames Dashboard).

DROP POLICY IF EXISTS "Authenticated update hausuebungen" ON hausuebungen;
CREATE POLICY "Eigene hausuebungen update"
  ON hausuebungen FOR UPDATE
  TO authenticated
  USING (erstellt_von = auth.uid() OR erstellt_von IS NULL);

DROP POLICY IF EXISTS "Authenticated delete hausuebungen" ON hausuebungen;
CREATE POLICY "Eigene hausuebungen delete"
  ON hausuebungen FOR DELETE
  TO authenticated
  USING (erstellt_von = auth.uid() OR erstellt_von IS NULL);
