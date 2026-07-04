// Textarea die automatisch mit dem Inhalt mitwächst (keine externe Library)
// Strg+Enter submittet das übergeordnete Formular, Enter macht Zeilenumbruch
import { useRef, useEffect } from 'react'

export default function AutoGrowTextarea({ value, onChange, placeholder, id, required }) {
  const ref = useRef(null)

  // Höhe bei jeder Wertänderung anpassen. scrollHeight enthält bei
  // box-sizing: border-box NICHT die Border – ohne den Aufschlag fehlen ein
  // paar Pixel und Windows zeigt dauerhaft einen Scrollbalken, der den
  // Placeholder abschneidet. Placeholder zählt mit, daher auch als Dependency.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const stil = window.getComputedStyle(el)
    const rahmen = parseFloat(stil.borderTopWidth) + parseFloat(stil.borderBottomWidth)
    el.style.height = `${el.scrollHeight + rahmen}px`
  }, [value, placeholder])

  // Strg+Enter submittet das Formular, plain Enter = Zeilenumbruch
  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const form = ref.current?.closest('form')
      if (!form) return
      // requestSubmit() führt HTML5-Validierung aus (Safari <16 kennt es nicht)
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit()
      } else {
        form.submit()
      }
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
