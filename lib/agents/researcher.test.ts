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
  const r = findAestheticMatch('Terrain Luxe')
  eq(r.match_type, 'exact')
  eq(r.confidence_score, 100)
  eq(r.match?.id, 'terrain-luxe')
})

assert("'quiet structure' → exact, 100", () => {
  const r = findAestheticMatch('quiet structure')
  eq(r.match_type, 'exact')
  eq(r.confidence_score, 100)
  eq(r.match?.id, 'quiet-structure')
})

// ─── Alias matches ───────────────────────────────────────────────────────────

console.log('\n── Alias matches ──')

assert("'gorpcore' → terrain-luxe, alias", () => {
  const r = findAestheticMatch('gorpcore')
  eq(r.match?.id, 'terrain-luxe')
  eq(r.match_type, 'alias')
  eq(r.confidence_score, 90)
})

assert("'quiet luxury' → quiet-structure, alias", () => {
  const r = findAestheticMatch('quiet luxury')
  eq(r.match?.id, 'quiet-structure')
  eq(r.match_type, 'alias')
  eq(r.confidence_score, 90)
})

assert("'dark academia' → romantic-analog, alias", () => {
  const r = findAestheticMatch('dark academia')
  eq(r.match?.id, 'romantic-analog')
  eq(r.match_type, 'alias')
  eq(r.confidence_score, 90)
})

assert("'kawaii' → sweet-subversion, alias", () => {
  const r = findAestheticMatch('kawaii')
  eq(r.match?.id, 'sweet-subversion')
  eq(r.match_type, 'alias')
  eq(r.confidence_score, 90)
})

// ─── Keyword matches ─────────────────────────────────────────────────────────

console.log('\n── Keyword matches (ambiguous — must pick right one) ──')

assert("'minimalist architectural structure' → quiet-structure", () => {
  const r = findAestheticMatch('minimalist architectural structure')
  eq(r.match?.id, 'quiet-structure', 'id')
  eq(r.match_type, 'keyword', 'match_type')
})

assert("'artisanal handcrafted natural' → heritage-hand", () => {
  const r = findAestheticMatch('artisanal handcrafted natural')
  eq(r.match?.id, 'heritage-hand', 'id')
  eq(r.match_type, 'keyword', 'match_type')
})

assert("'bold maximalist expressive' → high-voltage", () => {
  const r = findAestheticMatch('bold maximalist expressive')
  eq(r.match?.id, 'high-voltage', 'id')
  eq(r.match_type, 'keyword', 'match_type')
})

// ─── Chip keyword matches ────────────────────────────────────────────────────

console.log('\n── Chip keyword matches ──')

assert("'inflated forms' → haptic-play, chip_keyword", () => {
  const r = findAestheticMatch('inflated forms')
  eq(r.match?.id, 'haptic-play', 'id')
  eq(r.match_type, 'chip_keyword', 'match_type')
  eq(r.confidence_score, 70)
})

assert("'anti-fit tailoring' → undone-glam, chip_keyword", () => {
  const r = findAestheticMatch('anti-fit tailoring')
  eq(r.match?.id, 'undone-glam', 'id')
  eq(r.match_type, 'chip_keyword', 'match_type')
})

assert("'column silhouettes' → quiet-structure, chip_keyword", () => {
  const r = findAestheticMatch('column silhouettes')
  eq(r.match?.id, 'quiet-structure', 'id')
  eq(r.match_type, 'chip_keyword', 'match_type')
})

// ─── No match — returns proxy ────────────────────────────────────────────────

console.log('\n── No match — returns proxy ──')

assert("'underwater goth' → none, has suggested_proxy and ui_message", () => {
  const r = findAestheticMatch('underwater goth')
  eq(r.match_type, 'none')
  notNull(r.suggested_proxy, 'suggested_proxy')
  notNull(r.ui_message, 'ui_message')
})

assert("'regencycore' → none, has suggested_proxy", () => {
  const r = findAestheticMatch('regencycore')
  eq(r.match_type, 'none')
  notNull(r.suggested_proxy, 'suggested_proxy')
})

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
