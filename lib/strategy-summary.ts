export interface StrategySummaryInput {
  priorities: string[];
  trendLabel: string;
  creativeLabel: string;
  elevatedLabel: string;
  noveltyLabel: string;
  targetMargin?: number | null;
  targetMsrp?: number | null;
  sliderTrendValue?: number | null;
  sliderCreativeValue?: number | null;
  sliderElevatedValue?: number | null;
  sliderNoveltyValue?: number | null;
}

export interface ProgressiveStrategySummary {
  stage: 0 | 1 | 2 | 3;
  text: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function dedupe(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value?.trim()) return false;
    const key = value.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCurrency(value: number) {
  return `$${Math.round(value)}`;
}

function resolvePriorityClause(priorities: string[]) {
  const normalized = priorities.map(normalize);
  const hasBrand = normalized.some((value) => value.includes("distinct point of view"));
  const hasCommercial = normalized.some((value) => value.includes("sell-through confidence"));
  const hasTrend = normalized.some((value) => value.includes("current market mood"));
  const hasMargin = normalized.some((value) => value.includes("protect margin"));
  const hasExperiment = normalized.some((value) => value.includes("test a new idea"));

  if (hasBrand && hasCommercial) return "balancing brand expression with commercial clarity";
  if (hasBrand && hasMargin) return "holding a strong point of view with tighter exposure";
  if (hasCommercial && hasMargin) return "favoring commercial clarity with tighter exposure";
  if (hasBrand) return "prioritizing a strong brand point of view";
  if (hasCommercial) return "prioritizing commercial clarity";
  if (hasTrend) return "leaning into the current market mood";
  if (hasMargin) return "protecting margin with tighter exposure";
  if (hasExperiment) return "leaving room to test a new idea";

  return null;
}

function getTrendPhrase(label: string) {
  const value = normalize(label);
  if (value.includes("steady longevity") || value.includes("timeless") || value.includes("long-horizon")) {
    return "low trend exposure";
  }
  if (value.includes("high exposure") || value.includes("trend-forward") || value.includes("of-the-moment")) {
    return "high trend exposure";
  }
  return "calibrated trend exposure";
}

function getCreativePhrase(label: string) {
  const value = normalize(label);
  if (value.includes("commercial restraint") || value.includes("commercially safe") || value.includes("restrained")) {
    return "restrained expression";
  }
  if (value.includes("high expression") || value.includes("creative-led") || value.includes("expressive")) {
    return "expressive";
  }
  return "measured expression";
}

function getElevatedPhrase(label: string) {
  const value = normalize(label);
  if (value.includes("access-led") || value.includes("accessible")) return "accessible";
  if (value.includes("elevated stance") || value.includes("design-elevated")) return "elevated";
  return "elevated but accessible";
}

function getNoveltyPhrase(label: string) {
  const value = normalize(label);
  if (value.includes("continuity-first")) return "continuity-led";
  if (value.includes("high innovation") || value.includes("novelty-forward") || value.includes("newness-led")) {
    return "directional";
  }
  return "continuity-aware";
}

function hasSliderShift(value: number | null | undefined) {
  return typeof value === "number" && Math.abs(value - 50) >= 10;
}

export function buildProgressiveStrategySummary(input: StrategySummaryInput): ProgressiveStrategySummary {
  const hasFrame =
    typeof input.targetMargin === "number" &&
    input.targetMargin > 0 &&
    typeof input.targetMsrp === "number" &&
    input.targetMsrp > 0;
  const priorityClause = resolvePriorityClause(input.priorities.filter(Boolean));
  const hasPriorities = Boolean(priorityClause);
  const hasSliderLanguage = [
    input.sliderTrendValue,
    input.sliderCreativeValue,
    input.sliderElevatedValue,
    input.sliderNoveltyValue,
  ].some(hasSliderShift);

  if (!hasFrame) {
    return {
      stage: 0,
      text: "Define your collection stance",
    };
  }

  const cogsCeiling = Math.round((input.targetMsrp ?? 0) * (1 - (input.targetMargin ?? 0) / 100));
  const frameClause = `A ${formatCurrency(input.targetMsrp ?? 0)} collection anchored to a ${Math.round(
    input.targetMargin ?? 0
  )}% margin with a ${formatCurrency(cogsCeiling)} cost ceiling`;

  if (!hasPriorities) {
    return {
      stage: 1,
      text: frameClause,
    };
  }

  if (!hasSliderLanguage) {
    return {
      stage: 2,
      text: `${frameClause}, ${priorityClause}`,
    };
  }

  const creativePhrase = getCreativePhrase(input.creativeLabel);
  const trendPhrase = getTrendPhrase(input.trendLabel);
  const elevatedPhrase = getElevatedPhrase(input.elevatedLabel);
  const noveltyPhrase = getNoveltyPhrase(input.noveltyLabel);
  const leadPhrase =
    creativePhrase === "restrained expression" || elevatedPhrase !== "elevated"
      ? "commercially grounded"
      : creativePhrase === "expressive"
      ? "more expressive"
      : "editorially balanced";

  const descriptivePhrases = dedupe([
    leadPhrase,
    noveltyPhrase,
    creativePhrase,
    trendPhrase,
    elevatedPhrase === "elevated but accessible" ? elevatedPhrase : null,
  ]).slice(0, 4);

  const editorialClause = descriptivePhrases.length > 0
    ? `A ${descriptivePhrases.join(", ")} collection`
    : "A collection";

  const tailParts = dedupe([
    priorityClause,
    `anchored to a ${Math.round(input.targetMargin ?? 0)}% margin`,
  ]);

  return {
    stage: 3,
    text: `${editorialClause}${tailParts.length ? `, ${tailParts.join(", ")}` : ""}`,
  };
}

export function buildStrategySummary(input: StrategySummaryInput): string | null {
  return buildProgressiveStrategySummary(input).text;
}
