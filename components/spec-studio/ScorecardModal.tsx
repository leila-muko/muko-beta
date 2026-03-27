"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import type { SpecSuggestion } from "@/lib/types/next-move";
import type { ScorecardInsight, Consideration } from "@/app/api/synthesizer/scorecard/route";
import type {
  ActionSuggestion,
  ActionSuggestionPayload,
  AlternativeMaterial,
  ConflictType,
} from "@/app/api/synthesizer/scorecard-action/route";
import materialsData from "@/data/materials.json";

const STATIC_ACTION_FALLBACK: ActionSuggestion = {
  conflict_label: "No conflicts",
  directive: "This piece is ready. Add it and keep building.",
  explanation:
    "Identity, Commercial Potential, and Execution are working together. The build clears margin and the timeline is comfortable.",
  show_alternatives: false,
  alternatives: [],
  cta_variant: "add",
  hint_text: "Revise to keep refining",
};

/* ─── Brand tokens (match all other pages exactly) ─── */
const OLIVE      = "#43432B";
const CHARTREUSE = "#A8B475";
const CAMEL      = "#B8876B";
const PULSE_RED  = "#8A3A3A";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

const microLabel: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "rgba(67,67,43,0.38)",
};

function scoreColor(score: number): string {
  if (score >= 75) return CHARTREUSE;
  if (score >= 50) return CAMEL;
  return PULSE_RED;
}

/* ─── Action suggestion helpers ─── */

interface MaterialEntry {
  id: string;
  name: string;
  cost_per_yard: number;
  lead_time_weeks: number;
  redirect_compatible?: string[];
  typical_aesthetics?: string[];
}

const DELIVERY_WINDOW_FW = 20;
const DELIVERY_WINDOW_SS = 26;
const COMPLEXITY_WEEKS: Record<string, number> = { low: 6, moderate: 10, high: 16 };

function deriveConflictType(
  identityScore: number,
  executionScore: number,
  marginGatePassed: boolean,
  material: MaterialEntry | undefined,
  constructionTier: string,
  season: string
): ConflictType {
  if (!marginGatePassed) return "cost_gate";
  if (executionScore < 70) {
    if (material) {
      const isFW = /fw|fall|autumn/i.test(season);
      const deliveryWindow = isFW ? DELIVERY_WINDOW_FW : DELIVERY_WINDOW_SS;
      const required = (COMPLEXITY_WEEKS[constructionTier] ?? 10) + material.lead_time_weeks;
      if (required > deliveryWindow - 4) return "execution_timeline";
    }
    return "execution_complexity";
  }
  if (identityScore < 65) return "identity_misalignment";
  return "none";
}

// Estimated yardage used to approximate COGS saving for cost_gate filtering.
// Actual yardage isn't available in modal context; 3yd is a reasonable mid-garment default.
const ESTIMATED_YARDAGE = 3;

