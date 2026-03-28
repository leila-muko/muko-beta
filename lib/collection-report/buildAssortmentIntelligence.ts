import type { AssortmentIntelligence } from '@/lib/collection-report/types';

type CollectionStage = 'early' | 'developing' | 'built';
type RoleBalanceStatus = 'missing_core' | 'missing_hero' | 'missing_support' | 'balanced';
type ComplexityRisk = 'front_loaded_high' | 'balanced' | 'too_safe';
type Coverage = 'narrow' | 'moderate' | 'broad';
type ViabilitySignal = 'fragile' | 'building' | 'stable';

interface AssortmentIntelligenceInput {
  totalPieces: number;
  heroCount: number;
  coreCount: number;
  supportCount: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  uniqueCategoryCount: number;
  executionScore?: number | null;
  collectionScore?: number | null;
}

interface AssortmentDiagnostics {
  collectionStage: CollectionStage;
  roleBalanceStatus: RoleBalanceStatus;
  complexityRisk: ComplexityRisk;
  coverage: Coverage;
  viabilitySignal: ViabilitySignal;
  complexitySummary: string;
}

function getCollectionStage(totalPieces: number): CollectionStage {
  if (totalPieces <= 3) return 'early';
  if (totalPieces <= 7) return 'developing';
  return 'built';
}

function getRoleBalanceStatus(
  heroCount: number,
  coreCount: number,
  supportCount: number
): RoleBalanceStatus {
  if (coreCount === 0) return 'missing_core';
  if (heroCount === 0) return 'missing_hero';
  if (supportCount === 0) return 'missing_support';
  return 'balanced';
}

function getComplexityRisk(input: AssortmentIntelligenceInput): ComplexityRisk {
  const { totalPieces, highCount, lowCount, mediumCount } = input;
  if (totalPieces === 0) return 'balanced';

  const highShare = highCount / totalPieces;
  const lowShare = lowCount / totalPieces;

  if (highCount >= 2 && highShare >= 0.4) return 'front_loaded_high';
  if (highCount === 0 && lowShare >= 0.5 && mediumCount <= Math.max(2, Math.ceil(totalPieces / 3))) {
    return 'too_safe';
  }
  return 'balanced';
}

function getCoverage(uniqueCategoryCount: number): Coverage {
  if (uniqueCategoryCount >= 4) return 'broad';
  if (uniqueCategoryCount === 3) return 'moderate';
  return 'narrow';
}

function getComplexitySummary(risk: ComplexityRisk, input: AssortmentIntelligenceInput) {
  const { lowCount, mediumCount, highCount } = input;

  if (risk === 'front_loaded_high') {
    return `${highCount} high / ${mediumCount} medium / ${lowCount} low — front-loaded in higher complexity.`;
  }

  if (risk === 'too_safe') {
    return `${highCount} high / ${mediumCount} medium / ${lowCount} low — skewed toward safer builds.`;
  }

  return `${highCount} high / ${mediumCount} medium / ${lowCount} low — balanced across complexity tiers.`;
}

function getViabilitySignal(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics): ViabilitySignal {
  const executionScore = input.executionScore ?? 0;

  if (
    input.totalPieces <= 3 ||
    diagnostics.roleBalanceStatus !== 'balanced' ||
    diagnostics.coverage === 'narrow' ||
    executionScore < 55
  ) {
    return 'fragile';
  }

  if (
    input.totalPieces >= 8 &&
    diagnostics.roleBalanceStatus === 'balanced' &&
    diagnostics.complexityRisk === 'balanced' &&
    executionScore >= 65
  ) {
    return 'stable';
  }

  return 'building';
}

function getCollectionState(diagnostics: AssortmentDiagnostics): string {
  if (diagnostics.collectionStage === 'early') return 'Early Build';
  if (diagnostics.roleBalanceStatus === 'missing_core') return 'Direction Set, Assortment Thin';
  if (diagnostics.roleBalanceStatus === 'missing_hero') return 'Developing Direction';
  if (diagnostics.roleBalanceStatus === 'missing_support') return 'High Potential, Low Coverage';
  if (diagnostics.viabilitySignal === 'stable') return 'Structurally Sound';
  if (diagnostics.coverage === 'narrow') return 'High Potential, Low Coverage';
  return 'Developing Direction';
}

