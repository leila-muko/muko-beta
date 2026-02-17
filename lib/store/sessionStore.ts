import { create } from 'zustand';

interface PulseState {
  status: 'green' | 'yellow' | 'red';
  score: number;
  message: string;
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
  
  // Step 3: Spec Studio
  category: string;
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

  // Actions
  setSeason: (season: string) => void;
  setCollectionName: (name: string) => void;
  setAestheticInput: (input: string) => void;
  setColorPalette: (colors: string[], name: string) => void;
  setCategory: (category: string) => void;
  setTargetMsrp: (msrp: number) => void;
  setMaterial: (id: string) => void;
  setSilhouette: (silhouette: string) => void;
  setConstructionTier: (tier: 'low' | 'moderate' | 'high', override?: boolean) => void;
  
  updateIdentityPulse: (pulse: PulseState | null) => void;
  updateResonancePulse: (pulse: PulseState | null) => void;
  updateExecutionPulse: (pulse: PulseState | null) => void;
  
  setIntentGoals: (goals: string[]) => void;
  setIntentTradeoff: (tradeoff: string) => void;

  lockConcept: () => void;
  unlockConcept: () => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  // Initial state
  season: '',
  collectionName: '',
  aestheticInput: '',
  aestheticMatchedId: null,
  refinementModifiers: [],
  moodboardImages: [],
  colorPalette: [],
  colorPaletteName: '',
  category: '',
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

  // Actions
  setSeason: (season) => set({ season }),
  setCollectionName: (collectionName) => set({ collectionName }),
  setAestheticInput: (aestheticInput) => set({ aestheticInput }),
  setColorPalette: (colorPalette, colorPaletteName) => 
    set({ colorPalette, colorPaletteName }),
  setCategory: (category) => set({ category }),
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
    category: '',
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
  }),
}));