function buildAlternatives(
  currentMaterial: MaterialEntry | undefined,
  allMaterials: MaterialEntry[],
  conflictType: ConflictType,
  constructionTier: string,
  season: string,
  cogsGap: number  // positive = amount over ceiling; 0 if not a cost conflict
): AlternativeMaterial[] {
  // No material alternatives for these conflict types — fix is conceptual or tier-based
  if (conflictType === "identity_misalignment" || conflictType === "execution_complexity" || conflictType === "none") {
    return [];
  }
  if (!currentMaterial || !currentMaterial.redirect_compatible) return [];

  const isFW = /fw|fall|autumn/i.test(season);
  const deliveryWindow = isFW ? DELIVERY_WINDOW_FW : DELIVERY_WINDOW_SS;
  const complexityW = COMPLEXITY_WEEKS[constructionTier] ?? 10;

  const candidates = currentMaterial.redirect_compatible
    .map((id) => allMaterials.find((mat) => mat.id === id))
    .filter((m): m is MaterialEntry => m !== null);

  // Build a trade-off label for each candidate describing what it resolves + secondary trade-offs
  function buildTradeoffNote(m: MaterialEntry): string {
    const parts: string[] = [];
    const currentAesthetics = new Set(currentMaterial?.typical_aesthetics ?? []);
    const sharedAesthetics = (m.typical_aesthetics ?? []).filter((a) => currentAesthetics.has(a)).length;

    if (conflictType === "execution_timeline") {
      const newRequired = complexityW + m.lead_time_weeks;
      if (newRequired <= deliveryWindow) {
        parts.push("Resolves lead time");
      } else {
        const weeksSaved = (currentMaterial?.lead_time_weeks ?? 0) - m.lead_time_weeks;
        parts.push(`Reduces by ${weeksSaved} wk${weeksSaved !== 1 ? "s" : ""}`);
      }
      if (m.cost_per_yard < (currentMaterial?.cost_per_yard ?? Infinity)) {
        parts.push("margin improves");
      } else if (m.cost_per_yard > (currentMaterial?.cost_per_yard ?? -Infinity)) {
        parts.push("cost increases");
      }
      if ((m.typical_aesthetics?.length ?? 0) > 0) {
        if (sharedAesthetics === 0) {
          parts.push("aesthetic trade-off");
        } else if (sharedAesthetics < 2) {
          parts.push("slight aesthetic trade-off");
        }
      }
    } else if (conflictType === "cost_gate") {
      const saving = ((currentMaterial?.cost_per_yard ?? 0) - m.cost_per_yard) * ESTIMATED_YARDAGE;
      if (saving >= cogsGap) {
        parts.push("Resolves margin gap");
      } else {
        parts.push(`Saves $${Math.round(saving)}`);
      }
      if (m.lead_time_weeks < (currentMaterial?.lead_time_weeks ?? Infinity)) {
        parts.push("lead time improves");
      } else if (m.lead_time_weeks > (currentMaterial?.lead_time_weeks ?? -Infinity)) {
        parts.push("longer lead time");
      }
      if ((m.typical_aesthetics?.length ?? 0) > 0 && sharedAesthetics === 0) {
        parts.push("aesthetic trade-off");
      }
    }

    return parts.join(" · ");
  }

  // Relaxed filter: primary constraint must improve (does not need to fully resolve)
  const filtered = candidates.filter((m) => {
    if (conflictType === "execution_timeline") {
      return m.lead_time_weeks < currentMaterial.lead_time_weeks;
    }
    if (conflictType === "cost_gate") {
      return m.cost_per_yard < currentMaterial.cost_per_yard;
    }
    return false;
  });

  // Sort: timeline → shortest lead first; cost → cheapest first. Cap at 2.
  if (conflictType === "execution_timeline") {
    filtered.sort((a, b) => a.lead_time_weeks - b.lead_time_weeks);
  } else {
    filtered.sort((a, b) => a.cost_per_yard - b.cost_per_yard);
  }

  return filtered.slice(0, 2).map((m) => ({
    material_name: m.name,
    cost_per_yard: m.cost_per_yard,
    lead_time_weeks: m.lead_time_weeks,
    saving_vs_selected: Math.round(currentMaterial.cost_per_yard - m.cost_per_yard),
    lead_reduction_weeks: currentMaterial.lead_time_weeks - m.lead_time_weeks,
    aesthetic_note: m.typical_aesthetics?.slice(0, 2).join(", ") ?? "",
    tradeoff_note: buildTradeoffNote(m),
  }));
}

function buildExecutionReason(
  constructionTier: string,
  material: MaterialEntry | undefined,
  season: string
): string {
  if (!material) return "Execution constraints from construction and timeline";
  const isFW = /fw|fall|autumn/i.test(season);
  const deliveryWindow = isFW ? DELIVERY_WINDOW_FW : DELIVERY_WINDOW_SS;
  const required = (COMPLEXITY_WEEKS[constructionTier] ?? 10) + material.lead_time_weeks;
  const gap = deliveryWindow - required;
  if (gap < 0) {
    return `${material.lead_time_weeks}-week ${material.name} lead time exceeds ${season} delivery window by ${Math.abs(gap)} weeks`;
  }
  if (gap < 4) {
    return `${required}-week total timeline is tight against the ${season} delivery window`;
  }
  return `Timeline feasible — ${gap}-week buffer against ${season} delivery window`;
}

