import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { translate } from './i18n'

const LanguageContext = createContext(null)

const shouldSkip = (node) => ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.parentElement?.tagName) || node.parentElement?.closest('[data-i18n-skip]')

export function LanguageProvider({ children }) {
  const [language] = useState(() => {
    const stored = localStorage.getItem('minewise_language')
    return ['en', 'rw', 'fr'].includes(stored) ? stored : 'en'
  })
  const originalText = useRef(new WeakMap())
  const originalAttributes = useRef(new WeakMap())

  useEffect(() => {
    localStorage.setItem('minewise_language', language)
    document.documentElement.lang = language
    const apply = (root = document.body) => {
      if (!root) return
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      const nodes = []; let node
      while ((node = walker.nextNode())) nodes.push(node)
      nodes.forEach((textNode) => {
        if (!textNode.nodeValue?.trim() || shouldSkip(textNode)) return
        if (!originalText.current.has(textNode)) originalText.current.set(textNode, textNode.nodeValue)
        textNode.nodeValue = translate(originalText.current.get(textNode), language)
      })
      root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach((element) => {
        if (element.closest('[data-i18n-skip]')) return
        let attrs = originalAttributes.current.get(element)
        if (!attrs) { attrs = new Map(); originalAttributes.current.set(element, attrs) }
        ;['placeholder', 'title', 'aria-label'].forEach((attribute) => {
          const value = element.getAttribute(attribute)
          if (value === null) return
          if (!attrs.has(attribute)) attrs.set(attribute, value)
          element.setAttribute(attribute, translate(attrs.get(attribute), language))
        })
      })
    }
    apply()
    const observer = new MutationObserver(() => apply())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  // Reloading after a language change restores original React text cleanly,
  // then applies the selected language to every mounted screen.
  const setLanguage = (next) => {
    if (!['en', 'rw', 'fr'].includes(next)) return
    if (next === language) return
    localStorage.setItem('minewise_language', next)
    window.location.reload()
  }
  const t = (value) => translate(value, language)
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
