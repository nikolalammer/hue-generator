// Anmeldeseite für Lehrpersonen – sendet einen Magic Link per E-Mail
import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('lammer.nikola@ms-eberschwang.at')
  const [gesendet, setGesendet] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)

  async function magicLinkSenden(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)

    const { error } = await supabase.auth.signInWithOtp({ email })

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
        <h1 className="login-titel">HUE-Generator</h1>
        <p className="login-untertitel">Anmeldung für Lehrpersonen</p>

        {gesendet ? (
          // Bestätigungsmeldung nach dem Senden
          <div className="login-bestaetigung">
            <span className="login-bestaetigung-icon">✉</span>
            <p className="login-bestaetigung-text">
              <strong>Schau in dein Postfach!</strong>
            </p>
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
