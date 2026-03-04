#!/usr/bin/env npx tsx
// scripts/test-synthesizer-templates.ts
// Standalone test for generateTemplateNarrative() — no test framework required.
// Run with: npx tsx scripts/test-synthesizer-templates.ts
//
// Covers all 7 branches:
//   HIGH + amplify, HIGH + differentiate
//   MODERATE + invest (cost gate fail), MODERATE + constrain (cost gate pass)
//   LOW identity-weakest, LOW resonance-weakest, LOW execution-weakest
// Then runs a tone audit and prints a pass/fail summary.

import {
  generateTemplateNarrative,
  type NarrativeInput,
  type NarrativeAestheticContext,
} from '../lib/agents/synthesizer';
import type { InsightData } from '../lib/types/insight';

// ─────────────────────────────────────────────
// ANSI COLOURS
// ─────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};

const PASS  = `${C.green}✓ PASS${C.reset}`;
const FAIL  = (msg: string) => `${C.red}✗ FAIL  ${msg}${C.reset}`;
const WARN  = (msg: string) => `${C.yellow}⚠ WARN  ${msg}${C.reset}`;
const LABEL = (s: string)   => `${C.cyan}${s}${C.reset}`;
const HR    = (n = 70)      => `${C.dim}${'─'.repeat(n)}${C.reset}`;

// ─────────────────────────────────────────────
// AESTHETIC FIXTURES
// Real data from data/aesthetics.json
// ─────────────────────────────────────────────

// HIGH-SATURATION — quiet-structure, saturation_score: 72, trend_velocity: "peak"
const quietStructure: NarrativeAestheticContext = {
  id: 'quiet-structure',
  name: 'Quiet Structure',
  seen_in: ['Toteme', 'Khaite', 'COS', 'Rohe', 'The Row'],
  consumer_insight:
    'Driven by the desire for visual silence and internal authority in a world of algorithm fatigue. These clothes provide calm and control, allowing the wearer to feel composed and intentional without dressing for external approval.',
  risk_factors: [
    'High saturation means consumer fatigue is a real threat unless differentiated through superior fit',
    'Risk of being perceived as generic or safe if not executed with visible quality',
    'Brands at lower contemporary price points may struggle to convey value in simple silhouettes',
  ],
  seasonal_relevance: { ss26: 5, fw26: 5 },
  adjacent_directions: ['terrain-luxe', 'high-voltage'],
};

// EMERGING — haptic-play, saturation_score: 32, trend_velocity: "ascending"
const hapticPlay: NarrativeAestheticContext = {
  id: 'haptic-play',
  name: 'Haptic Play',
  seen_in: ['Loewe', 'UGG', 'Coperni', 'JW Anderson', 'Melissa'],
  consumer_insight:
    'Physical experience is becoming the new measure of product value as consumers seek counterbalances to constant digital stimulation.',
  risk_factors: [
    'Risk of perceived immaturity or fast-fashion quality at bridge price points',
    'Sensory materials must be grounded in sophisticated design to justify pricing',
    'Limited FW26 relevance may reduce commercial viability for fall collections',
  ],
  seasonal_relevance: { ss26: 5, fw26: 3 },
  adjacent_directions: ['sweet-subversion', 'undone-glam'],
};

// ─────────────────────────────────────────────
// MATERIAL COST NOTES
// Real cost_range_note values from data/materials.json
// ─────────────────────────────────────────────

const SILK_COST_NOTE =
  '$28\u2013$55/yd mid-market wholesale (16\u201319mm charmeuse); subject to exchange rate volatility';
const ORGANIC_COTTON_COST_NOTE =
  '$12\u2013$18/yd mid-market wholesale (300\u2013500 yd MOQ, GOTS certified)';

// ─────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────

interface TestCase {
  id:    number;
  label: string;
  input: NarrativeInput;
}

