import { createContext, useContext, useEffect, useState } from 'react'

const LanguageContext = createContext(null)

export const translations = {
  en: {
    Dashboard: 'Dashboard', Companies: 'Companies', Owners: 'Owners', Admins: 'Admins',
    Mines: 'Mines', Departments: 'Departments', Positions: 'Positions', Attendance: 'Attendance',
    Production: 'Production', Workers: 'Workers', Payroll: 'Payroll', Advances: 'Advances',
    Payments: 'Payments', Reports: 'Reports', Downloads: 'Downloads', Managers: 'Managers',
    Accountants: 'Accountants', Roles: 'Roles', Workspace: 'Workspace', Collapse: 'Collapse',
    English: 'English', Kinyarwanda: 'Kinyarwanda'
  },
  rw: {
    Dashboard: 'Ikibaho', Companies: 'Amasosiyete', Owners: 'Ba nyirayo', Admins: 'Abayobozi',
    Mines: 'Ibirombe', Departments: 'Amashami', Positions: 'Imyanya y’akazi', Attendance: 'Uko abakozi bitabira',
    Production: 'Umusaruro', Workers: 'Abakozi', Payroll: 'Imishahara', Advances: 'Inguzanyo z’umushahara',
    Payments: 'Kwishyura', Reports: 'Raporo', Downloads: 'Ibikururwa', Managers: 'Abayobozi b’ikorwa',
    Accountants: 'Ababaruramari', Roles: 'Inshingano', Workspace: 'Aho ukorera', Collapse: 'Guhisha',
    English: 'Icyongereza', Kinyarwanda: 'Ikinyarwanda'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('minewise_language') || 'en')
  useEffect(() => {
    localStorage.setItem('minewise_language', language)
    document.documentElement.lang = language === 'rw' ? 'rw' : 'en'
  }, [language])
  const t = (key) => translations[language]?.[key] || translations.en[key] || key
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
