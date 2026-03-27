import type {
  AssortmentIntelligence,
  CollectionComplexity,
  CollectionDistributionItem,
  CollectionHealthDetail,
  CollectionPieceRole,
  CollectionPieceStatus,
  CollectionReportInput,
  CollectionReportInputPiece,
  CollectionReportIntentInput,
  CollectionReportPayload,
  CollectionReportResponse,
} from '@/lib/collection-report/types';
import { buildAssortmentIntelligence } from '@/lib/collection-report/buildAssortmentIntelligence';

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
  if (score >= 68) return 'directional';
  if (score >= 56) return 'core-evolution';
  return 'volume-driver';
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
    roleTargets: { hero: 0.18, directional: 0.22, 'core-evolution': 0.32, 'volume-driver': 0.28 },
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
    profile.roleTargets = { hero: 0.3, directional: 0.28, 'core-evolution': 0.24, 'volume-driver': 0.18 };
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
    profile.roleTargets = { hero: 0.12, directional: 0.14, 'core-evolution': 0.32, 'volume-driver': 0.42 };
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

function describeRoleBalance(
  score: number,
  roles: Record<CollectionPieceRole, number>,
  strategy: StrategyProfile,
  intentSummary: string
) {
  const dominantRole = (Object.entries(roles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'core-evolution') as CollectionPieceRole;

  if (score >= 75) {
    return {
      label: 'Balanced',
      interpretation: 'Hero, directional, core evolution, and volume-driving pieces are carrying distinct jobs without one tier overpowering the edit.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  if (dominantRole === 'hero') {
    return {
      label: 'Hero-led',
      interpretation: 'The collection is currently over-concentrated in hero concepts and needs a steadier core and volume-driving layer around them.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  if (dominantRole === 'volume-driver') {
    return {
      label: 'Volume-led',
      interpretation: 'The collection has commercial grounding, but it needs more lift and distinction to hold the assortment together.',
      basis: intentSummary || `Benchmarked against a ${strategy.framing}.`,
    };
  }

  if (dominantRole === 'directional') {
    return {
      label: 'Directional-heavy',
      interpretation: 'Forward ideas are doing most of the work, and the line needs more stabilizing roles around them.',
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
    foundationShare: number;
    complexityLoad: number;
    redundancyRisk: number;
  }
): string {
  if (label === 'Identity') {
    if (score >= 80) {
      return `${context.brandName ?? 'The collection'} is holding a consistent line across ${context.dominantCategory ?? 'the key categories'}, so the assortment reads as one system instead of isolated pieces.`;
    }

    if (score >= 65) {
      return `The assortment has a readable identity, but a sharper structural edit around ${context.dominantCategory ?? 'the lead category'} would make the line feel more disciplined.`;
    }

    return 'The collection is still fragmented at the assortment level, and the strongest pieces are not yet pulling the rest of the line into one coherent build.';
  }

  if (label === 'Resonance') {
    if (score >= 80) {
      return `The assortment has enough structural clarity around ${context.dominantCategory ?? 'the lead categories'} to feel commercially legible without collapsing into sameness.`;
    }

    if (score >= 65) {
      return 'The line has commercial potential, but it needs stronger role clarity and category separation to convert interest into a viable buy.';
    }

    return 'The assortment is not yet built clearly enough to support demand, especially where overlap is highest.';
  }

  if (score >= 80) {
    return `Build feasibility is strong, with ${context.topMaterial ?? 'material choices'} and complexity load staying inside the risk tolerance implied by the collection brief.`;
  }

  if (score >= 65) {
    return `Execution is workable, though complexity concentration and a ${context.foundationShare < 45 ? 'thin commercial foundation' : 'few demanding lead pieces'} create pressure points against the current intent.`;
  }

  return 'Execution risk is elevated, with too much complexity or concentration for the collection to move cleanly into sampling without edits.';
}

function buildThesis(input: CollectionReportInput, context: {
  assortmentIntelligence: AssortmentIntelligence;
}) {
  return context.assortmentIntelligence.collection_insight;
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

function buildOverallRead(args: {
  assortmentIntelligence: AssortmentIntelligence;
}) {
  const firstSentence = args.assortmentIntelligence.collection_insight.split('. ')[0]?.trim() || 'The assortment needs a clearer structure.';
  return `${firstSentence.replace(/\.$/, '')}.`;
}

function buildOverallReadDetail(args: {
  assortmentIntelligence: AssortmentIntelligence;
}) {
  return args.assortmentIntelligence.watchlist[0] ?? args.assortmentIntelligence.recommended_actions[0] ?? '';
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
    directional: roleCounts['directional'] ?? 0,
    'core-evolution': roleCounts['core-evolution'] ?? 0,
    'volume-driver': roleCounts['volume-driver'] ?? 0,
  };

  const heroShare = percentage(roles.hero, total);
  const foundationShare = percentage(roles['core-evolution'] + roles['volume-driver'], total);

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
    rawExecution + (complexityLoadScore >= 70 ? 4 : 0) - (foundationShare < 40 ? 3 : 0)
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
  const assortmentIntelligence = buildAssortmentIntelligence({
    totalPieces: pieceCount,
    heroCount: roles.hero,
    coreCount: roles['core-evolution'] + roles['volume-driver'],
    supportCount: roles.directional,
    lowCount: complexityCounts.low ?? 0,
    mediumCount: complexityCounts.medium ?? 0,
    highCount: complexityCounts.high ?? 0,
    uniqueCategoryCount: Object.keys(categoryCounts).filter((token) => token !== 'unknown').length,
    executionScore: rawExecution,
  });

  const scoresContext = {
    brandName: input.brand?.brand_name ?? undefined,
    intentSummary,
    dominantCategory,
    topMaterial: topMaterialLabel,
    heroShare,
    foundationShare,
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

  const insight = {
    working: assortmentIntelligence.breakdown,
    watch: assortmentIntelligence.watchlist,
    recommendations: assortmentIntelligence.recommended_actions,
  };

  const keyRisks = assortmentIntelligence.watchlist.map((detail, index) => ({
    title:
      index === 0
        ? 'Role Balance'
        : index === 1
          ? 'Complexity Risk'
          : index === 2
            ? 'Coverage Risk'
            : 'Assortment Risk',
    detail,
  }));

  const overallRead = buildOverallRead({
    assortmentIntelligence,
  });
  const overallReadDetail = buildOverallReadDetail({
    assortmentIntelligence,
  });

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
        assortmentIntelligence,
      }),
      narrative: input.narrative?.trim() || '',
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
      assortment_intelligence: assortmentIntelligence,
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
        immediate_actions: assortmentIntelligence.recommended_actions.slice(0, 3),
        decision_points: assortmentIntelligence.watchlist.slice(0, 3),
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
