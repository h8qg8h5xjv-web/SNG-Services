// Fails if the code uses a Tailwind arbitrary value (text-[..], bg-[#..], p-[..])
// or an inline style={{ }} — both banned by DESIGN-SYSTEM §8. New tokens go in the
// design system (globals.css), not inline. Run: npm run check:styles

import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app', 'components']

// Utility families that must not carry an arbitrary [..] value.
const ARBITRARY =
  /\b(?:text|bg|border|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|inset|leading|tracking|grid-cols|grid-rows|aspect|z|opacity|flex|basis|size)-\[[^\]]+\]/
const INLINE_STYLE = /style=\{\{/

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
      if (INLINE_STYLE.test(line)) problems.push(`${file}:${i + 1}  inline style: ${line.trim()}`)
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
console.log('✓ no arbitrary Tailwind values or inline styles')
