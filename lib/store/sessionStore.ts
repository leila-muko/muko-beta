import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  directionInterpretationText: string;
  directionInterpretationModifiers: string[];
  directionInterpretationChips: string[];

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
  collectionRole: CollectionRoleId | null;
  selectedKeyPiece: KeyPiece | null;
  decisionGuidanceState: DecisionGuidanceState;
  activeProductPieceId: string | null;
  pieceRolesById: PieceRolesById;

  // Branch tracking
  parentAnalysisId: string | null;
  savedAnalysisId: string | null;

  // Collections hub
  activeCollection: string | null;
  assortmentInsightCache: Record<string, string>;

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
  setCollectionRole: (role: CollectionRoleId | null) => void;
  setSelectedKeyPiece: (piece: KeyPiece | null) => void;
  setDecisionGuidanceState: (state: DecisionGuidanceState) => void;
  setActiveProductPieceId: (pieceId: string | null) => void;
  setPieceRolesById: (roles: PieceRolesById) => void;
  setParentAnalysisId: (id: string | null) => void;
  setSavedAnalysisId: (id: string | null) => void;
  setActiveCollection: (name: string | null) => void;
  setAssortmentInsightCache: (collectionName: string, insight: string) => void;

  lockConcept: () => void;
  unlockConcept: () => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;

  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      // Initial state
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
      directionInterpretationText: '',
      directionInterpretationModifiers: [],
      directionInterpretationChips: [],
      category: '',
      subcategory: '',
      targetMsrp: null,
      materialId: '',
      silhouette: '',
      constructionTier: 'moderate',
      constructionTierOverride: false,
      identityPulse: null,
      resonancePulse: null,
      executionPulse: null,
      currentStep: 1,
      conceptLocked: false,
      intentGoals: [],
      intentTradeoff: '',
      collectionRole: null,
      selectedKeyPiece: null,
      decisionGuidanceState: { is_confirmed: false, selected_anchor_piece: null },
      activeProductPieceId: null,
      pieceRolesById: {},
      parentAnalysisId: null,
      savedAnalysisId: null,
      activeCollection: null,
      assortmentInsightCache: {},

      // Actions
      setSeason: (season) => set({ season }),
      setCollectionName: (collectionName) => set({ collectionName }),
      setAestheticInput: (aestheticInput) => set({ aestheticInput }),
      setColorPalette: (colorPalette, colorPaletteName) =>
        set({ colorPalette, colorPaletteName }),
      setChipSelection: (chipSelection) => set({ chipSelection }),
      setCustomChips: (customChips) => set({ customChips }),
      setConceptSilhouette: (conceptSilhouette) => set({ conceptSilhouette }),
      setConceptPalette: (conceptPalette) => set({ conceptPalette }),
      setCollectionAesthetic: (collectionAesthetic) => set({ collectionAesthetic }),
      setDirectionInterpretationText: (directionInterpretationText) => set({ directionInterpretationText }),
      setDirectionInterpretationModifiers: (directionInterpretationModifiers) => set({ directionInterpretationModifiers }),
      setDirectionInterpretationChips: (directionInterpretationChips) => set({ directionInterpretationChips }),
      setCategory: (category) => set({ category, subcategory: '' }),
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
      setCollectionRole: (collectionRole) => set({ collectionRole }),
      setSelectedKeyPiece: (selectedKeyPiece) => set({ selectedKeyPiece }),
      setDecisionGuidanceState: (decisionGuidanceState) => set({ decisionGuidanceState }),
      setActiveProductPieceId: (activeProductPieceId) => set({ activeProductPieceId }),
      setPieceRolesById: (pieceRolesById) => set({ pieceRolesById }),
      setParentAnalysisId: (parentAnalysisId) => set({ parentAnalysisId }),
      setSavedAnalysisId: (savedAnalysisId) => set({ savedAnalysisId }),
      setActiveCollection: (activeCollection) => set({ activeCollection }),
      setAssortmentInsightCache: (collectionName, insight) =>
        set((state) => ({
          assortmentInsightCache: { ...state.assortmentInsightCache, [collectionName]: insight },
        })),

      lockConcept: () => set({ conceptLocked: true }),
      unlockConcept: () => set({ conceptLocked: false }),
      setCurrentStep: (step) => set({ currentStep: step }),

      resetSession: () => set({
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
        directionInterpretationText: '',
        directionInterpretationModifiers: [],
        directionInterpretationChips: [],
        category: '',
        subcategory: '',
        targetMsrp: null,
        materialId: '',
        silhouette: '',
        constructionTier: 'moderate',
        constructionTierOverride: false,
        identityPulse: null,
        resonancePulse: null,
        executionPulse: null,
        currentStep: 1,
        conceptLocked: false,
        intentGoals: [],
        intentTradeoff: '',
        collectionRole: null,
        selectedKeyPiece: null,
        decisionGuidanceState: { is_confirmed: false, selected_anchor_piece: null },
        activeProductPieceId: null,
        pieceRolesById: {},
        parentAnalysisId: null,
        savedAnalysisId: null,
      }),
    }),
    {
      name: 'muko-session',
      partialize: (state) => {
        // Persist everything except actions
        const { setSeason, setCollectionName, setAestheticInput, setColorPalette, setChipSelection, setCustomChips, setConceptSilhouette, setConceptPalette, setCollectionAesthetic, setDirectionInterpretationText, setDirectionInterpretationModifiers, setDirectionInterpretationChips, setCategory, setSubcategory, setTargetMsrp, setMaterial, setSilhouette, setConstructionTier, updateIdentityPulse, updateResonancePulse, updateExecutionPulse, setIntentGoals, setIntentTradeoff, setCollectionRole, setSelectedKeyPiece, setParentAnalysisId, setSavedAnalysisId, setActiveCollection, setAssortmentInsightCache, lockConcept, unlockConcept, setCurrentStep, resetSession, ...rest } = state;
        return rest;
      },
    }
  )
);
