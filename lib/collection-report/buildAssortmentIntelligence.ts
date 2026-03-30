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
  categoryLeaders?: Array<{ label: string; count: number }>;
  materialLeaders?: Array<{ label: string; count: number }>;
  silhouetteLeaders?: Array<{ label: string; count: number }>;
  uniqueSilhouetteCount?: number;
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
  if (totalPieces <= 2) return 'early';
  if (totalPieces <= 7) return 'developing';
  return 'built';
}

function formatList(items: string[]) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function getCoveragePhrase(input: AssortmentIntelligenceInput) {
  const leaders = (input.categoryLeaders ?? []).filter((item) => item.label && item.count > 0);

  if (leaders.length === 0) {
    return 'coverage is still too thin to judge at category level';
  }

  if (leaders.length === 1) {
    return `${leaders[0].label} is carrying the line almost alone`;
  }

  if (leaders[0].count === leaders[1].count) {
    return `${leaders[0].label} and ${leaders[1].label} are sharing the load`;
  }

  return `${leaders[0].label} is leading, with ${leaders[1].label} as the secondary lane`;
}

function getSilhouettePhrase(input: AssortmentIntelligenceInput) {
  const totalPieces = Math.max(input.totalPieces, 1);
  const leaders = (input.silhouetteLeaders ?? []).filter((item) => item.label && item.count > 0);
  const uniqueSilhouettes = input.uniqueSilhouetteCount ?? 0;
  const dominantSilhouette = leaders[0];

  if (!dominantSilhouette) {
    return 'the silhouette pattern is still unresolved';
  }

  if (dominantSilhouette.count / totalPieces >= 0.5) {
    return `${dominantSilhouette.label} is repeating enough to set the shape language`;
  }

  if (uniqueSilhouettes >= Math.min(totalPieces, 4)) {
    return `the silhouette spread is opening up across ${uniqueSilhouettes} shapes`;
  }

  return `${dominantSilhouette.label} is the lead shape, but there is some range around it`;
}

function getMaterialPhrase(input: AssortmentIntelligenceInput) {
  const leaders = (input.materialLeaders ?? [])
    .filter((item) => item.label && item.label !== 'Unknown' && item.count > 0)
    .slice(0, 2)
    .map((item) => item.label);

  if (leaders.length === 0) {
    return 'material language is not yet strong enough to influence the read';
  }

  if (leaders.length === 1) {
    return `${leaders[0]} is doing most of the material signaling`;
  }

  return `${formatList(leaders)} are setting the material signal`;
}

function getRolePhrase(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics) {
  if (diagnostics.roleBalanceStatus === 'missing_core') {
    return `the line has ${input.heroCount} hero and ${input.supportCount} support roles, but no true core layer yet`;
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    return `the line has a base of ${input.coreCount} core and ${input.supportCount} support roles, but no clear hero`;
  }

  if (diagnostics.roleBalanceStatus === 'missing_support') {
    return `the lead idea is there with ${input.heroCount} hero and ${input.coreCount} core roles, but support is still missing`;
  }

  return `${input.heroCount} hero, ${input.coreCount} core, and ${input.supportCount} support roles are giving the line readable structure`;
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
    input.totalPieces <= 2 ||
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

  if (input.totalPieces <= 2) {
    return 'The collection is still building; there are not yet enough pieces to read the full assortment logic.';
  }

  const caveat = input.totalPieces < 8 ? `Based on ${input.totalPieces} pieces so far, ` : '';
  const rolePhrase = getRolePhrase(input, diagnostics);
  const coveragePhrase = getCoveragePhrase(input);

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    return `${caveat}${rolePhrase}, but too much of the collection weight is sitting in the highest-complexity pieces while ${coveragePhrase}.`;
  }

  if (diagnostics.complexityRisk === 'too_safe') {
    return `${caveat}${rolePhrase}, but the assortment is still landing in one safe commercial band even though ${coveragePhrase}.`;
  }

  if (diagnostics.viabilitySignal === 'stable') {
    return `${caveat}${rolePhrase}, and ${coveragePhrase}, so the collection is starting to hold as a system.`;
  }

  return `${caveat}${rolePhrase}, with ${coveragePhrase}, so the collection is readable even if it is not fully built yet.`;
}