const CASES: TestCase[] = [
  // ── Case 1: HIGH + amplify ──────────────────────────────────────────────
  {
    id: 1,
    label: 'HIGH (83) + amplify — quiet-structure, Reformation, FW26',
    input: {
      score:      83,
      dimensions: { identity_score: 88, resonance_score: 85, execution_score: 78 },
      gates:      { margin_gate_passed: true },
      mode:       'amplify',
      aesthetic:  quietStructure,
      brandName:  'Reformation',
      season:     'fw26',
    },
  },

  // ── Case 2: HIGH + differentiate ────────────────────────────────────────
  {
    id: 2,
    label: 'HIGH (84) + differentiate — quiet-structure, Reformation, FW26',
    input: {
      score:      84,
      dimensions: { identity_score: 91, resonance_score: 79, execution_score: 80 },
      gates:      { margin_gate_passed: true },
      mode:       'differentiate',
      aesthetic:  quietStructure,
      brandName:  'Reformation',
      season:     'fw26',
    },
  },

  // ── Case 3: MODERATE + invest, cost gate FAIL ───────────────────────────
  // Execution (55) is weakest; silk material note grounds the cost sentence
  {
    id: 3,
    label: 'MODERATE (62) + invest, cost gate FAIL (silk) — haptic-play, Dôen, SS26',
    input: {
      score:           62,
      dimensions:      { identity_score: 82, resonance_score: 71, execution_score: 55 },
      gates:           { margin_gate_passed: false },
      mode:            'invest',
      aesthetic:       hapticPlay,
      materialCostNote: SILK_COST_NOTE,
      brandName:       'Dôen',
      season:          'ss26',
    },
  },

  // ── Case 4: MODERATE + constrain, cost gate PASS ────────────────────────
  // Execution (58) is weakest; no cost pressure
  {
    id: 4,
    label: 'MODERATE (66) + constrain, cost gate PASS — haptic-play, Dôen, SS26',
    input: {
      score:      66,
      dimensions: { identity_score: 68, resonance_score: 72, execution_score: 58 },
      gates:      { margin_gate_passed: true },
      mode:       'constrain',
      aesthetic:  hapticPlay,
      brandName:  'Dôen',
      season:     'ss26',
    },
  },

  // ── Case 5: LOW — Identity is weakest (38) ──────────────────────────────
  // Exercises the identity-gap s1 branch in buildLow
  {
    id: 5,
    label: 'LOW (44) — Identity weakest (38) — haptic-play, Dôen, FW26 (reconsider)',
    input: {
      score:      44,
      dimensions: { identity_score: 38, resonance_score: 71, execution_score: 65 },
      gates:      { margin_gate_passed: true },
      mode:       'reconsider',
      aesthetic:  hapticPlay,
      brandName:  'Dôen',
      season:     'fw26',
    },
  },

  // ── Case 6: LOW — Resonance is weakest (32) ─────────────────────────────
  // Exercises the resonance-saturation s1 branch in buildLow
  {
    id: 6,
    label: 'LOW (41) — Resonance weakest (32) — quiet-structure, Reformation, FW26 (differentiate)',
    input: {
      score:      41,
      dimensions: { identity_score: 74, resonance_score: 32, execution_score: 68 },
      gates:      { margin_gate_passed: true },
      mode:       'differentiate',
      aesthetic:  quietStructure,
      brandName:  'Reformation',
      season:     'fw26',
    },
  },

  // ── Case 7: LOW — Execution is weakest (28), cost gate FAIL ─────────────
  // Exercises the execution-constraint s1 branch + cost gate in buildLow
  {
    id: 7,
    label: 'LOW (42) — Execution weakest (28), cost gate FAIL — quiet-structure, Reformation, FW26',
    input: {
      score:           42,
      dimensions:      { identity_score: 76, resonance_score: 70, execution_score: 28 },
      gates:           { margin_gate_passed: false },
      mode:            'constrain',
      aesthetic:       quietStructure,
      materialCostNote: ORGANIC_COTTON_COST_NOTE,
      brandName:       'Reformation',
      season:          'fw26',
    },
  },
];

