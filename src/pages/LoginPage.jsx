// Anmeldeseite für Lehrpersonen – sendet einen Magic Link per E-Mail
import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [gesendet, setGesendet] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)

  async function magicLinkSenden(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Nach Magic-Link-Klick direkt auf das Dashboard weiterleiten
        emailRedirectTo: window.location.origin + '/dashboard',
      },
    })

    if (error) {
      setFehler('Fehler beim Senden des Links: ' + error.message)
    } else {
      setGesendet(true)
    }

    setLaedt(false)
  }

  return (
    <div className="login-container">
      <div className="login-karte">
        {/* Branding */}
        <div className="login-brand">
          <span className="login-brand-icon" aria-hidden="true">📚</span>
          <h1 className="login-titel">HÜ-Generator</h1>
          <p className="login-untertitel">Lehrer-Login</p>
        </div>

        {gesendet ? (
          // Bestätigungsmeldung nach dem Senden
          <div className="login-bestaetigung">
            <span className="login-bestaetigung-icon" aria-hidden="true">✓</span>
            <p className="login-bestaetigung-text">Schau in dein Postfach!</p>
            <p className="login-bestaetigung-hinweis">
              Wir haben einen Anmeldelink an <strong>{email}</strong> geschickt.
              Klicke auf den Link in der E-Mail, um dich anzumelden.
            </p>
          </div>
        ) : (
          // Anmeldeformular
          <form className="login-formular" onSubmit={magicLinkSenden}>
            <div className="login-formfeld">
              <label htmlFor="email">E-Mail-Adresse</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@schule.at"
                required
                autoFocus
              />
            </div>

            {fehler && <div className="login-fehler">{fehler}</div>}

            <button
              type="submit"
              className="login-btn"
              disabled={laedt}
            >
              {laedt ? 'Wird gesendet...' : 'Magic Link senden'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