function buildInsight(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics) {
  if (input.totalPieces <= 2) {
    return 'This collection is still direction-led rather than assortment-led. A few more pieces are needed before role distribution, category coverage, and shape language can be judged with confidence.';
  }

  const caveat = input.totalPieces < 8 ? `Based on ${input.totalPieces} pieces so far, ` : '';
  const coveragePhrase = getCoveragePhrase(input);
  const silhouettePhrase = getSilhouettePhrase(input);
  const materialPhrase = getMaterialPhrase(input);
  const opening =
    diagnostics.collectionStage === 'developing'
      ? `${caveat}the collection is starting to read as a line rather than a loose group of pieces.`
      : 'This collection has enough pieces to read as a system.';

  let middle = `${getRolePhrase(input, diagnostics)}, ${coveragePhrase}, ${silhouettePhrase}, and ${materialPhrase}.`;

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    middle = `${middle} The missing core layer is what keeps the idea from settling into a real assortment read.`;
  } else if (diagnostics.roleBalanceStatus === 'missing_hero') {
    middle = `${middle} The role mix is still too flat, so no single lane is asserting itself as the lead.`;
  } else if (diagnostics.roleBalanceStatus === 'missing_support') {
    middle = `${middle} The hero-and-core read is visible, but it still lacks the surrounding context that makes the line feel complete.`;
  } else if (diagnostics.complexityRisk === 'front_loaded_high') {
    middle = `${middle} Complexity is front-loaded, so too much of the collection burden is sitting in a narrow set of demanding pieces.`;
  } else if (diagnostics.complexityRisk === 'too_safe') {
    middle = `${middle} The build is too cautious overall, which flattens the line into one commercial tier.`;
  } else if (diagnostics.coverage === 'broad') {
    middle = `${middle} Coverage is broad enough to support a line, as long as the current role separation stays clear.`;
  }

  return `${opening} ${middle}`;
}

function buildNextAction(input: AssortmentIntelligenceInput, diagnostics: AssortmentDiagnostics): string {
  if (input.totalPieces === 1) {
    return 'Add a second piece to start testing whether the direction can extend beyond one look.';
  }

  if (input.totalPieces === 2) {
    return 'Add a third piece that tests the same idea in a second role or category so the collection can start to read structurally.';
  }

  const topCategory = input.categoryLeaders?.[0]?.label ?? 'the lead category';
  const secondCategory = input.categoryLeaders?.[1]?.label;
  const topMaterial = input.materialLeaders?.find((item) => item.label !== 'Unknown')?.label;
  const leadSilhouette = input.silhouetteLeaders?.[0]?.label;

  if (diagnostics.roleBalanceStatus === 'missing_core') {
    return `Add a core piece around ${topCategory}${topMaterial ? ` using the ${topMaterial.toLowerCase()} signal already present` : ''} so the collection stops depending on statement roles alone.`;
  }

  if (diagnostics.roleBalanceStatus === 'missing_hero') {
    return `Create one clearer hero in ${topCategory}${leadSilhouette ? ` around the ${leadSilhouette.toLowerCase()} shape language` : ''} so the assortment has an obvious lead position.`;
  }

  if (diagnostics.roleBalanceStatus === 'missing_support') {
    return `Add a support piece${secondCategory ? ` in ${secondCategory}` : ''} that extends the ${topCategory.toLowerCase()} idea and gives the lead pieces more context around them.`;
  }

  if (diagnostics.complexityRisk === 'front_loaded_high') {
    return `Offset the high-complexity weight with a simpler core piece${secondCategory ? ` in ${secondCategory}` : ''} so the line is not carried by its hardest builds alone.`;
  }

  if (diagnostics.coverage === 'narrow') {
    return `Translate the current ${topCategory.toLowerCase()} language into ${secondCategory ? secondCategory : 'one adjacent category'} before adding more of the same category.`;
  }

  if (diagnostics.complexityRisk === 'too_safe') {
    return `Add one sharper directional piece${leadSilhouette ? ` that pushes beyond the current ${leadSilhouette.toLowerCase()} repeat` : ''} so the line stops reading as one safe commercial band.`;
  }

  if (
    (input.collectionScore ?? 0) >= 80 &&
    diagnostics.roleBalanceStatus === 'balanced' &&
    diagnostics.complexityRisk === 'balanced'
  ) {
    return `Expand through ${secondCategory ?? topCategory} while keeping the current role split and material language intact.`;
  }

  return `Add the next piece where the collection is thinnest${secondCategory ? `, especially outside ${topCategory}` : ''}, so the current shape and material story can prove it has range.`;
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
