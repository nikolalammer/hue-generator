// Anmeldeseite für Lehrpersonen – sendet einen Magic Link per E-Mail
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [gesendet, setGesendet] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)
  // Von welcher geschützten Seite kam die Weiterleitung? Nur bekannte eigene
  // Pfade zulassen – location.state ist clientseitig manipulierbar und darf
  // nie in eine beliebige Redirect-URL münden.
  const erlaubteZiele = ['/', '/dashboard']
  const state = useLocation().state
  const von = erlaubteZiele.includes(state?.von) ? state.von : '/'

  async function magicLinkSenden(e) {
    e.preventDefault()
    setLaedt(true)
    setFehler(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Kein Self-Signup: Der Magic Link funktioniert nur für bereits
        // angelegte Lehrer-Accounts. Sonst könnte sich jeder Schüler selbst
        // registrieren und die (kostenpflichtige) Generierung nutzen.
        shouldCreateUser: false,
        // Nach Magic-Link-Klick zurück auf die ursprünglich angeforderte Seite
        emailRedirectTo: window.location.origin + von,
      },
    })

    if (error) {
      // Supabase meldet nicht freigeschaltete Adressen als "Signups not allowed for otp"
      setFehler(
        /signups not allowed/i.test(error.message)
          ? 'Diese E-Mail-Adresse ist nicht freigeschaltet. Bitte wende dich an die Administration.'
          : 'Fehler beim Senden des Links: ' + error.message
      )
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
          <span className="login-brand-stern" aria-hidden="true">✱</span>
          <h1 className="login-titel">Aufgabolino</h1>
          <p className="login-untertitel">Lehrer-Login</p>
        </div>

        {gesendet ? (
          // Bestätigungsmeldung nach dem Senden
          <div className="login-bestaetigung">
            <span className="login-bestaetigung-icon" aria-hidden="true">✓</span>
            <p className="login-bestaetigung-text">Schau in dein Postfach.</p>
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