// ─────────────────────────────────────────────
// STRUCTURE VALIDATION
// Checks InsightData shape against spec in lib/types/insight.ts
// ─────────────────────────────────────────────

interface StructureIssue {
  field:  string;
  detail: string;
}

function validateStructure(output: InsightData): StructureIssue[] {
  const issues: StructureIssue[] = [];

  if (!Array.isArray(output.statements)) {
    issues.push({ field: 'statements', detail: 'not an array' });
  } else {
    if (output.statements.length !== 3) {
      issues.push({ field: 'statements', detail: `expected 3, got ${output.statements.length}` });
    }
    output.statements.forEach((s, i) => {
      if (typeof s !== 'string' || s.trim() === '') {
        issues.push({ field: `statements[${i}]`, detail: 'empty or non-string' });
      }
    });
  }

  if (!Array.isArray(output.edit)) {
    issues.push({ field: 'edit', detail: 'not an array' });
  } else {
    if (output.edit.length !== 3) {
      issues.push({ field: 'edit', detail: `expected 3, got ${output.edit.length}` });
    }
    output.edit.forEach((e, i) => {
      if (typeof e !== 'string' || e.trim() === '') {
        issues.push({ field: `edit[${i}]`, detail: 'empty or non-string' });
      }
    });
  }

  if (typeof output.editLabel !== 'string') {
    issues.push({ field: 'editLabel', detail: 'not a string' });
  } else if (output.editLabel !== 'THE EDIT' && output.editLabel !== 'THE OPPORTUNITY') {
    issues.push({ field: 'editLabel', detail: `unexpected value: "${output.editLabel}"` });
  }

  if (!output.mode) {
    issues.push({ field: 'mode', detail: 'missing' });
  }

  return issues;
}

// ─────────────────────────────────────────────
// TONE AUDIT
// ─────────────────────────────────────────────

interface ToneViolation {
  rule:     string;
  location: string;
  excerpt:  string;
}

/** Checks a single string for all tone rules and returns any violations. */
function auditString(text: string, location: string): ToneViolation[] {
  const violations: ToneViolation[] = [];
  const snip = (s: string, n = 70) => s.length > n ? s.slice(0, n) + '…' : s;

  // ── RULE: no disallowed sentence openers ──────────────────────────────
  // A sentence start is: beginning of string, or end-of-sentence punctuation + whitespace.
  for (const word of ['unfortunately', 'however', 'but']) {
    // Match at string start or after ". " / "! " / "? "
    const re = new RegExp(`(?:^|[.!?]\\s+)${word}\\b`, 'i');
    if (re.test(text)) {
      violations.push({
        rule:     `sentence opens with "${word}"`,
        location,
        excerpt:  snip(text),
      });
    }
  }

  // ── RULE: no "your brand" ─────────────────────────────────────────────
  if (/\byour brand\b/i.test(text)) {
    violations.push({ rule: 'uses "your brand"', location, excerpt: snip(text) });
  }

  // ── RULE: no hedge phrases ────────────────────────────────────────────
  const hedges: Array<[string, RegExp]> = [
    ['"might"',              /\bmight\b/i],
    ['"could potentially"',  /\bcould potentially\b/i],
    ['"it seems"',           /\bit seems\b/i],
  ];
  for (const [label, re] of hedges) {
    if (re.test(text)) {
      violations.push({ rule: `hedge phrase ${label}`, location, excerpt: snip(text) });
    }
  }

  return violations;
}

