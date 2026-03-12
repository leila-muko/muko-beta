import type {
  CollectionComplexity,
  CollectionDistributionItem,
  CollectionHealthDetail,
  CollectionPieceRole,
  CollectionPieceStatus,
  CollectionReportBrandInput,
  CollectionReportInput,
  CollectionReportInputPiece,
  CollectionReportIntentInput,
  CollectionReportPayload,
  CollectionReportResponse,
  CollectionRisk,
} from '@/lib/collection-report/types';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentage(count: number, total: number) {
  if (total <= 0) return 0;
  return clamp((count / total) * 100);
}

function titleCase(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferRole(piece: CollectionReportInputPiece): CollectionPieceRole {
  if (piece.role) return piece.role;
  const score = piece.score ?? 0;
  if (score >= 82) return 'hero';
  if (score >= 64) return 'core';
  return 'support';
}

function inferComplexity(piece: CollectionReportInputPiece): CollectionComplexity {
  if (piece.complexity) return piece.complexity;
  const token = normalizeToken(piece.material);
  if (token.includes('silk') || token.includes('leather') || token.includes('jacquard')) return 'high';
  return 'medium';
}

function inferStatus(piece: CollectionReportInputPiece): CollectionPieceStatus {
  if (piece.status) return piece.status;
  const score = piece.score ?? 0;
  if (score >= 80) return 'strong';
  if (score >= 62) return 'watch';
  return 'revise';
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function toDistribution(counts: Record<string, number>, total: number): CollectionDistributionItem[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label: titleCase(label),
      count,
      percentage: percentage(count, total),
    }));
}

interface StrategyProfile {
  roleTargets: Record<CollectionPieceRole, number>;
  complexityCeiling: number;
  silhouetteTarget: number;
  redundancyTolerance: number;
  identityBias: number;
  resonanceBias: number;
  executionBias: number;
  framing: string;
}

function getPrimaryGoal(intent?: CollectionReportIntentInput | null) {
  return intent?.primary_goals?.[0]?.trim() || '';
}

function getStrategyProfile(intent?: CollectionReportIntentInput | null): StrategyProfile {
  const creative = intent?.tension_sliders?.creative_expression ?? 50;
  const novelty = intent?.tension_sliders?.novelty ?? 50;
  const trend = intent?.tension_sliders?.trend_forward ?? 50;
  const role = normalizeToken(intent?.collection_role);
  const tradeoff = normalizeToken(intent?.tradeoff);
  const primaryGoal = normalizeToken(getPrimaryGoal(intent));

  const profile: StrategyProfile = {
    roleTargets: { hero: 0.2, core: 0.5, support: 0.3 },
    complexityCeiling: 58,
    silhouetteTarget: 60,
    redundancyTolerance: 42,
    identityBias: 0.34,
    resonanceBias: 0.33,
    executionBias: 0.33,
    framing: 'balanced collection health',
  };

  if (
    role === 'hero' ||
    primaryGoal.includes('brand') ||
    primaryGoal.includes('statement') ||
    creative >= 66 ||
    novelty >= 64
  ) {
    profile.roleTargets = { hero: 0.34, core: 0.38, support: 0.28 };
    profile.complexityCeiling = 66;
    profile.silhouetteTarget = 72;
    profile.redundancyTolerance = 50;
    profile.identityBias = 0.44;
    profile.resonanceBias = 0.28;
    profile.executionBias = 0.28;
    profile.framing = 'statement-led brief';
  }

  if (
    role === 'volume-driver' ||
    primaryGoal.includes('commercial') ||
    primaryGoal.includes('sales') ||
    tradeoff.includes('longevity') ||
    creative <= 38
  ) {
    profile.roleTargets = { hero: 0.12, core: 0.44, support: 0.44 };
    profile.complexityCeiling = 42;
    profile.silhouetteTarget = 50;
    profile.redundancyTolerance = 34;
    profile.identityBias = 0.26;
    profile.resonanceBias = 0.38;
    profile.executionBias = 0.36;
    profile.framing = 'commercially-driven brief';
  }

  if (trend >= 68) {
    profile.redundancyTolerance += 6;
    profile.silhouetteTarget += 4;
  }

  if (tradeoff.includes('line in the sand')) {
    profile.identityBias += 0.05;
    profile.executionBias -= 0.03;
    profile.resonanceBias -= 0.02;
  }

  return profile;
}

