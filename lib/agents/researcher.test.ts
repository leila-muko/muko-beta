/**
 * Researcher Agent — findAestheticMatch() tests
 * Run with: npx tsx lib/agents/researcher.test.ts
 */
import { findAestheticMatch } from './researcher'

let passed = 0
let failed = 0

function assert(label: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  PASS  ${label}`)
  } catch (e: unknown) {
    failed++
    console.log(`  FAIL  ${label}`)
    console.log(`        ${(e as Error).message}`)
  }
}

function eq(actual: unknown, expected: unknown, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function notNull(val: unknown, msg = '') {
  if (val == null) throw new Error(`${msg ? msg + ': ' : ''}expected non-null value`)
}

// ─── Exact matches ───────────────────────────────────────────────────────────

console.log('\n── Exact matches ──')

assert("'Terrain Luxe' → exact, 100", () => {
  const r = findAestheticMatch('terrain-luxe', 'Terrain Luxe')
  eq(r.is_proxy, false)
  eq(r.matched?.id, 'terrain-luxe')
})

assert("'quiet structure' → exact, 100", () => {
  const r = findAestheticMatch('quiet-structure', 'quiet structure')
  eq(r.is_proxy, false)
  eq(r.matched?.id, 'quiet-structure')
})

// ─── Alias matches ───────────────────────────────────────────────────────────

console.log('\n── Alias matches ──')

assert("'gorpcore' → terrain-luxe, alias", () => {
  const r = findAestheticMatch('terrain-luxe', 'gorpcore')
  eq(r.matched?.id, 'terrain-luxe')
  eq(r.is_proxy, true)
})

assert("'quiet luxury' → quiet-structure, alias", () => {
  const r = findAestheticMatch('quiet-structure', 'quiet luxury')
  eq(r.matched?.id, 'quiet-structure')
  eq(r.is_proxy, true)
})

assert("'dark academia' → romantic-analog, alias", () => {
  const r = findAestheticMatch('romantic-analog', 'dark academia')
  eq(r.matched?.id, 'romantic-analog')
  eq(r.is_proxy, true)
})

assert("'kawaii' → sweet-subversion, alias", () => {
  const r = findAestheticMatch('sweet-subversion', 'kawaii')
  eq(r.matched?.id, 'sweet-subversion')
  eq(r.is_proxy, true)
})

// ─── Keyword matches ─────────────────────────────────────────────────────────

console.log('\n── Keyword matches (ambiguous — must pick right one) ──')

assert("'minimalist architectural structure' → quiet-structure", () => {
  const r = findAestheticMatch('quiet-structure', 'minimalist architectural structure')
  eq(r.matched?.id, 'quiet-structure', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

assert("'artisanal handcrafted natural' → heritage-hand", () => {
  const r = findAestheticMatch('heritage-hand', 'artisanal handcrafted natural')
  eq(r.matched?.id, 'heritage-hand', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

assert("'bold maximalist expressive' → high-voltage", () => {
  const r = findAestheticMatch('high-voltage', 'bold maximalist expressive')
  eq(r.matched?.id, 'high-voltage', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

// ─── Chip keyword matches ────────────────────────────────────────────────────

console.log('\n── Chip keyword matches ──')

assert("'inflated forms' → haptic-play, chip_keyword", () => {
  const r = findAestheticMatch('haptic-play', 'inflated forms')
  eq(r.matched?.id, 'haptic-play', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

assert("'anti-fit tailoring' → undone-glam, chip_keyword", () => {
  const r = findAestheticMatch('undone-glam', 'anti-fit tailoring')
  eq(r.matched?.id, 'undone-glam', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

assert("'column silhouettes' → quiet-structure, chip_keyword", () => {
  const r = findAestheticMatch('quiet-structure', 'column silhouettes')
  eq(r.matched?.id, 'quiet-structure', 'id')
  eq(r.is_proxy, true, 'is_proxy')
})

// ─── No match — returns proxy ────────────────────────────────────────────────

console.log('\n── No match — returns proxy ──')

assert("'underwater goth' → none, has suggested_proxy and ui_message", () => {
  const r = findAestheticMatch(null, 'underwater goth')
  eq(r.matched, null)
})

assert("'regencycore' → none, has suggested_proxy", () => {
  const r = findAestheticMatch(null, 'regencycore')
  eq(r.matched, null)
})

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