/** Audits all strings in an InsightData output. */
function auditTone(output: InsightData): ToneViolation[] {
  const violations: ToneViolation[] = [];

  output.statements.forEach((s, i) => {
    violations.push(...auditString(s, `statements[${i}]`));
  });
  output.edit.forEach((e, i) => {
    violations.push(...auditString(e, `edit[${i}]`));
  });

  // ── RULE: max one redirect in statements[2] (s3) ──────────────────────
  // Redirect phrases are signals that a pivot is being suggested.
  const s3 = output.statements[2] ?? '';
  const redirectPatterns = [
    /offers a sharper\b/i,
    /is the clearest redirect\b/i,
    /works the same consumer\b/i,
    /addresses the same consumer\b/i,
    /worth comparing the two\b/i,
  ];
  const hits = redirectPatterns.filter(p => p.test(s3));
  if (hits.length > 1) {
    violations.push({
      rule:     `more than one redirect in statements[2] (${hits.length} patterns matched)`,
      location: 'statements[2]',
      excerpt:  s3.slice(0, 80),
    });
  }

  return violations;
}

// ─────────────────────────────────────────────
// DATA GAP CHECK
// ─────────────────────────────────────────────

function checkDataGaps(aesthetic: NarrativeAestheticContext): string[] {
  const gaps: string[] = [];
  if (!aesthetic.adjacent_directions?.length)
    gaps.push('adjacent_directions empty — redirect will fall back to repair-point copy');
  if (!aesthetic.consumer_insight?.trim())
    gaps.push('consumer_insight missing');
  if (!aesthetic.seen_in?.length)
    gaps.push('seen_in empty — market pair will use fallback text');
  if (!aesthetic.risk_factors?.length)
    gaps.push('risk_factors empty — risk will use fallback text');
  return gaps;
}

// ─────────────────────────────────────────────
// PRINT HELPERS
// ─────────────────────────────────────────────

function printOutput(output: InsightData): void {
  const scoreTier = (mode: string, editLabel: string) =>
    editLabel === 'THE OPPORTUNITY' ? `${C.green}THE OPPORTUNITY${C.reset}` : `${C.yellow}THE EDIT${C.reset}`;

  console.log(`  ${LABEL('editLabel')} ${scoreTier(output.mode, output.editLabel)}   ${LABEL('mode')} ${output.mode}`);
  console.log();

  console.log(`  ${C.bold}STATEMENTS${C.reset}`);
  output.statements.forEach((s, i) => {
    // Wrap to ~90 chars for readability
    const wrapped = s.replace(/(.{1,90})(?:\s|$)/g, '\n    $1').trim();
    console.log(`  [${i + 1}] ${wrapped}`);
  });

  console.log();
  console.log(`  ${C.bold}${output.editLabel}${C.reset}`);
  output.edit.forEach((e) => {
    const wrapped = e.replace(/(.{1,88})(?:\s|$)/g, '\n    $1').trim();
    console.log(`  •  ${wrapped}`);
  });
}

