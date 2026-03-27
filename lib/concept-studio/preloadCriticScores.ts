"use client";

import { createClient } from "@/lib/supabase/client";
import { AESTHETICS } from "@/lib/concept-studio/constants";
import aestheticsData from "@/data/aesthetics.json";

type BrandProfileRow = {
  id: string;
};

type AestheticDataEntry = {
  name: string;
  keywords?: string[];
};

export async function preloadCriticScores(): Promise<Record<string, number>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  const { data: brandProfile, error } = await supabase
    .from("brand_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single<BrandProfileRow>();

  if (error || !brandProfile?.id) return {};

  const entries = aestheticsData as AestheticDataEntry[];
  const results = await Promise.allSettled(
    AESTHETICS.map(async (aesthetic) => {
      const entry = entries.find((item) => item.name === aesthetic);
      if (!entry?.keywords?.length) {
        return { aesthetic, score: 0 };
      }

      const response = await fetch("/api/agents/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aesthetic_keywords: entry.keywords,
          aesthetic_name: aesthetic,
          brand_profile_id: brandProfile.id,
        }),
      });

      if (!response.ok) {
        return { aesthetic, score: 0 };
      }

      const data = await response.json();
      return { aesthetic, score: data.pulse?.score ?? 0 };
    })
  );

  return results.reduce<Record<string, number>>((scores, result) => {
    if (result.status === "fulfilled") {
      scores[result.value.aesthetic] = result.value.score;
    }
    return scores;
  }, {});
}
