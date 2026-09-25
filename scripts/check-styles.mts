// Fails if the code uses a Tailwind arbitrary value (text-[..], bg-[#..], p-[..])
// or an inline style={{ }} — both banned by DESIGN-SYSTEM.md. New tokens go in the
// design system (globals.css / app/styles), not inline. Run: npm run check:styles
//
// One exception (DESIGN-SYSTEM.md «Проверка стилей»): an inline style whose keys
// are ALL CSS custom properties, e.g. style={{ '--i': index }}. That passes data
// to a rule in the stylesheet (stagger delays, progress); it never styles.
//
// Outside the admin (which is out of the v2 redesign) the pre-v2 blue system is
// banned too: Tailwind's stock palette colours (slate-*, blue-*, …) and the
// legacy tokens (text-body, rounded-card, accent, focus-ring, press…). v2 uses
// its own tokens and the component classes in app/styles.

import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app', 'components']

// Utility families that must not carry an arbitrary [..] value.
const ARBITRARY =
  /\b(?:text|bg|border|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|inset|leading|tracking|grid-cols|grid-rows|aspect|z|opacity|flex|basis|size)-\[[^\]]+\]/
const INLINE_STYLE = /style=\{\{/
const STOCK_PALETTE =
  /\b(?:text|bg|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|decoration|shadow|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
const LEGACY_TOKEN =
  /(?<![\w-])(?:text-(?:body|meta|title|h2|section|label)|rounded-(?:card|control|photo)|(?:bg|text|border|ring)-accent(?:-soft)?|focus-ring|press|border-medium|toggle-3d|field-action)(?![\w-])/
const isAdmin = (file: string) => /[\\/]\(admin\)[\\/]|[\\/]components[\\/]admin[\\/]/.test(file)
// Object literal made only of '--custom-property': value pairs.
const CUSTOM_PROPS_ONLY = /^\s*(?:(['"])--[a-z0-9-]+\1\s*:\s*(?:`[^`]*`|[^,}`]+),?\s*)+$/i

// The style object's source, from `style={{` to its closing `}}` (may span lines).
function styleObject(lines: string[], i: number): string {
  let text = lines[i].slice(lines[i].indexOf('style={{') + 'style={{'.length)
  const end = () => text.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)).indexOf('}}')
  for (let j = i + 1; end() < 0 && j < lines.length; j++) text += ' ' + lines[j]
  return text.slice(0, end())
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return e.name.endsWith('.tsx') ? [p] : []
  })
}

const problems: string[] = []
for (const root of ROOTS) {
  for (const file of walk(path.join(import.meta.dirname, '..', root))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (ARBITRARY.test(line)) problems.push(`${file}:${i + 1}  arbitrary value: ${line.trim()}`)
      if (!isAdmin(file) && (STOCK_PALETTE.test(line) || LEGACY_TOKEN.test(line))) {
        problems.push(`${file}:${i + 1}  pre-v2 class outside the admin: ${line.trim()}`)
      }
      if (INLINE_STYLE.test(line) && !CUSTOM_PROPS_ONLY.test(styleObject(lines, i))) {
        problems.push(`${file}:${i + 1}  inline style: ${line.trim()}`)
      }
    })
  }
}

if (problems.length) {
  console.error('✗ design-system violations:\n' + problems.join('\n'))
  console.error(
    `\n${problems.length} found. Use a palette/scale class or add a token to the design system.`,
  )
  process.exit(1)
}
console.log('✓ no arbitrary Tailwind values, inline styles or pre-v2 classes outside the admin')