function divider(title: string): void {
  const maxLen  = Math.max(70, title.length + 8);
  const titleStr = ` CASE ${title} `;
  const padLeft  = Math.floor((maxLen - titleStr.length) / 2);
  const padRight = Math.max(0, maxLen - titleStr.length - padLeft);
  console.log(
    `\n${C.bold}${'═'.repeat(padLeft)}${titleStr}${'═'.repeat(padRight)}${C.reset}`
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

console.log(`\n${C.bold}${C.white}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.bold}${C.white}║   MUKO SYNTHESIZER — Template Narrative Test Runner          ║${C.reset}`);
console.log(`${C.bold}${C.white}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
console.log(`${C.dim}  generateTemplateNarrative() · 7 branches · tone audit + structure check${C.reset}\n`);

// ── DATA GAP PRE-CHECK ─────────────────────────────────────────────────────
const fixtures: Array<{ name: string; aesthetic: NarrativeAestheticContext }> = [
  { name: 'quiet-structure', aesthetic: quietStructure },
  { name: 'haptic-play',     aesthetic: hapticPlay },
];
const allGaps = fixtures.flatMap(f =>
  checkDataGaps(f.aesthetic).map(w => `${f.name}: ${w}`)
);
if (allGaps.length > 0) {
  console.log(HR());
  console.log(`${C.yellow}DATA GAP WARNINGS (pre-run):${C.reset}`);
  allGaps.forEach(g => console.log(`  ${WARN(g)}`));
  console.log(HR());
} else {
  console.log(`${PASS} ${C.dim}All fixture fields populated — no data gaps${C.reset}`);
}

// ── RUN CASES ─────────────────────────────────────────────────────────────

interface CaseResult {
  id:              number;
  label:           string;
  toneViolations:  ToneViolation[];
  structureIssues: StructureIssue[];
}

const results: CaseResult[] = [];

for (const tc of CASES) {
  divider(`${tc.id}: ${tc.label}`);
  console.log();

  let output: InsightData;
  try {
    output = generateTemplateNarrative(tc.input);
  } catch (err) {
    console.log(FAIL(`generateTemplateNarrative threw: ${err}`));
    results.push({ id: tc.id, label: tc.label, toneViolations: [], structureIssues: [{ field: 'runtime', detail: String(err) }] });
    continue;
  }

  printOutput(output);

  const toneViolations  = auditTone(output);
  const structureIssues = validateStructure(output);
  results.push({ id: tc.id, label: tc.label, toneViolations, structureIssues });

  console.log();
  console.log(`  ${HR(66)}`);
  if (toneViolations.length === 0 && structureIssues.length === 0) {
    console.log(`  ${PASS}`);
  } else {
    toneViolations.forEach(v => {
      console.log(`  ${FAIL(`[tone] ${v.rule}`)}`);
      console.log(`         ${C.dim}location: ${v.location}${C.reset}`);
      console.log(`         ${C.dim}excerpt:  "${v.excerpt}"${C.reset}`);
    });
    structureIssues.forEach(s => {
      console.log(`  ${FAIL(`[shape] ${s.field}: ${s.detail}`)}`);
    });
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────

const passing = results.filter(r => r.toneViolations.length === 0 && r.structureIssues.length === 0);
const failing  = results.filter(r => r.toneViolations.length > 0  || r.structureIssues.length > 0);

console.log(`\n${C.bold}${'═'.repeat(70)}${C.reset}`);
console.log(`${C.bold}  SUMMARY${C.reset}`);
console.log(`${'─'.repeat(70)}`);
console.log();

const scoreColor = passing.length === CASES.length ? C.green : C.red;
console.log(`  ${C.bold}Tone + shape audit: ${scoreColor}${passing.length}/${CASES.length} cases passed${C.reset}`);

if (failing.length > 0) {
  console.log();
  console.log(`  ${C.bold}Failing cases:${C.reset}`);
  for (const r of failing) {
    console.log(`  ${C.red}Case ${r.id}${C.reset}  ${r.label}`);
    r.toneViolations.forEach(v =>
      console.log(`    ${C.dim}[tone]  ${v.rule}  (${v.location})${C.reset}`)
    );
    r.structureIssues.forEach(s =>
      console.log(`    ${C.dim}[shape] ${s.field}: ${s.detail}${C.reset}`)
    );
  }
}

if (allGaps.length > 0) {
  console.log();
  console.log(`  ${C.bold}Data gap warnings:${C.reset}`);
  allGaps.forEach(g => console.log(`  ${C.dim}· ${g}${C.reset}`));
} else {
  console.log();
  console.log(`  ${C.green}✓${C.reset} ${C.dim}All fixture fields populated — no data gaps${C.reset}`);
}

console.log();
console.log(`  ${C.dim}Aesthetics: quiet-structure (saturation 72, peak) · haptic-play (saturation 32, ascending)${C.reset}`);
console.log(`  ${C.dim}Materials:  silk ($28–$55/yd) · organic-cotton ($12–$18/yd)${C.reset}`);
console.log();
console.log(HR());
console.log();
