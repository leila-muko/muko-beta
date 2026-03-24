"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { MukoNav } from "@/components/MukoNav";
import { createClient } from "@/lib/supabase/client";

// --- Design tokens ---
const BG = "#F9F7F4";
const BG2 = "#F2EFE9";
const TEXT = "#191919";
const MUTED = "#888078";
const BORDER = "#E2DDD6";
const CHARTREUSE = "#A8B475";
const CAMEL = "#B8876B";
const STEEL = "#7D96AC";
const ROSE = "#CDAAB3";

const inter = "var(--font-inter), -ui-sans-serif, sans-serif";
const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";

// --- Types ---
type SuccessId =
  | "brand_statement"
  | "commercial_performance"
  | "trend_moment"
  | "protect_margins"
  | "experiment_learn";

// --- Constants ---

const SUCCESS_OPTIONS: { id: SuccessId; title: string; description: string }[] = [
  {
    id: "brand_statement",
    title: "Make a strong brand statement",
    description: "Lead with a distinct point of view this season.",
  },
  {
    id: "commercial_performance",
    title: "Drive commercial performance",
    description: "Optimize toward sell-through and market clarity.",
  },
  {
    id: "trend_moment",
    title: "Capture a current trend moment",
    description: "Lean into what feels culturally and commercially relevant now.",
  },
  {
    id: "protect_margins",
    title: "Protect margins and reduce risk",
    description: "Prioritize business resilience and lower-exposure bets.",
  },
  {
    id: "experiment_learn",
    title: "Experiment and learn",
    description: "Use the collection to test, observe, and sharpen future direction.",
  },
];

const SLIDERS = [
  {
    key: "trend" as const,
    label: "Trend ↔ Timeless",
    left: "Trend-forward",
    right: "Timeless",
    description: "How exposed to trend velocity should this collection be?",
    color: CHARTREUSE,
    labels: ["Trend-forward", "Balanced Horizon", "Timeless"] as [string, string, string],
  },
  {
    key: "creative" as const,
    label: "Creative ↔ Commercial",
    left: "Creative expression",
    right: "Commercial safety",
    description: "Where does the collection sit between expression and broad market usability?",
    color: STEEL,
    labels: ["Creative-led", "Balanced Creativity", "Commercially safe"] as [string, string, string],
  },
  {
    key: "elevated" as const,
    label: "Elevated ↔ Accessible",
    left: "Elevated design",
    right: "Accessible price",
    description: "How should design ambition and price architecture be balanced?",
    color: CAMEL,
    labels: ["Design-elevated", "Balanced Value", "Accessible"] as [string, string, string],
  },
  {
    key: "novelty" as const,
    label: "Novelty ↔ Continuity",
    left: "Novelty",
    right: "Continuity",
    description: "Should the collection introduce fresh ground or reinforce what is already owned?",
    color: ROSE,
    labels: ["Novelty-forward", "Continuity-aware", "Continuity-first"] as [string, string, string],
  },
];

// --- Helpers ---
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
  // FW: target Aug 1; SS: target Feb 1
  const delivery = type === "FW" ? new Date(year, 7, 1) : new Date(year, 1, 1);
  const now = new Date();
  const weeks = Math.round((delivery.getTime() - now.getTime()) / (7 * 24 * 3600 * 1000));
  return weeks > 0 ? weeks : null;
}

// --- Sub-components ---

function BeatHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {/* Eyebrow with extending hairline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: inter,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            color: MUTED,
            flexShrink: 0,
          }}
        >
          {eyebrow}
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>
      {/* Heading */}
      <div
        style={{
          fontFamily: sohne,
          fontSize: 30,
          fontWeight: 700,
          color: TEXT,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {/* Description */}
      {description && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 13,
            color: MUTED,
            fontStyle: "italic",
            lineHeight: 1.6,
            marginBottom: 28,
            maxWidth: 560,
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
        textTransform: "uppercase" as const,
        color: MUTED,
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}

function BeatDivider() {
  return <div style={{ height: 1, background: BORDER, margin: "0 0 52px" }} />;
}

function RailCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: BG2,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
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
  const parts = label.split("↔");
  return (
    <div>
      {/* Axis title row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <span style={{ fontFamily: sohne, fontSize: 17, fontWeight: 700, color: TEXT, letterSpacing: "-0.01em" }}>
          {parts[0]}
          <span style={{ fontFamily: inter, fontSize: 14, color: MUTED, margin: "0 4px", verticalAlign: "middle" }}>↔</span>
          {parts[1]}
        </span>
        <span
          style={{
            fontFamily: inter,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
            color,
            ...(color === ROSE ? { filter: "saturate(1.4)" } : {}),
          }}
        >
          {posLabel}
        </span>
      </div>
      {/* Description */}
      <p
        style={{
          fontFamily: inter,
          fontSize: 12,
          fontStyle: "italic",
          color: MUTED,
          margin: "0 0 14px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {/* Track row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 88,
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
            width: 88,
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

// --- Main page ---

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
    setCurrentStep,
  } = useSessionStore();

  // Read-only context from entry page — reactive store subscriptions
  const season = useSessionStore((s) => s.season);
  const collectionName = useSessionStore((s) => s.collectionName);

  // Initialize editable fields from persisted store
  const init = useSessionStore.getState();
  const [targetMsrp, setTargetMsrp] = useState<number>(init.targetMsrp ?? 0);
  const [targetMargin, setTargetMargin] = useState<number>(
    init.targetMargin > 0 ? init.targetMargin : 0
  );
  const [successPriorities, setSuccessPriorities] = useState<SuccessId[]>(
    (init.successPriorities as SuccessId[]) || []
  );
  const [sliderTrend, setSliderTrend] = useState(init.sliderTrend ?? 50);
  const [sliderCreative, setSliderCreative] = useState(init.sliderCreative ?? 50);
  const [sliderElevated, setSliderElevated] = useState(init.sliderElevated ?? 50);
  const [sliderNovelty, setSliderNovelty] = useState(init.sliderNovelty ?? 50);
  const [brandDnaChips, setBrandDnaChips] = useState<string[]>([]);

  useEffect(() => {
    setCurrentStep?.(1);
  }, [setCurrentStep]);

  // Seed MSRP, margin, and brand DNA keywords from brand profile on mount
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived values
  const cogsCeiling =
    targetMsrp > 0 && targetMargin > 0
      ? Math.round(targetMsrp * (1 - targetMargin / 100))
      : null;
  const weeksOut = deliveryWeeks(season);

  const sliderLabels = {
    trend: positionLabel(sliderTrend, SLIDERS[0].labels),
    creative: positionLabel(sliderCreative, SLIDERS[1].labels),
    elevated: positionLabel(sliderElevated, SLIDERS[2].labels),
    novelty: positionLabel(sliderNovelty, SLIDERS[3].labels),
  };

  const canContinue =
    collectionName.trim().length > 0 &&
    season.length > 0 &&
    successPriorities.length > 0;

  // --- Handlers ---
  const handleTargetMsrp = (v: number) => {
    setTargetMsrp(v);
    storeTargetMsrp(v);
  };
  const handleTargetMargin = (v: number) => {
    setTargetMargin(v);
    storeTargetMargin(v);
  };
  const togglePriority = (id: SuccessId) => {
    setSuccessPriorities((prev) => {
      let next: SuccessId[];
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else if (prev.length >= 3) {
        next = prev;
      } else {
        next = [...prev, id];
      }
      storeSuccessPriorities(next);
      return next;
    });
  };
  const handleSlider = (
    key: "trend" | "creative" | "elevated" | "novelty",
    v: number
  ) => {
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
    // Populate intentGoals (titles) for backward compat with scoring pipeline
    const titles = successPriorities
      .map((id) => SUCCESS_OPTIONS.find((o) => o.id === id)?.title ?? "")
      .filter(Boolean);
    setIntentGoals(titles);
    setIntentTradeoff(""); // cleared in new model
    // Reset concept state for a fresh flow
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
    // TODO: persist collection-level intent to Supabase when schema supports it
    router.push("/concept");
  };

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
          height: 28px;
          background: transparent;
          cursor: pointer;
          display: block;
        }
        .intent-range:focus { outline: none; }
        .intent-range::-webkit-slider-runnable-track {
          height: 3px;
          border-radius: 2px;
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
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--intent-accent);
          margin-top: -6.5px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.14);
          transition: transform 120ms ease;
        }
        .intent-range:active::-webkit-slider-thumb { transform: scale(1.08); }
        .intent-range::-moz-range-track {
          height: 3px;
          border-radius: 2px;
          background: ${BORDER};
        }
        .intent-range::-moz-range-progress {
          height: 3px;
          border-radius: 2px;
          background: var(--intent-accent);
        }
        .intent-range::-moz-range-thumb {
          -moz-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--intent-accent);
          box-shadow: 0 1px 6px rgba(0,0,0,0.14);
        }
        .intent-card-field {
          width: 100%;
          padding: 10px 0;
          border: none;
          border-bottom: 1px solid #F2EFE9;
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
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 10px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-align: left;
          font: inherit;
          position: relative;
          overflow: hidden;
          transition: border-color 0.12s, background 0.12s;
        }
        .priority-row:hover:not(.selected):not(:disabled) {
          border-color: #C8C2BA;
          background: #FDFCFB;
        }
        .priority-row.selected {
          border: 1px solid ${CHARTREUSE};
          background: #F7F9F1;
        }
        .priority-row.selected::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: ${CHARTREUSE};
          border-radius: 2px 0 0 2px;
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

      {/* Two-column body */}
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: 72,
          height: "calc(100vh - 72px)",
          overflow: "hidden",
        }}
      >
        {/* ── Left: scrollable content ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "48px 52px 60px",
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          {/* ── Beat 1: Collection context ── */}
          <section style={{ marginBottom: 52 }}>
            <BeatHeader
              eyebrow="Collection Context"
              title="Set the stage."
              description="Your season and collection name are set. Confirm your commercial parameters before building your direction."
            />

            {/* Read-only context strip */}
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                background: BG2,
                borderRadius: 12,
                padding: "18px 22px",
                marginBottom: 20,
                gap: 32,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: MUTED,
                    marginBottom: 4,
                  }}
                >
                  Season
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 15,
                    fontWeight: 500,
                    color: season ? TEXT : MUTED,
                  }}
                >
                  {season || "—"}
                </div>
              </div>

              <div style={{ width: 1, background: BORDER, flexShrink: 0 }} />

              <div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: MUTED,
                    marginBottom: 4,
                  }}
                >
                  Collection Name
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 15,
                    fontWeight: 500,
                    color: collectionName ? TEXT : MUTED,
                  }}
                >
                  {collectionName || "—"}
                </div>
              </div>
            </div>

            {/* MSRP + Margin card */}
            <div
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "22px 24px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <FieldLabel>Target MSRP ($)</FieldLabel>
                  <input
                    className="intent-card-field"
                    type="number"
                    placeholder="e.g. 450"
                    value={targetMsrp || ""}
                    min={0}
                    onChange={(e) =>
                      handleTargetMsrp(e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>

                <div style={{ borderLeft: `1px solid ${BG2}`, paddingLeft: 16 }}>
                  <FieldLabel>Target Margin (%)</FieldLabel>
                  <input
                    className="intent-card-field"
                    type="number"
                    placeholder="e.g. 60"
                    value={targetMargin || ""}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      handleTargetMargin(e.target.value ? Number(e.target.value) : 0)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Brand DNA chip card */}
            {brandDnaChips.length > 0 && (
              <div
                style={{
                  background: "white",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                }}
              >
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
                        border: `1px solid ${BORDER}`,
                        background: BG,
                        padding: "5px 13px",
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

          {/* ── Beat 2: Success priorities ── */}
          <section style={{ marginBottom: 52 }}>
            <BeatHeader
              eyebrow="Priorities"
              title="Set your priorities."
              description="Choose up to 3. These set what Muko optimizes toward when scoring and giving guidance."
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
                    <div style={{ flex: 1, paddingLeft: selected ? 21 : 4 }}>
                      <div
                        style={{
                          fontFamily: sohne,
                          fontSize: 15,
                          fontWeight: 700,
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
                          lineHeight: 1.5,
                        }}
                      >
                        {opt.description}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        flexShrink: 0,
                        marginLeft: 16,
                        border: selected ? "none" : `1.5px solid ${BORDER}`,
                        background: selected ? CHARTREUSE : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.12s",
                      }}
                    >
                      {selected && (
                        <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1.5 4L3.5 6.5L8.5 1"
                            stroke="white"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <BeatDivider />

          {/* ── Beat 3: Sliders ── */}
          <section>
            <BeatHeader
              eyebrow="Tradeoffs"
              title="Set the balance."
              description="These weight what Muko emphasizes in scoring and guidance. They travel with every piece you build."
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
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

          {/* ── Continue button — sticky to bottom of scroll area ── */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: `linear-gradient(to top, ${BG} 80%, transparent)`,
              padding: "24px 0 0",
              marginTop: 52,
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

        {/* ── Right rail: Intent Preview ── */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            overflowY: "auto",
            padding: "28px 28px",
            background: BG,
            borderLeft: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, marginBottom: 20 }}>Intent Preview</div>

          {/* Margin Gate */}
          <RailCard>
            <div
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 6,
              }}
            >
              Margin Gate
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 22,
                fontWeight: 600,
                color: TEXT,
              }}
            >
              {cogsCeiling !== null ? `$${cogsCeiling}` : "—"}
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 11,
                color: MUTED,
                marginTop: 2,
              }}
            >
              COGS ceiling at {targetMargin}% margin
            </div>
            {targetMsrp > 0 && (
              <div
                style={{
                  marginTop: 8,
                  height: 3,
                  borderRadius: 2,
                  background: BORDER,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(Math.max(targetMargin, 0), 100)}%`,
                    height: "100%",
                    background: CHARTREUSE,
                    borderRadius: 2,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            )}
          </RailCard>

          {/* Delivery Window */}
          <RailCard>
            <div
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 6,
              }}
            >
              Delivery Window
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 22,
                fontWeight: 600,
                color: TEXT,
              }}
            >
              {weeksOut !== null ? `${weeksOut}w` : "—"}
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 11,
                color: MUTED,
                marginTop: 2,
              }}
            >
              {weeksOut !== null
                ? `${weeksOut} weeks to ${season} delivery`
                : "Select a season to see delivery window"}
            </div>
          </RailCard>

          <div style={{ height: 1, background: BORDER, margin: "0 0 24px" }} />

          {/* Collection Stance */}
          <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Collection Stance</div>

          {[
            { label: "Trend", value: sliderLabels.trend, color: CHARTREUSE },
            { label: "Creative", value: sliderLabels.creative, color: STEEL },
            { label: "Elevated", value: sliderLabels.elevated, color: CAMEL },
            { label: "Novelty", value: sliderLabels.novelty, color: ROSE },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: BG2,
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 4,
              }}
            >
              <span style={{ fontFamily: inter, fontSize: 11, color: MUTED }}>
                {row.label}
              </span>
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  fontWeight: 600,
                  color: row.color,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}

          {/* Priorities */}
          {successPriorities.length > 0 && (
            <>
              <div style={{ height: 1, background: BORDER, margin: "16px 0 24px" }} />
              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Priorities</div>
              {successPriorities.map((id) => {
                const opt = SUCCESS_OPTIONS.find((o) => o.id === id);
                if (!opt) return null;
                return (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: CHARTREUSE,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontFamily: inter, fontSize: 11, color: TEXT }}>
                      {opt.title}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
