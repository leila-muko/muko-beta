"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import type { SpecSuggestion } from "@/lib/types/next-move";
import type { ScorecardInsight, Consideration } from "@/app/api/synthesizer/scorecard/route";

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

/* ─── Props (unchanged) ─── */
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
}: ScorecardModalProps) {
  const router = useRouter();
  const {
    collectionName,
    activeCollection,
    savedAnalysisId,
    setSavedAnalysisId,
    setParentAnalysisId,
    setCurrentStep,
    aestheticInput,
    materialId,
    category,
    season,
    targetMsrp: storeTargetMsrp,
    silhouette,
    constructionTier,
    constructionTierOverride,
    collectionRole,
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

  const animatedScore = useCountUp(mukoScore);

  /* ─── Fetch scorecard insight on mount ─── */
  useEffect(() => {
    fetch("/api/synthesizer/scorecard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      }),
    })
      .then((r) => r.json())
      .then((json: ScorecardInsight & { error?: string }) => {
        if (json.error || !json.insight) setFallbackText(mukoInsight ?? null);
        else setScorecardData(json);
      })
      .catch(() => setFallbackText(mukoInsight ?? null))
      .finally(() => setScorecardLoading(false));
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
        category: category || null,
        target_msrp: storeTargetMsrp ?? null,
        aesthetic_input: aestheticInput || null,
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
        agent_versions: {
          scorecard_modal: "v1",
          ...(trimmedPieceName ? { saved_piece_name: trimmedPieceName } : {}),
          ...(collectionRole ? { collection_role: collectionRole } : {}),
        },
        parent_analysis_id: null,
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

  /* ─── Existing: Branch ─── */
  const handleBranch = () => {
    if (savedAnalysisId) setParentAnalysisId(savedAnalysisId);
    onRevise();
    setCurrentStep(2);
    router.push("/concept");
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

        {/* ── SCORE BLOCK ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.80)",
            padding: "36px 32px 28px",
            textAlign: "center",
            borderBottom: "1px solid rgba(67,67,43,0.09)",
          }}
        >
          {/* Big score */}
          <div
            style={{
              fontFamily: sohne,
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: mainScoreColor,
            }}
          >
            {animatedScore}
          </div>
          <div style={{ ...microLabel, marginTop: 8, marginBottom: 26 }}>
            Muko Score
          </div>

          {/* Sub-scores — 3-col grid with 1px gap as divider */}
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
              { label: "Resonance", score: resonanceScore },
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

          {/* Margin gate */}
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

        {/* ── INSIGHT + CONSIDERATIONS ── */}
        <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid rgba(67,67,43,0.09)" }}>
          {scorecardLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[92, 78, 60].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 11,
                    borderRadius: 4,
                    width: `${w}%`,
                    background: "rgba(67,67,43,0.07)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : (fallbackText || scorecardData) ? (
            <>
              {/* Insight text */}
              <p
                style={{
                  fontFamily: inter,
                  fontSize: 13,
                  lineHeight: 1.72,
                  color: "rgba(67,67,43,0.72)",
                  margin: "0 0 20px",
                }}
              >
                {scorecardData?.insight ?? fallbackText}
              </p>

              {/* Considerations — only when we have structured data */}
              {scorecardData && scorecardData.considerations?.length > 0 && (
                <>
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
                        {/* Colored dot */}
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
                          <span
                            style={{
                              fontWeight: 600,
                              color: OLIVE,
                            }}
                          >
                            {c.label}
                          </span>
                          {". "}
                          {c.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>

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
        <div
          style={{
            padding: "16px 32px 20px",
            display: "flex",
            gap: 8,
            background: "#FAFAF7",
          }}
        >
          {/* Revise */}
          <GhostButton onClick={onRevise}>Revise</GhostButton>

          {/* Branch */}
          <GhostButton onClick={handleBranch}>Branch</GhostButton>

          {/* Add to Collection — primary fill */}
          <button
            onClick={handleAddToCollection}
            disabled={saveState !== "idle" || !effectiveCollection}
            style={{
              flex: 1.5,
              padding: "9px 14px",
              borderRadius: 999,
              border: "none",
              background: !effectiveCollection
                ? "rgba(168,180,117,0.40)"
                : saveState === "saved"
                ? "#6B8F3E"
                : CHARTREUSE,
              fontFamily: sohne,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#FFFFFF",
              cursor: saveState !== "idle" || !effectiveCollection ? "default" : "pointer",
              opacity: saveState === "saving" ? 0.7 : 1,
              transition: "background 150ms ease, opacity 150ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {saveState === "saved" ? "Saved ✓" : "Add to Collection"}
          </button>
        </div>

      </div>
    </div>
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
