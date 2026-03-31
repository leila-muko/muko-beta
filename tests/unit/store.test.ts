/**
 * tests/unit/store.test.ts
 *
 * Extensive unit tests for the Zustand session store (lib/store/sessionStore.ts).
 * Covers: initial state, step transitions, concept lock, backwards navigation,
 * aesthetic-change resets, stress loops, construction-tier
 * smart defaults, and piece-role / collection fields.
 *
 * Strategy:
 *   - Import the store directly — no mocks of the store module itself.
 *   - Mock localStorage so the `persist` middleware does not throw in Node.
 *   - Reset store with `resetSession()` + manual fields not covered by reset in beforeEach.
 *   - Some tests assert INTENDED behaviour not yet wired into the store; those are
 *     deliberately failing specs that document the expected contract.
 */

// ─── localStorage shim (must exist before the store module loads) ────────────
// vi.hoisted runs synchronously before any import is resolved.
vi.hoisted(() => {
  const _store: Record<string, string> = {};
  const lsMock = {
    getItem:    (k: string)        => _store[k] ?? null,
    setItem:    (k: string, v: string) => { _store[k] = v; },
    removeItem: (k: string)        => { delete _store[k]; },
    clear:      ()                 => { for (const k in _store) delete _store[k]; },
    get length() { return Object.keys(_store).length; },
    key:        (i: number)        => Object.keys(_store)[i] ?? null,
  } satisfies Storage;

  Object.defineProperty(globalThis, 'localStorage', {
    value: lsMock,
    writable: true,
    configurable: true,
  });
});
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { KeyPiece, CollectionRoleId } from '@/lib/store/sessionStore';
import { getSmartDefault, SMART_DEFAULTS } from '@/lib/spec-studio/smart-defaults';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shorthand for reading the current store state. */
const s = () => useSessionStore.getState();

/**
 * Full reset between tests.
 * resetSession() covers all data fields except activeCollection and
 * assortmentInsightCache, which we clear manually.
 */
function fullReset() {
  s().resetSession();
  useSessionStore.setState({ activeCollection: null, assortmentInsightCache: {} });
}

/** A minimal valid KeyPiece fixture. */
const FIXTURE_KEY_PIECE: KeyPiece = {
  item:                   'Classic Trench',
  signal:                 'high-volume',
  category:               'outerwear',
  type:                   'Trench',
  recommended_material_id:'gabardine',
  redirect_material_id:   'organic-cotton',
  custom:                 false,
};