function buildSupportingLine(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics): string {
  if (input.totalPieces === 0) {
    return 'The direction is not yet built into enough pieces to read as a collection.';
  }

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    return 'Direction is strong, but the collection is not yet structurally built.';
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    return 'The base is forming, but the assortment still needs a clearer anchor.';
  }

  if (diagnostics.roleBalanceStatus === 'missing_support') {
    return 'The lead idea is visible, but the surrounding assortment is still too thin.';
  }

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    return 'The collection has shape, but too much weight is sitting in the most demanding pieces.';
  }

  if (diagnostics.complexityRisk === 'too_safe') {
    return 'The collection is organized, but the role mix is still too even to create hierarchy.';
  }

  if (diagnostics.coverage === 'narrow') {
    return 'The direction is coherent, but the assortment still needs broader coverage to hold.';
  }

  if (diagnostics.viabilitySignal === 'stable') {
    return 'The collection is reading as a system, with enough balance to support the point of view.';
  }

  return 'The collection is moving in the right direction, but the role structure still needs tightening.';
}

function buildInsight(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics) {
  const opening =
    diagnostics.collectionStage === 'early'
      ? 'This collection is still direction-led rather than assortment-led.'
      : diagnostics.collectionStage === 'developing'
        ? 'This collection is beginning to read as a line, but the structure is not holding yet.'
        : 'This collection has enough pieces to read as a system.';

  let middle = 'Role distribution, coverage, and complexity are currently working together without a major structural gap.';

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    middle = 'It is missing a core volume layer, so the point of view does not yet have enough commercial foundation.';
  } else if (diagnostics.roleBalanceStatus === 'missing_hero') {
    middle = 'The role mix is too flat, so no single piece is giving the assortment a clear lead position.';
  } else if (diagnostics.roleBalanceStatus === 'missing_support') {
    middle = 'The hero and core signals are present, but the collection does not yet have enough support around them.';
  } else if (diagnostics.complexityRisk === 'front_loaded_high') {
    middle = 'Complexity is front-loaded, which puts too much of the collection burden into a narrow set of pieces.';
  } else if (diagnostics.complexityRisk === 'too_safe') {
    middle = 'The complexity spread is too cautious, so the collection risks flattening into one commercial tier.';
  } else if (diagnostics.coverage === 'narrow') {
    middle = 'Coverage is still too limited to validate the direction at the assortment level.';
  } else if (diagnostics.coverage === 'broad') {
    middle = 'Coverage is broad enough to support a line, but only if the role separation stays clear.';
  }

  let closing = 'Next, tighten the role structure before widening the line.';

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    closing = 'Next, build a stronger core base so the direction can hold at collection scale.';
  } else if (diagnostics.roleBalanceStatus === 'missing_hero') {
    closing = 'Next, introduce a stronger anchor role so the assortment reads with clearer hierarchy.';
  } else if (diagnostics.roleBalanceStatus === 'missing_support') {
    closing = 'Next, build supporting context around the lead pieces so the assortment feels complete.';
  } else if (diagnostics.complexityRisk === 'front_loaded_high') {
    closing = 'Next, reduce front-loaded complexity so the collection is easier to carry forward.';
  } else if (diagnostics.complexityRisk === 'too_safe') {
    closing = 'Next, add a stronger point of separation without losing the base layer.';
  } else if (diagnostics.coverage === 'narrow') {
    closing = 'Next, broaden assortment coverage before treating the collection as commercially viable.';
  } else if (diagnostics.viabilitySignal === 'stable') {
    closing = 'Next, keep additions disciplined so breadth does not weaken the current balance.';
  }

  return `${opening} ${middle} ${closing}`;
}

