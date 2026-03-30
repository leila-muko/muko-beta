import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SelectedPieceImage } from '@/lib/piece-image';
import { createClient } from '@/lib/supabase/client';
import { getSmartDefault } from '@/lib/spec-studio/smart-defaults';

interface PulseState {
  status: 'green' | 'yellow' | 'red';
  score: number;
  message: string;
}

export interface KeyPiece {
  item: string;
  signal: 'high-volume' | 'ascending' | 'emerging' | null;
  note?: string;
  category: string | null;
  type: string | null;
  recommended_material_id: string | null;
  redirect_material_id: string | null;
  implied_chips?: string[];
  custom?: boolean;
}

export interface ActivatedChip {
  label: string;
  type: 'spec' | 'mood';
  material: string | null;
  silhouette: Record<string, string> | null;
  complexity_mod: number;
  palette: string | null;
  isCustom: boolean;
}

export interface ChipSelection {
  directionId: string;
  activatedChips: ActivatedChip[];
}

export interface DecisionGuidanceState {
  is_confirmed: boolean;
  selected_anchor_piece: string | null;
}

export type CollectionRoleId = 'hero' | 'directional' | 'core-evolution' | 'volume-driver';
export type PieceRolesById = Record<string, CollectionRoleId>;
export type CollectionLanguageState = 'strong' | 'emerging' | 'missing';
export type ExpressionSignalState = 'strong' | 'emerging' | 'missing';

export interface PieceBuildContext {
  adaptedTitle: string | null;
  role: CollectionRoleId | null;
  archetype: string | null;
  originalLabel: string | null;
  expression: string | null;
  translation: string | null;
  collectionLanguage: Array<{
    label: string;
    state: CollectionLanguageState;
  }>;
  expressionSignals: Array<{
    label: string;
    state: ExpressionSignalState;
  }>;
  complexityBias: 'reduce' | 'steady' | null;
}

interface SessionState {
  // Step 1: Entry
  season: string;
  collectionName: string;

  // Step 2: Concept Studio
  aestheticInput: string;
  aestheticMatchedId: string | null;
  refinementModifiers: string[];
  moodboardImages: string[];
  colorPalette: string[];
  colorPaletteName: string; // e.g., 'Earth Tones'
  chipSelection: ChipSelection | null;
  customChips: Record<string, ActivatedChip[]>; // keyed by aesthetic name
  conceptSilhouette: string; // required before lock — 'straight' | 'relaxed' | 'structured' | 'oversized'
  conceptPalette: string | null; // optional palette id from aesthetic's palette_options
  collectionAesthetic: string | null;
  aestheticInflection: string | null; // alias of directionInterpretationText — used by orchestrator
  directionInterpretationText: string;
  directionInterpretationModifiers: string[];
  directionInterpretationChips: string[];
  // Concept insight — persisted after SSE stream completes
  conceptInsightTitle: string | null;
  conceptInsightDescription: string | null;
  conceptInsightPositioning: string[] | null; // 3 positioning bullets
  conceptInsightConfidence: number | null;
  strategySummary: string | null;
  /** True when the aesthetic was matched via LLM proxy rather than exact name */
  isProxyMatch: boolean;

  // Step 3: Spec Studio
  category: string;
  subcategory: string; // garment type within category (e.g., 'trench', 'bomber')
  targetMsrp: number | null;
  materialId: string;
  silhouette: string;
  constructionTier: 'low' | 'moderate' | 'high';
  constructionTierOverride: boolean;

  // Pulse states
  identityPulse: PulseState | null;
  resonancePulse: PulseState | null;
  executionPulse: PulseState | null;

  // Navigation state
  currentStep: 1 | 2 | 3 | 4;
  conceptLocked: boolean;

  // Intent
  intentGoals: string[];
  intentTradeoff: string;
  successPriorities: string[];
  targetMargin: number;
  sliderTrend: number;
  sliderCreative: number;
  sliderElevated: number;
  sliderNovelty: number;
  collectionRole: CollectionRoleId | null;
  selectedKeyPiece: KeyPiece | null;
  selectedPieceImage: SelectedPieceImage | null;
  decisionGuidanceState: DecisionGuidanceState;
  activeProductPieceId: string | null;
  pieceRolesById: PieceRolesById;
  pieceBuildContext: PieceBuildContext | null;

