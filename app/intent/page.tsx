"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { BRAND } from "../../lib/concept-studio/constants";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
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

/* ─── Design tokens — match Concept Studio & Report exactly ─────────────────── */
const CHARTREUSE = "#A8B475";
const OLIVE = BRAND.oliveInk; // #43432B
const inter = "var(--font-inter), system-ui, sans-serif";
const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

/* Section label — matches "PULSE" / "MUKO INSIGHT" labels in Concept Studio */
const microLabel: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(67,67,43,0.38)",
  marginBottom: 16,
};

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function IntentCalibrationPage() {
  const router = useRouter();
  const { season, setCurrentStep, setIntentGoals, setIntentTradeoff } = useSessionStore();

  const STEEL = (BRAND as any)?.steelBlue ?? (BRAND as any)?.steel ?? "#7D96AC";

  const [headerCollectionName, setHeaderCollectionName] = useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || "—");

  useEffect(() => {
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
    []
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
    []
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

    const goalLabels = success.map(
      (id) => successOptions.find((o) => o.id === id)?.label ?? id
    );
    setIntentGoals(goalLabels);
    setIntentTradeoff(
      tradeoff ? (tradeoffOptions.find((o) => o.id === tradeoff)?.title ?? tradeoff) : ""
    );
  };

  const onContinue = () => {
    setTouched({ success: true, tradeoff: true });
    if (!canContinue) return;
    saveIntent();
    router.push("/concept");
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
        : "Expect nudges toward longevity and brand coherence."
    );

    parts.push(
      wantsRisk
        ? "Muko will surface margin + risk flags earlier."
        : "Muko will stay lighter on guardrails unless something looks off."
    );

    if (tradeoff === "speed_over_perfection")
      parts.push("We'll bias toward 'good, shipped, and clear.'");

    return parts.join(" ");
  }, [success, tradeoff, tTrend]);

  // Pulse on insight update
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

  /* ─── Focus ring for text input ──────────────────────────────────────────── */
  const [inputFocused, setInputFocused] = useState(false);

  /* ─── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF9F6",
        display: "flex",
        position: "relative",
      }}
    >
      {/* ── Fixed header — matches Concept Studio exactly ──────────────────── */}
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
        {/* Left: logo + step pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.02em",
              color: OLIVE,
            }}
          >
            muko
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(
              [
                { label: "Intent", done: false, active: true },
                { label: "Concept", done: false, active: false },
                { label: "Spec", done: false, active: false },
                { label: "Report", done: false, active: false },
              ] as { label: string; done: boolean; active: boolean }[]
            ).map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: s.done
                    ? `1.5px solid ${CHARTREUSE}`
                    : s.active
                    ? `1.5px solid ${STEEL}`
                    : "1.5px solid rgba(67,67,43,0.10)",
                  background: s.done
                    ? "rgba(168,180,117,0.08)"
                    : s.active
                    ? "rgba(125,150,172,0.07)"
                    : "rgba(67,67,43,0.03)",
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  color: s.done
                    ? "rgba(67,67,43,0.70)"
                    : s.active
                    ? OLIVE
                    : "rgba(67,67,43,0.35)",
                }}
              >
                {s.done ? (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M4.5 7.2L6.2 8.8L9.5 5.5"
                      stroke={CHARTREUSE}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : s.active ? (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: STEEL,
                      boxShadow: `0 0 0 3px rgba(125,150,172,0.20)`,
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
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: session meta + actions */}
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

      {/* ── Main scrollable content ────────────────────────────────────────── */}
      <main style={{ flex: 1, paddingTop: 72 }}>
        <div
          style={{
            padding: "36px 44px 120px",
            maxWidth: 1520,
            margin: "0 auto",
          }}
        >
          {/* Page title */}
          <div style={{ paddingBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: sohne,
                fontWeight: 500,
                fontSize: 28,
                color: OLIVE,
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              Intent Calibration
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: inter,
                fontSize: 13,
                color: "rgba(67,67,43,0.52)",
                lineHeight: 1.55,
                maxWidth: 460,
              }}
            >
              Before we define direction, help Muko understand what you&apos;re
              optimizing for this time. There&apos;s no right answer — just tradeoffs.
            </p>
          </div>

          {/* Two-column layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 340px",
              gap: 40,
              alignItems: "start",
            }}
          >
            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* Section 1 — Success goals */}
              <div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 15,
                    fontWeight: 500,
                    color: OLIVE,
                    marginBottom: 6,
                  }}
                >
                  What does success look like for this collection?
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(67,67,43,0.44)",
                    marginBottom: 14,
                  }}
                >
                  Choose up to {maxSuccess}. This sets Muko&apos;s bias.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {successOptions.map((opt) => {
                    const active = success.includes(opt.id);
                    const disabled = !active && success.length >= maxSuccess;
                    return (
                      <IntentCard
                        key={opt.id}
                        active={active}
                        disabled={disabled}
                        onClick={() => toggleSuccess(opt.id)}
                        chartreuse={CHARTREUSE}
                        steel={STEEL}
                      >
                        <span
                          style={{
                            fontFamily: inter,
                            fontSize: 13,
                            fontWeight: 500,
                            color: active ? OLIVE : "rgba(67,67,43,0.78)",
                          }}
                        >
                          {opt.label}
                        </span>
                      </IntentCard>
                    );
                  })}
                </div>

                {touched.success && success.length === 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      color: BRAND.rose,
                      fontFamily: inter,
                    }}
                  >
                    Select at least one success goal.
                  </div>
                )}
              </div>

              {/* Section 2 — Tradeoffs */}
              <div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 15,
                    fontWeight: 500,
                    color: OLIVE,
                    marginBottom: 6,
                  }}
                >
                  When tradeoffs come up, what are you most willing to give on?
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(67,67,43,0.44)",
                    marginBottom: 14,
                  }}
                >
                  Pick one. This helps Muko decide what to protect.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tradeoffOptions.map((opt) => {
                    const active = tradeoff === opt.id;
                    return (
                      <IntentCard
                        key={opt.id}
                        active={active}
                        disabled={false}
                        onClick={() => {
                          setTouched((t) => ({ ...t, tradeoff: true }));
                          setTradeoff(opt.id);
                        }}
                        chartreuse={CHARTREUSE}
                        steel={STEEL}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: inter,
                              fontSize: 13,
                              fontWeight: 500,
                              color: active ? OLIVE : "rgba(67,67,43,0.78)",
                            }}
                          >
                            {opt.title}
                          </div>
                          {opt.desc ? (
                            <div
                              style={{
                                marginTop: 4,
                                fontFamily: inter,
                                fontSize: 12,
                                color: "rgba(67,67,43,0.52)",
                                lineHeight: 1.5,
                              }}
                            >
                              {opt.desc}
                            </div>
                          ) : null}
                        </div>
                      </IntentCard>
                    );
                  })}
                </div>

                {touched.tradeoff && !tradeoff && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      color: BRAND.rose,
                      fontFamily: inter,
                    }}
                  >
                    Choose one tradeoff to continue.
                  </div>
                )}
              </div>

              {/* Section 3 — Tension sliders */}
              <div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 15,
                    fontWeight: 500,
                    color: OLIVE,
                    marginBottom: 6,
                  }}
                >
                  What tension are you intentionally navigating with this collection?
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(67,67,43,0.44)",
                    marginBottom: 14,
                  }}
                >
                  Slide to set the line you&apos;re walking. (You can keep it balanced.)
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <TensionSlider
                    left="Trend-forward"
                    right="Timeless"
                    value={tTrend}
                    onSet={setTTrend}
                    steel={STEEL}
                    color={CHARTREUSE}
                  />
                  <TensionSlider
                    left="Creative expression"
                    right="Commercial safety"
                    value={tCreative}
                    onSet={setTCreative}
                    steel={STEEL}
                    color={STEEL}
                  />
                  <TensionSlider
                    left="Elevated design"
                    right="Accessible price"
                    value={tElevated}
                    onSet={setTElevated}
                    steel={STEEL}
                    color="#B8876B"
                  />
                  <TensionSlider
                    left="Novelty"
                    right="Continuity"
                    value={tNovelty}
                    onSet={setTNovelty}
                    steel={STEEL}
                    color="#A97B8F"
                  />
                </div>
              </div>

              {/* Section 4 — Optional miss input */}
              <div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 15,
                    fontWeight: 500,
                    color: OLIVE,
                    marginBottom: 6,
                  }}
                >
                  What would make this collection feel like a miss? (Optional)
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(67,67,43,0.44)",
                    marginBottom: 14,
                  }}
                >
                  One line is enough. This helps Muko avoid &ldquo;safe generic.&rdquo;
                </div>

                <input
                  value={miss}
                  onChange={(e) => setMiss(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Feels generic or safe…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    fontSize: 13,
                    borderRadius: 10,
                    border: inputFocused
                      ? `1px solid ${STEEL}`
                      : "1px solid rgba(67,67,43,0.12)",
                    background: "rgba(255,255,255,0.80)",
                    color: OLIVE,
                    fontFamily: inter,
                    outline: "none",
                    transition: "border-color 150ms ease",
                  }}
                />
              </div>
            </div>

            {/* ── RIGHT RAIL column wrapper ────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Panel */}
            <div
              style={{
                position: "sticky",
                top: 88,
                background: "rgba(250,249,246,0.98)",
                borderRadius: 10,
                border: "1px solid rgba(67,67,43,0.08)",
                padding: "20px 22px",
              }}
            >
              {/* INTENT section — mirrors PULSE section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ ...microLabel }}>INTENT</div>

                <IntentPulseRow
                  label="PRIMARY GOAL"
                  value={primaryGoalText}
                  filled={success.length > 0}
                  chartreuse={CHARTREUSE}
                />
                <IntentPulseRow
                  label="TRADEOFF"
                  value={tradeoffText}
                  filled={!!tradeoff}
                  chartreuse={CHARTREUSE}
                  isLast
                />
              </div>

              {/* MUKO INSIGHT section */}
              <div>
                <div style={{ ...microLabel }}>MUKO INSIGHT</div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: "rgba(67,67,43,0.64)",
                    transition: "opacity 300ms ease",
                    opacity: insightPulse ? 0.7 : 1,
                  }}
                >
                  {mukoInsight}
                </div>
              </div>

              {/* "A miss" block — conditional */}
              {miss.trim() ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ ...microLabel }}>&ldquo;A MISS&rdquo; LOOKS LIKE</div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: "rgba(67,67,43,0.64)",
                    }}
                  >
                    {miss.trim()}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Continue button — standalone below the rail panel */}
            <button
              onClick={onContinue}
              disabled={!canContinue}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "14px 16px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: sohne,
                letterSpacing: "0.02em",
                color: canContinue ? STEEL : "rgba(67,67,43,0.30)",
                background: canContinue
                  ? "rgba(125,150,172,0.07)"
                  : "rgba(255,255,255,0.46)",
                border: canContinue
                  ? `1.5px solid ${STEEL}`
                  : "1.5px solid rgba(67,67,43,0.10)",
                cursor: canContinue ? "pointer" : "not-allowed",
                transition: "all 280ms ease",
                opacity: canContinue ? 1 : 0.65,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
              onMouseEnter={(e) => {
                if (!canContinue) return;
                e.currentTarget.style.background = "rgba(125,150,172,0.14)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                if (!canContinue) return;
                e.currentTarget.style.background = "rgba(125,150,172,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
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
            </div>{/* end right rail column wrapper */}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 1100px) {
          .intent-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── IntentCard — matches DirectionCard style from Concept Studio ─────────── */
function IntentCard({
  active,
  disabled,
  onClick,
  children,
  chartreuse,
  steel,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  chartreuse: string;
  steel: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 8,
        padding: "14px 16px",
        background: active ? "rgba(168,180,117,0.08)" : "rgba(255,255,255,0.75)",
        border: "1px solid rgba(67,67,43,0.09)",
        borderLeft: active
          ? `3px solid ${chartreuse}`
          : hovered && !disabled
          ? `3px solid ${steel}`
          : "3px solid transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
        transition: "all 180ms ease",
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {/* Selection indicator — left side */}
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 999,
          border: active ? `1.5px solid ${chartreuse}` : "1.5px solid rgba(67,67,43,0.22)",
          background: active ? chartreuse : "transparent",
          flexShrink: 0,
          transition: "all 150ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        {active && (
          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
            <path
              d="M1 3L2.8 4.8L6 1.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </button>
  );
}

/* ─── IntentPulseRow — mirrors Concept Studio pulse rows ────────────────────── */
function IntentPulseRow({
  label,
  value,
  filled,
  chartreuse,
  isLast,
}: {
  label: string;
  value: string;
  filled: boolean;
  chartreuse: string;
  isLast?: boolean;
}) {
  const inter = "var(--font-inter), system-ui, sans-serif";
  return (
    <div
      style={{
        paddingBottom: 14,
        marginBottom: isLast ? 0 : 14,
        borderBottom: isLast ? "none" : "1px solid rgba(67,67,43,0.07)",
      }}
    >
      {/* Label row with dot */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: filled ? chartreuse : "rgba(67,67,43,0.18)",
            flexShrink: 0,
            transition: "background 250ms ease",
            boxShadow: filled ? `0 0 0 3px rgba(168,180,117,0.18)` : "none",
          }}
        />
        <span
          style={{
            fontFamily: inter,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "rgba(67,67,43,0.68)",
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 12,
          color: "rgba(67,67,43,0.52)",
          paddingLeft: 14,
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>

      {/* 2px progress bar — matches Concept Studio pulse bars */}
      <div
        style={{
          height: 2,
          background: "rgba(67,67,43,0.08)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: filled ? "100%" : "0%",
            background: chartreuse,
            borderRadius: 1,
            transition: "width 500ms ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─── TensionSlider — slim 2px track, chartreuse fill, clean handle ────────── */
function TensionSlider({
  left,
  right,
  value,
  onSet,
  steel,
  color,
}: {
  left: string;
  right: string;
  value: TensionValue;
  onSet: (v: TensionValue) => void;
  steel: string;
  color: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const position = value === "left" ? 0 : value === "center" ? 50 : 100;

  const handleInteraction = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    if (percent < 33.33) onSet("left");
    else if (percent > 66.67) onSet("right");
    else onSet("center");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleInteraction(e.clientX);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const centerLabel = value === "center" ? "BALANCED" : value === "left" ? "←" : "→";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => !isDragging && setHovered(false)}
      style={{
        borderRadius: 8,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(67,67,43,0.09)",
        borderLeft: hovered ? `3px solid ${steel}` : "3px solid transparent",
        transition: "border-left 180ms ease",
      }}
    >
      {/* Pole labels + center state */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(67,67,43,0.72)",
          }}
        >
          {left}
        </span>

        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(67,67,43,0.38)",
            textAlign: "center",
            minWidth: 64,
          }}
        >
          {centerLabel}
        </span>

        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(67,67,43,0.72)",
            textAlign: "right",
          }}
        >
          {right}
        </span>
      </div>

      {/* Clickable track wrapper (20px tall for usability, 2px visual) */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "relative",
          height: 20,
          cursor: isDragging ? "grabbing" : "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            borderRadius: 2,
            background: "rgba(224,221,214,1)",
          }}
        >
          {/* Colored fill from left */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${position}%`,
              background: color,
              borderRadius: "2px 0 0 2px",
              transition: isDragging ? "none" : "width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Handle */}
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            transform: "translate(-50%, 0)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            border: `1.5px solid ${color}`,
            boxShadow: `0 1px 5px rgba(0,0,0,0.14), 0 0 0 2px ${color}28`,
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "left 260ms cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDragging(true);
          }}
        />
      </div>
    </div>
  );
}
