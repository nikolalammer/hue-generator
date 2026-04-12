// Textarea die automatisch mit dem Inhalt mitwächst (keine externe Library)
// Strg+Enter submittet das übergeordnete Formular, Enter macht Zeilenumbruch
import { useRef, useEffect } from 'react'

export default function AutoGrowTextarea({ value, onChange, placeholder, id, required }) {
  const ref = useRef(null)

  // Höhe bei jeder Wertänderung anpassen
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // Strg+Enter submittet das Formular, plain Enter = Zeilenumbruch
  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const form = ref.current?.closest('form')
      if (form) form.requestSubmit()
    }
  }

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={required}
      rows={1}
      className="auto-grow-textarea"
    />
  )
}