function buildComplexityLoad(
  constructionTier: string,
  executionScore: number
): { label: "healthy" | "moderate" | "strained"; score: number } {
  if (constructionTier === "high" || executionScore < 50) return { label: "strained", score: 25 };
  if (constructionTier === "moderate" || executionScore < 70) return { label: "moderate", score: 55 };
  return { label: "healthy", score: 80 };
}

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      setCurrent(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return current;
}

/* ─── Props ─── */
export interface ScorecardModalProps {
  identityScore: number;
  resonanceScore: number;
  executionScore: number;
  mukoScore: number;
  marginGatePassed: boolean;
  insight: { cogs: number; ceiling: number } | null;
  targetMsrp: number;
  mukoInsight: string | null;
  suggestions: SpecSuggestion[];
  onRevise: () => void;
  brandName?: string | null;
}

export function ScorecardModal({
  identityScore,
  resonanceScore,
  executionScore,
  mukoScore,
  marginGatePassed,
  insight,
  targetMsrp,
  mukoInsight,
  onRevise,
  brandName,
}: ScorecardModalProps) {
  const router = useRouter();
  const {
    collectionName,
    activeCollection,
    savedAnalysisId,
    setSavedAnalysisId,
    setCurrentStep,
    aestheticInput,
    aestheticMatchedId,
    materialId,
    category,
    season,
    targetMsrp: storeTargetMsrp,
    silhouette,
    constructionTier,
    constructionTierOverride,
    collectionRole,
    selectedKeyPiece,
    selectedPieceImage,
    refinementModifiers,
    intentGoals,
  } = useSessionStore();

  /* ─── Existing logic state ─── */
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pieceName, setPieceName] = useState("");
  const [pieceNameFocused, setPieceNameFocused] = useState(false);
  const effectiveCollection = collectionName || activeCollection;

  /* ─── Scorecard insight state ─── */
  const [scorecardData, setScorecardData] = useState<ScorecardInsight | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(true);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  /* ─── Action suggestion state ─── */
  const [actionSuggestion, setActionSuggestion] = useState<ActionSuggestion | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictTypeState, setConflictTypeState] = useState<ConflictType>("none");

  const animatedScore = useCountUp(mukoScore);

  /* ─── Fetch scorecard insight + action suggestion on mount (parallel) ─── */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // ── Scorecard insight ──
    fetch("/api/synthesizer/scorecard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        scores: { identity: identityScore, resonance: resonanceScore, execution: executionScore, overall: mukoScore },
        margin: { passed: marginGatePassed, cogs: insight?.cogs ?? 0, ceiling: insight?.ceiling ?? 0, msrp: targetMsrp },
        context: {
          aesthetic: aestheticInput || "Unknown",
          material: materialId || "Unknown",
          category: category || "Unknown",
          collection: effectiveCollection || "Unknown",
          season: season || "Unknown",
        },
        ...(refinementModifiers.length > 0 && { brand_keywords: refinementModifiers }),
        ...(intentGoals.length > 0 && { intent_primary_goals: intentGoals }),
      }),
    })
      .then((r) => r.json())
      .then((json: ScorecardInsight & { error?: string }) => {
        if (signal.aborted) return;
        if (json.error || !json.insight) setFallbackText(mukoInsight ?? null);
        else setScorecardData(json);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setFallbackText(mukoInsight ?? null);
      })
      .finally(() => { if (!signal.aborted) setScorecardLoading(false); });

    // ── Action suggestion ──
    const allMaterials = materialsData as MaterialEntry[];
    const material = allMaterials.find((m) => m.id === materialId);
    const conflictType = deriveConflictType(
      identityScore,
      executionScore,
      marginGatePassed,
      material,
      constructionTier,
      season || ""
    );

    setConflictTypeState(conflictType);

    if (conflictType === "none") {
      // Clean piece — use static fallback, no LLM call
      setActionSuggestion(STATIC_ACTION_FALLBACK);
      setActionLoading(false);
    } else {
      setHasConflict(true);
      setActionLoading(true);

      const cogsGap = insight ? Math.max(0, Math.round(insight.cogs - insight.ceiling)) : 0;
      const alternatives = buildAlternatives(material, allMaterials, conflictType, constructionTier, season || "", cogsGap);
      const executionReason = buildExecutionReason(constructionTier, material, season || "");
      const complexityLoad = buildComplexityLoad(constructionTier, executionScore);
      const contextPieceName =
        selectedKeyPiece?.item || category || "Piece Concept";
      const roleLabel = collectionRole?.replace(/-/g, " ") ?? "core";
      const marginBuffer = insight
        ? Math.max(0, Math.round(insight.ceiling - insight.cogs))
        : 0;

      const payload: ActionSuggestionPayload = {
        conflict_type: conflictType,
        brand_name: brandName || "Brand",
        piece_name: contextPieceName,
        category: category || "Unknown",
        piece_role: roleLabel,
        collection_name: effectiveCollection || "Collection",
        season: season || "Current Season",
        identity_score: identityScore,
        resonance_score: resonanceScore,
        execution_score: executionScore,
        cost_gate_passed: marginGatePassed,
        cogs: insight?.cogs ?? 0,
        margin_buffer: marginBuffer,
        msrp: targetMsrp,
        material_name: material?.name ?? materialId ?? "Unknown",
        material_cost_per_yard: material?.cost_per_yard ?? 0,
        material_lead_time_weeks: material?.lead_time_weeks ?? 0,
        construction_tier: constructionTier,
        execution_reason: executionReason,
        complexity_load_label: complexityLoad.label,
        complexity_load_score: complexityLoad.score,
        role_distribution_summary: `1 ${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}`,
        alternatives,
      };

      fetch("/api/synthesizer/scorecard-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((json: ActionSuggestion & { error?: string }) => {
          if (signal.aborted) return;
          if (json.directive && typeof json.directive === 'string') {
            setActionSuggestion(json);
          } else {
            setActionSuggestion(STATIC_ACTION_FALLBACK);
          }
        })
        .catch((err) => { if (err?.name !== "AbortError") { console.warn('[scorecard-action] failed:', err); } })
        .finally(() => { if (!signal.aborted) setActionLoading(false); });
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Existing: Add to Collection ─── */
  const handleAddToCollection = async () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      if (!userId) {
        throw new Error("No authenticated user found for collection save.");
      }

      const trimmedPieceName = pieceName.trim();
      const baseInsert = {
        user_id: userId,
        collection_name: effectiveCollection,
        season: season || "SS27",
        category: category?.toLowerCase()?.trim() || null,
        target_msrp: storeTargetMsrp ?? null,
        aesthetic_input: aestheticInput || null,
        aesthetic_matched_id: aestheticMatchedId ?? aestheticInput?.toLowerCase()?.replace(/\s+/g, '-') ?? null,
        material_id: materialId || null,
        silhouette: silhouette || null,
        construction_tier: constructionTier ?? null,
        construction_tier_override: constructionTierOverride ?? false,
        score: mukoScore,
        dimensions: {
          identity: identityScore,
          resonance: resonanceScore,
          execution: executionScore,
        },
        gates_passed: {
          cost: marginGatePassed,
        },
        collection_role: collectionRole || null,
        narrative: scorecardData?.insight ?? fallbackText ?? mukoInsight ?? '',
        agent_versions: {},
        // parent_analysis_id removed — branching deferred to Phase 2
      };

      let insertResult = await supabase
        .from("analyses")
        .insert({
          ...baseInsert,
          piece_name: trimmedPieceName || null,
        })
        .select("id")
        .single();

      const missingPieceNameColumn =
        insertResult.error?.code === "PGRST204" &&
        insertResult.error.message?.includes("'piece_name' column");

      if (missingPieceNameColumn) {
        insertResult = await supabase
          .from("analyses")
          .insert(baseInsert)
          .select("id")
          .single();
      }

      if (insertResult.error) throw insertResult.error;
      const { data } = insertResult;
      if (data?.id) setSavedAnalysisId(data.id as string);
    } catch (error) {
      if (error instanceof Error) {
        console.error("[Muko] Failed to save analysis to collection:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error("[Muko] Failed to save analysis to collection:", JSON.stringify(error));
      }
      setSaveState("idle");
      return;
    }
    setSaveState("saved");
    setTimeout(() => router.push("/collections"), 1500);
  };

  const mainScoreColor = scoreColor(mukoScore);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(25, 25, 25, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
      }}
    >
      <div
        style={{
          width: 500,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#FAFAF7",
          borderRadius: 12,
          border: "1px solid rgba(67,67,43,0.09)",
          boxShadow: "0 8px 40px rgba(67,67,43,0.18)",
        }}
      >

        {/* ── MODAL TOP ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.80)",
            padding: "28px 32px 20px",
            borderBottom: "1px solid rgba(67,67,43,0.09)",
          }}
        >

          {/* 1. PIECE CONTEXT ROW */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            {/* Left: category + piece name / direction + silhouette */}
            <div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(67,67,43,0.38)",
                }}
              >
                {[category, selectedKeyPiece?.item].filter(Boolean).join(" · ") || "—"}
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 13,
                  color: "rgba(67,67,43,0.64)",
                  marginTop: 2,
                }}
              >
                {[aestheticInput, silhouette].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>

            {/* Right: role badge */}
            {collectionRole && (
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "0.5px solid rgba(168,180,117,0.35)",
                  background: "rgba(168,180,117,0.15)",
                  fontFamily: inter,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#6b7843",
                  whiteSpace: "nowrap",
                }}
              >
                {collectionRole.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            )}
          </div>

          {/* 2. MUKO'S READ */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...microLabel, marginBottom: 7 }}>Muko&rsquo;s read</div>
            {scorecardLoading ? (
              <div
                style={{
                  height: 20,
                  width: "70%",
                  background: "rgba(67,67,43,0.07)",
                  borderRadius: 4,
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
            ) : (
              <MukoStreamingParagraph
                text={scorecardData?.insight ?? mukoInsight ?? "Reviewing your piece for creative and commercial fit."}
                paragraphStyle={{
                  fontFamily: sohne,
                  fontSize: 17,
                  fontWeight: 600,
                  color: OLIVE,
                  lineHeight: 1.35,
                }}
              />
            )}
          </div>

          {/* 3. THREE-CARD SCORE ROW */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1,
              background: "rgba(67,67,43,0.10)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {[
              { label: "Identity",  score: identityScore },
              { label: "Commercial Potential", score: resonanceScore },
              { label: "Execution", score: executionScore },
            ].map(({ label, score }) => (
              <div
                key={label}
                style={{
                  background: "#FAFAF7",
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: scoreColor(score),
                  }}
                >
                  {score}
                </div>
                <div style={{ ...microLabel, marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 4. GATE STRIP */}
          <div
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${marginGatePassed ? "rgba(168,180,117,0.50)" : "rgba(138,58,58,0.30)"}`,
              background: marginGatePassed ? "rgba(168,180,117,0.08)" : "rgba(138,58,58,0.06)",
              fontFamily: inter,
              fontSize: 12,
              fontWeight: 500,
              color: marginGatePassed ? "#4A6B2A" : PULSE_RED,
            }}
          >
            <span style={{ fontSize: 13 }}>{marginGatePassed ? "✓" : "✕"}</span>
            {marginGatePassed
              ? `Cost viable at $${targetMsrp} MSRP`
              : insight
              ? `COGS $${Math.round(insight.cogs)} exceeds target by $${Math.round(insight.cogs - insight.ceiling)}`
              : "Cost not viable at current spec"}
          </div>
        </div>

        {/* ── CONSIDERATIONS ── */}
        {scorecardData && scorecardData.considerations?.length > 0 && (
          <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid rgba(67,67,43,0.09)" }}>
            <div style={{ ...microLabel, marginBottom: 12 }}>Considerations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {scorecardData.considerations.map((c: Consideration, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    paddingTop: i === 0 ? 0 : 10,
                    paddingBottom: i < scorecardData.considerations.length - 1 ? 10 : 0,
                    borderBottom: i < scorecardData.considerations.length - 1
                      ? "1px solid rgba(67,67,43,0.07)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 6,
                      background: c.type === "risk" ? CAMEL : CHARTREUSE,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: "rgba(67,67,43,0.64)",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: OLIVE }}>{c.label}</span>
                    {". "}
                    {c.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTION SUGGESTION ── */}
        {hasConflict && (
          <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(67,67,43,0.09)" }}>
            {actionLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[32, 80, 65].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: i === 0 ? 9 : i === 1 ? 13 : 11,
                      borderRadius: 4,
                      width: `${w}%`,
                      background: "rgba(67,67,43,0.07)",
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  />
                ))}
              </div>
            ) : actionSuggestion ? (
              <>
                {/* Conflict label */}
                <div style={{ ...microLabel, marginBottom: 10 }}>
                  {actionSuggestion.conflict_label}
                </div>

                {/* Directive */}
                <p
                  style={{
                    fontFamily: sohne,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: OLIVE,
                    lineHeight: 1.5,
                    margin: "0 0 8px",
                  }}
                >
                  {actionSuggestion.directive}
                </p>

                {/* Explanation */}
                <p
                  style={{
                    fontFamily: inter,
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: "rgba(67,67,43,0.60)",
                    margin: actionSuggestion.show_alternatives && actionSuggestion.alternatives.length > 0 ? "0 0 14px" : "0",
                  }}
                >
                  {actionSuggestion.explanation}
                </p>

                {/* Alternative material chips */}
                {actionSuggestion.show_alternatives && actionSuggestion.alternatives.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {actionSuggestion.alternatives.map((alt) => (
                      <ActionChip
                        key={alt.material_id}
                        label={alt.label}
                        onClick={() => {
                          // TODO: pre-load Spec Studio with this material
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Empty state: alternatives were relevant but none found even with relaxed constraints */}
                {(conflictTypeState === "execution_timeline" || conflictTypeState === "cost_gate") &&
                  actionSuggestion.alternatives.length === 0 && (
                  <p
                    style={{
                      fontFamily: inter,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: "rgba(67,67,43,0.50)",
                      margin: "10px 0 0",
                    }}
                  >
                    No alternatives found for this combination. Consider adjusting your timeline or construction tier.
                  </p>
                )}
              </>
            ) : (
              <p
                style={{
                  fontFamily: inter,
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "rgba(67,67,43,0.60)",
                  margin: 0,
                }}
              >
                We couldn&apos;t generate a suggestion right now. Try running the analysis again.
              </p>
            )}
          </div>
        )}

        {/* ── PIECE NAME INPUT ── */}
        <div
          style={{
            padding: "18px 32px",
            background: "rgba(255,255,255,0.80)",
            borderBottom: "1px solid rgba(67,67,43,0.09)",
          }}
        >
          <div style={{ ...microLabel, marginBottom: 6 }}>Collection</div>
          <div
            style={{
              fontFamily: sohne,
              fontSize: 14,
              fontWeight: 600,
              color: effectiveCollection ? OLIVE : CAMEL,
              marginBottom: 12,
            }}
          >
            {effectiveCollection || "No collection selected"}
          </div>
          <div style={{ ...microLabel, marginBottom: 8 }}>Piece Name</div>
          <input
            type="text"
            value={pieceName}
            onChange={(e) => setPieceName(e.target.value)}
            onFocus={() => setPieceNameFocused(true)}
            onBlur={() => setPieceNameFocused(false)}
            placeholder="e.g. Architectural Cape"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 7,
              border: `1.5px solid ${pieceNameFocused ? CHARTREUSE : "rgba(67,67,43,0.14)"}`,
              background: "#FAFAF7",
              fontFamily: inter,
              fontSize: 13,
              color: OLIVE,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 150ms ease",
            }}
          />
          {!effectiveCollection && (
            <p
              style={{
                fontFamily: inter,
                fontSize: 11,
                color: CAMEL,
                margin: "7px 0 0",
              }}
            >
              Select a collection first before saving.
            </p>
          )}
        </div>

        {/* ── ACTIONS ── */}
        {(() => {
          // Map legacy add_with_risk to revise_recommended
          const rawVariant = actionSuggestion?.cta_variant ?? "add";
          const isRevise = rawVariant === "revise_recommended" || (rawVariant as string) === "add_with_risk";

          return (
            <>
              <div
                style={{
                  padding: "16px 32px 20px",
                  display: "flex",
                  gap: 8,
                  background: "#FAFAF7",
                }}
              >
                {/* Revise — primary fill when conflict present, ghost when clean */}
                <button
                  onClick={onRevise}
                  style={{
                    flex: 1.5,
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: isRevise ? CHARTREUSE : "transparent",
                    fontFamily: sohne,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: isRevise ? "#3d4225" : "rgba(67,67,43,0.70)",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                    whiteSpace: "nowrap",
                    ...(isRevise ? {} : { border: "1px solid rgba(67,67,43,0.14)" }),
                  }}
                >
                  {isRevise ? "← Revise specs" : "Revise"}
                </button>

                {/* Add to Collection — primary fill when clean, ghost when conflict */}
                <button
                  onClick={handleAddToCollection}
                  disabled={saveState !== "idle" || !effectiveCollection}
                  style={{
                    flex: 1.5,
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: isRevise ? "0.5px solid rgba(67,67,43,0.20)" : "none",
                    background: !effectiveCollection
                      ? "rgba(168,180,117,0.40)"
                      : saveState === "saved"
                      ? "#6B8F3E"
                      : isRevise
                      ? "transparent"
                      : CHARTREUSE,
                    fontFamily: sohne,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: saveState === "saved"
                      ? "#FFFFFF"
                      : isRevise
                      ? "rgba(67,67,43,0.64)"
                      : "#FFFFFF",
                    cursor: saveState !== "idle" || !effectiveCollection ? "default" : "pointer",
                    opacity: saveState === "saving" ? 0.7 : 1,
                    transition: "background 150ms ease, opacity 150ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {saveState === "saved" ? "Saved ✓" : "Add to Collection"}
                </button>
              </div>

              {/* Hint text */}
              {actionSuggestion?.hint_text && !actionLoading && (
                <p
                  style={{
                    fontFamily: inter,
                    fontSize: 11,
                    color: "rgba(67,67,43,0.38)",
                    margin: "-10px 32px 16px",
                    lineHeight: 1.5,
                  }}
                >
                  {actionSuggestion.hint_text}
                </p>
              )}
            </>
          );
        })()}

      </div>
    </div>
  );
}

/* ─── Action chip — clickable material/action suggestion pill ─── */
function ActionChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 12px 6px 11px",
        borderRadius: 999,
        border: `1.5px solid ${hovered ? "rgba(67,67,43,0.38)" : "rgba(67,67,43,0.22)"}`,
        background: hovered ? "rgba(67,67,43,0.06)" : "rgba(255,255,255,0.90)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color: "#43432B",
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: hovered ? "0 1px 4px rgba(67,67,43,0.10)" : "0 1px 2px rgba(67,67,43,0.06)",
        transition: "border-color 120ms ease, background 120ms ease, box-shadow 120ms ease",
      }}
    >
      {label}
      <span style={{ fontSize: 11, opacity: hovered ? 1 : 0.55, transition: "opacity 120ms ease" }}>→</span>
    </button>
  );
}

/* ─── Ghost pill button — matches Back / nav buttons across all pages ─── */
function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: "9px 14px",
        borderRadius: 999,
        border: "1px solid rgba(67,67,43,0.14)",
        background: hovered ? "rgba(67,67,43,0.05)" : "transparent",
        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.01em",
        color: "rgba(67,67,43,0.70)",
        cursor: "pointer",
        transition: "background 120ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
