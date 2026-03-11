import aestheticsData from '@/data/aesthetics.json';

type AestheticChip = {
  label: string;
};

type AestheticEntry = {
  id: string;
  name: string;
  chips: AestheticChip[];
};

const aesthetics = aestheticsData as AestheticEntry[];

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function getAestheticEntry(aesthetic: string): AestheticEntry | undefined {
  const key = normalize(aesthetic);
  return aesthetics.find(
    (entry) => normalize(entry.id) === key || normalize(entry.name) === key
  );
}

export function getAestheticChipLabels(aesthetic: string): string[] {
  return getAestheticEntry(aesthetic)?.chips.map((chip) => chip.label) ?? [];
}

export function normalizeExecutionLevers(
  aesthetic: string,
  executionLevers: string[] | undefined,
  maxLevers: number = 4,
): string[] {
  if (!Array.isArray(executionLevers) || executionLevers.length === 0) return [];

  const validLabels = getAestheticChipLabels(aesthetic);
  const validMap = new Map(validLabels.map((label) => [normalize(label), label]));
  const normalized: string[] = [];

  for (const lever of executionLevers) {
    const match = validMap.get(normalize(lever));
    if (!match || normalized.includes(match)) continue;
    normalized.push(match);
    if (normalized.length >= maxLevers) break;
  }

  return normalized;
}