  savedAnalysisId: string | null;

  // Collections hub
  activeCollection: string | null;
  assortmentInsightCache: Record<string, string>;
  preloadedCriticScores: Record<string, number>;

  // Actions
  setSeason: (season: string) => void;
  setCollectionName: (name: string) => void;
  setAestheticInput: (input: string) => void;
  setColorPalette: (colors: string[], name: string) => void;
  setChipSelection: (selection: ChipSelection | null) => void;
  setCustomChips: (chips: Record<string, ActivatedChip[]>) => void;
  setConceptSilhouette: (s: string) => void;
  setConceptPalette: (p: string | null) => void;
  setCollectionAesthetic: (aesthetic: string | null) => void;
  setAestheticInflection: (inflection: string | null) => void;
  setDirectionInterpretationText: (text: string) => void;
  setDirectionInterpretationModifiers: (modifiers: string[]) => void;
  setDirectionInterpretationChips: (chips: string[]) => void;
  setCategory: (category: string) => void;
  setSubcategory: (subcategory: string) => void;
  setTargetMsrp: (msrp: number) => void;
  setMaterial: (id: string) => void;
  setSilhouette: (silhouette: string) => void;
  setConstructionTier: (tier: 'low' | 'moderate' | 'high', override?: boolean) => void;

  updateIdentityPulse: (pulse: PulseState | null) => void;
  updateResonancePulse: (pulse: PulseState | null) => void;
  updateExecutionPulse: (pulse: PulseState | null) => void;

  setIntentGoals: (goals: string[]) => void;
  setIntentTradeoff: (tradeoff: string) => void;
  setSuccessPriorities: (priorities: string[]) => void;
  setTargetMargin: (margin: number) => void;
  setSliderTrend: (value: number) => void;
  setSliderCreative: (value: number) => void;
  setSliderElevated: (value: number) => void;
  setSliderNovelty: (value: number) => void;
  setCollectionRole: (role: CollectionRoleId | null) => void;
  setSelectedKeyPiece: (piece: KeyPiece | null) => void;
  setSelectedPieceImage: (image: SelectedPieceImage | null) => void;
  setDecisionGuidanceState: (state: DecisionGuidanceState) => void;
  setActiveProductPieceId: (pieceId: string | null) => void;
  setPieceRolesById: (roles: PieceRolesById) => void;
  setPieceBuildContext: (context: PieceBuildContext | null) => void;
  setConceptInsight: (insight: { title: string; description: string; positioning: string[]; confidence: number | null }) => void;
  clearConceptInsight: () => void;
  setStrategySummary: (summary: string | null) => void;
  setIsProxyMatch: (value: boolean) => void;
  setSavedAnalysisId: (id: string | null) => void;
  setActiveCollection: (name: string | null) => void;
  setAssortmentInsightCache: (collectionName: string, insight: string) => void;
  setPreloadedCriticScores: (scores: Record<string, number>) => void;

  lockConcept: () => void;
  unlockConcept: () => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

  resetSession: () => void;
}