function summarizeIntent(intent?: CollectionReportIntentInput | null) {
  const primaryGoal = getPrimaryGoal(intent);
  const role = titleCase(intent?.collection_role);
  const tradeoff = intent?.tradeoff?.trim() || '';
  const parts = [primaryGoal, role !== 'Unknown' ? role : '', tradeoff].filter(Boolean);
  if (parts.length === 0) return 'No intent calibration available.';
  return `Measured against ${parts.join(' / ')}.`;
}

function buildGapRecommendation(args: {
  dominantCategory?: string;
  topMaterial?: string;
  supportShare: number;
  heroShare: number;
  silhouetteDiversity: CollectionHealthDetail;
  complexityLoad: CollectionHealthDetail;
}) {
  if (args.supportShare < 28) {
    return `Add a support-led ${args.dominantCategory ? args.dominantCategory.toLowerCase().replace(/s$/, '') : 'piece'} in ${args.topMaterial?.toLowerCase() ?? 'a simpler material'} to make the headline ideas easier to merchandise.`;
  }

  if (args.silhouetteDiversity.label === 'Low') {
    return `Introduce one sharper silhouette shift outside ${args.dominantCategory?.toLowerCase() ?? 'the current category center'} so the line stops repeating the same outline.`;
  }

  if (args.complexityLoad.score <= 48) {
    return `Hold one hero in ${args.topMaterial?.toLowerCase() ?? 'the lead fabrication'} and strip complexity out of the next supporting style before development load compounds.`;
  }

  if (args.heroShare < 18) {
    return `Add one clearer hero ${args.dominantCategory ? args.dominantCategory.toLowerCase().replace(/s$/, '') : 'piece'} to give the assortment a visible lead story.`;
  }

  return 'Keep new additions disciplined around one clear role gap rather than broadening the range in every direction at once.';
}

