import type { Material } from "@/lib/types/spec-studio";

type MaterialLike = Partial<Material> & {
  sustainability_flags?: unknown;
  drape_quality?: unknown;
  fiber_type?: unknown;
};

export function getMaterialProperties(material: MaterialLike | null | undefined): string[] {
  if (!material) return [];
  if (Array.isArray(material.properties)) return material.properties.filter((value): value is string => typeof value === "string");

  const properties: string[] = [];

  const sustainabilityFlags = material.sustainability_flags;
  if (Array.isArray(sustainabilityFlags)) {
    properties.push(...sustainabilityFlags.filter((value): value is string => typeof value === "string"));
  }

  if (typeof material.drape_quality === "string") {
    properties.push(material.drape_quality);
  }

  if (typeof material.fiber_type === "string") {
    properties.push(material.fiber_type);
  }

  return properties;
}
