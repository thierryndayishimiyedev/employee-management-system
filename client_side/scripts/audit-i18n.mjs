/*
 * Development guard for visible JSX literals. It intentionally reports rather
 * than rewrites strings: each result must become a stable t('key') entry.
 * Run with `npm run i18n:audit` before merging UI work.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')
const sourceFiles = async (folder) => {
  const entries = await readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? sourceFiles(join(folder, entry.name)) : /\.(jsx|tsx)$/.test(entry.name) ? [join(folder, entry.name)] : []))
  return nested.flat()
}
const lineOf = (text, index) => text.slice(0, index).split('\n').length
const ignored = (value) => !/[A-Za-z]{3}/.test(value) || /^(RWF|MTN|EN|RW|FR|DAY|NIGHT)$/.test(value.trim())
const findings = []
for (const file of await sourceFiles(root)) {
  if (file.endsWith('context/i18n.js')) continue
  const text = await readFile(file, 'utf8')
  // Text nodes and the high-value attributes that users can see.
  const patterns = [
    // A direct JSX text node. Do not permit newlines or braces here: those
    // are normally JavaScript expressions and would create false positives.
    />([A-Za-z][^<{}\n]{2,})</g,
    /\b(?:placeholder|title|aria-label|alt)=['"]([^'"]{3,})['"]/g,
    /\b(?:toast\.(?:success|error)|alert|confirm|prompt)\(\s*['"]([^'"]{3,})['"]/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1].trim()
      if (!ignored(value)) findings.push(`${relative(process.cwd(), file)}:${lineOf(text, match.index)}  ${value}`)
    }
  }
}
if (findings.length) {
  console.error(`[i18n] Found ${findings.length} visible literal(s). Replace each with t('section.key').`)
  console.error(findings.join('\n'))
  process.exitCode = 1
} else console.log('[i18n] No visible JSX literals found.')
