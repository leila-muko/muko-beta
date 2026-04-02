interface MaterialLike {
  id: string;
  name: string;
}

function normalizeMaterialText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMaterialAliases(material: MaterialLike): string[] {
  const aliases = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeMaterialText(value);
    if (normalized) aliases.add(normalized);
  };

  add(material.id);
  add(material.id.replace(/-/g, " "));
  add(material.name);

  if (material.id === "organic-cotton") {
    ["organic cotton", "cotton organic"].forEach(add);
  } else if (material.id === "conventional-cotton") {
    ["conventional cotton", "cotton", "cotton woven", "cotton poplin"].forEach(add);
  } else if (material.id === "tencel") {
    ["tencel", "lyocell", "tencel lyocell"].forEach(add);
  } else if (material.id === "rayon-viscose") {
    ["rayon", "viscose", "rayon viscose"].forEach(add);
  } else if (material.id === "wool-merino") {
    ["wool", "merino", "merino wool"].forEach(add);
  } else if (material.id === "cashmere-blend") {
    ["cashmere", "cashmere blend"].forEach(add);
  } else if (material.id === "deadstock-fabric") {
    ["deadstock", "deadstock fabric", "deadstock material"].forEach(add);
  } else if (material.id === "recycled-polyester") {
    ["recycled polyester", "polyester recycled"].forEach(add);
  } else if (material.id === "virgin-polyester") {
    ["virgin polyester", "polyester"].forEach(add);
  } else if (material.id === "vegan-leather") {
    ["vegan leather", "faux leather", "pu leather"].forEach(add);
  } else if (material.id === "leather") {
    ["leather", "genuine leather", "real leather"].forEach(add);
  } else if (material.id === "linen") {
    ["linen", "flax linen"].forEach(add);
  } else if (material.id === "hemp") {
    ["hemp", "hemp canvas", "hemp twill"].forEach(add);
  } else if (material.id === "denim-conventional") {
    ["denim", "conventional denim", "standard denim", "blue denim"].forEach(add);
  } else if (material.id === "denim-raw-selvedge") {
    ["raw denim", "selvedge denim", "selvedge", "raw selvedge denim", "rigid denim"].forEach(add);
  }

  return Array.from(aliases);
}

function scoreClosestAliasMatch(source: string, alias: string): number {
  const sourceTokens = new Set(source.split(" ").filter(Boolean));
  const aliasTokens = alias.split(" ").filter(Boolean);
  if (aliasTokens.length === 0) return 0;

  let overlap = 0;
  for (const token of aliasTokens) {
    if (sourceTokens.has(token)) overlap += 1;
  }

  if (overlap === 0) return 0;
  return overlap * 20 + alias.length - Math.max(0, sourceTokens.size - aliasTokens.length) * 3;
}

export function findMaterialMention<T extends MaterialLike>(
  source: string,
  materials: T[],
): T | null {
  const normalized = normalizeMaterialText(source);
  if (!normalized) return null;

  let bestMatch: { material: T; score: number } | null = null;

  for (const material of materials) {
    for (const alias of buildMaterialAliases(material)) {
      if (!alias) continue;
      let score = 0;

      if (normalized === alias) {
        score = 100;
      } else if (normalized.includes(alias)) {
        score = alias.split(" ").length * 10 + alias.length;
      } else {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { material, score };
      }
    }
  }

  return bestMatch?.material ?? null;
}

export function findClosestMaterialMatch<T extends MaterialLike>(
  source: string,
  materials: T[],
): T | null {
  const normalized = normalizeMaterialText(source);
  if (!normalized) return null;

  let bestMatch: { material: T; score: number } | null = null;

  for (const material of materials) {
    for (const alias of buildMaterialAliases(material)) {
      const score = scoreClosestAliasMatch(normalized, alias);
      if (score === 0) continue;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { material, score };
      }
    }
  }

  return bestMatch?.score && bestMatch.score >= 24 ? bestMatch.material : null;
}

export function materialIdsToDisplayList<T extends MaterialLike>(materials: T[]): string {
  return materials.map((material) => `${material.id}: ${material.name}`).join(", ");
}
