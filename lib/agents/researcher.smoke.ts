/**
 * Researcher Agent — findAestheticMatch() smoke tests
 * Superseded by __tests__/researcher.test.ts (vitest)
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

// ─── LLM-based id lookup ────────────────────────────────────────────────────

console.log('\n── Valid id lookup ──')

assert("'terrain-luxe' id → matched, Terrain Luxe", () => {
  const r = findAestheticMatch('terrain-luxe', 'Terrain Luxe')
  notNull(r.matched, 'matched')
  eq(r.matched!.id, 'terrain-luxe')
  eq(r.is_proxy, false)
})

assert("'quiet-structure' id + different input → is_proxy true", () => {
  const r = findAestheticMatch('quiet-structure', 'old money vibes')
  notNull(r.matched, 'matched')
  eq(r.matched!.id, 'quiet-structure')
  eq(r.is_proxy, true)
  eq(r.proxy_source, 'old money vibes')
})

// ─── Invalid / null id ──────────────────────────────────────────────────────

console.log('\n── Null / invalid id ──')

assert("null id → matched null", () => {
  const r = findAestheticMatch(null, 'anything')
  eq(r.matched, null)
  eq(r.is_proxy, false)
})

assert("nonexistent id → matched null", () => {
  const r = findAestheticMatch('fake-id', 'anything')
  eq(r.matched, null)
  eq(r.is_proxy, false)
})

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