function describeRoleBalance(
  score: number,
  roles: Record<CollectionPieceRole, number>,
  strategy: StrategyProfile,
  intentSummary: string
) {
  const dominantRole = (Object.entries(roles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'core') as CollectionPieceRole;

  if (score >= 75) {
    return {
      label: 'Balanced',
      interpretation: 'Hero, core, and support pieces are carrying distinct roles without one tier overpowering the edit.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  if (dominantRole === 'hero') {
    return {
      label: 'Hero-led',
      interpretation: 'The collection is currently over-concentrated in hero concepts and needs a steadier support layer around them.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  if (dominantRole === 'support') {
    return {
      label: 'Support-heavy',
      interpretation: 'The base is present, but the collection needs more signature energy to hold the assortment together.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  return {
    label: 'Moderate',
    interpretation: 'The line is directionally sound, though one role tier is starting to outweigh the rest of the architecture.',
    basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
  };
}

function describeComplexityLoad(
  score: number,
  highCount: number,
  total: number,
  strategy: StrategyProfile,
  intentSummary: string
) {
  if (score >= 72) {
    return {
      label: 'Controlled',
      interpretation: 'Development burden is staying inside the collection’s current risk tolerance, leaving room for selective ambition.',
      basis: `${intentSummary} Complexity tolerance set for a ${strategy.framing}.`,
    };
  }

  if (score <= 42) {
    return {
      label: 'Strained',
      interpretation: 'Development burden is too high for the current brief and should be edited before sampling capacity tightens.',
      basis: `${intentSummary} Complexity tolerance set for a ${strategy.framing}.`,
    };
  }

  return {
    label: 'Moderate',
    interpretation:
      highCount > 0 && highCount / Math.max(total, 1) >= 0.35
        ? 'A few demanding pieces are carrying disproportionate development weight.'
        : 'Construction effort is present but still workable at this stage of the assortment.',
    basis: `${intentSummary} Complexity tolerance set for a ${strategy.framing}.`,
  };
}

function describeSilhouetteDiversity(
  score: number,
  uniqueSilhouettes: number,
  total: number,
  strategy: StrategyProfile,
  intentSummary: string
) {
  if (score >= 70) {
    return {
      label: 'Diverse',
      interpretation: 'The collection is showing enough silhouette variation to feel intentional rather than repetitive.',
      basis: `${intentSummary} Shape breadth calibrated for a ${strategy.framing}.`,
    };
  }

  if (uniqueSilhouettes <= Math.max(1, Math.floor(total / 3))) {
    return {
      label: 'Low',
      interpretation: 'Several pieces are landing in overlapping shapes, which narrows the assortment read.',
      basis: `${intentSummary} Shape breadth calibrated for a ${strategy.framing}.`,
    };
  }

  return {
    label: 'Moderate',
    interpretation: 'There is some range in shape, but a few repeated outlines are starting to compress assortment breadth.',
    basis: `${intentSummary} Shape breadth calibrated for a ${strategy.framing}.`,
  };
}

function describeRedundancyRisk(
  score: number,
  dominantCategoryShare: number,
  strategy: StrategyProfile,
  intentSummary: string
) {
  if (score >= 68) {
    return {
      label: 'Contained',
      interpretation: 'Category and silhouette overlap are controlled enough that pieces still read with distinct jobs.',
      basis: `${intentSummary} Redundancy tolerance calibrated for a ${strategy.framing}.`,
    };
  }

  if (dominantCategoryShare >= 55) {
    return {
      label: 'Moderate',
      interpretation: 'The assortment is leaning heavily on one category, so edit discipline will matter as more pieces are added.',
      basis: `${intentSummary} Redundancy tolerance calibrated for a ${strategy.framing}.`,
    };
  }

  return {
    label: 'Elevated',
    interpretation: 'Category and silhouette overlap are high enough that parts of the line may compete with one another.',
    basis: `${intentSummary} Redundancy tolerance calibrated for a ${strategy.framing}.`,
  };
}

function getScoreExplanation(
  label: 'Identity' | 'Resonance' | 'Execution',
  score: number,
  context: {
    brandName?: string;
    intentSummary: string;
    dominantCategory?: string;
    topMaterial?: string;
    heroShare: number;
    supportShare: number;
    complexityLoad: number;
    redundancyRisk: number;
  }
): string {
  if (label === 'Identity') {
    if (score >= 80) {
      return `${context.brandName ?? 'The collection'} reads coherently through ${context.dominantCategory ?? 'the key categories'}, with a point of view that stays consistent under the current brief.`;
    }

    if (score >= 65) {
      return `The direction is recognizable, though a sharper edit around ${context.dominantCategory ?? 'the lead category'} would make the brand language feel more deliberate for this collection intent.`;
    }

    return 'The collection direction is still fragmented, and the strongest pieces are not yet pulling the rest of the line into one coherent story.';
  }

  if (label === 'Resonance') {
    if (score >= 80) {
      return `The assortment lands in a commercially relevant space, with enough clarity around ${context.dominantCategory ?? 'the lead categories'} to feel timely without blurring into category sameness.`;
    }

    if (score >= 65) {
      return 'There is market promise here, but the line needs stronger role clarity and differentiation to convert relevance into demand.';
    }

    return 'The assortment is not yet translating its creative direction into a sharp market proposition, especially where overlap is highest.';
  }

  if (score >= 80) {
    return `Build feasibility is strong, with ${context.topMaterial ?? 'material choices'} and complexity load staying inside the risk tolerance implied by the collection brief.`;
  }

  if (score >= 65) {
    return `Execution is workable, though complexity concentration and a ${context.supportShare < 25 ? 'thin support layer' : 'few demanding hero pieces'} create pressure points against the current intent.`;
  }

  return 'Execution risk is elevated, with too much complexity or concentration for the collection to move cleanly into sampling without edits.';
}

function buildThesis(input: CollectionReportInput, context: {
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
  identity: number;
  resonance: number;
  execution: number;
  dominantCategory?: string;
  topMaterial?: string;
  roleBalanceLabel: string;
  silhouetteLabel: string;
}) {
  const brandName = context.brand?.brand_name || input.collection_name;
  const leadGoal = getPrimaryGoal(context.intent);
  const customer = context.brand?.customer_profile?.split(/[.!?]/)[0]?.trim();
  const strongest =
    context.identity >= context.resonance && context.identity >= context.execution
      ? 'brand coherence'
      : context.resonance >= context.execution
        ? 'market relevance'
        : 'build viability';
  const mainTension =
    context.silhouetteLabel === 'Low'
      ? 'broader silhouette differentiation'
      : context.roleBalanceLabel === 'Hero-led'
        ? 'sharper role balance'
        : context.execution < 70
          ? 'a cleaner execution edit'
          : 'tighter assortment discipline';

  return `${brandName} is building a ${context.dominantCategory ? `${context.dominantCategory.toLowerCase()}-led` : 'focused'} collection that is strongest when it pushes ${strongest}${leadGoal ? ` in service of ${leadGoal.toLowerCase()}` : ''}. ${customer ? `For a customer anchored in ${customer.toLowerCase()},` : 'Right now,'} the line feels most convincing through ${context.topMaterial ? context.topMaterial.toLowerCase() : 'its material language'}, but it still needs ${mainTension} before development decisions lock.`;
}

function buildOverviewNote(silhouetteScore: number, dominantSilhouetteShare: number) {
  if (silhouetteScore >= 70) {
    return 'Silhouettes are varied enough to give the collection shape without losing cohesion.';
  }

  if (dominantSilhouetteShare >= 45) {
    return 'A few repeated shapes are doing too much of the work and may limit assortment breadth.';
  }

  return 'The collection has some silhouette range, though overlap is starting to show in adjacent pieces.';
}

function buildRisks(args: {
  roleBalance: CollectionHealthDetail;
  complexityLoad: CollectionHealthDetail;
  silhouetteDiversity: CollectionHealthDetail;
  redundancyRisk: CollectionHealthDetail;
  dominantCategory?: string;
  topMaterial?: string;
  supportShare: number;
  heroShare: number;
}): CollectionRisk[] {
  const risks: CollectionRisk[] = [];

  if (args.complexityLoad.score <= 48) {
    risks.push({
      title: 'Complexity concentration',
      detail: 'Too much development weight is sitting in a small number of pieces, which raises sampling and execution pressure.',
    });
  }

  if (args.silhouetteDiversity.score <= 48) {
    risks.push({
      title: 'Silhouette redundancy',
      detail: 'Several looks are landing in adjacent shapes, reducing the assortment’s sense of range.',
    });
  }

  if (args.roleBalance.label === 'Hero-led' || args.supportShare < 22) {
    risks.push({
      title: 'Underbuilt support layer',
      detail: 'The collection has direction, but it needs more support pieces to make the heroes commercially legible.',
    });
  }

  if (args.redundancyRisk.score <= 42 && args.dominantCategory) {
    risks.push({
      title: `${args.dominantCategory} dependence`,
      detail: `The line is leaning heavily on ${args.dominantCategory.toLowerCase()}, so performance risk is concentrated in one area.`,
    });
  }

  if (risks.length < 2) {
    risks.push({
      title: 'Editing discipline',
      detail: `The strongest opportunity is to clarify what each piece contributes before the collection expands further around ${args.topMaterial?.toLowerCase() ?? 'the current material direction'}.`,
    });
  }

  return risks.slice(0, 4);
}

function buildOverallRead(args: {
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
  identity: number;
  resonance: number;
  execution: number;
  roleBalance: CollectionHealthDetail;
  silhouetteDiversity: CollectionHealthDetail;
  riskCount: number;
}) {
  if (args.identity >= 80 && args.resonance >= 75 && args.execution >= 72 && args.riskCount <= 2) {
    return `${args.brand?.brand_name ?? 'This collection'} is ready to move forward with refinement, not rethinking.`;
  }

  if (args.identity >= 78 && (args.roleBalance.label !== 'Balanced' || args.silhouetteDiversity.label === 'Low')) {
    return 'The direction is convincing, but the assortment needs rebalancing before sampling earns the headline.';
  }

  if (args.identity >= 75 && args.execution < 70) {
    return 'Brand clarity is landing; development discipline is the gate to readiness.';
  }

  return 'The collection is promising, but the line edit is not resolved enough to lock cleanly.';
}

function buildOverallReadDetail(args: {
  dominantCategory?: string;
  roleBalance: CollectionHealthDetail;
  complexityLoad: CollectionHealthDetail;
  silhouetteDiversity: CollectionHealthDetail;
  recommendation: string;
}) {
  return [
    args.dominantCategory ? `${args.dominantCategory} is still carrying too much of the collection’s outcome.` : null,
    args.roleBalance.label !== 'Balanced' ? args.roleBalance.interpretation : null,
    args.complexityLoad.score >= 68 ? args.complexityLoad.interpretation : null,
    args.silhouetteDiversity.label === 'Low' ? args.silhouetteDiversity.interpretation : null,
    args.recommendation,
  ].filter(Boolean)[0] ?? args.recommendation;
}

function summarizeInsight(args: {
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
  roleBalance: CollectionHealthDetail;
  complexityLoad: CollectionHealthDetail;
  silhouetteDiversity: CollectionHealthDetail;
  redundancyRisk: CollectionHealthDetail;
  dominantCategory?: string;
  heroShare: number;
  supportShare: number;
  topMaterial?: string;
}) {
  const working: string[] = [];
  const watch: string[] = [];
  const recommendations: string[] = [];

  if (args.heroShare >= 18) {
    working.push(`The collection has enough hero energy to anchor the line, so the lead story is legible instead of diffused across too many ideas.`);
  } else {
    working.push('Core pieces are carrying the line consistently, which gives the assortment a stable commercial base to build on.');
  }

  if (args.roleBalance.label === 'Balanced') {
    working.push('Role distribution is reading with discipline, so the collection feels intentionally built rather than accumulated piece by piece.');
  }

  if (args.topMaterial) {
    working.push(`${args.topMaterial} is helping unify the edit without flattening the collection into a single-note material story.`);
  }

  if (args.silhouetteDiversity.label === 'Low') {
    watch.push(`Shape repetition is compressing the collection, making adjacent ${args.dominantCategory?.toLowerCase() ?? 'pieces'} feel closer than they should.`);
  }

  if (args.complexityLoad.score <= 48) {
    watch.push('Complexity is stacking into too few pieces, which could slow development disproportionate to assortment size.');
  }

  if (args.supportShare < 22) {
    watch.push('The support architecture is thin, so hero ideas may arrive without enough surrounding clarity.');
  }

  if (args.redundancyRisk.score <= 42 && args.dominantCategory) {
    watch.push(`Too much of the collection outcome depends on ${args.dominantCategory.toLowerCase()}, increasing concentration risk.`);
  }

  recommendations.push(buildGapRecommendation(args));

  if (args.supportShare < 28) {
    recommendations.push(`Add or strengthen support pieces that make the hero concepts easier to merchandise${args.topMaterial ? `, ideally in ${args.topMaterial.toLowerCase()} or an adjacent easier fabric` : ''}.`);
  }

  if (args.complexityLoad.score <= 48) {
    recommendations.push('Validate feasibility on the most complex pieces now, then simplify construction or fabrication where the payoff is marginal.');
  } else {
    recommendations.push(`Protect the strongest direction by keeping new additions disciplined around role and silhouette${args.intent?.collection_role ? ` for a ${titleCase(args.intent.collection_role).toLowerCase()} brief` : ''}.`);
  }

  return {
    working: working.slice(0, 3),
    watch: watch.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
  };
}

export function buildCollectionReport(input: CollectionReportInput): CollectionReportResponse {
  const strategy = getStrategyProfile(input.intent);
  const intentSummary = summarizeIntent(input.intent);
  const pieces = input.pieces.map((piece) => ({
    id: piece.id,
    piece_name: piece.piece_name?.trim() || 'Untitled Piece',
    category: titleCase(piece.category),
    role: inferRole(piece),
    complexity: inferComplexity(piece),
    direction_tag: titleCase(piece.direction_tag || 'Collection Direction'),
    material: titleCase(piece.material),
    silhouette: titleCase(piece.silhouette),
    score: clamp(piece.score ?? 0),
    status: inferStatus(piece),
    dimensions: piece.dimensions ?? null,
    margin_passed: piece.margin_passed ?? null,
  }));

  const pieceCount = pieces.length;
  const roleCounts = countBy(pieces.map((piece) => piece.role));
  const complexityCounts = countBy(pieces.map((piece) => piece.complexity));
  const categoryCounts = countBy(pieces.map((piece) => normalizeToken(piece.category) || 'unknown'));
  const materialCounts = countBy(pieces.map((piece) => normalizeToken(piece.material) || 'unknown'));
  const silhouetteCounts = countBy(pieces.map((piece) => normalizeToken(piece.silhouette) || 'unknown'));
  const total = Math.max(pieceCount, 1);

  const roles: Record<CollectionPieceRole, number> = {
    hero: roleCounts.hero ?? 0,
    core: roleCounts.core ?? 0,
    support: roleCounts.support ?? 0,
  };

  const heroShare = percentage(roles.hero, total);
  const supportShare = percentage(roles.support, total);

  const roleBalanceScore = (() => {
    const variance = (Object.keys(strategy.roleTargets) as CollectionPieceRole[]).reduce((sum, key) => {
      return sum + Math.abs((roles[key] / total) - strategy.roleTargets[key]);
    }, 0);

    return clamp((1 - variance / 1.2) * 100);
  })();

  const complexityWeights: Record<CollectionComplexity, number> = {
    high: 1,
    medium: 0.6,
    low: 0.3,
  };

  const rawComplexityLoad = clamp(
    (pieces.reduce((sum, piece) => sum + complexityWeights[piece.complexity], 0) / total) * 100
  );
  const complexityLoadScore = clamp(
    100 - Math.max(0, rawComplexityLoad - strategy.complexityCeiling) * 2.2
  );

  const uniqueSilhouettes = Object.keys(silhouetteCounts).filter((token) => token !== 'unknown').length;
  const rawSilhouetteDiversity = clamp((uniqueSilhouettes / total) * 100);
  const silhouetteDiversityScore = clamp(
    100 - Math.abs(rawSilhouetteDiversity - strategy.silhouetteTarget) * 1.6
  );
  const dominantSilhouetteShare = Object.values(silhouetteCounts).sort((a, b) => b - a)[0]
    ? percentage(Object.values(silhouetteCounts).sort((a, b) => b - a)[0], total)
    : 0;
  const dominantCategoryToken = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantCategoryShare = dominantCategoryToken ? percentage(categoryCounts[dominantCategoryToken], total) : 0;
  const rawRedundancyRisk = clamp((100 - rawSilhouetteDiversity) * 0.6 + dominantCategoryShare * 0.4);
  const redundancyRiskScore = clamp(
    Math.max(0, rawRedundancyRisk - strategy.redundancyTolerance) * 1.7
  );

  const roleBalance = {
    score: roleBalanceScore,
    ...describeRoleBalance(roleBalanceScore, roles, strategy, intentSummary),
  };
  const complexityLoad = {
    score: complexityLoadScore,
    ...describeComplexityLoad(complexityLoadScore, complexityCounts.high ?? 0, total, strategy, intentSummary),
  };
  const silhouetteDiversity = {
    score: silhouetteDiversityScore,
    ...describeSilhouetteDiversity(silhouetteDiversityScore, uniqueSilhouettes, total, strategy, intentSummary),
  };
  const redundancyRisk = {
    score: redundancyRiskScore,
    ...describeRedundancyRisk(redundancyRiskScore, dominantCategoryShare, strategy, intentSummary),
  };

  const rawIdentity = average(
    pieces.map((piece) => piece.dimensions?.identity ?? Math.round(piece.score * 0.95))
  );
  const rawResonance = average(
    pieces.map((piece) => piece.dimensions?.resonance ?? piece.score)
  );
  const rawExecution = average(
    pieces.map((piece) => piece.dimensions?.execution ?? Math.round(piece.score * 0.9))
  );
  const identity = clamp(
    rawIdentity + (roleBalanceScore >= 72 ? 4 : 0) + (silhouetteDiversityScore >= 70 ? 2 : 0)
  );
  const resonance = clamp(
    rawResonance + (redundancyRiskScore <= 30 ? 3 : 0) - (dominantCategoryShare >= 55 ? 4 : 0)
  );
  const execution = clamp(
    rawExecution + (complexityLoadScore >= 70 ? 4 : 0) - (supportShare < 22 ? 3 : 0)
  );

  const dominantCategory = dominantCategoryToken ? titleCase(dominantCategoryToken) : undefined;
  const topMaterial = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMaterialLabel = topMaterial ? titleCase(topMaterial) : undefined;
  const overviewRoleDistribution = toDistribution(roleCounts, total);
  const overviewComplexityDistribution = toDistribution(complexityCounts, total);
  const overviewCategoryDistribution = toDistribution(categoryCounts, total).slice(0, 4);
  const topMaterials = toDistribution(materialCounts, total)
    .filter((item) => normalizeToken(item.label) !== 'unknown')
    .slice(0, 3)
    .map((item) => item.label);

  const scoresContext = {
    brandName: input.brand?.brand_name ?? undefined,
    intentSummary,
    dominantCategory,
    topMaterial: topMaterialLabel,
    heroShare,
    supportShare,
    complexityLoad: complexityLoadScore,
    redundancyRisk: redundancyRiskScore,
  };

  const scores: CollectionReportPayload['scores'] = {
    identity: {
      score: identity,
      explanation: getScoreExplanation('Identity', identity, scoresContext),
    },
    resonance: {
      score: resonance,
      explanation: getScoreExplanation('Resonance', resonance, scoresContext),
    },
    execution: {
      score: execution,
      explanation: getScoreExplanation('Execution', execution, scoresContext),
    },
  };

  const insight = summarizeInsight({
    brand: input.brand,
    intent: input.intent,
    roleBalance,
    complexityLoad,
    silhouetteDiversity,
    redundancyRisk,
    dominantCategory,
    heroShare,
    supportShare,
    topMaterial: topMaterialLabel,
  });

  const keyRisks = buildRisks({
    roleBalance,
    complexityLoad,
    silhouetteDiversity,
    redundancyRisk,
    dominantCategory,
    topMaterial: topMaterialLabel,
    supportShare,
    heroShare,
  });

  const overallRead = buildOverallRead({
    brand: input.brand,
    intent: input.intent,
    identity,
    resonance,
    execution,
    roleBalance,
    silhouetteDiversity,
    riskCount: keyRisks.length,
  });
  const overallReadDetail = buildOverallReadDetail({
    dominantCategory,
    roleBalance,
    complexityLoad,
    silhouetteDiversity,
    recommendation: insight.recommendations[0] ?? 'Keep editing toward a clearer collection hierarchy.',
  });

  const immediateActions = [
    complexityLoad.score <= 48
      ? 'Validate feasibility, costing, and timeline on the most complex hero pieces before sampling slots tighten.'
      : 'Confirm the lead hero pieces and keep the rest of the line disciplined around them.',
    silhouetteDiversity.label === 'Low'
      ? 'Edit duplicate silhouettes so adjacent pieces are not competing for the same role in the assortment.'
      : 'Review the line for any pieces whose role or silhouette is still too close to an existing style.',
    supportShare < 28
      ? 'Strengthen the support layer so the collection can sell through more than its headline concepts.'
      : 'Lock materials and trims on the strongest pieces to protect coherence as development continues.',
  ].slice(0, 3);

  const decisionPoints = [
    dominantCategory
      ? `Decide whether to maintain the current concentration in ${dominantCategory.toLowerCase()} or reallocate into adjacent categories.`
      : 'Decide whether the current category concentration is intentional or needs rebalancing.',
    complexityLoad.score <= 48
      ? 'Choose where elevated complexity is truly worth the investment and where a simpler build would preserve the idea.'
      : 'Decide how much construction ambition the team wants to hold before costs begin to distort the assortment.',
    silhouetteDiversity.label === 'Low'
      ? 'Choose whether overlapping silhouettes should be differentiated further or reduced before the line locks.'
      : 'Decide whether the current shape range is enough for the market breadth you want the collection to cover.',
  ].slice(0, 3);

  return {
    collection_report: {
      header: {
        title: `${input.season} Collection Report`,
        collection_name: input.collection_name,
        season: input.season,
        generated_at: input.generated_at ?? new Date().toISOString(),
        piece_count: pieceCount,
        version_label: input.version_label ?? null,
      },
      collection_thesis: buildThesis(input, {
        brand: input.brand,
        intent: input.intent,
        identity,
        resonance,
        execution,
        dominantCategory,
        topMaterial: topMaterialLabel,
        roleBalanceLabel: roleBalance.label,
        silhouetteLabel: silhouetteDiversity.label,
      }),
      overview: {
        total_pieces: pieceCount,
        role_distribution: overviewRoleDistribution,
        complexity_distribution: overviewComplexityDistribution,
        category_distribution: overviewCategoryDistribution,
        silhouette_note: buildOverviewNote(silhouetteDiversityScore, dominantSilhouetteShare),
        top_materials: topMaterials,
      },
      scores,
      muko_insight: insight,
      collection_health: {
        role_balance: roleBalance,
        complexity_load: complexityLoad,
        silhouette_diversity: silhouetteDiversity,
        redundancy_risk: redundancyRisk,
      },
      piece_summary: pieces
        .sort((a, b) => b.score - a.score)
        .map((piece) => ({
          id: piece.id,
          piece_name: piece.piece_name,
          category: piece.category,
          role: piece.role,
          complexity: piece.complexity,
          direction_tag: piece.direction_tag,
          material: piece.material,
          score: piece.score,
          status: piece.status,
        })),
      key_risks: keyRisks,
      next_steps: {
        immediate_actions: immediateActions,
        decision_points: decisionPoints,
      },
      overall_read: overallRead,
      overall_read_detail: overallReadDetail,
      meta: {
        source: 'fallback',
        snapshot_id: input.snapshot_id ?? null,
      },
    },
  };
}
