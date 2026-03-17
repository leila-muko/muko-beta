"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { BRAND } from "../../lib/concept-studio/constants";

type CollectionRoleId = "hero" | "directional" | "core-evolution" | "volume-driver";

type SuccessId =
  | "brand_statement"
  | "commercial_performance"
  | "trend_moment"
  | "protect_margins"
  | "experiment_learn";

type TradeoffId =
  | "refinement_over_boldness"
  | "margin_over_materials"
  | "speed_over_perfection"
  | "trend_over_longevity"
  | "nothing_line_in_sand";

type TensionValue = "left" | "center" | "right";

type IntentPayload = {
  success: SuccessId[];
  tradeoff: TradeoffId | null;
  collectionRole: CollectionRoleId | null;
  tensions: {
    trendForward_vs_timeless: TensionValue;
    creative_vs_commercial: TensionValue;
    elevated_vs_accessible: TensionValue;
    novelty_vs_continuity: TensionValue;
  };
  miss: string;
  meta: {
    seasonLabel: string;
    collectionName: string;
    savedAt: string;
  };
};

type BrandPalette = typeof BRAND & {
  steelBlue?: string;
  steel?: string;
};

type SuccessOption = {
  id: SuccessId;
  title: string;
  description: string;
};

type TradeoffOption = {
  id: TradeoffId;
  title: string;
  description: string;
};

type TensionDefinition = {
  key: "trend" | "creative" | "elevated" | "novelty";
  left: string;
  right: string;
  accent: string;
  value: TensionValue;
  onChange: (next: TensionValue) => void;
};

const CHARTREUSE = "#A8B475";
const OLIVE = BRAND.oliveInk;
const CREAM = "#FAF9F6";
const inter = "var(--font-inter), system-ui, sans-serif";
const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

const microLabel: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(67,67,43,0.38)",
};