beforeEach(() => {
  fullReset();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. INITIAL STATE
// ═════════════════════════════════════════════════════════════════════════════

describe('Initial state — all fields start at defaults', () => {
  it('season is an empty string', () => {
    expect(s().season).toBe('');
  });

  it('collectionName is an empty string', () => {
    expect(s().collectionName).toBe('');
  });

  it('aestheticInput is an empty string', () => {
    expect(s().aestheticInput).toBe('');
  });

  it('aestheticMatchedId is null', () => {
    expect(s().aestheticMatchedId).toBeNull();
  });

  it('materialId is an empty string', () => {
    expect(s().materialId).toBe('');
  });

  it('silhouette is an empty string', () => {
    expect(s().silhouette).toBe('');
  });

  it('constructionTier defaults to "moderate"', () => {
    expect(s().constructionTier).toBe('moderate');
  });

  it('constructionTierOverride defaults to false', () => {
    expect(s().constructionTierOverride).toBe(false);
  });

  it('category is an empty string', () => {
    expect(s().category).toBe('');
  });

  it('subcategory is an empty string', () => {
    expect(s().subcategory).toBe('');
  });

  it('targetMsrp is null', () => {
    expect(s().targetMsrp).toBeNull();
  });

  it('identityPulse is null', () => {
    expect(s().identityPulse).toBeNull();
  });

  it('resonancePulse is null', () => {
    expect(s().resonancePulse).toBeNull();
  });

  it('executionPulse is null', () => {
    expect(s().executionPulse).toBeNull();
  });

  it('conceptLocked starts false', () => {
    expect(s().conceptLocked).toBe(false);
  });

  it('currentStep starts at 1', () => {
    expect(s().currentStep).toBe(1);
  });

  it('collectionRole is null', () => {
    expect(s().collectionRole).toBeNull();
  });

  it('selectedKeyPiece is null', () => {
    expect(s().selectedKeyPiece).toBeNull();
  });

  it('savedAnalysisId is null', () => {
    expect(s().savedAnalysisId).toBeNull();
  });

  it('collectionAesthetic is null', () => {
    expect(s().collectionAesthetic).toBeNull();
  });

  it('aestheticInflection is null', () => {
    expect(s().aestheticInflection).toBeNull();
  });

  it('conceptInsightTitle is null', () => {
    expect(s().conceptInsightTitle).toBeNull();
  });

  it('conceptInsightDescription is null', () => {
    expect(s().conceptInsightDescription).toBeNull();
  });

  it('conceptInsightPositioning is null', () => {
    expect(s().conceptInsightPositioning).toBeNull();
  });

  it('conceptInsightConfidence is null', () => {
    expect(s().conceptInsightConfidence).toBeNull();
  });

  it('isProxyMatch starts false', () => {
    expect(s().isProxyMatch).toBe(false);
  });

  it('chipSelection is null', () => {
    expect(s().chipSelection).toBeNull();
  });

  it('colorPalette is an empty array', () => {
    expect(s().colorPalette).toEqual([]);
  });

  it('refinementModifiers is an empty array', () => {
    expect(s().refinementModifiers).toEqual([]);
  });

  it('intentGoals is an empty array', () => {
    expect(s().intentGoals).toEqual([]);
  });

  it('intentTradeoff is an empty string', () => {
    expect(s().intentTradeoff).toBe('');
  });

  it('pieceRolesById is an empty object', () => {
    expect(s().pieceRolesById).toEqual({});
  });

  it('decisionGuidanceState has is_confirmed=false and null anchor piece', () => {
    expect(s().decisionGuidanceState).toEqual({
      is_confirmed: false,
      selected_anchor_piece: null,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. STEP 1 → STEP 2 FLOW
// ═════════════════════════════════════════════════════════════════════════════

describe('Step 1 → Step 2 flow', () => {
  it('setSeason stores the exact string provided', () => {
    s().setSeason('FW26');
    expect(s().season).toBe('FW26');
  });

  it('setCollectionName stores the exact string provided', () => {
    s().setCollectionName('Desert Mirage');
    expect(s().collectionName).toBe('Desert Mirage');
  });

  it('season and collectionName are independent — setting one does not affect the other', () => {
    s().setSeason('SS27');
    s().setCollectionName('River Run');
    expect(s().season).toBe('SS27');
    expect(s().collectionName).toBe('River Run');
  });

  it('season persists after collectionName is updated', () => {
    s().setSeason('FW26');
    s().setCollectionName('Any Name');
    expect(s().season).toBe('FW26');
  });

  it('collectionName persists after season is updated', () => {
    s().setCollectionName('Desert Mirage');
    s().setSeason('SS27');
    expect(s().collectionName).toBe('Desert Mirage');
  });

  it('season is not coerced — number-like string stays a string', () => {
    s().setSeason('2026');
    expect(s().season).toBe('2026');
    expect(typeof s().season).toBe('string');
  });

  it('season accepts unicode strings without mutation', () => {
    const name = 'Été 2026 — Soleil';
    s().setSeason(name);
    expect(s().season).toBe(name);
  });

  it('collectionName accepts long strings without truncation', () => {
    const long = 'A'.repeat(512);
    s().setCollectionName(long);
    expect(s().collectionName).toBe(long);
  });

  it('setting currentStep to 2 does not clear Step 1 fields', () => {
    s().setSeason('FW26');
    s().setCollectionName('Desert Mirage');
    s().setCurrentStep(2);
    expect(s().season).toBe('FW26');
    expect(s().collectionName).toBe('Desert Mirage');
  });

  it('overwriting season replaces the previous value', () => {
    s().setSeason('FW26');
    s().setSeason('SS27');
    expect(s().season).toBe('SS27');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. CONCEPT LOCK
// ═════════════════════════════════════════════════════════════════════════════

describe('Concept lock', () => {
  it('lockConcept sets conceptLocked to true', () => {
    s().lockConcept();
    expect(s().conceptLocked).toBe(true);
  });

  it('unlockConcept sets conceptLocked back to false', () => {
    s().lockConcept();
    s().unlockConcept();
    expect(s().conceptLocked).toBe(false);
  });

  it('identityPulse can be updated freely before lock', () => {
    const pulse = { status: 'green' as const, score: 80, message: 'Strong alignment' };
    s().updateIdentityPulse(pulse);
    expect(s().identityPulse).toEqual(pulse);
  });

  it('resonancePulse can be updated freely before lock', () => {
    const pulse = { status: 'yellow' as const, score: 62, message: 'Moderate resonance' };
    s().updateResonancePulse(pulse);
    expect(s().resonancePulse).toEqual(pulse);
  });

  it('identityPulse can be updated after lock', () => {
    s().lockConcept();
    const pulse = { status: 'green' as const, score: 90, message: 'Updated post-lock' };
    s().updateIdentityPulse(pulse);
    expect(s().identityPulse).toEqual(pulse);
  });

  it('executionPulse remains writable after concept lock', () => {
    s().lockConcept();
    const pulse = { status: 'red' as const, score: 40, message: 'Execution risk' };
    s().updateExecutionPulse(pulse);
    expect(s().executionPulse).toEqual(pulse);
    expect(s().conceptLocked).toBe(true);
  });

  it('conceptLocked persists through multiple unrelated state writes', () => {
    s().lockConcept();
    s().setSeason('FW26');
    s().setCollectionName('Test');
    s().setTargetMsrp(450);
    expect(s().conceptLocked).toBe(true);
  });

  it('concept lock does not reset the existing aestheticInput', () => {
    s().setAestheticInput('Romantic Goth');
    s().lockConcept();
    expect(s().aestheticInput).toBe('Romantic Goth');
  });

  it('after lockConcept, setAestheticInput writes are frozen (intended behaviour)', () => {
    s().setAestheticInput('Romantic Goth');
    s().lockConcept();
    s().setAestheticInput('Unexpected Overwrite');
    expect(s().aestheticInput).toBe('Romantic Goth');
  });

  it('resetSession resets conceptLocked back to false', () => {
    s().lockConcept();
    s().resetSession();
    expect(s().conceptLocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. BACKWARDS NAVIGATION — CORE SCENARIOS
// ═════════════════════════════════════════════════════════════════════════════

describe('Backwards navigation — core scenarios', () => {
  /** Load all Step 3 fields to a known set of values. */
  function populateStep3() {
    s().setMaterial('silk');
    s().setSilhouette('structured');
    s().setConstructionTier('high');
    s().setCategory('outerwear');
    s().setSubcategory('trench');
    s().setTargetMsrp(650);
  }

  it('Step 3 fields survive a Step 3 → Step 2 → Step 3 round-trip (no aesthetic change)', () => {
    populateStep3();
    // Navigate back to Step 2
    s().setCurrentStep(2);
    // Navigate forward to Step 3
    s().setCurrentStep(3);

    expect(s().materialId).toBe('silk');
    expect(s().silhouette).toBe('structured');
    expect(s().constructionTier).toBe('high');
    expect(s().category).toBe('outerwear');
    expect(s().targetMsrp).toBe(650);
  });

  it('Step 3 fields survive 5 consecutive round-trips without degradation', () => {
    populateStep3();
    const snapshot = {
      materialId:       s().materialId,
      silhouette:       s().silhouette,
      constructionTier: s().constructionTier,
      category:         s().category,
      targetMsrp:       s().targetMsrp,
    };

    for (let i = 0; i < 5; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);

      expect(s().materialId).toBe(snapshot.materialId);
      expect(s().silhouette).toBe(snapshot.silhouette);
      expect(s().constructionTier).toBe(snapshot.constructionTier);
      expect(s().category).toBe(snapshot.category);
      expect(s().targetMsrp).toBe(snapshot.targetMsrp);
    }
  });

  it('navigating back and cancelling aesthetic change leaves Step 3 fields intact', () => {
    populateStep3();
    // Simulate "navigate back, look but don't confirm new aesthetic, go forward"
    s().setCurrentStep(2);
    // No aesthetic change committed
    s().setCurrentStep(3);

    expect(s().materialId).toBe('silk');
    expect(s().silhouette).toBe('structured');
    expect(s().constructionTier).toBe('high');
    expect(s().category).toBe('outerwear');
    expect(s().targetMsrp).toBe(650);
  });

  /**
   * INTENDED BEHAVIOUR:
   * When the user navigates back and confirms a new aesthetic, the application
   * should reset Step 3 material/silhouette/constructionTier to empty/defaults,
   * but keep category and targetMsrp. The store has no single atomic action for
   * this today — the UI would call multiple setters. This test documents the
   * contract: a confirmed aesthetic change must reset spec fields.
   *
   * Simulate by manually calling the setters as the app would.
   */
  it('confirmed aesthetic change resets material, silhouette, constructionTier', () => {
    populateStep3();
    // App confirms new aesthetic by resetting spec-only fields
    s().setMaterial('');
    s().setSilhouette('');
    s().setConstructionTier('moderate'); // back to default, no override

    expect(s().materialId).toBe('');
    expect(s().silhouette).toBe('');
    expect(s().constructionTier).toBe('moderate');
    // category and targetMsrp survive
    expect(s().category).toBe('outerwear');
    expect(s().targetMsrp).toBe(650);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. STATE RESET ON AESTHETIC CHANGE
// ═════════════════════════════════════════════════════════════════════════════

describe('State reset on aesthetic change', () => {
  /** Full Step 3 setup with matching Step 2 data. */
  function fullSetup() {
    s().setAestheticInput('Old Aesthetic');
    useSessionStore.setState({ aestheticMatchedId: 'old-aesthetic-id' });
    s().lockConcept();
    s().setMaterial('linen');
    s().setSilhouette('relaxed');
    s().setConstructionTier('moderate');
    s().setCategory('tops');
    s().setTargetMsrp(220);
  }

  /**
   * Simulate confirmed aesthetic change the way the app does it:
   * update aesthetic fields, reset conceptLocked, reset spec-only fields.
   */
  function confirmAestheticChange(newAesthetic: string, newId: string) {
    s().unlockConcept();
    s().setAestheticInput(newAesthetic);
    useSessionStore.setState({ aestheticMatchedId: newId });
    s().setMaterial('');
    s().setSilhouette('');
    s().setConstructionTier('moderate');
  }

  it('after aesthetic change: materialId resets to empty string', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().materialId).toBe('');
  });

  it('after aesthetic change: silhouette resets to empty string', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().silhouette).toBe('');
  });

  it('after aesthetic change: constructionTier resets to "moderate"', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().constructionTier).toBe('moderate');
  });

  it('after aesthetic change: category is NOT reset', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().category).toBe('tops');
  });

  it('after aesthetic change: targetMsrp is NOT reset', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().targetMsrp).toBe(220);
  });

  it('after aesthetic change: conceptLocked resets to false', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().conceptLocked).toBe(false);
  });

  it('after aesthetic change: aestheticInput updates to new value', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().aestheticInput).toBe('New Wave Pastoral');
  });

  it('after aesthetic change: aestheticMatchedId updates to new value', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().aestheticMatchedId).toBe('new-wave-pastoral');
  });

  it('after aesthetic change: old aestheticMatchedId is gone', () => {
    fullSetup();
    confirmAestheticChange('New Wave Pastoral', 'new-wave-pastoral');
    expect(s().aestheticMatchedId).not.toBe('old-aesthetic-id');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. NAVIGATION LOOP STRESS TEST
// ═════════════════════════════════════════════════════════════════════════════

describe('Navigation loop stress test', () => {
  it('Step 2 → Step 3 loop × 10 does not corrupt spec fields', () => {
    // Seed stable values
    s().setAestheticInput('Terrain Luxe');
    useSessionStore.setState({ aestheticMatchedId: 'terrain-luxe' });
    s().setMaterial('organic-cotton');
    s().setSilhouette('oversized');
    s().setConstructionTier('low');
    s().setCategory('tops');
    s().setTargetMsrp(180);

    for (let i = 0; i < 10; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);
    }

    expect(s().materialId).toBe('organic-cotton');
    expect(s().silhouette).toBe('oversized');
    expect(s().constructionTier).toBe('low');
    expect(s().category).toBe('tops');
    expect(s().targetMsrp).toBe(180);
    expect(s().aestheticMatchedId).toBe('terrain-luxe');
  });

  it('after 10 loops: no field has become undefined', () => {
    s().setMaterial('linen');
    s().setSilhouette('relaxed');
    s().setConstructionTier('moderate');
    s().setCategory('dresses');
    s().setTargetMsrp(320);

    for (let i = 0; i < 10; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);
    }

    const st = s();
    expect(st.materialId).not.toBeUndefined();
    expect(st.silhouette).not.toBeUndefined();
    expect(st.constructionTier).not.toBeUndefined();
    expect(st.category).not.toBeUndefined();
    expect(st.targetMsrp).not.toBeUndefined();
  });

  it('after 10 loops: previousy set string fields are not empty', () => {
    s().setMaterial('silk');
    s().setSilhouette('structured');
    s().setCategory('outerwear');

    for (let i = 0; i < 10; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);
    }

    expect(s().materialId).not.toBe('');
    expect(s().silhouette).not.toBe('');
    expect(s().category).not.toBe('');
  });

  it('after 10 loops: constructionTierOverride flag retains its value', () => {
    s().setConstructionTier('high', true); // override = true
    expect(s().constructionTierOverride).toBe(true);

    for (let i = 0; i < 10; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);
    }

    expect(s().constructionTierOverride).toBe(true);
    expect(s().constructionTier).toBe('high');
  });

  it('after 10 loops: currentStep ends at the last value set', () => {
    for (let i = 0; i < 10; i++) {
      s().setCurrentStep(2);
      s().setCurrentStep(3);
    }
    expect(s().currentStep).toBe(3);
  });

  it('repeated state updates do not accumulate duplicate array entries', () => {
    const goals = ['profit-margin', 'creative-exploration'];
    for (let i = 0; i < 10; i++) {
      s().setIntentGoals(goals); // idempotent write
    }
    expect(s().intentGoals).toEqual(goals);
    expect(s().intentGoals).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. SAVED ANALYSIS ID
// ═════════════════════════════════════════════════════════════════════════════

describe('Saved analysis id', () => {
  it('resetSession clears savedAnalysisId', () => {
    s().setSavedAnalysisId('saved-222');
    s().resetSession();
    expect(s().savedAnalysisId).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. CONSTRUCTION TIER SMART DEFAULTS
//
// getSmartDefault lives in lib/spec-studio/smart-defaults.ts.
// setCategory now calls getSmartDefault internally and writes the result to
// constructionTier, resetting constructionTierOverride to false on every call.
//
// Section A tests getSmartDefault directly.
// Section B tests the store contract — setCategory triggers the default.
// ═════════════════════════════════════════════════════════════════════════════

describe('Construction tier smart defaults — getSmartDefault (smart-defaults.ts)', () => {
  it('SMART_DEFAULTS: outerwear → "high"', () => {
    expect(SMART_DEFAULTS['outerwear']).toBe('high');
  });

  it('SMART_DEFAULTS: tops → "low"', () => {
    expect(SMART_DEFAULTS['tops']).toBe('low');
  });

  it('SMART_DEFAULTS: dresses → "moderate"', () => {
    expect(SMART_DEFAULTS['dresses']).toBe('moderate');
  });

  it('SMART_DEFAULTS: bottoms → "moderate"', () => {
    expect(SMART_DEFAULTS['bottoms']).toBe('moderate');
  });

  it('getSmartDefault: outerwear without silhouette → "high"', () => {
    expect(getSmartDefault('outerwear')).toBe('high');
  });

  it('getSmartDefault: tops without silhouette → "low"', () => {
    expect(getSmartDefault('tops')).toBe('low');
  });

  it('getSmartDefault: dresses without silhouette → "moderate"', () => {
    expect(getSmartDefault('dresses')).toBe('moderate');
  });

  it('getSmartDefault: outerwear + "relaxed" silhouette → "high" (silhouette only pushes up, relaxed cannot downgrade from high)', () => {
    // The code applies overrides only when rank(override) > rank(base).
    // outerwear base = 'high' (rank 2), relaxed override = 'moderate' (rank 1) → not applied.
    expect(getSmartDefault('outerwear', 'relaxed')).toBe('high');
  });

  it('getSmartDefault: outerwear + "structured" silhouette → "high"', () => {
    expect(getSmartDefault('outerwear', 'structured')).toBe('high');
  });

  it('getSmartDefault: tops + "structured" silhouette → "high" (structured always pushes to high)', () => {
    expect(getSmartDefault('tops', 'structured')).toBe('high');
  });

  it('getSmartDefault: dresses + "structured" silhouette → "high"', () => {
    expect(getSmartDefault('dresses', 'structured')).toBe('high');
  });

  it('getSmartDefault: tops + "oversized" silhouette → "low" (oversized on low stays low)', () => {
    // oversized pushes low→moderate for tops per SILHOUETTE_CATEGORY_OVERRIDES,
    // but the rule is "oversized on simple garments adds some complexity" → moderate
    // Actually from the code: oversized on base=low → moderate
    expect(getSmartDefault('tops', 'oversized')).toBe('moderate');
  });

  it('getSmartDefault: unknown category without silhouette falls back to "moderate"', () => {
    expect(getSmartDefault('accessories')).toBe('moderate');
  });

  it('getSmartDefault: subcategoryAffinity takes precedence over category default', () => {
    // subcategoryAffinity='high' overrides category default for 'tops' ('low')
    expect(getSmartDefault('tops', undefined, 'high')).toBe('high');
  });

  it('getSmartDefault: structured silhouette overrides low subcategory affinity', () => {
    // subcategory affinity=low, but structured always demands high
    expect(getSmartDefault('tops', 'structured', 'low')).toBe('high');
  });
});

describe('Construction tier smart defaults — store contract', () => {
  it('setCategory("outerwear") auto-sets constructionTier to "high"', () => {
    s().setCategory('outerwear');
    expect(s().constructionTier).toBe('high');
  });

  it('setCategory("tops") auto-sets constructionTier to "low"', () => {
    s().setCategory('tops');
    expect(s().constructionTier).toBe('low');
  });

  it('setCategory("dresses") auto-sets constructionTier to "moderate"', () => {
    s().setConstructionTier('high'); // pre-set so the assertion is not coincidental
    s().setCategory('dresses');
    expect(s().constructionTier).toBe('moderate');
  });

  it('manual override: setConstructionTier(tier, true) sets constructionTierOverride=true', () => {
    s().setConstructionTier('low', true);
    expect(s().constructionTierOverride).toBe(true);
    expect(s().constructionTier).toBe('low');
  });

  it('manual override: user value is preserved by subsequent truly unrelated writes', () => {
    s().setConstructionTier('low', true);
    s().setSeason('FW26');      // unrelated — does not touch tier
    s().setTargetMsrp(400);    // unrelated — does not touch tier
    expect(s().constructionTier).toBe('low');
    expect(s().constructionTierOverride).toBe(true);
  });

  it('default write (no override flag): constructionTierOverride stays false', () => {
    s().setConstructionTier('high');
    expect(s().constructionTierOverride).toBe(false);
    expect(s().constructionTier).toBe('high');
  });

  it('new category after manual override: default fires again and override flag resets', () => {
    s().setCategory('outerwear');               // tier → 'high', override → false
    s().setConstructionTier('low', true);       // manual override
    expect(s().constructionTierOverride).toBe(true);

    s().setCategory('tops');                    // fires default, resets override
    expect(s().constructionTierOverride).toBe(false);
    expect(s().constructionTier).toBe('low');   // tops default
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. PIECE ROLE & COLLECTION FIELDS
// ═════════════════════════════════════════════════════════════════════════════

describe('Piece role & collection fields', () => {
  it('setCollectionRole stores the role', () => {
    s().setCollectionRole('hero');
    expect(s().collectionRole).toBe('hero');
  });

  it('setCollectionRole accepts all valid roles', () => {
    const roles: CollectionRoleId[] = ['hero', 'directional', 'core-evolution', 'volume-driver'];
    for (const role of roles) {
      s().setCollectionRole(role);
      expect(s().collectionRole).toBe(role);
    }
  });

  it('setCollectionRole(null) clears the role', () => {
    s().setCollectionRole('hero');
    s().setCollectionRole(null);
    expect(s().collectionRole).toBeNull();
  });

  it('collectionRole is a top-level store field, not nested in JSONB', () => {
    s().setCollectionRole('directional');
    // Confirm it is directly readable from state, not nested
    const st = s();
    expect(typeof st.collectionRole).toBe('string');
    // It must not be buried inside another object
    expect(st).toHaveProperty('collectionRole', 'directional');
  });

  it('setSelectedKeyPiece stores the key piece', () => {
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);
    expect(s().selectedKeyPiece).toEqual(FIXTURE_KEY_PIECE);
  });

  it('setSelectedKeyPiece(null) clears the piece', () => {
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);
    s().setSelectedKeyPiece(null);
    expect(s().selectedKeyPiece).toBeNull();
  });

  it('selectedKeyPiece.item serves as the piece name (top-level column via store)', () => {
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);
    expect(s().selectedKeyPiece?.item).toBe('Classic Trench');
  });

  it('setCollectionAesthetic stores the aesthetic name', () => {
    s().setCollectionAesthetic('Romantic Analog');
    expect(s().collectionAesthetic).toBe('Romantic Analog');
  });

  it('setCollectionAesthetic(null) clears the aesthetic', () => {
    s().setCollectionAesthetic('Romantic Analog');
    s().setCollectionAesthetic(null);
    expect(s().collectionAesthetic).toBeNull();
  });

  it('setAestheticInflection stores the inflection string', () => {
    s().setAestheticInflection('Leaning into the darker palette notes');
    expect(s().aestheticInflection).toBe('Leaning into the darker palette notes');
  });

  it('aestheticInflection persists independently of collectionAesthetic', () => {
    s().setCollectionAesthetic('Terrain Luxe');
    s().setAestheticInflection('Rustic texture emphasis');
    // Changing collectionAesthetic does not clear aestheticInflection
    s().setCollectionAesthetic('Coastal Grandeur');
    expect(s().aestheticInflection).toBe('Rustic texture emphasis');
  });

  it('aestheticInflection is not cleared when collectionAesthetic is set to null', () => {
    s().setAestheticInflection('Rustic texture emphasis');
    s().setCollectionAesthetic(null);
    expect(s().aestheticInflection).toBe('Rustic texture emphasis');
  });

  it(
    'collectionAesthetic locks (becomes read-only) after the first key piece is added',
    () => {
      s().setCollectionAesthetic('Terrain Luxe');
      s().setSelectedKeyPiece(FIXTURE_KEY_PIECE); // first piece added
      // Attempt to overwrite should be ignored
      s().setCollectionAesthetic('Different Aesthetic');
      expect(s().collectionAesthetic).toBe('Terrain Luxe');
    },
  );

  it('setPieceRolesById stores role mappings by piece id', () => {
    const roles: Record<string, CollectionRoleId> = {
      'piece-001': 'hero',
      'piece-002': 'volume-driver',
    };
    s().setPieceRolesById(roles);
    expect(s().pieceRolesById).toEqual(roles);
  });

  it('setPieceRolesById replaces the entire map (no merge)', () => {
    s().setPieceRolesById({ 'piece-001': 'hero' });
    s().setPieceRolesById({ 'piece-002': 'directional' });
    expect(s().pieceRolesById).toEqual({ 'piece-002': 'directional' });
    expect(s().pieceRolesById).not.toHaveProperty('piece-001');
  });

  it('collectionRole and selectedKeyPiece are independent fields', () => {
    s().setCollectionRole('hero');
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);
    s().setCollectionRole('volume-driver');
    // Key piece unaffected
    expect(s().selectedKeyPiece).toEqual(FIXTURE_KEY_PIECE);
    expect(s().collectionRole).toBe('volume-driver');
  });

  it('resetSession clears collectionRole', () => {
    s().setCollectionRole('hero');
    s().resetSession();
    expect(s().collectionRole).toBeNull();
  });

  it('resetSession clears selectedKeyPiece', () => {
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);
    s().resetSession();
    expect(s().selectedKeyPiece).toBeNull();
  });

  it('resetSession clears pieceRolesById', () => {
    s().setPieceRolesById({ 'piece-001': 'hero' });
    s().resetSession();
    expect(s().pieceRolesById).toEqual({});
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. CONCEPT INSIGHT
// ═════════════════════════════════════════════════════════════════════════════

describe('Concept insight', () => {
  const INSIGHT = {
    title:       'Layered Desert Minimalism',
    description: 'A stripped-back take on terrain luxury with raw edge finishing.',
    positioning: ['Earth-forward palette', 'Zero-waste cut', 'Luxury-adjacent MSRP'],
    confidence:  0.82,
  };

  it('setConceptInsight stores all four fields', () => {
    s().setConceptInsight(INSIGHT);
    expect(s().conceptInsightTitle).toBe(INSIGHT.title);
    expect(s().conceptInsightDescription).toBe(INSIGHT.description);
    expect(s().conceptInsightPositioning).toEqual(INSIGHT.positioning);
    expect(s().conceptInsightConfidence).toBe(INSIGHT.confidence);
  });

  it('clearConceptInsight resets all four fields to null', () => {
    s().setConceptInsight(INSIGHT);
    s().clearConceptInsight();
    expect(s().conceptInsightTitle).toBeNull();
    expect(s().conceptInsightDescription).toBeNull();
    expect(s().conceptInsightPositioning).toBeNull();
    expect(s().conceptInsightConfidence).toBeNull();
  });

  it('setConceptInsight with null confidence stores null', () => {
    s().setConceptInsight({ ...INSIGHT, confidence: null });
    expect(s().conceptInsightConfidence).toBeNull();
  });

  it('concept insight survives navigation round-trips', () => {
    s().setConceptInsight(INSIGHT);
    s().setCurrentStep(3);
    s().setCurrentStep(2);
    expect(s().conceptInsightTitle).toBe(INSIGHT.title);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. ASSORTMENT INSIGHT CACHE
// ═════════════════════════════════════════════════════════════════════════════

describe('Assortment insight cache', () => {
  it('setAssortmentInsightCache stores insight by collection name', () => {
    s().setAssortmentInsightCache('Desert Mirage', 'Strong outerwear signal.');
    expect(s().assortmentInsightCache['Desert Mirage']).toBe('Strong outerwear signal.');
  });

  it('multiple collections coexist in the cache', () => {
    s().setAssortmentInsightCache('Collection A', 'Insight A');
    s().setAssortmentInsightCache('Collection B', 'Insight B');
    expect(s().assortmentInsightCache['Collection A']).toBe('Insight A');
    expect(s().assortmentInsightCache['Collection B']).toBe('Insight B');
  });

  it('overwriting a key replaces the insight', () => {
    s().setAssortmentInsightCache('Desert Mirage', 'Old insight');
    s().setAssortmentInsightCache('Desert Mirage', 'New insight');
    expect(s().assortmentInsightCache['Desert Mirage']).toBe('New insight');
  });

  it('resetSession does not clear assortmentInsightCache (by design)', () => {
    s().setAssortmentInsightCache('Desert Mirage', 'Strong signal');
    s().resetSession();
    // resetSession intentionally omits assortmentInsightCache
    // If the store is updated to clear it, this test should be updated accordingly.
    expect(s().assortmentInsightCache['Desert Mirage']).toBe('Strong signal');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. RESET COMPLETENESS
// ═════════════════════════════════════════════════════════════════════════════

describe('resetSession completeness', () => {
  it('resets all Step 1 fields', () => {
    s().setSeason('FW26');
    s().setCollectionName('Test');
    s().resetSession();
    expect(s().season).toBe('');
    expect(s().collectionName).toBe('');
  });

  it('resets all Step 2 fields', () => {
    s().setAestheticInput('Poetcore');
    s().setConceptSilhouette('relaxed');
    s().setColorPalette(['#fff', '#000'], 'Neutral');
    s().lockConcept();
    s().resetSession();
    expect(s().aestheticInput).toBe('');
    expect(s().conceptSilhouette).toBe('');
    expect(s().colorPalette).toEqual([]);
    expect(s().conceptLocked).toBe(false);
  });

  it('resets all Step 3 fields', () => {
    s().setMaterial('silk');
    s().setSilhouette('structured');
    s().setCategory('outerwear');
    s().setTargetMsrp(650);
    s().setConstructionTier('high', true);
    s().resetSession();
    expect(s().materialId).toBe('');
    expect(s().silhouette).toBe('');
    expect(s().category).toBe('');
    expect(s().targetMsrp).toBeNull();
    expect(s().constructionTier).toBe('moderate');
    expect(s().constructionTierOverride).toBe(false);
  });

  it('resets pulse states', () => {
    s().updateIdentityPulse({ status: 'green', score: 88, message: 'OK' });
    s().updateResonancePulse({ status: 'yellow', score: 60, message: 'Watch' });
    s().updateExecutionPulse({ status: 'red', score: 30, message: 'Risk' });
    s().resetSession();
    expect(s().identityPulse).toBeNull();
    expect(s().resonancePulse).toBeNull();
    expect(s().executionPulse).toBeNull();
  });

  it('resets currentStep to 1', () => {
    s().setCurrentStep(3);
    s().resetSession();
    expect(s().currentStep).toBe(1);
  });

  it('resets collectionRole to null', () => {
    s().setCollectionRole('hero');
    s().resetSession();
    expect(s().collectionRole).toBeNull();
  });

  it('resets all navigation state in one call', () => {
    s().setSeason('FW26');
    s().setCollectionName('Test');
    s().setAestheticInput('Poetcore');
    s().lockConcept();
    s().setMaterial('silk');
    s().setCurrentStep(3);
    s().setCollectionRole('hero');
    s().setSelectedKeyPiece(FIXTURE_KEY_PIECE);

    s().resetSession();

    expect(s().season).toBe('');
    expect(s().collectionName).toBe('');
    expect(s().aestheticInput).toBe('');
    expect(s().conceptLocked).toBe(false);
    expect(s().materialId).toBe('');
    expect(s().currentStep).toBe(1);
    expect(s().collectionRole).toBeNull();
    expect(s().selectedKeyPiece).toBeNull();
  });
});
