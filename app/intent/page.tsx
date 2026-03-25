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
  const m = season.match(/^(SS|FW)(\d{2})$/i);
  if (!m) return null;
  const type = m[1].toUpperCase();
  const year = 2000 + parseInt(m[2], 10);
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: inter,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: MUTED,
        marginBottom: 5,
      }}
    >
      {children}
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
      <div
        style={{
          marginTop: 10,
          fontFamily: inter,
          fontSize: 11,
          color: MUTED,
        }}
      >
        Currently: <span style={{ color: TEXT }}>{posLabel}</span>
      </div>
    </div>
  );
}

export default function IntentCalibrationPage() {
  const router = useRouter();

  const {
    setTargetMsrp: storeTargetMsrp,
    setTargetMargin: storeTargetMargin,
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

  const init = useSessionStore.getState();
  const [targetMsrp, setTargetMsrp] = useState<number>(init.targetMsrp ?? 0);
  const [targetMargin, setTargetMargin] = useState<number>(init.targetMargin > 0 ? init.targetMargin : 0);
  const [successPriorities, setSuccessPriorities] = useState<SuccessId[]>((init.successPriorities as SuccessId[]) || []);
  const [sliderTrend, setSliderTrend] = useState(init.sliderTrend ?? 50);
  const [sliderCreative, setSliderCreative] = useState(init.sliderCreative ?? 50);
  const [sliderElevated, setSliderElevated] = useState(init.sliderElevated ?? 50);
  const [sliderNovelty, setSliderNovelty] = useState(init.sliderNovelty ?? 50);
  const [brandDnaChips, setBrandDnaChips] = useState<string[]>([]);

  useEffect(() => {
    setCurrentStep?.(1);
  }, [setCurrentStep]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("brand_profiles")
        .select("target_margin, target_msrp, keywords")
        .eq("user_id", user.id)
        .single();
      if (!data) return;
      if (targetMargin === 0 && data.target_margin) {
        const pct = Math.round(data.target_margin * 100);
        setTargetMargin(pct);
        storeTargetMargin(pct);
      }
      if (targetMsrp === 0 && data.target_msrp) {
        setTargetMsrp(data.target_msrp);
        storeTargetMsrp(data.target_msrp);
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        setBrandDnaChips(data.keywords as string[]);
      }
    })();
  }, [storeTargetMargin, storeTargetMsrp, targetMargin, targetMsrp]);

  const cogsCeiling =
    targetMsrp > 0 && targetMargin > 0 ? Math.round(targetMsrp * (1 - targetMargin / 100)) : null;
  const weeksOut = deliveryWeeks(season);

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
    targetMsrp,
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
    targetMsrp,
    sliderTrendValue: sliderTrend,
    sliderCreativeValue: sliderCreative,
    sliderElevatedValue: sliderElevated,
    sliderNoveltyValue: sliderNovelty,
  });

  const canContinue = collectionName.trim().length > 0 && season.length > 0 && successPriorities.length > 0;

  const handleTargetMsrp = (v: number) => {
    setTargetMsrp(v);
    storeTargetMsrp(v);
  };

  const handleTargetMargin = (v: number) => {
    setTargetMargin(v);
    storeTargetMargin(v);
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
      isProxyMatch: false,
    });
    router.push("/concept");
  };

  useEffect(() => {
    setStrategySummary(strategySummary);
  }, [setStrategySummary, strategySummary]);

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
          padding: 10px 0 12px;
          border: none;
          border-bottom: 1px solid rgba(67, 67, 43, 0.12);
          border-radius: 0;
          font-family: ${inter};
          font-size: 15px;
          font-weight: 500;
          color: ${TEXT};
          background: transparent;
          outline: none;
          box-sizing: border-box;
          transition: border-bottom-color 0.15s;
        }
        .intent-card-field::placeholder { color: ${BORDER}; font-weight: 400; font-size: 14px; }
        .intent-card-field:focus { border-bottom: 1.5px solid ${CHARTREUSE}; }
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
        collectionName={collectionName || undefined}
        seasonLabel={season || undefined}
        onSaveClose={() => {}}
      />

      <CollectionReadBar
        collectionName={collectionName}
        season={season}
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
                  color: collectionName ? TEXT : MUTED,
                  letterSpacing: "-0.02em",
                }}
              >
                {collectionName || "Untitled Collection"}
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: season ? MUTED : "rgba(136, 128, 120, 0.6)",
                }}
              >
                {season || "Season not set"}
              </div>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 14,
                padding: "22px 24px 18px",
                marginBottom: brandDnaChips.length > 0 ? 18 : 0,
                boxShadow: "0 8px 24px rgba(67, 67, 43, 0.05)",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: MUTED,
                    marginBottom: 5,
                  }}
                >
                  Commercial Frame
                </div>
                <div style={{ fontFamily: inter, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                  Set the price architecture that defines how far the collection can stretch.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <FieldLabel>Target MSRP ($)</FieldLabel>
                  <input
                    className="intent-card-field"
                    type="number"
                    placeholder="e.g. 450"
                    value={targetMsrp || ""}
                    min={0}
                    onChange={(e) => handleTargetMsrp(e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>

                <div style={{ borderLeft: "1px solid rgba(67, 67, 43, 0.08)", paddingLeft: 18 }}>
                  <FieldLabel>Target Margin (%)</FieldLabel>
                  <input
                    className="intent-card-field"
                    type="number"
                    placeholder="e.g. 60"
                    value={targetMargin || ""}
                    min={0}
                    max={100}
                    onChange={(e) => handleTargetMargin(e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(67, 67, 43, 0.08)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px 28px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: MUTED,
                      marginBottom: 4,
                    }}
                  >
                    Cost ceiling
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 12, color: cogsCeiling !== null ? TEXT : MUTED }}>
                    {cogsCeiling !== null
                      ? `${Math.round(targetMargin)}% margin keeps COGS near $${cogsCeiling}`
                      : "Add price and margin to set the ceiling."}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: MUTED,
                      marginBottom: 4,
                    }}
                  >
                    Delivery window
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 12, color: weeksOut !== null ? TEXT : MUTED }}>
                    {weeksOut !== null
                      ? `${weeksOut} weeks to ${season} delivery`
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
                fontFamily: inter,
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
