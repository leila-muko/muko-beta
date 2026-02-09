'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  Material,
  Category,
  ConstructionTier,
  ConceptContext as ConceptContextType,
} from '@/lib/types/spec-studio';
import { calculateCOGS, generateInsight } from '@/lib/spec-studio/calculator';
import { findAlternativeMaterial } from '@/lib/spec-studio/material-matcher';
import { SMART_DEFAULTS, getOverrideWarning } from '@/lib/spec-studio/smart-defaults';

import TopRail from './TopRail';
import ConceptContext from './ConceptContext';
import MaterialSelector from './MaterialSelector';
import SilhouetteSelector from './SilhouetteSelector';
import ConstructionTierComponent from './ConstructionTier';
import LiningToggle from './LiningToggle';
import PulseRail from './PulseRail';
import MukoInsightPanel from './MukoInsightPanel';
import PaletteReference from './PaletteReference';

// Import data
import categoriesData from '@/data/categories.json';
import materialsData from '@/data/materials.json';

interface SpecStudioProps {
  // Passed from the Orchestrator / session state
  conceptContext: ConceptContextType;
  brandTargetMargin: number;
  seasonLabel: string;
  collectionName: string;
  onRunAnalysis: (specState: any) => void;
}

export default function SpecStudio({
  conceptContext,
  brandTargetMargin,
  seasonLabel,
  collectionName,
  onRunAnalysis,
}: SpecStudioProps) {
  const categories: Category[] = categoriesData.categories as Category[];
  const materials: Material[] = materialsData.materials;

  // ============================================
  // State
  // ============================================
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [targetMSRP, setTargetMSRP] = useState(450);
  const [materialId, setMaterialId] = useState('');
  const [silhouetteId, setSilhouetteId] = useState('');
  const [constructionTier, setConstructionTier] = useState<ConstructionTier>('high');
  const [lined, setLined] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);

  // ============================================
  // Derived data
  // ============================================
  const selectedCategory = useMemo(
    () => categories.find(c => c.id === categoryId) || categories[0],
    [categoryId, categories]
  );

  const selectedMaterial = useMemo(
    () => materials.find(m => m.id === materialId) || null,
    [materialId, materials]
  );

  const selectedSilhouette = useMemo(
    () => selectedCategory.silhouettes.find(s => s.id === silhouetteId) || null,
    [silhouetteId, selectedCategory]
  );

  const alternativeMaterial = useMemo(
    () => selectedMaterial ? findAlternativeMaterial(selectedMaterial, materials) : null,
    [selectedMaterial, materials]
  );

  // ============================================
  // COGS calculation + Insight generation (reactive)
  // ============================================
  const insight = useMemo(() => {
    if (!selectedMaterial || !selectedSilhouette) return null;

    const breakdown = calculateCOGS(
      selectedMaterial,
      selectedSilhouette.yardage,
      constructionTier,
      lined,
      targetMSRP,
      brandTargetMargin
    );

    return generateInsight(
      breakdown,
      selectedMaterial,
      selectedSilhouette.name,
      constructionTier,
      lined,
      selectedSilhouette.yardage,
      alternativeMaterial
    );
  }, [selectedMaterial, selectedSilhouette, constructionTier, lined, targetMSRP, brandTargetMargin, alternativeMaterial]);

  // ============================================
  // Execution pulse status
  // ============================================
  const executionStatus = !insight ? null :
    insight.type === 'warning' ? 'red' as const :
    insight.type === 'viable' ? 'yellow' as const : 'green' as const;

  const executionDetail = insight
    ? insight.type === 'warning'
      ? `COGS $${insight.cogs} exceeds $${insight.ceiling} ceiling`
      : insight.type === 'viable'
        ? `Tight margin — $${insight.ceiling - insight.cogs} buffer`
        : `Comfortable — $${insight.ceiling - insight.cogs} buffer`
    : null;

  // ============================================
  // Handlers
  // ============================================
  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setSilhouetteId(''); // Reset silhouette when category changes
    // Apply smart default for construction
    const defaultTier = SMART_DEFAULTS[newCategoryId] || 'moderate';
    setConstructionTier(defaultTier);
    setOverrideWarning(null);
  };

  const handleConstructionChange = (tier: ConstructionTier) => {
    setConstructionTier(tier);
    const defaultTier = SMART_DEFAULTS[categoryId] || 'moderate';
    const warning = getOverrideWarning(categoryId, selectedCategory.name, tier, defaultTier);
    setOverrideWarning(warning);
  };

  const handleSwapToAlternative = () => {
    if (alternativeMaterial) {
      setMaterialId(alternativeMaterial.id);
    }
  };

  const handleRunAnalysis = () => {
    onRunAnalysis({
      categoryId,
      category: selectedCategory.name,
      targetMSRP,
      materialId,
      silhouetteId,
      constructionTier,
      constructionOverride: constructionTier !== (SMART_DEFAULTS[categoryId] || 'moderate'),
      lined,
      cogs: insight?.cogs,
    });
  };

  const isComplete = materialId && silhouetteId && constructionTier;

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      {/* Step Progress Header */}
      <div className="border-b border-[#E8E3D6] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-[#43432B] tracking-tight">
            muko
          </span>
          <div className="flex gap-1">
            {['Entry', 'Concept', 'Spec', 'Report'].map((step, i) => (
              <div
                key={step}
                className={`px-3.5 py-1 rounded-full text-[11px] tracking-wide
                  ${i === 2
                    ? 'font-semibold text-[#FAF8F4] bg-[#43432B]'
                    : i < 2
                      ? 'font-medium text-[#A8B475] bg-[#A8B475]/10'
                      : 'text-[#43432B]/30'
                  }`}
              >
                {i < 2 ? '✓ ' : ''}{step}
              </div>
            ))}
          </div>
        </div>
        <div className="text-[12px] text-[#43432B]/45">
          {seasonLabel} · {collectionName}
        </div>
      </div>

      {/* Top Rail */}
      <TopRail
        categories={categories}
        selectedCategoryId={categoryId}
        onCategoryChange={handleCategoryChange}
        targetMSRP={targetMSRP}
        onMSRPChange={setTargetMSRP}
        targetMargin={brandTargetMargin}
        insight={insight}
      />

      {/* Main Split Screen */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* LEFT PANEL — 60% — Spec Inputs */}
        <div className="w-[60%] px-8 py-7 border-r border-[#E8E3D6] overflow-y-auto">
          {/* Locked Concept from Step 2 */}
          <ConceptContext concept={conceptContext} />

          {/* Material */}
          <MaterialSelector
            materials={materials}
            selectedMaterialId={materialId}
            onSelect={setMaterialId}
            alternativeMaterial={alternativeMaterial}
            selectedMaterial={selectedMaterial}
            onSwapToAlternative={handleSwapToAlternative}
          />

          {/* Silhouette */}
          <SilhouetteSelector
            silhouettes={selectedCategory.silhouettes}
            selectedSilhouetteId={silhouetteId}
            onSelect={setSilhouetteId}
            categoryName={selectedCategory.name}
          />

          {/* Construction Tier */}
          <ConstructionTierComponent
            selectedTier={constructionTier}
            onSelect={handleConstructionChange}
            defaultTier={SMART_DEFAULTS[categoryId] || 'moderate'}
            overrideWarning={overrideWarning}
          />

          {/* Lining */}
          <LiningToggle lined={lined} onToggle={setLined} />

          {/* Run Analysis Button */}
          <button
            disabled={!isComplete}
            onClick={handleRunAnalysis}
            className={`w-full py-4 rounded-xl font-semibold text-[14px] tracking-wide
              transition-all duration-300
              ${isComplete
                ? 'bg-[#43432B] text-[#FAF8F4] cursor-pointer hover:bg-[#43432B]/90'
                : 'bg-[#E8E3D6] text-[#43432B]/30 cursor-not-allowed'
              }`}
          >
            Run Muko Analysis →
          </button>
        </div>

        {/* RIGHT PANEL — 40% — Intelligence */}
        <div className="w-[40%] px-6 py-7 bg-[#F5F2EB]/40 overflow-y-auto">
          {/* Pulse Rail */}
          <PulseRail
            executionStatus={executionStatus}
            executionDetail={executionDetail}
          />

          {/* Muko Insight Panel */}
          <div className="mb-6">
            <MukoInsightPanel insight={insight} />
          </div>

          {/* Aesthetic Palette Reference */}
          <PaletteReference
            aestheticName={conceptContext.aestheticName}
            palette={conceptContext.recommendedPalette}
          />
        </div>
      </div>
    </div>
  );
}