function createInitialSessionState(targetMargin = 50) {
  return {
    season: '',
    collectionName: '',
    aestheticInput: '',
    aestheticMatchedId: null,
    refinementModifiers: [],
    moodboardImages: [],
    colorPalette: [],
    colorPaletteName: '',
    chipSelection: null,
    customChips: {},
    conceptSilhouette: '',
    conceptPalette: null,
    collectionAesthetic: null,
    aestheticInflection: null,
    directionInterpretationText: '',
    directionInterpretationModifiers: [],
    directionInterpretationChips: [],
    conceptInsightTitle: null,
    conceptInsightDescription: null,
    conceptInsightPositioning: null,
    conceptInsightConfidence: null,
    strategySummary: null,
    isProxyMatch: false,
    category: '',
    subcategory: '',
    targetMsrp: null,
    materialId: '',
    silhouette: '',
    constructionTier: 'moderate' as const,
    constructionTierOverride: false,
    identityPulse: null,
    resonancePulse: null,
    executionPulse: null,
    currentStep: 1 as const,
    conceptLocked: false,
    intentGoals: [],
    intentTradeoff: '',
    successPriorities: [],
    targetMargin,
    sliderTrend: 50,
    sliderCreative: 50,
    sliderElevated: 50,
    sliderNovelty: 50,
    collectionRole: null,
    selectedKeyPiece: null,
    selectedPieceImage: null,
    decisionGuidanceState: { is_confirmed: false, selected_anchor_piece: null },
    activeProductPieceId: null,
    pieceRolesById: {},
    pieceBuildContext: null,
    savedAnalysisId: null,
    activeCollection: null,
    assortmentInsightCache: {},
    preloadedCriticScores: {},
  };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...createInitialSessionState(),

      // Actions
      setSeason: (season) => set({ season }),
      setCollectionName: (collectionName) => set({ collectionName }),
      setAestheticInput: (aestheticInput) => set((state) => state.conceptLocked ? {} : { aestheticInput }),
      setColorPalette: (colorPalette, colorPaletteName) =>
        set({ colorPalette, colorPaletteName }),
      setChipSelection: (chipSelection) => set({ chipSelection }),
      setCustomChips: (customChips) => set({ customChips }),
      setConceptSilhouette: (conceptSilhouette) => set({ conceptSilhouette }),
      setConceptPalette: (conceptPalette) => set({ conceptPalette }),
      setCollectionAesthetic: (collectionAesthetic) => set((state) =>
        state.collectionAesthetic !== null && state.selectedKeyPiece !== null
          ? {}
          : { collectionAesthetic }
      ),
      setAestheticInflection: (aestheticInflection) => set({ aestheticInflection }),
      setDirectionInterpretationText: (directionInterpretationText) => set({ directionInterpretationText }),
      setDirectionInterpretationModifiers: (directionInterpretationModifiers) => set({ directionInterpretationModifiers }),
      setDirectionInterpretationChips: (directionInterpretationChips) => set({ directionInterpretationChips }),
      setCategory: (category) => {
        const tier = getSmartDefault(category);
        set({ category, subcategory: '', constructionTierOverride: false, ...(tier ? { constructionTier: tier } : {}) });
      },
      setSubcategory: (subcategory) => set({ subcategory }),
      setTargetMsrp: (targetMsrp) => set({ targetMsrp }),
      setMaterial: (materialId) => set({ materialId }),
      setSilhouette: (silhouette) => set({ silhouette }),
      setConstructionTier: (tier, override = false) =>
        set({ constructionTier: tier, constructionTierOverride: override }),

      updateIdentityPulse: (pulse) => set({ identityPulse: pulse }),
      updateResonancePulse: (pulse) => set({ resonancePulse: pulse }),
      updateExecutionPulse: (pulse) => set({ executionPulse: pulse }),

      setIntentGoals: (intentGoals) => set({ intentGoals }),
      setIntentTradeoff: (intentTradeoff) => set({ intentTradeoff }),
      setSuccessPriorities: (successPriorities) => set({ successPriorities }),
      setTargetMargin: (targetMargin) => set({ targetMargin }),
      setSliderTrend: (sliderTrend) => set({ sliderTrend }),
      setSliderCreative: (sliderCreative) => set({ sliderCreative }),
      setSliderElevated: (sliderElevated) => set({ sliderElevated }),
      setSliderNovelty: (sliderNovelty) => set({ sliderNovelty }),
      setCollectionRole: (collectionRole) => set({ collectionRole }),
      setSelectedKeyPiece: (selectedKeyPiece) => set({ selectedKeyPiece }),
      setSelectedPieceImage: (selectedPieceImage) => set({ selectedPieceImage }),
      setDecisionGuidanceState: (decisionGuidanceState) => set({ decisionGuidanceState }),
      setActiveProductPieceId: (activeProductPieceId) => set({ activeProductPieceId }),
      setPieceRolesById: (pieceRolesById) => set({ pieceRolesById }),
      setPieceBuildContext: (pieceBuildContext) => set({ pieceBuildContext }),
      setConceptInsight: ({ title, description, positioning, confidence }) =>
        set({
          conceptInsightTitle: title,
          conceptInsightDescription: description,
          conceptInsightPositioning: positioning,
          conceptInsightConfidence: confidence,
        }),
      clearConceptInsight: () =>
        set({
          conceptInsightTitle: null,
          conceptInsightDescription: null,
          conceptInsightPositioning: null,
          conceptInsightConfidence: null,
        }),
      setStrategySummary: (strategySummary) => set({ strategySummary }),
      setIsProxyMatch: (isProxyMatch) => set({ isProxyMatch }),
      setSavedAnalysisId: (savedAnalysisId) => set({ savedAnalysisId }),
      setActiveCollection: (activeCollection) => set({ activeCollection }),
      setAssortmentInsightCache: (collectionName, insight) =>
        set((state) => ({
          assortmentInsightCache: { ...state.assortmentInsightCache, [collectionName]: insight },
        })),
      setPreloadedCriticScores: (preloadedCriticScores) => set({ preloadedCriticScores }),

      lockConcept: () => set({ conceptLocked: true }),
      unlockConcept: () => set({ conceptLocked: false }),
      setCurrentStep: (step) => set({ currentStep: step }),

      resetSession: () => set((state) => ({
        ...createInitialSessionState(state.targetMargin > 0 ? state.targetMargin : 50),
        activeCollection: state.activeCollection,
        assortmentInsightCache: state.assortmentInsightCache,
      })),
    }),
    {
      name: 'muko-session',
      version: 4,
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            ...(persistedState as object),
            successPriorities: [],
            targetMargin: 50,
            sliderTrend: 50,
            sliderCreative: 50,
            sliderElevated: 50,
            sliderNovelty: 50,
            strategySummary: null,
          };
        }
        if (version < 3) {
          return {
            ...(persistedState as object),
            strategySummary: null,
          };
        }
        if (version < 4) {
          return {
            ...(persistedState as object),
            preloadedCriticScores: {},
          };
        }
        return persistedState;
      },
      partialize: (state) => {
        // Persist everything except actions
        const { setSeason, setCollectionName, setAestheticInput, setColorPalette, setChipSelection, setCustomChips, setConceptSilhouette, setConceptPalette, setCollectionAesthetic, setAestheticInflection, setDirectionInterpretationText, setDirectionInterpretationModifiers, setDirectionInterpretationChips, setConceptInsight, clearConceptInsight, setStrategySummary, setIsProxyMatch, setCategory, setSubcategory, setTargetMsrp, setMaterial, setSilhouette, setConstructionTier, updateIdentityPulse, updateResonancePulse, updateExecutionPulse, setIntentGoals, setIntentTradeoff, setSuccessPriorities, setTargetMargin, setSliderTrend, setSliderCreative, setSliderElevated, setSliderNovelty, setCollectionRole, setSelectedKeyPiece, setSelectedPieceImage, setDecisionGuidanceState, setActiveProductPieceId, setPieceRolesById, setPieceBuildContext, setSavedAnalysisId, setActiveCollection, setAssortmentInsightCache, setPreloadedCriticScores, lockConcept, unlockConcept, setCurrentStep, resetSession, ...rest } = state;
        return rest;
      },
    }
  )
);

let authListenerInitialized = false;
let lastSignedInUserId: string | null = null;
const SESSION_OWNER_STORAGE_KEY = 'muko-session-owner';

function clearSessionStoreForSignedInUser() {
  useSessionStore.persist.clearStorage();
  useSessionStore.setState(createInitialSessionState());
}

function getStoredSessionOwnerId() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_OWNER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredSessionOwnerId(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_OWNER_STORAGE_KEY, userId);
  } catch {}
}

function initializeSessionStoreAuthListener() {
  if (authListenerInitialized || typeof window === 'undefined') return;

  authListenerInitialized = true;

  const supabase = createClient();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN') return;

    const userId = session?.user?.id ?? null;
    if (!userId || userId === lastSignedInUserId) return;

    const storedOwnerId = getStoredSessionOwnerId();
    if (storedOwnerId && storedOwnerId !== userId) {
      clearSessionStoreForSignedInUser();
    }

    lastSignedInUserId = userId;
    setStoredSessionOwnerId(userId);
  });
}

initializeSessionStoreAuthListener();
