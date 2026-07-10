// Text in die Zwischenablage kopieren – mit Fallback für ältere Browser.
// Gemeinsamer Helper für App.jsx (Schüler-Link nach Freigabe) und Dashboard.
export async function inZwischenablage(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const eingabe = document.createElement('input')
    eingabe.value = text
    document.body.appendChild(eingabe)
    eingabe.select()
    document.execCommand('copy')
    document.body.removeChild(eingabe)
  }
}
