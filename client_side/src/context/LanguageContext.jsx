import { createContext, useContext, useEffect, useState } from 'react'
import { auditDictionaries, translate } from './i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setCurrentLanguage] = useState(() => {
    const stored = localStorage.getItem('minewise_language')
    return ['en', 'rw', 'fr'].includes(stored) ? stored : 'en'
  })
  useEffect(() => {
    localStorage.setItem('minewise_language', language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    const missing = auditDictionaries()
    if (missing.length) throw new Error(`[i18n] Incomplete dictionaries: ${missing.join(', ')}`)
  }, [])

  // Switching is global and immediate. Components render translation keys;
  // the provider intentionally never mutates DOM text or applies phrase maps.
  const setLanguage = (next) => {
    if (!['en', 'rw', 'fr'].includes(next)) return
    if (next === language) return
    localStorage.setItem('minewise_language', next)
    setCurrentLanguage(next)
  }
  const t = (key, values) => translate(key, language, values)
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