function buildNextAction(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics): string {
  if (input.totalPieces === 1) {
    return 'Add more pieces to establish collection shape.';
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    return 'Introduce a stronger anchor role so the assortment reads with clearer hierarchy.';
  }

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    return 'Reduce construction complexity on at least one piece to protect the production timeline.';
  }

  if (
    (input.collectionScore ?? 0) >= 80 &&
    diagnostics.roleBalanceStatus === 'balanced' &&
    diagnostics.complexityRisk === 'balanced'
  ) {
    return 'Continue building — the collection direction is strong.';
  }

  return 'Review role distribution before adding more pieces.';
}

function buildRecommendedActions(
  input: AssortmentIntelligenceInput,
  diagnostics: AssortmentDiagnostics
) {
  const actions: string[] = [];

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    actions.push('Add a core volume layer.');
    actions.push('Broaden coverage with a lower-risk support piece.');
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    actions.push('Introduce a stronger anchor role.');
  }

  if (diagnostics.roleBalanceStatus === 'missing_support') {
    actions.push('Build supporting context around the hero.');
  }

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    actions.push('Reduce front-loaded complexity.');
    actions.push('Balance the line with a steadier mid-complexity role.');
  }

  if (diagnostics.complexityRisk === 'too_safe') {
    actions.push('Introduce more distinction between lead and support roles.');
  }

  if (diagnostics.coverage === 'narrow') {
    actions.push('Broaden coverage at the assortment level.');
  } else if (diagnostics.coverage === 'broad') {
    actions.push('Keep expansion tied to clear role separation.');
  }

  if (actions.length < 2) {
    actions.push('Refine the role mix before adding more volume.');
  }

  if (actions.length < 3) {
    actions.push('Strengthen the collection with one lower-risk supporting layer.');
  }

  return actions.slice(0, 4);
}

function buildWatchlist(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics) {
  const watchlist: string[] = [];

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    watchlist.push('The collection lacks a core volume layer.');
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    watchlist.push('The assortment still lacks a clear anchor role.');
  }

  if (diagnostics.roleBalanceStatus === 'missing_support') {
    watchlist.push('The hero does not yet have enough supporting context.');
  }

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    watchlist.push('Complexity is front-loaded.');
  }

  if (diagnostics.complexityRisk === 'too_safe') {
    watchlist.push('Complexity is too safe.');
  }

  if (diagnostics.coverage === 'narrow') {
    watchlist.push('Coverage is still too limited to validate the direction.');
  }

  if (input.totalPieces < 6) {
    watchlist.push('Collection size is still too small to confirm balance.');
  }

  return watchlist.slice(0, 4);
}

export function buildAssortmentIntelligence(
  input: AssortmentIntelligenceInput
): AssortmentIntelligence & { diagnostics: AssortmentDiagnostics } {
  const complexityRisk = getComplexityRisk(input);
  const diagnostics: AssortmentDiagnostics = {
    collectionStage: getCollectionStage(input.totalPieces),
    roleBalanceStatus: getRoleBalanceStatus(input.heroCount, input.coreCount, input.supportCount),
    complexityRisk,
    coverage: getCoverage(input.uniqueCategoryCount),
    viabilitySignal: 'building',
    complexitySummary: getComplexitySummary(complexityRisk, input),
  };

  diagnostics.viabilitySignal = getViabilitySignal(input, diagnostics);

  const collectionState = getCollectionState(diagnostics);
  const supportingLine = buildSupportingLine(input, diagnostics);
  const collectionInsight = buildInsight(input, diagnostics);
  const nextAction = buildNextAction(input, diagnostics);
  const breakdown = [
    `Pieces: ${input.totalPieces} (target range 6–10)`,
    `Roles: ${input.heroCount} Hero / ${input.coreCount} Core / ${input.supportCount} Support`,
    `Complexity: ${diagnostics.complexitySummary}`,
    `Coverage: ${diagnostics.coverage}`,
  ];

  return {
    collection_state: collectionState,
    collection_read: supportingLine,
    supporting_line: supportingLine,
    muko_insight: collectionInsight,
    collection_insight: collectionInsight,
    next_action: nextAction,
    breakdown,
    recommended_actions: buildRecommendedActions(input, diagnostics),
    watchlist: buildWatchlist(input, diagnostics),
    diagnostics,
  };
}
