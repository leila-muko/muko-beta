"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { BRAND } from "../../lib/concept-studio/constants";

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

export default function IntentCalibrationPage() {
  const router = useRouter();
  const { season, setCurrentStep } = useSessionStore();

  const STEEL_BLUE =
    (BRAND as any)?.steelBlue ?? (BRAND as any)?.steel ?? "#7D96AC";

  const [headerCollectionName, setHeaderCollectionName] =
    useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(
    season || "—",
  );

  useEffect(() => {
    // Entry done, Intent active
    setCurrentStep?.(1);
  }, [setCurrentStep]);

  useEffect(() => {
    try {
      const n = window.localStorage.getItem("muko_collectionName");
      const s = window.localStorage.getItem("muko_seasonLabel");
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
      else setHeaderSeasonLabel(season || "—");
    } catch {
      setHeaderSeasonLabel(season || "—");
    }
  }, [season]);

  const successOptions = useMemo(
    () =>
      [
        { id: "brand_statement", label: "Make a strong brand statement" },
        { id: "commercial_performance", label: "Drive commercial performance" },
        { id: "trend_moment", label: "Capture a current trend moment" },
        { id: "protect_margins", label: "Protect margins and reduce risk" },
        { id: "experiment_learn", label: "Experiment and learn" },
      ] as { id: SuccessId; label: string }[],
    [],
  );

  const tradeoffOptions = useMemo(
    () =>
      [
        {
          id: "refinement_over_boldness",
          title: "Refinement over boldness",
          desc: "(keeping it tighter and safer than pushing something new)",
        },
        {
          id: "margin_over_materials",
          title: "Margin over materials",
          desc: "(adjusting fabric choices to protect the business)",
        },
        {
          id: "speed_over_perfection",
          title: "Speed over perfection",
          desc: "(shipping something good on time vs perfect too late)",
        },
        {
          id: "trend_over_longevity",
          title: "Trend clarity over longevity",
          desc: "(leaning into the moment, even if it dates faster)",
        },
        {
          id: "nothing_line_in_sand",
          title: "Nothing — this is a line in the sand",
          desc: "",
        },
      ] as { id: TradeoffId; title: string; desc: string }[],
    [],
  );

  const maxSuccess = 3;

  const [success, setSuccess] = useState<SuccessId[]>([]);
  const [tradeoff, setTradeoff] = useState<TradeoffId | null>(null);

  const [tTrend, setTTrend] = useState<TensionValue>("center");
  const [tCreative, setTCreative] = useState<TensionValue>("center");
  const [tElevated, setTElevated] = useState<TensionValue>("center");
  const [tNovelty, setTNovelty] = useState<TensionValue>("center");

  const [miss, setMiss] = useState("");
  const [touched, setTouched] = useState({ success: false, tradeoff: false });

  const canContinue = success.length > 0 && !!tradeoff;

  const toggleSuccess = (id: SuccessId) => {
    setTouched((t) => ({ ...t, success: true }));
    setSuccess((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSuccess) return prev;
      return [...prev, id];
    });
  };

  const cycle = (v: TensionValue): TensionValue =>
    v === "left" ? "center" : v === "center" ? "right" : "left";

  const saveIntent = () => {
    const payload: IntentPayload = {
      success,
      tradeoff,
      tensions: {
        trendForward_vs_timeless: tTrend,
        creative_vs_commercial: tCreative,
        elevated_vs_accessible: tElevated,
        novelty_vs_continuity: tNovelty,
      },
      miss: (miss || "").trim(),
      meta: {
        seasonLabel: headerSeasonLabel,
        collectionName: headerCollectionName,
        savedAt: new Date().toISOString(),
      },
    };
    try {
      window.localStorage.setItem("muko_intent", JSON.stringify(payload));
    } catch {}
  };

  const onContinue = () => {
    setTouched({ success: true, tradeoff: true });
    if (!canContinue) return;
    saveIntent();
    router.push("/concept"); // update if your route differs
  };

  const primaryGoalText = useMemo(() => {
    if (!success.length) return "—";
    const first = successOptions.find((o) => o.id === success[0])?.label;
    return first ?? "—";
  }, [success, successOptions]);

  const tradeoffText = useMemo(() => {
    if (!tradeoff) return "—";
    return tradeoffOptions.find((t) => t.id === tradeoff)?.title ?? "—";
  }, [tradeoff, tradeoffOptions]);

  const mukoInsight = useMemo(() => {
    if (!success.length && !tradeoff) {
      return "Set a few priorities — Muko uses this to calibrate how opinionated it should be when tradeoffs show up.";
    }

    const wantsBrand = success.includes("brand_statement");
    const wantsCommercial = success.includes("commercial_performance");
    const wantsTrend = success.includes("trend_moment") || tTrend === "left";
    const wantsRisk =
      success.includes("protect_margins") || tradeoff === "margin_over_materials";

    const parts: string[] = [];

    if (wantsBrand && wantsCommercial)
      parts.push("You're threading point of view with sell-through.");
    else if (wantsBrand) parts.push("You're optimizing for a clear point of view.");
    else if (wantsCommercial)
      parts.push("You're optimizing for performance and repeatability.");
    else parts.push("You're setting a grounded direction with room to explore.");

    parts.push(
      wantsTrend
        ? "Expect more directional nudges toward what's peaking now."
        : "Expect nudges toward longevity and brand coherence.",
    );

    parts.push(
      wantsRisk
        ? "Muko will surface margin + risk flags earlier."
        : "Muko will stay lighter on guardrails unless something looks off.",
    );

    if (tradeoff === "speed_over_perfection")
      parts.push("We'll bias toward 'good, shipped, and clear.'");

    return parts.join(" ");
  }, [success, tradeoff, tTrend]);

  // Rose glow pulse on insight update (right rail)
  const [insightPulse, setInsightPulse] = useState(false);
  const prevInsightRef = useRef<string>("");

  useEffect(() => {
    const prev = prevInsightRef.current;
    if (prev && prev !== mukoInsight) {
      setInsightPulse(true);
      const t = window.setTimeout(() => setInsightPulse(false), 750);
      return () => window.clearTimeout(t);
    }
    prevInsightRef.current = mukoInsight;
  }, [mukoInsight]);

  useEffect(() => {
    prevInsightRef.current = mukoInsight;
  }, []);

  // Shared styles (Concept-native)
  const sectionTitle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 650,
    color: BRAND.oliveInk,
    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
    marginBottom: 6,
  };

  const sectionSub: React.CSSProperties = {
    fontSize: "13px",
    color: "rgba(67, 67, 43, 0.55)",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    lineHeight: 1.5,
    marginBottom: 16,
  };

  const cardBase: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    borderRadius: "16px",
    padding: "14px 18px",
    background: "rgba(255,255,255,0.62)",
    border: "1px solid rgba(67, 67, 43, 0.10)",
    boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06)",
    cursor: "pointer",
    transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
    outline: "none",
    position: "relative",
  };

  const pillText: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(67, 67, 43, 0.78)",
    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
    letterSpacing: "-0.005em",
  };

  const errorText: React.CSSProperties = {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 650,
    color: BRAND.rose,
    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF9F6",
        display: "flex",
        position: "relative",
      }}
    >
      {/* Top bar — matched to Concept */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "72px",
          background: "rgba(250, 249, 246, 0.86)",
          backdropFilter: "blur(26px) saturate(180%)",
          WebkitBackdropFilter: "blur(26px) saturate(180%)",
          borderBottom: "1px solid rgba(67, 67, 43, 0.10)",
          zIndex: 200,
        }}
      >
        <div
          style={{
            maxWidth: "1520px",
            margin: "0 auto",
            height: "100%",
            padding: "0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: BRAND.oliveInk,
                fontSize: "18px",
              }}
            >
              muko
            </div>

            {/* Stepper pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {[
                { label: "Intent", state: "active" as const },
                { label: "Concept", state: "idle" as const },
                { label: "Spec", state: "idle" as const },
                { label: "Report", state: "idle" as const },
              ].map((s) => {
                const isActive = s.state === "active";
                const isDone = s.state === "done";

                const stepBg = isDone
                  ? "rgba(171, 171, 99, 0.10)"
                  : isActive
                    ? "rgba(169, 191, 214, 0.08)"
                    : "rgba(67, 67, 43, 0.03)";

                const stepBorder = isDone
                  ? `1.5px solid ${BRAND.chartreuse}`
                  : isActive
                    ? `1.5px solid ${STEEL_BLUE}`
                    : "1.5px solid rgba(67, 67, 43, 0.10)";

                const labelColor = isDone
                  ? "rgba(67, 67, 43, 0.72)"
                  : isActive
                    ? "rgba(67, 67, 43, 0.85)"
                    : "rgba(67, 67, 43, 0.38)";

                return (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "7px 14px",
                      borderRadius: "999px",
                      border: stepBorder,
                      background: stepBg,
                      boxShadow: isActive
                        ? `0 8px 24px rgba(169, 191, 214, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.80)`
                        : isDone
                          ? `0 6px 18px rgba(171, 171, 99, 0.08)`
                          : "none",
                      fontFamily:
                        "var(--font-sohne-breit), system-ui, sans-serif",
                      fontSize: "12px",
                      fontWeight: 650,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" fill={BRAND.chartreuse} opacity="0.22" />
                        <path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={BRAND.chartreuse} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isActive ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: STEEL_BLUE,
                          boxShadow: `0 0 0 3px rgba(169, 191, 214, 0.22)`,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: "rgba(67, 67, 43, 0.18)",
                        }}
                      />
                    )}
                    <span style={{ color: labelColor }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {headerSeasonLabel}
              <span style={{ padding: "0 8px", opacity: 0.35 }}>·</span>
              {headerCollectionName}
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  fontSize: "12px",
                  fontWeight: 650,
                  color: BRAND.rose,
                  background: "rgba(169, 123, 143, 0.06)",
                  border: "1px solid rgba(169, 123, 143, 0.18)",
                  borderRadius: 999,
                  padding: "7px 14px 7px 10px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 180ms ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>

              <button
                onClick={() => {
                  saveIntent();
                }}
                style={{
                  fontSize: "12px",
                  fontWeight: 650,
                  color: BRAND.rose,
                  background: "rgba(169, 123, 143, 0.06)",
                  border: "1px solid rgba(169, 123, 143, 0.18)",
                  borderRadius: 999,
                  padding: "7px 14px 7px 10px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 180ms ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 8.5V11.5C11 11.776 10.776 12 10.5 12H3.5C3.224 12 3 11.776 3 11.5V2.5C3 2.224 3.224 2 3.5 2H8.5L11 4.5V8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.5 2V4.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 8H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M5 10H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, paddingTop: "88px" }}>
        <div
          style={{
            padding: "46px 72px 120px",
            maxWidth: "1520px",
            margin: "0 auto",
          }}
        >
          {/* Header copy */}
          <div style={{ marginBottom: "38px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 600,
                color: BRAND.oliveInk,
                margin: 0,
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Intent Calibration
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                marginTop: "14px",
                marginBottom: 0,
                maxWidth: 820,
                lineHeight: 1.55,
              }}
            >
              Before we define direction, help Muko understand what you're optimizing for this time.
              There's no right answer — just tradeoffs.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(720px, 1fr) 372px",
              gap: "40px",
              alignItems: "start",
            }}
          >
            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              {/* Section 1 */}
              <div>
                <div style={sectionTitle}>What does success look like for this collection?</div>
                <div style={sectionSub}>Choose up to {maxSuccess}. This sets Muko's bias.</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {successOptions.map((opt) => {
                    const active = success.includes(opt.id);
                    const disabled = !active && success.length >= maxSuccess;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleSuccess(opt.id)}
                        disabled={disabled}
                        style={{
                          ...cardBase,
                          border: active
                            ? `1px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67, 67, 43, 0.10)",
                          boxShadow: active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 10px 32px rgba(67, 67, 43, 0.06)",
                          opacity: disabled ? 0.55 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (disabled) return;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 14px 44px rgba(67, 67, 43, 0.10)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 10px 32px rgba(67, 67, 43, 0.06)";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ ...pillText, color: active ? BRAND.oliveInk : "rgba(67,67,43,0.78)" }}>
                            {opt.label}
                          </div>

                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: active ? "rgba(171,171,99,0.18)" : "rgba(67,67,43,0.08)",
                              border: active
                                ? "1px solid rgba(171,171,99,0.55)"
                                : "1px solid rgba(67,67,43,0.10)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: active ? "rgba(67,67,43,0.80)" : "transparent",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                            aria-hidden
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.success && success.length === 0 && (
                  <div style={errorText}>Select at least one success goal.</div>
                )}
              </div>

              {/* Section 2 */}
              <div>
                <div style={sectionTitle}>When tradeoffs come up, what are you most willing to give on?</div>
                <div style={sectionSub}>Pick one. This helps Muko decide what to protect.</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {tradeoffOptions.map((opt) => {
                    const active = tradeoff === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTouched((t) => ({ ...t, tradeoff: true }));
                          setTradeoff(opt.id);
                        }}
                        style={{
                          ...cardBase,
                          padding: "16px 18px",
                          border: active
                            ? `1px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67, 67, 43, 0.10)",
                          boxShadow: active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 10px 32px rgba(67, 67, 43, 0.06)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 14px 44px rgba(67, 67, 43, 0.10)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = active
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : "0 10px 32px rgba(67, 67, 43, 0.06)";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                          <div>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 650,
                                color: BRAND.oliveInk,
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                letterSpacing: "-0.005em",
                              }}
                            >
                              {opt.title}
                            </div>
                            {opt.desc ? (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 13,
                                  color: "rgba(67,67,43,0.55)",
                                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  lineHeight: 1.5,
                                }}
                              >
                                {opt.desc}
                              </div>
                            ) : null}
                          </div>

                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: active ? "rgba(171,171,99,0.18)" : "rgba(67,67,43,0.08)",
                              border: active
                                ? "1px solid rgba(171,171,99,0.55)"
                                : "1px solid rgba(67,67,43,0.10)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: active ? "rgba(67,67,43,0.80)" : "transparent",
                              fontSize: 12,
                              fontWeight: 800,
                              flex: "0 0 auto",
                              marginTop: 2,
                            }}
                            aria-hidden
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.tradeoff && !tradeoff && (
                  <div style={errorText}>Choose one tradeoff to continue.</div>
                )}
              </div>

              {/* Section 3 — refined draggable sliders with brand colors */}
              <div>
                <div style={sectionTitle}>What tension are you intentionally navigating with this collection?</div>
                <div style={sectionSub}>Slide to set the line you're walking. (You can keep it balanced.)</div>

                <RefinedSlider
                  left="Trend-forward"
                  right="Timeless"
                  value={tTrend}
                  onSet={setTTrend}
                  color="#A8B475"
                />
                <div style={{ height: 12 }} />
                <RefinedSlider
                  left="Creative expression"
                  right="Commercial safety"
                  value={tCreative}
                  onSet={setTCreative}
                  color="#B8876B"
                />
                <div style={{ height: 12 }} />
                <RefinedSlider
                  left="Elevated design"
                  right="Accessible price"
                  value={tElevated}
                  onSet={setTElevated}
                  color="#7D96AC"
                />
                <div style={{ height: 12 }} />
                <RefinedSlider
                  left="Novelty"
                  right="Continuity"
                  value={tNovelty}
                  onSet={setTNovelty}
                  color="#A97B8F"
                />
              </div>

              {/* Section 4 */}
              <div>
                <div style={sectionTitle}>What would make this collection feel like a miss? (Optional)</div>
                <div style={sectionSub}>One line is enough. This helps Muko avoid "safe generic."</div>

                <div
                  style={{
                    borderRadius: "16px",
                    padding: "14px 18px",
                    background: "rgba(255,255,255,0.62)",
                    border: "1px solid rgba(67, 67, 43, 0.10)",
                    boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06)",
                  }}
                >
                  <input
                    value={miss}
                    onChange={(e) => setMiss(e.target.value)}
                    placeholder="Feels generic or safe…"
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 14,
                      color: "rgba(67,67,43,0.80)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT RAIL */}
            <div style={{ position: "sticky", top: 110 }}>
              <div
                style={{
                  position: "relative",
                  borderRadius: "18px",
                  padding: "18px 18px 16px",
                  background: "rgba(255,255,255,0.62)",
                  border: "1px solid rgba(67, 67, 43, 0.10)",
                  boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06)",
                  overflow: "hidden",
                }}
              >
                {/* Rose glow pulse layer (subtle) */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: -60,
                    background:
                      "radial-gradient(420px 320px at 65% 35%, rgba(169, 123, 143, 0.28), rgba(169, 123, 143, 0.10), transparent 70%)",
                    opacity: insightPulse ? 1 : 0,
                    transform: insightPulse ? "scale(1)" : "scale(0.98)",
                    transition: "opacity 420ms ease, transform 520ms ease",
                    pointerEvents: "none",
                    filter: "blur(6px)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(67, 67, 43, 0.55)",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Intent Summary
                  </div>

                  <SummaryRow label="Primary goal" value={primaryGoalText} />
                  <div style={{ height: 10 }} />
                  <SummaryRow label="Tradeoff bias" value={tradeoffText} />

                  <div style={{ height: 16 }} />

                  {/* Muko Insight */}
                  <div
                    style={{
                      borderRadius: 14,
                      padding: "12px 12px",
                      border: "1px solid rgba(186, 156, 168, 0.18)",
                      background: "rgba(186, 156, 168, 0.06)",
                      boxShadow: insightPulse
                        ? "0 18px 54px rgba(169, 123, 143, 0.10)"
                        : "none",
                      transition: "box-shadow 420ms ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "rgba(67, 67, 43, 0.55)",
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      Muko Insight
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.58,
                        color: "rgba(67, 67, 43, 0.70)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      {mukoInsight}
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue button - outside container, matching Concept Studio exactly */}
              <button
                onClick={onContinue}
                disabled={!canContinue}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 750,
                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                  color: canContinue ? STEEL_BLUE : "rgba(67, 67, 43, 0.32)",
                  background: canContinue
                    ? "rgba(125, 150, 172, 0.08)"
                    : "rgba(255,255,255,0.46)",
                  border: canContinue
                    ? `1.5px solid ${STEEL_BLUE}`
                    : "1.5px solid rgba(67, 67, 43, 0.10)",
                  cursor: canContinue ? "pointer" : "not-allowed",
                  boxShadow: canContinue
                    ? "0 14px 44px rgba(125, 150, 172, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.60)"
                    : "none",
                  transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: canContinue ? 1 : 0.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.background = "rgba(125, 150, 172, 0.14)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.background = "rgba(125, 150, 172, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span>Continue to Concept</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{
                    transition: "transform 280ms ease",
                    opacity: canContinue ? 1 : 0.4,
                  }}
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

              {miss.trim() ? (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: "18px",
                    padding: "16px 18px",
                    background: "rgba(255,255,255,0.62)",
                    border: "1px solid rgba(67, 67, 43, 0.10)",
                    boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(67, 67, 43, 0.55)",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    "A miss" looks like
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.58,
                      color: "rgba(67, 67, 43, 0.70)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    {miss.trim()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(67, 67, 43, 0.10)",
        background: "rgba(67, 67, 43, 0.03)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "rgba(67, 67, 43, 0.55)",
          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 650,
          color: "rgba(67, 67, 43, 0.82)",
          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
          lineHeight: 1.45,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RefinedSlider({
  left,
  right,
  value,
  onSet,
  color,
}: {
  left: string;
  right: string;
  value: TensionValue;
  onSet: (v: TensionValue) => void;
  color: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const position = value === "left" ? 0 : value === "center" ? 50 : 100;

  const handleInteraction = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    
    // Snap to nearest position with wider zones
    if (percent < 33.33) {
      onSet("left");
    } else if (percent > 66.67) {
      onSet("right");
    } else {
      onSet("center");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const stateLabel = value === "center" ? "Balanced" : value === "left" ? "Leaning left" : "Leaning right";

  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "18px 20px",
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(67, 67, 43, 0.08)",
        boxShadow: "0 6px 20px rgba(67, 67, 43, 0.03)",
      }}
    >
      {/* Labels row - perfectly aligned */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: "rgba(67,67,43,0.70)",
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
          }}
        >
          {left}
        </div>
        
        <div
          style={{
            fontSize: 11,
            color: "rgba(67, 67, 43, 0.42)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 600,
            textAlign: "center",
            minWidth: 80,
          }}
        >
          {stateLabel}
        </div>
        
        <div
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: "rgba(67,67,43,0.70)",
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
            textAlign: "right",
          }}
        >
          {right}
        </div>
      </div>

      {/* Slider track - premium and interactive */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "relative",
          height: 48,
          borderRadius: 12,
          background: `linear-gradient(90deg, ${color}08 0%, ${color}04 50%, ${color}08 100%)`,
          cursor: "pointer",
          border: `1px solid ${color}18`,
          display: "flex",
          alignItems: "center",
          padding: "0 6px",
        }}
      >
        {/* Active fill from left */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${position}%`,
            background: `linear-gradient(90deg, ${color}20, ${color}12)`,
            borderRadius: "12px 0 0 12px",
            transition: isDragging ? "none" : "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        />

        {/* Tick marks */}
        <div
          style={{
            position: "absolute",
            left: "33.33%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 2,
            height: 12,
            borderRadius: 2,
            background: "rgba(67,67,43,0.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 2,
            height: 16,
            borderRadius: 2,
            background: "rgba(67,67,43,0.18)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "66.67%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 2,
            height: 12,
            borderRadius: 2,
            background: "rgba(67,67,43,0.12)",
            pointerEvents: "none",
          }}
        />

        {/* Knob - premium elevated design */}
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 6px 20px ${color}50, 0 2px 8px ${color}40, inset 0 1px 0 rgba(255,255,255,0.50)`,
            border: "2.5px solid rgba(255,255,255,0.95)",
            transition: isDragging ? "none" : "left 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: isDragging ? "grabbing" : "grab",
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDragging(true);
          }}
        />
      </div>

      {/* Position indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          onClick={() => onSet("left")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: value === "left" 
              ? `1.5px solid ${color}60` 
              : "1px solid rgba(67, 67, 43, 0.08)",
            background: value === "left" 
              ? `${color}12` 
              : "rgba(255,255,255,0.50)",
            color: value === "left" 
              ? "rgba(67, 67, 43, 0.82)" 
              : "rgba(67, 67, 43, 0.45)",
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 650,
            cursor: "pointer",
            transition: "all 180ms ease",
            textAlign: "center",
          }}
        >
          Left
        </button>
        
        <button
          onClick={() => onSet("center")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: value === "center" 
              ? `1.5px solid ${color}60` 
              : "1px solid rgba(67, 67, 43, 0.08)",
            background: value === "center" 
              ? `${color}12` 
              : "rgba(255,255,255,0.50)",
            color: value === "center" 
              ? "rgba(67, 67, 43, 0.82)" 
              : "rgba(67, 67, 43, 0.45)",
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 650,
            cursor: "pointer",
            transition: "all 180ms ease",
            textAlign: "center",
          }}
        >
          Balanced
        </button>
        
        <button
          onClick={() => onSet("right")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: value === "right" 
              ? `1.5px solid ${color}60` 
              : "1px solid rgba(67, 67, 43, 0.08)",
            background: value === "right" 
              ? `${color}12` 
              : "rgba(255,255,255,0.50)",
            color: value === "right" 
              ? "rgba(67, 67, 43, 0.82)" 
              : "rgba(67, 67, 43, 0.45)",
            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 650,
            cursor: "pointer",
            transition: "all 180ms ease",
            textAlign: "center",
          }}
        >
          Right
        </button>
      </div>
    </div>
  );
}

const segmentBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

function SmallPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: active ? "1px solid rgba(125, 150, 172, 0.36)" : "1px solid rgba(67, 67, 43, 0.10)",
        background: active ? "rgba(125, 150, 172, 0.08)" : "rgba(67, 67, 43, 0.03)",
        color: active ? "rgba(67, 67, 43, 0.82)" : "rgba(67, 67, 43, 0.48)",
        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 650,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}