const successOptions: SuccessOption[] = [
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

const tradeoffOptions: TradeoffOption[] = [
  {
    id: "refinement_over_boldness",
    title: "Refinement over boldness",
    description: "Keep the direction tighter and safer than pushing too far.",
  },
  {
    id: "margin_over_materials",
    title: "Margin over materials",
    description: "Protect the business by staying flexible on fabric choices.",
  },
  {
    id: "speed_over_perfection",
    title: "Speed over perfection",
    description: "Move on time, even if every detail is not fully resolved.",
  },
  {
    id: "trend_over_longevity",
    title: "Trend clarity over longevity",
    description: "Prioritize relevance now, even if it dates faster.",
  },
  {
    id: "nothing_line_in_sand",
    title: "Nothing — this is a line in the sand",
    description: "This collection should not compromise here.",
  },
];

const tensionDescriptorMap: Record<
  TensionDefinition["key"],
  Record<TensionValue, string>
> = {
  trend: {
    left: "Strong trend lean",
    center: "Balanced horizon",
    right: "Strong timeless lean",
  },
  creative: {
    left: "Expressive bias",
    center: "Balanced creativity",
    right: "Commercially protective",
  },
  elevated: {
    left: "Slight premium bias",
    center: "Balanced value posture",
    right: "Price-aware discipline",
  },
  novelty: {
    left: "Novelty-led",
    center: "Continuity-aware",
    right: "Continuity-led",
  },
};

const tensionNarrativeMap: Record<
  TensionDefinition["key"],
  Record<TensionValue, string>
> = {
  trend: {
    left: "This collection should read as current, directional, and culturally alert.",
    center: "This collection should hold current relevance without chasing the moment too hard.",
    right: "This collection should feel enduring, grounded, and less exposed to rapid trend turnover.",
  },
  creative: {
    left: "Muko should preserve room for expression, even when choices become harder to commercialize.",
    center: "Muko should maintain a balanced creative-commercial posture.",
    right: "Muko should protect clarity, confidence, and broader market usability.",
  },
  elevated: {
    left: "Muko should favor elevated design cues, then work backward to protect feasibility.",
    center: "Muko should balance perceived elevation with realistic price architecture.",
    right: "Muko should maintain design integrity while keeping price accessibility in view.",
  },
  novelty: {
    left: "Muko should encourage freshness and visible evolution across the assortment.",
    center: "Muko should evolve the line while keeping recognizable continuity.",
    right: "Muko should protect recognizability and build on what already feels owned.",
  },
};

function valueToIndex(value: TensionValue) {
  return value === "left" ? 0 : value === "center" ? 1 : 2;
}

function indexToValue(index: number): TensionValue {
  if (index <= 0) return "left";
  if (index >= 2) return "right";
  return "center";
}

function sentenceCaseJoin(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export default function IntentCalibrationPage() {
  const router = useRouter();
  const {
    season,
    setCurrentStep,
    setIntentGoals,
    setIntentTradeoff,
    setCollectionRole: storeSetCollectionRole,
  } = useSessionStore();

  const STEEL = (BRAND as BrandPalette).steelBlue ?? (BRAND as BrandPalette).steel ?? "#7D96AC";
  const maxSuccess = 3;

  const [headerCollectionName] = useState<string>(() => {
    try {
      return window.localStorage.getItem("muko_collectionName") ?? "Collection";
    } catch {
      return "Collection";
    }
  });
  const [headerSeasonLabel] = useState<string>(() => {
    try {
      return window.localStorage.getItem("muko_seasonLabel") ?? (season || "—");
    } catch {
      return season || "—";
    }
  });

  useEffect(() => {
    setCurrentStep?.(1);
  }, [setCurrentStep]);

  const [success, setSuccess] = useState<SuccessId[]>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.success ?? [];
      }
    } catch {}
    return [];
  });
  const [tradeoff, setTradeoff] = useState<TradeoffId | null>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tradeoff ?? null;
      }
    } catch {}
    return null;
  });
  const [collectionRole] = useState<CollectionRoleId | null>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.collectionRole ?? null;
      }
    } catch {}
    return null;
  });
  const [tTrend, setTTrend] = useState<TensionValue>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tensions?.trendForward_vs_timeless ?? "center";
      }
    } catch {}
    return "center";
  });
  const [tCreative, setTCreative] = useState<TensionValue>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tensions?.creative_vs_commercial ?? "center";
      }
    } catch {}
    return "center";
  });
  const [tElevated, setTElevated] = useState<TensionValue>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tensions?.elevated_vs_accessible ?? "center";
      }
    } catch {}
    return "center";
  });
  const [tNovelty, setTNovelty] = useState<TensionValue>(() => {
    try {
      const saved = window.localStorage.getItem("muko_intent");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tensions?.novelty_vs_continuity ?? "center";
      }
    } catch {}
    return "center";
  });
  const [touched, setTouched] = useState({ success: false, tradeoff: false, role: false });

  const selectedSuccessOptions = useMemo(
    () => successOptions.filter((option) => success.includes(option.id)),
    [success]
  );
  const selectedTradeoffOption = useMemo(
    () => tradeoffOptions.find((option) => option.id === tradeoff) ?? null,
    [tradeoff]
  );
  const canContinue = success.length > 0 && Boolean(tradeoff);

  const tensionDefinitions: TensionDefinition[] = [
    {
      key: "trend",
      left: "Trend-forward",
      right: "Timeless",
      accent: CHARTREUSE,
      value: tTrend,
      onChange: setTTrend,
    },
    {
      key: "creative",
      left: "Creative expression",
      right: "Commercial safety",
      accent: STEEL,
      value: tCreative,
      onChange: setTCreative,
    },
    {
      key: "elevated",
      left: "Elevated design",
      right: "Accessible price",
      accent: "#B8876B",
      value: tElevated,
      onChange: setTElevated,
    },
    {
      key: "novelty",
      left: "Novelty",
      right: "Continuity",
      accent: "#A97B8F",
      value: tNovelty,
      onChange: setTNovelty,
    },
  ];

  const tensionChips = tensionDefinitions.map(
    (item) => tensionDescriptorMap[item.key][item.value]
  );

  const primaryGoalText = selectedSuccessOptions[0]?.title ?? "Not yet set";
  const tradeoffText = selectedTradeoffOption?.title ?? "Not yet set";

  const mukoInsight = useMemo(() => {
    if (!success.length && !tradeoff) {
      return "Set the collection stance here and Muko will carry that posture forward into concept, specification, and downstream recommendations.";
    }

    const lines: string[] = [];

    if (selectedSuccessOptions.length) {
      const lead = selectedSuccessOptions[0].title;
      const support = selectedSuccessOptions.slice(1).map((item) => item.title.toLowerCase());
      if (support.length) {
        lines.push(
          `The collection is being framed around ${lead.toLowerCase()}, while still holding space for ${sentenceCaseJoin(
            support
          )}.`
        );
      } else {
        lines.push(`The collection is being framed around ${lead.toLowerCase()}.`);
      }
    }

    if (selectedTradeoffOption) {
      lines.push(`When pressure appears, Muko should protect against compromising ${selectedTradeoffOption.title.toLowerCase()}.`);
    }

    lines.push(
      tensionNarrativeMap.trend[tTrend],
      tensionNarrativeMap.creative[tCreative],
      tensionNarrativeMap.elevated[tElevated],
      tensionNarrativeMap.novelty[tNovelty]
    );

    if (collectionRole === "hero") {
      lines.push("This reads like a hero collection posture: conviction first, with Muko flagging commercial risk rather than flattening it.");
    } else if (collectionRole === "directional") {
      lines.push("This reads as a directional move: Muko should help keep the proposition sharp without losing viability.");
    } else if (collectionRole === "core-evolution") {
      lines.push("This reads as controlled evolution: Muko should tighten guardrails around overreach and protect clarity.");
    } else if (collectionRole === "volume-driver") {
      lines.push("This reads as a volume-driver posture: Muko should protect margin, pace, and repeatability.");
    }

    return lines.join(" ");
  }, [
    collectionRole,
    selectedSuccessOptions,
    selectedTradeoffOption,
    success.length,
    tradeoff,
    tTrend,
    tCreative,
    tElevated,
    tNovelty,
  ]);

  const toggleSuccess = (id: SuccessId) => {
    setTouched((current) => ({ ...current, success: true }));
    setSuccess((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxSuccess) return current;
      return [...current, id];
    });
  };

  const saveIntent = () => {
    const payload: IntentPayload = {
      success,
      tradeoff,
      collectionRole,
      tensions: {
        trendForward_vs_timeless: tTrend,
        creative_vs_commercial: tCreative,
        elevated_vs_accessible: tElevated,
        novelty_vs_continuity: tNovelty,
      },
      miss: "",
      meta: {
        seasonLabel: headerSeasonLabel,
        collectionName: headerCollectionName,
        savedAt: new Date().toISOString(),
      },
    };

    try {
      window.localStorage.setItem("muko_intent", JSON.stringify(payload));
    } catch {}

    setIntentGoals(selectedSuccessOptions.map((item) => item.title));
    setIntentTradeoff(selectedTradeoffOption?.title ?? "");
    if (collectionRole) storeSetCollectionRole(collectionRole);
  };

  const onContinue = () => {
    setTouched({ success: true, tradeoff: true, role: true });
    if (!canContinue) return;

    saveIntent();

    useSessionStore.setState({
      aestheticInput: "",
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
    });

    router.push("/concept");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: CREAM,
        display: "flex",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes intentInsightFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .intent-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 72px;
          align-items: start;
        }

        .intent-goal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .intent-tradeoff-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .intent-tension-stack {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .intent-range {
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 28px;
          cursor: pointer;
        }

        .intent-range:focus {
          outline: none;
        }

        .intent-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background:
            linear-gradient(to right,
              var(--intent-accent) 0%,
              var(--intent-accent) var(--intent-fill),
              rgba(220, 215, 206, 0.9) var(--intent-fill),
              rgba(220, 215, 206, 0.9) 100%);
        }

        .intent-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.98);
          border: 1.5px solid var(--intent-accent);
          margin-top: -7px;
          box-shadow: 0 10px 24px rgba(67,67,43,0.12), 0 0 0 4px color-mix(in srgb, var(--intent-accent) 14%, transparent);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .intent-range:active::-webkit-slider-thumb {
          transform: scale(1.06);
        }

        .intent-range::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: rgba(220, 215, 206, 0.9);
        }

        .intent-range::-moz-range-progress {
          height: 4px;
          border-radius: 999px;
          background: var(--intent-accent);
        }

        .intent-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.98);
          border: 1.5px solid var(--intent-accent);
          box-shadow: 0 10px 24px rgba(67,67,43,0.12);
        }

        @media (max-width: 1180px) {
          .intent-shell {
            grid-template-columns: 1fr;
          }

          .intent-rail {
            position: static !important;
          }
        }

      `}</style>

      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          borderBottom: "1px solid rgba(67,67,43,0.09)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button
            type="button"
            onClick={() => router.push("/entry")}
            aria-label="Go to entry page"
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.02em",
              color: OLIVE,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            muko
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "Intent", done: false, active: true },
              { label: "Concept", done: false, active: false },
              { label: "Spec", done: false, active: false },
              { label: "Report", done: false, active: false },
            ].map((step) => (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: step.done
                    ? `1.5px solid ${CHARTREUSE}`
                    : step.active
                    ? `1.5px solid ${STEEL}`
                    : "1.5px solid rgba(67,67,43,0.10)",
                  background: step.done
                    ? "rgba(168,180,117,0.08)"
                    : step.active
                    ? "rgba(125,150,172,0.07)"
                    : "rgba(67,67,43,0.03)",
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  color: step.done
                    ? "rgba(67,67,43,0.70)"
                    : step.active
                    ? OLIVE
                    : "rgba(67,67,43,0.35)",
                }}
              >
                {step.done ? (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M4.5 7.2L6.2 8.8L9.5 5.5"
                      stroke={CHARTREUSE}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : step.active ? (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: STEEL,
                      boxShadow: "0 0 0 3px rgba(125,150,172,0.20)",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "rgba(67,67,43,0.18)",
                    }}
                  />
                )}
                {step.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: sohne,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(67,67,43,0.50)",
              letterSpacing: "0.03em",
            }}
          >
            {headerSeasonLabel}
            <span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>
            {headerCollectionName}
          </span>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => window.history.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 13px 7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(67,67,43,0.14)",
                background: "transparent",
                fontFamily: sohne,
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(67,67,43,0.62)",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M8.5 3L4.5 7L8.5 11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>

            <button
              onClick={saveIntent}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: "none",
                background: OLIVE,
                fontFamily: sohne,
                fontSize: 11,
                fontWeight: 600,
                color: "#F5F0E8",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              SAVE &amp; CLOSE
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, paddingTop: 72 }}>
        <div style={{ maxWidth: 1520, margin: "0 auto", padding: "44px 44px 120px" }}>
          <div className="intent-shell">
            <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
              <HeroIntro />

              <SectionBlock
                title="What does success look like for this collection?"
                description={`Choose up to ${maxSuccess}. This sets the priorities Muko will optimize around.`}
              >
                <div className="intent-goal-grid">
                  {successOptions.map((option) => {
                    const active = success.includes(option.id);
                    const disabled = !active && success.length >= maxSuccess;
                    return (
                      <SelectionCard
                        key={option.id}
                        title={option.title}
                        description={option.description}
                        selected={active}
                        disabled={disabled}
                        onClick={() => toggleSuccess(option.id)}
                        accent={CHARTREUSE}
                        variant="multi"
                        subtleTag={active ? "Selected" : disabled ? "Limit reached" : "Choose up to 3"}
                      />
                    );
                  })}
                </div>
                {touched.success && success.length === 0 ? (
                  <ValidationMessage text="Select at least one objective to continue." />
                ) : null}
              </SectionBlock>

              <SectionBlock
                title="When tension arises, where do you hold the line?"
                description="Choose one. This tells Muko what to protect when tradeoffs appear."
              >
                <div className="intent-tradeoff-grid">
                  {tradeoffOptions.map((option) => (
                    <SelectionCard
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      selected={tradeoff === option.id}
                      disabled={false}
                      onClick={() => {
                        setTouched((current) => ({ ...current, tradeoff: true }));
                        setTradeoff(option.id);
                      }}
                      accent={STEEL}
                      variant="single"
                      subtleTag={tradeoff === option.id ? "Protected principle" : "Choose one"}
                    />
                  ))}
                </div>
                {touched.tradeoff && !tradeoff ? (
                  <ValidationMessage text="Choose one protected principle to continue." />
                ) : null}
              </SectionBlock>

              <SectionBlock
                title="Define the line you&apos;re walking"
                description="Set the balance Muko should help protect across the collection."
              >
                <div className="intent-tension-stack">
                  {tensionDefinitions.map((item) => (
                    <TensionModule
                      key={item.key}
                      leftLabel={item.left}
                      rightLabel={item.right}
                      descriptor={tensionDescriptorMap[item.key][item.value]}
                      narrative={tensionNarrativeMap[item.key][item.value]}
                      value={item.value}
                      accent={item.accent}
                      onChange={item.onChange}
                    />
                  ))}
                </div>
              </SectionBlock>
            </div>

            <aside
              className="intent-rail"
              style={{
                position: "sticky",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 22,
                paddingLeft: 28,
                borderLeft: "1px solid rgba(67,67,43,0.08)",
              }}
            >
              <div>
                <div style={{ ...microLabel, marginBottom: 20 }}>Muko&apos;s Read</div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 18,
                    lineHeight: 1.24,
                    color: OLIVE,
                    letterSpacing: "-0.02em",
                    marginBottom: 8,
                  }}
                >
                  {primaryGoalText}
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "rgba(67,67,43,0.56)",
                  }}
                >
                  {tradeoffText}
                </div>

                <div
                  key={mukoInsight}
                  style={{
                    marginTop: 34,
                    fontFamily: inter,
                    fontSize: 13.5,
                    lineHeight: 1.82,
                    color: "rgba(67,67,43,0.68)",
                    animation: "intentInsightFade 300ms ease",
                  }}
                >
                  {mukoInsight}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
                  {tensionChips.map((chip) => (
                    <SoftChip key={`rail-${chip}`} text={chip} compact />
                  ))}
                </div>
              </div>

              <ContinueButton canContinue={canContinue} accent={STEEL} onClick={onContinue} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function HeroIntro() {
  return (
    <section
      style={{
        padding: "28px 0 6px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: sohne,
          fontWeight: 500,
          fontSize: 38,
          color: OLIVE,
          letterSpacing: "-0.03em",
          lineHeight: 1.02,
          maxWidth: 720,
        }}
      >
        Intent Calibration
      </h1>
      <p
        style={{
          margin: "12px 0 0",
          fontFamily: inter,
          fontSize: 15,
          color: "rgba(67,67,43,0.62)",
          lineHeight: 1.8,
          maxWidth: 740,
        }}
      >
        Set the intention for this collection: what you are optimizing for, where you are flexible,
        and which tensions Muko should help you navigate. This becomes the strategic thesis the rest
        of the flow will build around.
      </p>
    </section>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "0",
      }}
    >
      <div
        style={{
          marginBottom: 24,
          maxWidth: 760,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: sohne,
            fontSize: 28,
            fontWeight: 500,
            color: OLIVE,
            letterSpacing: "-0.025em",
            lineHeight: 1.06,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "12px 0 0",
            fontFamily: inter,
            fontSize: 14,
            lineHeight: 1.7,
            color: "rgba(67,67,43,0.56)",
          }}
        >
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function SelectionCard({
  title,
  description,
  selected,
  disabled,
  onClick,
  accent,
  variant,
  subtleTag,
}: {
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  accent: string;
  variant: "multi" | "single";
  subtleTag: string;
}) {
  const [hovered, setHovered] = useState(false);
  const tone = selected
    ? `color-mix(in srgb, ${accent} 6%, rgba(255,255,255,0.52))`
    : hovered
    ? "rgba(255,255,255,0.22)"
    : "transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        width: "100%",
        minHeight: variant === "single" ? 98 : 92,
        borderRadius: 18,
        padding: "16px 0 16px 12px",
        border: "none",
        background: tone,
        boxShadow: "none",
        opacity: disabled ? 0.48 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 180ms ease, color 180ms ease, opacity 180ms ease",
        transform: "translateY(0)",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
        borderLeft: selected ? `1px solid color-mix(in srgb, ${accent} 58%, transparent)` : "1px solid transparent",
        borderBottom: "1px solid rgba(67,67,43,0.07)",
      }}
    >
      <div style={{ paddingRight: 12 }}>
        <div>
          <div
            style={{
              fontFamily: sohne,
              fontSize: 17,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "rgba(67,67,43,0.88)",
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "rgba(67,67,43,0.58)",
              maxWidth: 420,
            }}
          >
            {description}
          </div>
        </div>

      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          width: "fit-content",
          padding: "4px 0",
          borderRadius: 999,
          fontFamily: inter,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: selected ? OLIVE : "rgba(67,67,43,0.44)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {selected ? (
          <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-hidden>
            <path
              d="M1.5 5.5L4.7 8.7L11.2 2.2"
              stroke={accent}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : variant === "multi" ? (
          <span style={{ fontSize: 18, lineHeight: 1, color: "rgba(67,67,43,0.34)" }} aria-hidden>+</span>
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgba(67,67,43,0.24)" }} aria-hidden />
        )}
        <span>{subtleTag}</span>
      </div>
    </button>
  );
}

function TensionModule({
  leftLabel,
  rightLabel,
  descriptor,
  narrative,
  value,
  accent,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  descriptor: string;
  narrative: string;
  value: TensionValue;
  accent: string;
  onChange: (value: TensionValue) => void;
}) {
  const sliderValue = valueToIndex(value);
  const fill = `${sliderValue * 50}%`;

  return (
    <div
      style={{
        padding: "0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
            fontFamily: sohne,
            fontSize: 17,
            color: OLIVE,
            letterSpacing: "-0.02em",
            lineHeight: 1.08,
            }}
          >
            {leftLabel} <span style={{ color: "rgba(67,67,43,0.34)" }}>↔</span> {rightLabel}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: inter,
              fontSize: 13,
              lineHeight: 1.7,
              color: "rgba(67,67,43,0.56)",
              maxWidth: 620,
            }}
          >
            {narrative}
          </div>
        </div>

        <div
          style={{
            padding: "0",
            borderRadius: 999,
            fontFamily: inter,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: OLIVE,
            whiteSpace: "nowrap",
          }}
        >
          {descriptor}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 14, marginTop: 18 }}>
        <span style={{ fontFamily: inter, fontSize: 12, fontWeight: 500, color: "rgba(67,67,43,0.68)" }}>
          {leftLabel}
        </span>
        <span style={{ fontFamily: inter, fontSize: 12, fontWeight: 500, color: "rgba(67,67,43,0.68)" }}>
          {rightLabel}
        </span>
      </div>

      <input
        className="intent-range"
        type="range"
        min={0}
        max={2}
        step={1}
        value={sliderValue}
        aria-label={`${leftLabel} versus ${rightLabel}`}
        onChange={(event) => onChange(indexToValue(Number(event.target.value)))}
        style={
          {
            "--intent-accent": accent,
            "--intent-fill": fill,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SoftChip({
  text,
  compact,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: compact ? "5px 0" : "7px 0",
        borderRadius: 999,
        fontFamily: inter,
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        lineHeight: 1,
        color: "rgba(67,67,43,0.68)",
      }}
    >
      <span style={{ color: "rgba(67,67,43,0.34)", fontSize: compact ? 12 : 13, lineHeight: 1 }}>•</span>
      {text}
    </span>
  );
}

function ContinueButton({
  canContinue,
  accent,
  onClick,
}: {
  canContinue: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canContinue}
      style={{
        width: "100%",
        padding: "15px 18px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: sohne,
        letterSpacing: "0.02em",
        color: canContinue ? accent : "rgba(67,67,43,0.30)",
        background: canContinue
          ? "linear-gradient(180deg, rgba(125,150,172,0.12) 0%, rgba(125,150,172,0.08) 100%)"
          : "rgba(255,255,255,0.46)",
        border: canContinue
          ? `1.5px solid ${accent}`
          : "1.5px solid rgba(67,67,43,0.10)",
        cursor: canContinue ? "pointer" : "not-allowed",
        transition: "all 220ms ease",
        opacity: canContinue ? 1 : 0.65,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <span>Continue to Concept</span>
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        style={{ opacity: canContinue ? 1 : 0.4 }}
      >
        <path
          d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ValidationMessage({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        fontFamily: inter,
        fontSize: 12,
        fontWeight: 600,
        color: BRAND.rose,
      }}
    >
      {text}
    </div>
  );
}
