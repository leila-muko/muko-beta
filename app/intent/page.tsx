"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { MukoNav } from "@/components/MukoNav";
import { CollectionReadBar, COLLECTION_READ_BAR_OFFSET } from "@/components/collection/CollectionReadBar";
import { createClient } from "@/lib/supabase/client";
import { buildProgressiveStrategySummary, buildStrategySummary } from "@/lib/strategy-summary";

const BG = "#FAF9F6";
const TEXT = "#191919";
const MUTED = "#888078";
const BORDER = "#E2DDD6";
const CHARTREUSE = "#A8B475";
const CAMEL = "#B8876B";
const STEEL = "#7D96AC";
const ROSE = "#CDAAB3";

const inter = "var(--font-inter), -ui-sans-serif, sans-serif";
const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";

type SuccessId =
  | "brand_statement"
  | "commercial_performance"
  | "trend_moment"
  | "protect_margins"
  | "experiment_learn";

const SUCCESS_OPTIONS: { id: SuccessId; title: string; description: string }[] = [
  {
    id: "brand_statement",
    title: "Lead with a distinct point of view",
    description: "Set the season around a sharper brand perspective.",
  },
  {
    id: "commercial_performance",
    title: "Prioritize sell-through confidence",
    description: "Keep the collection legible, productive, and easy to place.",
  },
  {
    id: "trend_moment",
    title: "Move with the current market mood",
    description: "Lean closer to what feels culturally and commercially current.",
  },
  {
    id: "protect_margins",
    title: "Protect margin and reduce exposure",
    description: "Bias the season toward resilience, clarity, and tighter control.",
  },
  {
    id: "experiment_learn",
    title: "Test a new idea and learn from it",
    description: "Use the season to probe, observe, and refine what comes next.",
  },
];

const SLIDERS = [
  {
    key: "trend" as const,
    label: "Trend Exposure",
    left: "Of-the-moment",
    right: "Long-horizon",
    description: "Decide how closely the collection should move with the current market mood.",
    color: CHARTREUSE,
    labels: ["High exposure", "Calibrated exposure", "Steady longevity"] as [string, string, string],
  },
  {
    key: "creative" as const,
    label: "Expression Level",
    left: "Expressive",
    right: "Restrained",
    description: "Set how far the collection should push visual attitude versus broad usability.",
    color: STEEL,
    labels: ["High expression", "Measured expression", "Commercial restraint"] as [string, string, string],
  },
  {
    key: "elevated" as const,
    label: "Value Position",
    left: "Elevated",
    right: "Accessible",
    description: "Balance perceived elevation against how open and reachable the offer should feel.",
    color: CAMEL,
    labels: ["Elevated stance", "Balanced position", "Access-led"] as [string, string, string],
  },
  {
    key: "novelty" as const,
    label: "Innovation Level",
    left: "Newness-led",
    right: "Continuity-led",
    description: "Choose whether the season should introduce new territory or reinforce what already resonates.",
    color: ROSE,
    labels: ["High innovation", "Considered evolution", "Continuity-first"] as [string, string, string],
  },
];

function positionLabel(v: number, labels: [string, string, string]): string {
  if (v <= 30) return labels[0];
  if (v <= 69) return labels[1];
  return labels[2];
}

function deliveryWeeks(season: string): number | null {
  const normalized = season.trim().toUpperCase();
  const m =
    normalized.match(/^(SS|FW)\s*(\d{2})$/i) ??
    normalized.match(/^(SS|FW)\s*(\d{4})$/i);
  if (!m) return null;
  const type = m[1].toUpperCase();
  const rawYear = parseInt(m[2], 10);
  const year = m[2].length === 2 ? 2000 + rawYear : rawYear;
  const delivery = type === "FW" ? new Date(year, 7, 1) : new Date(year, 1, 1);
  const now = new Date();
  const weeks = Math.round((delivery.getTime() - now.getTime()) / (7 * 24 * 3600 * 1000));
  return weeks > 0 ? weeks : null;
}

function BeatHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: sohne,
          fontSize: 24,
          fontWeight: 500,
          color: TEXT,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 13,
            color: MUTED,
            fontStyle: "italic",
            lineHeight: 1.6,
            marginBottom: 30,
            maxWidth: 600,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

function FrameValueField({
  label,
  prefix,
  suffix,
  value,
  placeholder,
  min,
  max,
  onChange,
}: {
  label: string;
  prefix?: string;
  suffix?: string;
  value: number | null;
  placeholder: string;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div style={{ minWidth: 220, flex: "0 1 320px" }}>
      <div
        style={{
          fontFamily: inter,
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(67,67,43,0.56)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 3,
          borderBottom: "1px solid rgba(67, 67, 43, 0.08)",
          paddingBottom: 8,
        }}
      >
        {prefix ? (
          <span
            style={{
              fontFamily: sohne,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "rgba(25,25,25,0.9)",
            }}
          >
            {prefix}
          </span>
        ) : null}
        <input
          className="intent-card-field"
          type="number"
          placeholder={placeholder}
          value={value ?? ""}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
          style={{ borderBottom: "none", padding: 0 }}
        />
        {suffix ? (
          <span
            style={{
              fontFamily: sohne,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "rgba(25,25,25,0.9)",
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BeatDivider() {
  return <div style={{ height: 1, background: BORDER, margin: "0 0 56px" }} />;
}

function IntentSlider({
  label,
  left,
  right,
  description,
  color,
  posLabel,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  description: string;
  color: string;
  posLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span
          className="font-heading"
          style={{
            fontFamily: sohne,
            fontSize: 18,
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-0.015em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: inter,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color,
          }}
        >
          {posLabel}
        </span>
      </div>
      <p
        style={{
          fontFamily: inter,
          fontSize: 12,
          fontStyle: "italic",
          color: MUTED,
          margin: "0 0 16px",
          lineHeight: 1.5,
          maxWidth: 620,
        }}
      >
        {description}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span
          style={{
            width: 96,
            fontFamily: inter,
            fontSize: 10,
            color: MUTED,
            flexShrink: 0,
            lineHeight: 1.3,
          }}
        >
          {left}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="intent-range"
          style={
            {
              "--intent-accent": color,
              "--intent-fill": `${value}%`,
            } as React.CSSProperties
          }
        />
        <span
          style={{
            width: 96,
            fontFamily: inter,
            fontSize: 10,
            color: MUTED,
            textAlign: "right",
            flexShrink: 0,
            lineHeight: 1.3,
          }}
        >
          {right}
        </span>
      </div>
    </div>
  );
}

export default function IntentCalibrationPage() {
  const router = useRouter();

  const {
    setTargetMargin: storeTargetMargin,
    setTimelineWeeks: storeTimelineWeeks,
    setTimelineWeeksOverride: storeTimelineWeeksOverride,
    setSuccessPriorities: storeSuccessPriorities,
    setSliderTrend: storeSliderTrend,
    setSliderCreative: storeSliderCreative,
    setSliderElevated: storeSliderElevated,
    setSliderNovelty: storeSliderNovelty,
    setIntentGoals,
    setIntentTradeoff,
    setStrategySummary,
    setCurrentStep,
  } = useSessionStore();

  const season = useSessionStore((s) => s.season);
  const collectionName = useSessionStore((s) => s.collectionName);

  const [hasMounted, setHasMounted] = useState(false);
  const [targetMargin, setTargetMargin] = useState<number>(50);
  const [successPriorities, setSuccessPriorities] = useState<SuccessId[]>([]);
  const [sliderTrend, setSliderTrend] = useState(50);
  const [sliderCreative, setSliderCreative] = useState(50);
  const [sliderElevated, setSliderElevated] = useState(50);
  const [sliderNovelty, setSliderNovelty] = useState(50);
  const [timelineWeeksInput, setTimelineWeeksInput] = useState<number | null>(null);
  const [timelineWeeksOverride, setTimelineWeeksOverride] = useState(false);
  const [brandDnaChips, setBrandDnaChips] = useState<string[]>([]);

  const resolvedSeason = hasMounted ? season : "";
  const resolvedCollectionName = hasMounted ? collectionName : "";

  useEffect(() => {
    setCurrentStep?.(1);
  }, [setCurrentStep]);

  useEffect(() => {
    const persistedState = useSessionStore.getState();
    const timeoutId = window.setTimeout(() => {
      setTargetMargin(persistedState.targetMargin > 0 ? persistedState.targetMargin : 50);
      setSuccessPriorities((persistedState.successPriorities as SuccessId[]) || []);
      setSliderTrend(persistedState.sliderTrend ?? 50);
      setSliderCreative(persistedState.sliderCreative ?? 50);
      setSliderElevated(persistedState.sliderElevated ?? 50);
      setSliderNovelty(persistedState.sliderNovelty ?? 50);
      setTimelineWeeksInput(persistedState.timelineWeeks ?? null);
      setTimelineWeeksOverride(persistedState.timelineWeeksOverride ?? false);
      setHasMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("brand_profiles")
        .select("target_margin, keywords")
        .eq("user_id", user.id)
        .single();
      if (!data) return;
      if (data.target_margin != null) {
        const pct = Math.round(data.target_margin * 100);
        setTargetMargin(pct);
        storeTargetMargin(pct);
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        setBrandDnaChips(data.keywords as string[]);
      }
    })();
  }, [storeTargetMargin, targetMargin]);
  useEffect(() => {
    if (!hasMounted || timelineWeeksOverride) return;
    setTimelineWeeksInput(deliveryWeeks(resolvedSeason));
  }, [hasMounted, resolvedSeason, timelineWeeksOverride]);

  const weeksOut = timelineWeeksInput;

  const sliderLabels = {
    trend: positionLabel(sliderTrend, SLIDERS[0].labels),
    creative: positionLabel(sliderCreative, SLIDERS[1].labels),
    elevated: positionLabel(sliderElevated, SLIDERS[2].labels),
    novelty: positionLabel(sliderNovelty, SLIDERS[3].labels),
  };

  const strategySummary = buildStrategySummary({
    priorities: successPriorities
      .map((id) => SUCCESS_OPTIONS.find((option) => option.id === id)?.title ?? "")
      .filter(Boolean),
    trendLabel: sliderLabels.trend,
    creativeLabel: sliderLabels.creative,
    elevatedLabel: sliderLabels.elevated,
    noveltyLabel: sliderLabels.novelty,
    targetMargin,
    sliderTrendValue: sliderTrend,
    sliderCreativeValue: sliderCreative,
    sliderElevatedValue: sliderElevated,
    sliderNoveltyValue: sliderNovelty,
  });
  const collectionRead = buildProgressiveStrategySummary({
    priorities: successPriorities
      .map((id) => SUCCESS_OPTIONS.find((option) => option.id === id)?.title ?? "")
      .filter(Boolean),
    trendLabel: sliderLabels.trend,
    creativeLabel: sliderLabels.creative,
    elevatedLabel: sliderLabels.elevated,
    noveltyLabel: sliderLabels.novelty,
    targetMargin,
    sliderTrendValue: sliderTrend,
    sliderCreativeValue: sliderCreative,
    sliderElevatedValue: sliderElevated,
    sliderNoveltyValue: sliderNovelty,
  });

  const canContinue =
    resolvedCollectionName.trim().length > 0 && resolvedSeason.length > 0 && successPriorities.length > 0;

  const handleTargetMargin = (v: number) => {
    setTargetMargin(v);
    storeTargetMargin(v);
  };

  const handleTimelineWeeksChange = (v: number) => {
    setTimelineWeeksInput(v);
    setTimelineWeeksOverride(true);
  };

  const togglePriority = (id: SuccessId) => {
    let next: SuccessId[];
    if (successPriorities.includes(id)) {
      next = successPriorities.filter((x) => x !== id);
    } else if (successPriorities.length >= 3) {
      next = successPriorities;
    } else {
      next = [...successPriorities, id];
    }
    setSuccessPriorities(next);
    storeSuccessPriorities(next);
  };

  const handleSlider = (key: "trend" | "creative" | "elevated" | "novelty", v: number) => {
    if (key === "trend") {
      setSliderTrend(v);
      storeSliderTrend(v);
    } else if (key === "creative") {
      setSliderCreative(v);
      storeSliderCreative(v);
    } else if (key === "elevated") {
      setSliderElevated(v);
      storeSliderElevated(v);
    } else {
      setSliderNovelty(v);
      storeSliderNovelty(v);
    }
  };

  const onContinue = () => {
    if (!canContinue) return;
    const titles = successPriorities
      .map((id) => SUCCESS_OPTIONS.find((o) => o.id === id)?.title ?? "")
      .filter(Boolean);
    setIntentGoals(titles);
    setIntentTradeoff("");
    setStrategySummary(strategySummary);
    storeTimelineWeeks(timelineWeeksInput);
    storeTimelineWeeksOverride(timelineWeeksOverride);
    useSessionStore.setState({
      aestheticInput: "",
      aestheticMatchedId: null,
      collectionAesthetic: null,
      aestheticInflection: null,
      conceptLocked: false,
      identityPulse: null,
      resonancePulse: null,
      conceptSilhouette: "",
      conceptPalette: null,
      chipSelection: null,
      customChips: {},
      directionInterpretationText: "",
      directionInterpretationModifiers: [],
      directionInterpretationChips: [],
      collectionRole: null,
      selectedKeyPiece: null,
      selectedPieceImage: null,
      decisionGuidanceState: { is_confirmed: false, selected_anchor_piece: null },
      activeProductPieceId: null,
      pieceRolesById: {},
      pieceBuildContext: null,
      isProxyMatch: false,
    });
    router.push("/concept-prep");
  };

  useEffect(() => {
    if (!hasMounted) return;
    setStrategySummary(strategySummary);
  }, [hasMounted, setStrategySummary, strategySummary]);

  const sliderValues = {
    trend: sliderTrend,
    creative: sliderCreative,
    elevated: sliderElevated,
    novelty: sliderNovelty,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      <style>{`
        .intent-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 20px;
          background: transparent;
          cursor: pointer;
          display: block;
        }
        .intent-range:focus { outline: none; }
        .intent-range::-webkit-slider-runnable-track {
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--intent-accent) 0%,
            var(--intent-accent) var(--intent-fill),
            ${BORDER} var(--intent-fill),
            ${BORDER} 100%
          );
        }
        .intent-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: 1.5px solid var(--intent-accent);
          margin-top: -5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
          transition: transform 120ms ease;
        }
        .intent-range:active::-webkit-slider-thumb { transform: scale(1.06); }
        .intent-range::-moz-range-track {
          height: 2px;
          border-radius: 999px;
          background: ${BORDER};
        }
        .intent-range::-moz-range-progress {
          height: 2px;
          border-radius: 999px;
          background: var(--intent-accent);
        }
        .intent-range::-moz-range-thumb {
          -moz-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: 1.5px solid var(--intent-accent);
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }
        .intent-card-field {
          width: 100%;
          padding: 4px 0 8px;
          border: none;
          border-bottom: 1px solid rgba(67, 67, 43, 0.08);
          border-radius: 0;
          font-family: ${sohne};
          font-size: 20px;
          font-weight: 500;
          color: ${TEXT};
          background: transparent;
          outline: none;
          box-sizing: border-box;
          letter-spacing: -0.02em;
          line-height: 1.1;
          transition: border-bottom-color 0.15s, color 0.15s;
        }
        .intent-card-field::placeholder {
          color: rgba(136, 128, 120, 0.55);
          font-weight: 400;
          font-size: 18px;
        }
        .intent-card-field:focus { border-bottom: 1px solid ${CHARTREUSE}; }
        .intent-card-field::-webkit-outer-spin-button,
        .intent-card-field::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .intent-card-field[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .priority-row {
          width: 100%;
          background: transparent;
          border: none;
          border-left: 1px solid transparent;
          border-radius: 0;
          padding: 14px 18px 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          text-align: left;
          font: inherit;
          position: relative;
          transition: border-color 0.12s, background 0.12s;
        }
        .priority-row:hover:not(.selected):not(:disabled) {
          background: rgba(242, 239, 233, 0.46);
          border-left-color: rgba(67, 67, 43, 0.14);
        }
        .priority-row.selected {
          border-left-color: ${CHARTREUSE};
          background: rgba(168, 180, 117, 0.12);
        }
        .priority-row.selected::before {
          content: "";
          position: absolute;
          left: -1px;
          top: 12px;
          bottom: 12px;
          width: 1px;
          background: ${CHARTREUSE};
          border-radius: 999px;
        }
        .priority-row:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          pointer-events: none;
        }
        .intent-continue-btn:hover:not(:disabled) {
          background: #2A2622 !important;
        }
      `}</style>

      <MukoNav
        activeTab="setup"
        setupComplete={false}
        piecesComplete={false}
        collectionName={resolvedCollectionName || undefined}
        seasonLabel={resolvedSeason || undefined}
        onSaveClose={() => {}}
      />

      <CollectionReadBar
        collectionName={resolvedCollectionName}
        season={resolvedSeason}
        summary={collectionRead.text}
        stage={collectionRead.stage}
        stickyTop={72}
        isSticky
      />

      <div
        style={{
          flex: 1,
          marginTop: 72 + COLLECTION_READ_BAR_OFFSET,
          minHeight: `calc(100vh - ${72 + COLLECTION_READ_BAR_OFFSET}px)`,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "44px 60px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 38,
            }}
          >
            {["Frame", "Intent", "Tension"].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: index === 0 ? TEXT : MUTED,
                  }}
                >
                  {step}
                </div>
                {index < 2 && <div style={{ width: 34, height: 1, background: BORDER }} />}
              </React.Fragment>
            ))}
          </div>

          <section style={{ marginBottom: 52 }}>
            <BeatHeader
              title="Frame the collection."
              description="Set the context, then define the commercial frame that will shape every directional decision."
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 30,
                gap: 18,
              }}
            >
              <div
                style={{
                  fontFamily: sohne,
                  fontSize: 22,
                  fontWeight: 700,
                  color: resolvedCollectionName ? TEXT : MUTED,
                  letterSpacing: "-0.02em",
                }}
              >
                {resolvedCollectionName || "Untitled Collection"}
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: resolvedSeason ? MUTED : "rgba(136, 128, 120, 0.6)",
                }}
              >
                {resolvedSeason || "Season not set"}
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.56)",
                border: "1px solid rgba(67, 67, 43, 0.08)",
                borderRadius: 18,
                boxShadow: "0 10px 28px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255,255,255,0.45)",
                backdropFilter: "blur(8px) saturate(115%)",
                WebkitBackdropFilter: "blur(8px) saturate(115%)",
                padding: "26px 28px 22px",
                marginBottom: brandDnaChips.length > 0 ? 28 : 0,
              }}
            >
              <div style={{ marginBottom: 28 }}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(67,67,43,0.56)",
                    marginBottom: 5,
                  }}
                >
                  Commercial Frame
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 11,
                    color: "rgba(67,67,43,0.5)",
                    lineHeight: 1.5,
                    maxWidth: 520,
                  }}
                >
                  Set the price architecture that defines how far the collection can stretch.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: "28px 88px",
                }}
              >
                <FrameValueField
                  label="Target Margin"
                  suffix="%"
                  value={targetMargin ?? 0}
                  placeholder="50"
                  min={0}
                  max={100}
                  onChange={handleTargetMargin}
                />
                <FrameValueField
                  label="Delivery Window"
                  suffix="weeks"
                  value={timelineWeeksInput}
                  placeholder="43"
                  min={0}
                  onChange={handleTimelineWeeksChange}
                />
              </div>

              <div
                style={{
                  marginTop: 30,
                  borderTop: "1px solid rgba(67, 67, 43, 0.08)",
                  paddingTop: 22,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "18px 40px",
                }}
              >
                <div style={{ minWidth: 240 }}>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(67,67,43,0.56)",
                      marginBottom: 7,
                    }}
                  >
                    Cost ceiling
                  </div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 13,
                      fontWeight: 450,
                      color: "rgba(25,25,25,0.88)",
                      lineHeight: 1.45,
                    }}
                  >
                    {targetMargin > 0
                      ? `Holds to a ${Math.round(targetMargin)}% margin target`
                      : "Set your margin target to frame viability."}
                  </div>
                </div>
                <div style={{ minWidth: 220 }}>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(67,67,43,0.56)",
                      marginBottom: 7,
                    }}
                  >
                    Delivery window
                  </div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 13,
                      fontWeight: 450,
                      color: "rgba(25,25,25,0.88)",
                      lineHeight: 1.45,
                    }}
                  >
                    {timelineWeeksOverride
                      ? "Custom delivery window"
                      : weeksOut !== null
                        ? `${weeksOut} weeks to ${resolvedSeason} delivery`
                        : "Select a season to understand the delivery window."}
                  </div>
                </div>
              </div>
            </div>

            {brandDnaChips.length > 0 && (
              <div style={{ paddingTop: 4 }}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: MUTED,
                    marginBottom: 10,
                  }}
                >
                  Brand DNA
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {brandDnaChips.map((chip) => (
                    <span
                      key={chip}
                      style={{
                        borderRadius: 100,
                        background: "rgba(242, 239, 233, 0.72)",
                        padding: "6px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: inter,
                        color: MUTED,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <BeatDivider />

          <section style={{ marginBottom: 52 }}>
            <BeatHeader
              title="What matters most this season?"
              description="Choose up to 3 guiding priorities. Think of them as the stance the collection should defend."
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUCCESS_OPTIONS.map((opt) => {
                const selected = successPriorities.includes(opt.id);
                const disabled = !selected && successPriorities.length >= 3;
                return (
                  <button
                    key={opt.id}
                    className={`priority-row${selected ? " selected" : ""}`}
                    disabled={disabled}
                    onClick={() => togglePriority(opt.id)}
                  >
                    <div style={{ flex: 1, paddingLeft: 2 }}>
                      <div
                        style={{
                          fontFamily: sohne,
                          fontSize: 16,
                          fontWeight: 600,
                          color: TEXT,
                          marginBottom: 3,
                          lineHeight: 1.2,
                        }}
                      >
                        {opt.title}
                      </div>
                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 11,
                          color: MUTED,
                          lineHeight: 1.55,
                          maxWidth: 520,
                        }}
                      >
                        {opt.description}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                        color: selected ? CHARTREUSE : "transparent",
                        marginTop: 2,
                      }}
                    >
                      {selected ? "Selected" : " "}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <BeatDivider />

          <section>
            <BeatHeader
              title="Set the tension."
              description="Position the collection across a few core tensions so the direction feels intentional rather than accidental."
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {SLIDERS.map((s) => (
                <IntentSlider
                  key={s.key}
                  label={s.label}
                  left={s.left}
                  right={s.right}
                  description={s.description}
                  color={s.color}
                  value={sliderValues[s.key]}
                  posLabel={positionLabel(sliderValues[s.key], s.labels)}
                  onChange={(v) => handleSlider(s.key, v)}
                />
              ))}
            </div>
          </section>

          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: `linear-gradient(to top, ${BG} 80%, transparent)`,
              padding: "28px 0 0",
              marginTop: 56,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onContinue}
              disabled={!canContinue}
              className="intent-continue-btn"
              style={{
                padding: "13px 28px",
                borderRadius: 100,
                border: "none",
                background: canContinue ? TEXT : BORDER,
                color: canContinue ? "white" : MUTED,
                fontFamily: sohne,
                fontSize: 13,
                fontWeight: 500,
                cursor: canContinue ? "pointer" : "not-allowed",
                transition: "background 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              Continue to Direction →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
