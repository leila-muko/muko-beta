"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSessionStore } from "@/lib/store/sessionStore";
import {
  BRAND,
  AESTHETICS,
  TOP_SUGGESTED,
  AESTHETIC_CONTENT,
} from "../../lib/concept-studio/constants";
import {
  seededShuffle,
  matchAestheticToFolder,
  interpretRefine,
  generateMukoInsight,
} from "../../lib/concept-studio/utils";
import {
  IconIdentity,
  IconResonance,
} from "../../components/concept-studio/Icons";

type Confidence = "high" | "med" | "low";

type Interpretation = {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
};

/* ✅ Fixed execution icon — clean cog with visible teeth */
function IconExecution({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function boldParts({
  base,
  modifiers,
}: {
  base: string;
  modifiers: string[];
}): React.ReactNode {
  const mods =
    modifiers && modifiers.length ? modifiers.slice(0, 3).join(", ") : null;

  return (
    <span
      style={{
        fontSize: 13,
        color: "rgba(67, 67, 43, 0.74)",
        lineHeight: 1.55,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      Interpreting this as{" "}
      <span
        style={{
          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
          fontWeight: 700,
          color: "rgba(67, 67, 43, 0.90)",
        }}
      >
        {base}
      </span>
      {mods ? (
        <>
          {" "}
          with{" "}
          <span
            style={{
              fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
              fontWeight: 700,
              color: "rgba(67, 67, 43, 0.90)",
            }}
          >
            {mods}
          </span>
          .
        </>
      ) : (
        "."
      )}
    </span>
  );
}

export default function ConceptStudioPage() {
  const {
    season,
    aestheticInput,
    setAestheticInput,
    identityPulse,
    resonancePulse,
    conceptLocked,
    lockConcept,
    setCurrentStep,
  } = useSessionStore();

  const STEEL_BLUE =
    (BRAND as any)?.steelBlue ?? (BRAND as any)?.steel ?? "#A9BFD6";

  const [headerCollectionName, setHeaderCollectionName] =
    useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(
    season || "—",
  );

  useEffect(() => {
    setCurrentStep(2);
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

  const [showAllAesthetics, setShowAllAesthetics] = useState(false);

  const [hoveredAesthetic, setHoveredAesthetic] = useState<string | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);

  const openHover = (aesthetic: string) => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    setHoveredAesthetic(aesthetic);
  };

  const closeHoverSoft = () => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(
      () => setHoveredAesthetic(null),
      110,
    );
  };

  const selectedAesthetic = AESTHETICS.includes(aestheticInput as any)
    ? aestheticInput
    : null;
  const previewAesthetic = hoveredAesthetic || selectedAesthetic || "";
  const moodboardTitle = previewAesthetic || "";

  const [refineText, setRefineText] = useState("");
  const [refineDraft, setRefineDraft] = useState("");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(
    null,
  );

  const submitRefine = () => {
    if (!selectedAesthetic) return;
    const next = (refineDraft || "").trim();
    if (!next) return;
    setRefineText(next);
  };

  const [acceptedInterpretation, setAcceptedInterpretation] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [baseOverride, setBaseOverride] = useState<string | null>(null);
  const refineInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedAesthetic) {
      setRefineText("");
      setRefineDraft("");
      setInterpretation(null);
      setAcceptedInterpretation(false);
      setShowAdjust(false);
      setBaseOverride(null);
      return;
    }

    const initial = `${selectedAesthetic}, but…`;
    setRefineDraft(initial);
    setRefineText(initial);
    setInterpretation({
      base: selectedAesthetic,
      modifiers: [],
      note: `Interpreting this as: ${selectedAesthetic}`,
      confidence: "high",
      unsupportedHits: [],
    });

    setAcceptedInterpretation(false);
    setShowAdjust(false);
    setBaseOverride(null);
  }, [selectedAesthetic]);

  useEffect(() => {
    if (!selectedAesthetic) return;
    setAcceptedInterpretation(false);
    setShowAdjust(false);
    setBaseOverride(null);
  }, [refineDraft, selectedAesthetic]);

  const [moodboardImages, setMoodboardImages] = useState<string[]>([]);
  const [matchedAestheticFolder, setMatchedAestheticFolder] = useState<
    string | null
  >(null);

  const activeModifiers =
    previewAesthetic &&
    selectedAesthetic &&
    previewAesthetic === selectedAesthetic
      ? interpretation?.modifiers ?? []
      : [];

  const moodboardSeedKey = `${previewAesthetic}::${activeModifiers.join("|")}`;

  useEffect(() => {
    if (!previewAesthetic || previewAesthetic.length < 2) {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
      return;
    }

    const folder = matchAestheticToFolder(previewAesthetic);
    if (!folder) {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
      return;
    }

    const allImages = Array.from(
      { length: 10 },
      (_, i) => `/images/aesthetics/${folder}/${i + 1}.jpg`,
    );
    const shuffled = seededShuffle(allImages, moodboardSeedKey);
    setMoodboardImages(shuffled.slice(0, 9));
    setMatchedAestheticFolder(folder);
  }, [previewAesthetic, moodboardSeedKey]);

  const [pulseUpdated, setPulseUpdated] = useState(false);

  useEffect(() => {
    if (identityPulse || resonancePulse) {
      setPulseUpdated(true);
      const timer = setTimeout(() => setPulseUpdated(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [identityPulse?.score, resonancePulse?.score]);

  const handleSelectAesthetic = (aesthetic: string) => {
    setHoveredAesthetic(null);
    setAestheticInput(aesthetic);

    const base = AESTHETIC_CONTENT[aesthetic];
    const mockIdentity =
      base?.identityScore ?? Math.floor(Math.random() * 30) + 70;
    const mockResonance =
      base?.resonanceScore ?? Math.floor(Math.random() * 30) + 65;

    const identityStatus =
      mockIdentity >= 80 ? "green" : mockIdentity >= 60 ? "yellow" : "red";
    const resonanceStatus =
      mockResonance >= 80 ? "green" : mockResonance >= 60 ? "yellow" : "red";

    useSessionStore.setState({
      identityPulse: {
        score: mockIdentity,
        status: identityStatus,
        message:
          identityStatus === "green"
            ? "Strong alignment"
            : identityStatus === "yellow"
              ? "Moderate alignment"
              : "Weak alignment",
      },
      resonancePulse: {
        score: mockResonance,
        status: resonanceStatus,
        message:
          resonanceStatus === "green"
            ? "Strong opportunity"
            : resonanceStatus === "yellow"
              ? "Moderate opportunity"
              : "Saturated market",
      },
    });

    setPulseUpdated(true);
    window.setTimeout(() => setPulseUpdated(false), 1100);
  };

  useEffect(() => {
    if (!selectedAesthetic) return;
    if (!refineText || refineText.trim().length < 2) return;

    const base = baseOverride || selectedAesthetic;
    const interp = interpretRefine(base, refineText);
    setInterpretation(interp);
  }, [refineText, selectedAesthetic, baseOverride]);

  useEffect(() => {
    if (!selectedAesthetic) return;
    if (!refineText || refineText.trim().length < 2) return;

    const timer = window.setTimeout(() => {
      const baseScores = AESTHETIC_CONTENT[selectedAesthetic];
      if (!baseScores) return;

      const base = baseOverride || selectedAesthetic;
      const interp = interpretRefine(base, refineText);

      // ✅ NEW: Enhanced modifier impact on scores based on texture, mood, and constraint
      let identityDelta = 0;
      let resonanceDelta = 0;

      // Texture modifiers (affect identity more)
      if (interp.modifiers.includes("Refined")) identityDelta += 3;
      if (interp.modifiers.includes("Textured")) identityDelta += 2;
      if (interp.modifiers.includes("Sculptural")) identityDelta += 2;
      if (interp.modifiers.includes("Soft")) identityDelta += 1;
      if (interp.modifiers.includes("Structured")) identityDelta += 2;
      if (interp.modifiers.includes("Fluid")) identityDelta += 1;
      if (interp.modifiers.includes("Raw")) identityDelta -= 1;
      if (interp.modifiers.includes("Polished")) identityDelta += 2;

      // Mood modifiers (affect both identity and resonance)
      if (interp.modifiers.includes("Romantic")) {
        identityDelta += 1;
        resonanceDelta += 2;
      }
      if (interp.modifiers.includes("Moody")) {
        identityDelta += 1;
        resonanceDelta += 1;
      }
      if (interp.modifiers.includes("Playful")) {
        resonanceDelta += 3;
      }
      if (interp.modifiers.includes("Serious")) {
        identityDelta += 1;
        resonanceDelta -= 1;
      }
      if (interp.modifiers.includes("Ethereal")) {
        identityDelta += 2;
        resonanceDelta += 1;
      }
      if (interp.modifiers.includes("Grounded")) {
        identityDelta += 1;
      }

      // Constraint modifiers (affect resonance more - market positioning)
      if (interp.modifiers.includes("Minimal")) resonanceDelta += 2;
      if (interp.modifiers.includes("Maximal")) resonanceDelta -= 1;
      if (interp.modifiers.includes("Utility")) resonanceDelta += 2;
      if (interp.modifiers.includes("Decorative")) resonanceDelta -= 1;
      if (interp.modifiers.includes("Nostalgic")) resonanceDelta -= 2;
      if (interp.modifiers.includes("Contemporary")) resonanceDelta += 2;
      if (interp.modifiers.includes("Timeless")) {
        identityDelta += 2;
        resonanceDelta += 1;
      }
      if (interp.modifiers.includes("Trend-forward")) {
        resonanceDelta += 3;
      }

      const newIdentity = Math.max(
        0,
        Math.min(100, baseScores.identityScore + identityDelta),
      );
      const newResonance = Math.max(
        0,
        Math.min(100, baseScores.resonanceScore + resonanceDelta),
      );

      useSessionStore.setState({
        identityPulse: {
          score: newIdentity,
          status: newIdentity >= 80 ? "green" : newIdentity >= 60 ? "yellow" : "red",
          message: "",
        },
        resonancePulse: {
          score: newResonance,
          status:
            newResonance >= 80 ? "green" : newResonance >= 60 ? "yellow" : "red",
          message: "",
        },
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [refineText, selectedAesthetic, baseOverride]);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedKey, setConfirmedKey] = useState<string>("");

  const effectiveConfirmKey = `${selectedAesthetic ?? ""}::${refineText ?? ""}::${baseOverride ?? ""}`;

  useEffect(() => {
    if (!isConfirmed) return;
    if (confirmedKey && effectiveConfirmKey !== confirmedKey) {
      setIsConfirmed(false);
      try {
        useSessionStore.setState({ conceptLocked: false });
      } catch {}
    }
  }, [effectiveConfirmKey, confirmedKey, isConfirmed]);

  const lowConfidenceNeedsAccept =
    interpretation?.confidence === "low" && !acceptedInterpretation;

  const canConfirm = Boolean(
    selectedAesthetic &&
      identityPulse &&
      resonancePulse &&
      interpretation &&
      !lowConfidenceNeedsAccept,
  );

  const handleConfirmClick = () => {
    if (!canConfirm) return;

    setIsConfirmed(true);
    setConfirmedKey(effectiveConfirmKey);

    try {
      lockConcept?.();
    } catch {}
    try {
      useSessionStore.setState({ conceptLocked: true });
    } catch {}
  };

  const canContinue = isConfirmed;

  const identityScore = identityPulse?.score;
  const resonanceScore = resonancePulse?.score;

  const identityColor =
    typeof identityScore === "number"
      ? identityScore >= 80
        ? BRAND.chartreuse
        : identityScore >= 60
          ? BRAND.rose
          : "#C19A6B"
      : "rgba(67, 67, 43, 0.75)";

  const resonanceColor =
    typeof resonanceScore === "number"
      ? resonanceScore >= 80
        ? BRAND.chartreuse
        : resonanceScore >= 60
          ? BRAND.rose
          : "#C19A6B"
      : "rgba(67, 67, 43, 0.75)";

  const confirmEnabledBySelection = Boolean(selectedAesthetic);
  const confirmClickable =
    confirmEnabledBySelection && canConfirm && !isConfirmed;

  const orderedAesthetics = [
    ...TOP_SUGGESTED,
    ...AESTHETICS.filter((a) => !TOP_SUGGESTED.includes(a)),
  ];
  const visibleAesthetics = showAllAesthetics
    ? orderedAesthetics
    : orderedAesthetics.slice(0, 4);

  const topSuggestedTwo = TOP_SUGGESTED.slice(0, 2);

  // ✅ FIXED: Determine recommended aesthetic based on highest combined score, not just list position
  const recommendedAesthetic = useMemo(() => {
    // Calculate combined scores for all aesthetics
    const scoredAesthetics = AESTHETICS.map((aesthetic) => {
      const content = AESTHETIC_CONTENT[aesthetic];
      const identityScore = content?.identityScore ?? 0;
      const resonanceScore = content?.resonanceScore ?? 0;
      const combinedScore = identityScore + resonanceScore;
      
      return {
        aesthetic,
        identityScore,
        resonanceScore,
        combinedScore,
      };
    });

    // Sort by combined score descending
    scoredAesthetics.sort((a, b) => b.combinedScore - a.combinedScore);

    // Return the highest scoring aesthetic
    return scoredAesthetics[0]?.aesthetic || TOP_SUGGESTED[0];
  }, []);

  const scoreTextStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 650,
    color: "rgba(67, 67, 43, 0.62)",
    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
  };

  const scoreIconWrapStyle: React.CSSProperties = {
    display: "inline-flex",
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "rgba(255,255,255,0.70)",
    border: "1px solid rgba(67, 67, 43, 0.10)",
    boxShadow: "0 6px 16px rgba(67, 67, 43, 0.06)",
  };

  /* ✅ Premium glassmorphic panels — transparent glass over ambient mesh */
  const glassPanelBase: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(255, 255, 255, 0.35)",
    background: "rgba(255, 255, 255, 0.25)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    boxShadow: [
      "0 24px 80px rgba(0, 0, 0, 0.05)",
      "0 8px 32px rgba(67, 67, 43, 0.04)",
      "inset 0 1px 0 rgba(255, 255, 255, 0.60)",
      "inset 0 -1px 0 rgba(255, 255, 255, 0.12)",
    ].join(", "),
    overflow: "hidden",
    position: "relative",
  };

  /* Frosted glass inner highlight — subtle refraction at edges */
  const glassSheen: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: [
      "radial-gradient(ellipse 280px 120px at 15% -5%, rgba(255,255,255,0.35), transparent 65%)",
      "radial-gradient(ellipse 200px 100px at 90% 10%, rgba(255,255,255,0.15), transparent 60%)",
    ].join(", "),
  };

  /* Rose glow overlay — dramatic bloom + subtle lift on pulse update */
  const roseGlowStyle: React.CSSProperties = {
    position: "absolute",
    inset: -3,
    borderRadius: 23,
    pointerEvents: "none",
    opacity: pulseUpdated ? 1 : 0,
    transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
    background: pulseUpdated
      ? "radial-gradient(ellipse 120% 80% at 50% 30%, rgba(186, 156, 168, 0.14), transparent 70%)"
      : "transparent",
    boxShadow: pulseUpdated
      ? [
          "0 0 50px rgba(186, 156, 168, 0.35)",
          "0 0 100px rgba(186, 156, 168, 0.18)",
          "0 0 150px rgba(186, 156, 168, 0.08)",
          "inset 0 0 50px rgba(186, 156, 168, 0.10)",
        ].join(", ")
      : "none",
    border: pulseUpdated
      ? "1.5px solid rgba(186, 156, 168, 0.30)"
      : "1.5px solid transparent",
  };

  // ✅ NEW: Generate actionable suggestions based on current state - only when needed
  const generateSuggestions = () => {
    if (!selectedAesthetic) return [];
    
    const suggestions: Array<{
      label: string;
      sub: string;
      action: () => void;
    }> = [];

    const hasRefinement = refineText && refineText !== `${selectedAesthetic}, but…`;
    const isRecommended = selectedAesthetic === recommendedAesthetic;

    // If both scores are already high (>= 80), don't show suggestions
    if (identityScore && identityScore >= 80 && resonanceScore && resonanceScore >= 80 && !hasRefinement) {
      return suggestions; // Empty - this direction is already strong
    }

    // Suggest switching to recommended if significantly weaker
    if (!isRecommended && (identityScore && identityScore < 65 || resonanceScore && resonanceScore < 65)) {
      suggestions.push({
        label: `Switch to ${recommendedAesthetic}`,
        sub: "Stronger consumer resonance with clearer brand alignment.",
        action: () => handleSelectAesthetic(recommendedAesthetic),
      });
    }

    // Only suggest texture refinement if identity is weak
    if (identityScore && identityScore < 75 && (!hasRefinement || (hasRefinement && !interpretation?.modifiers.includes("Refined") && !interpretation?.modifiers.includes("Soft")))) {
      suggestions.push({
        label: "Add 'more refined' for texture",
        sub: "Elevates clarity and brings structure to the direction.",
        action: () => {
          const current = refineDraft || `${selectedAesthetic}, but…`;
          setRefineDraft(current + " more refined");
          setTimeout(() => submitRefine(), 100);
        },
      });
    }

    // Only suggest mood refinement based on specific aesthetic types or weak resonance
    if (!hasRefinement || (hasRefinement && !interpretation?.modifiers.includes("Ethereal") && !interpretation?.modifiers.includes("Grounded") && !interpretation?.modifiers.includes("Playful"))) {
      if ((identityScore && identityScore < 75 || resonanceScore && resonanceScore < 75)) {
        if (selectedAesthetic.toLowerCase().includes("romantic") || selectedAesthetic.toLowerCase().includes("coastal")) {
          suggestions.push({
            label: "Add 'ethereal' for mood",
            sub: "Softens the read — appeals to consumers seeking quiet luxury.",
            action: () => {
              const current = refineDraft || `${selectedAesthetic}, but…`;
              setRefineDraft(current + " ethereal");
              setTimeout(() => submitRefine(), 100);
            },
          });
        } else if (selectedAesthetic.toLowerCase().includes("western") || selectedAesthetic.toLowerCase().includes("grunge") || selectedAesthetic.toLowerCase().includes("dark")) {
          suggestions.push({
            label: "Try 'grounded' for mood",
            sub: "Anchors authenticity — resonates with consumers wanting realness.",
            action: () => {
              const current = refineDraft || `${selectedAesthetic}, but…`;
              setRefineDraft(current + " grounded");
              setTimeout(() => submitRefine(), 100);
            },
          });
        } else if (resonanceScore && resonanceScore < 70) {
          suggestions.push({
            label: "Try 'playful' for mood",
            sub: "Opens market positioning — taps into emerging consumer optimism.",
            action: () => {
              const current = refineDraft || `${selectedAesthetic}, but…`;
              setRefineDraft(current + " playful");
              setTimeout(() => submitRefine(), 100);
            },
          });
        }
      }
    }

    // Only suggest constraint refinement if resonance is weak
    if (resonanceScore && resonanceScore < 70 && (!hasRefinement || (hasRefinement && !interpretation?.modifiers.includes("Minimal") && !interpretation?.modifiers.includes("Contemporary")))) {
      suggestions.push({
        label: "Add 'minimal' for constraint",
        sub: "Sharpens positioning in a crowded market — clearer consumer read.",
        action: () => {
          const current = refineDraft || `${selectedAesthetic}, but…`;
          setRefineDraft(current + " minimal");
          setTimeout(() => submitRefine(), 100);
        },
      });
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  };

  // ✅ NEW: Generate enhanced Muko Insight based on selection and refinement
  const generateEnhancedMukoInsight = () => {
    if (!selectedAesthetic) {
      return (
        <>
          <div
            style={{
              fontSize: 14,
              fontWeight: 650,
              lineHeight: 1.5,
              color: "rgba(67, 67, 43, 0.88)",
              fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
              marginBottom: 12,
            }}
          >
            Start by selecting a direction
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.58,
              color: "rgba(67, 67, 43, 0.66)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              marginBottom: 12,
            }}
          >
            Look for the subtle rose glow — those are Muko's recommendations for your brand DNA.
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.58,
              color: "rgba(67, 67, 43, 0.60)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            After selecting, refine with texture, mood, or constraint to see how it shifts identity and resonance.
          </div>
        </>
      );
    }

    const isRecommended = selectedAesthetic === recommendedAesthetic;
    const hasRefinement = refineText && refineText !== `${selectedAesthetic}, but…`;
    
    if (!identityScore || !resonanceScore) {
      return `Analyzing ${selectedAesthetic}...`;
    }

    let insight = "";

    // High-performing direction (both scores strong)
    if (identityScore >= 80 && resonanceScore >= 80) {
      if (isRecommended) {
        insight = `${selectedAesthetic} is a natural fit — reads clearly as your brand voice and consumers are actively searching for this point of view. `;
        if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
          insight += `Adding ${interpretation.modifiers.slice(0, 2).join(" + ")} sharpens the target customer without losing the core appeal.`;
        } else {
          insight += "You can move forward as-is, or refine to claim a more specific consumer niche.";
        }
      } else {
        insight = `${selectedAesthetic} performs well on both fronts — strong brand alignment and healthy consumer demand. `;
        if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
          insight += `Your refinement (${interpretation.modifiers.slice(0, 2).join(" + ")}) adds strategic nuance, though ${recommendedAesthetic} would require less translation work.`;
        } else {
          insight += `This direction works, though ${recommendedAesthetic} would be more effortless to execute across your line.`;
        }
      }
    }
    // Good brand fit, weaker market resonance
    else if (identityScore >= 75 && resonanceScore < 75) {
      insight = `${selectedAesthetic} feels authentic to your brand, but the market is crowded here. `;
      if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
        insight += `${interpretation.modifiers.slice(0, 2).join(" + ")} helps carve out differentiation, but you'll need sharp execution to stand out to consumers.`;
      } else {
        insight += "Consider refining with mood or constraint to find a less saturated angle that still feels like you.";
      }
    }
    // Good market demand, weaker brand fit
    else if (resonanceScore >= 75 && identityScore < 75) {
      insight = `${selectedAesthetic} has strong consumer interest, but it's not your most natural language. `;
      if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
        insight += `Adding ${interpretation.modifiers.slice(0, 2).join(" + ")} bridges the gap, though you'll need to work harder to make it feel authentic across touchpoints.`;
      } else {
        insight += "Refine with texture to pull it closer to your voice, or consider a direction that requires less brand translation.";
      }
    }
    // Both scores moderate
    else if (identityScore >= 60 && resonanceScore >= 60) {
      if (isRecommended) {
        insight = `${selectedAesthetic} is a solid middle ground — enough brand clarity and consumer traction to work with. `;
        if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
          insight += `Your refinement (${interpretation.modifiers.slice(0, 2).join(" + ")}) helps tip it into stronger territory.`;
        } else {
          insight += "Refinement will push this into clearer positioning.";
        }
      } else {
        insight = `${selectedAesthetic} sits in workable territory, but both brand fit and market positioning could be sharper. `;
        if (hasRefinement && interpretation?.modifiers && interpretation?.modifiers.length > 0) {
          insight += `Adding ${interpretation.modifiers.slice(0, 2).join(" + ")} helps, though ${recommendedAesthetic} would give you a stronger starting point.`;
        } else {
          insight += `Consider ${recommendedAesthetic} for clearer consumer communication and easier brand expression.`;
        }
      }
    }
    // Low scores - needs intervention
    else {
      if (identityScore && identityScore < 60 && resonanceScore && resonanceScore < 60) {
        insight = `${selectedAesthetic} creates tension — it doesn't align with your brand DNA and faces heavy market saturation. `;
        if (isRecommended) {
          insight += "Refinement can help, but this direction will require significant effort to execute convincingly.";
        } else {
          insight += `Switch to ${recommendedAesthetic} for authentic brand expression and better consumer appetite.`;
        }
      } else if (identityScore < 60) {
        insight = `${selectedAesthetic} pulls you off-brand. While consumers respond to it, you'll struggle to execute it authentically. `;
        insight += hasRefinement 
          ? `Even with refinement, this direction fights your natural voice.`
          : `${recommendedAesthetic} lets you speak in your native language while still capturing consumer interest.`;
      } else {
        insight = `${selectedAesthetic} feels like you, but the market is oversaturated. `;
        insight += hasRefinement
          ? `Your refinement adds differentiation, but you're still entering a crowded space.`
          : `Refine to find a fresh angle, or explore a direction with more consumer headroom.`;
      }
    }

    return insight;
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
      {/* Top bar */}
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

            {/* ✅ UPDATED: Colored stepper */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {[
                { label: "Intent", state: "done" as const },
                { label: "Concept", state: "active" as const },
                { label: "Spec", state: "idle" as const },
                { label: "Report", state: "idle" as const },
              ].map((s) => {
                const isActive = s.state === "active";
                const isDone = s.state === "done";

                // Colors per state
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
                    <span style={{ color: labelColor }}>
                      {s.label}
                    </span>
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
                fontFamily:
                  "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {headerSeasonLabel}
              <span style={{ padding: "0 8px", opacity: 0.35 }}>·</span>
              {headerCollectionName}
            </div>

            {/* ✅ UPDATED: Rose-colored Back & Save with icons */}
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
                  fontFamily:
                    "var(--font-sohne-breit), system-ui, sans-serif",
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
                onClick={() => console.log("Save & Close")}
                style={{
                  fontSize: "12px",
                  fontWeight: 650,
                  color: BRAND.rose,
                  background: "rgba(169, 123, 143, 0.06)",
                  border: "1px solid rgba(169, 123, 143, 0.18)",
                  borderRadius: 999,
                  padding: "7px 14px 7px 10px",
                  cursor: "pointer",
                  fontFamily:
                    "var(--font-sohne-breit), system-ui, sans-serif",
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
              Concept Studio
            </h1>

            {/* ✅ UPDATED: New subtitle copy */}
            <p
              style={{
                fontSize: "14px",
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                marginTop: "14px",
                marginBottom: 0,
                maxWidth: 780,
              }}
            >
              Choose a direction, refine it in your own words — we'll interpret identity and resonance in real time, guided by Muko Insight.
            </p>
          </div>

          {/* 3-Column Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "440px minmax(540px, 1fr) 372px",
              gap: "40px",
              alignItems: "start",
            }}
          >
            {/* LEFT — ✅ increased gap from 22 → 30 for more breathing room */}
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 650,
                    color: BRAND.oliveInk,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    marginBottom: 6,
                  }}
                >
                  Start with a direction
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "rgba(67, 67, 43, 0.55)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    lineHeight: 1.5,
                    marginBottom: 16,
                  }}
                >
                  {/* ✅ NEW: Updated copy to mention rose glow */}
                  Look for the rose glow — that's Muko's top recommendation for your brand.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 12,
                  }}
                >
                  {visibleAesthetics.map((aesthetic) => {
                    const isSelected = selectedAesthetic === aesthetic;
                    const isHovered = hoveredAesthetic === aesthetic;
                    const isExpanded = isHovered || isSelected;
                    const content = AESTHETIC_CONTENT[aesthetic];

                    // ✅ NEW: Check if this is the recommended aesthetic
                    const isRecommended = aesthetic === recommendedAesthetic;

                    const identityColorChip =
                      (content?.identityScore ?? 0) >= 80
                        ? BRAND.chartreuse
                        : (content?.identityScore ?? 0) >= 60
                          ? BRAND.rose
                          : "#C19A6B";

                    const resonanceColorChip =
                      (content?.resonanceScore ?? 0) >= 80
                        ? BRAND.chartreuse
                        : (content?.resonanceScore ?? 0) >= 60
                          ? BRAND.rose
                          : "#C19A6B";

                    // ✅ NEW: Rose glow styling for recommended option
                    const roseGlow = isRecommended
                      ? {
                          boxShadow:
                            "0 18px 50px rgba(169,123,143,0.16), 0 0 0 1px rgba(169,123,143,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
                          border: "1.5px solid rgba(169,123,143,0.28)",
                        }
                      : {};

                    return (
                      <button
                        key={aesthetic}
                        onClick={() => handleSelectAesthetic(aesthetic)}
                        onMouseEnter={() => openHover(aesthetic)}
                        onMouseLeave={closeHoverSoft}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: "16px",
                          padding: isExpanded ? "16px 18px 14px" : "14px 18px",
                          background: "rgba(255,255,255,0.62)",
                          border: isSelected
                            ? `1px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67, 67, 43, 0.10)",
                          boxShadow: isSelected
                            ? `0 18px 56px rgba(67, 67, 43, 0.10), inset 0 0 0 1px rgba(255,255,255,0.60)`
                            : isHovered
                              ? "0 14px 44px rgba(67, 67, 43, 0.10)"
                              : "0 10px 32px rgba(67, 67, 43, 0.06)",
                          cursor: "pointer",
                          transition:
                            "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                          outline: "none",
                          position: "relative",
                          // ✅ NEW: Apply rose glow to recommended
                          ...(isRecommended ? roseGlow : {}),
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: isExpanded ? "flex-start" : "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: isSelected ? BRAND.oliveInk : "rgba(67, 67, 43, 0.78)",
                                fontFamily:
                                  "var(--font-sohne-breit), system-ui, sans-serif",
                                letterSpacing: "-0.005em",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {aesthetic}
                            </div>
                          </div>

                          {/* ✅ FIXED: Before selection = total scores on hover only. After selection = delta dot + delta scores on hover */}
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flex: "0 0 auto",
                              paddingTop: 2,
                            }}
                          >
                            {!selectedAesthetic ? (
                              // Before any selection: only show total scores on hover
                              isHovered ? (
                                <>
                                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                    <span style={{ ...scoreIconWrapStyle, color: identityColorChip }}>
                                      <IconIdentity size={16} />
                                    </span>
                                    <span style={scoreTextStyle}>
                                      {content?.identityScore ?? "—"}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                    <span style={{ ...scoreIconWrapStyle, color: resonanceColorChip }}>
                                      <IconResonance size={16} />
                                    </span>
                                    <span style={scoreTextStyle}>
                                      {content?.resonanceScore ?? "—"}
                                    </span>
                                  </div>
                                </>
                              ) : null
                            ) : (
                              // After selection: show delta dot, and delta scores on hover
                              <>
                                {isHovered ? (
                                  // Show delta scores on hover
                                  <>
                                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                      <span style={{ ...scoreIconWrapStyle, color: identityColorChip }}>
                                        <IconIdentity size={16} />
                                      </span>
                                      <span style={{
                                        ...scoreTextStyle,
                                        color: isSelected ? "rgba(67, 67, 43, 0.62)" : "rgba(67, 67, 43, 0.52)",
                                      }}>
                                        {isSelected 
                                          ? `${content?.identityScore ?? "—"}`
                                          : `${((content?.identityScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.identityScore ?? 0)) >= 0 ? '+' : ''}${(content?.identityScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.identityScore ?? 0)}`
                                        }
                                      </span>
                                    </div>

                                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                      <span style={{ ...scoreIconWrapStyle, color: resonanceColorChip }}>
                                        <IconResonance size={16} />
                                      </span>
                                      <span style={{
                                        ...scoreTextStyle,
                                        color: isSelected ? "rgba(67, 67, 43, 0.62)" : "rgba(67, 67, 43, 0.52)",
                                      }}>
                                        {isSelected 
                                          ? `${content?.resonanceScore ?? "—"}`
                                          : `${((content?.resonanceScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.resonanceScore ?? 0)) >= 0 ? '+' : ''}${(content?.resonanceScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.resonanceScore ?? 0)}`
                                        }
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  // Show delta dot when not hovering
                                  !isSelected && (
                                    <div
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: 
                                          ((content?.identityScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.identityScore ?? 0)) + 
                                          ((content?.resonanceScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.resonanceScore ?? 0)) > 0
                                            ? BRAND.chartreuse
                                            : ((content?.identityScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.identityScore ?? 0)) + 
                                              ((content?.resonanceScore ?? 0) - (AESTHETIC_CONTENT[selectedAesthetic]?.resonanceScore ?? 0)) < 0
                                              ? BRAND.rose
                                              : "rgba(67, 67, 43, 0.22)",
                                      }}
                                    />
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div
                            style={{
                              marginTop: 10,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: "rgba(67, 67, 43, 0.70)",
                                fontFamily:
                                  "var(--font-inter), system-ui, sans-serif",
                                lineHeight: 1.5,
                              }}
                            >
                              {/* ✅ NEW: Show recommended insight or default description */}
                              {isRecommended
                                ? "Strongest alignment with your brand DNA — clear, intentional, and room to make it your own."
                                : content?.description ?? " "}
                            </div>

                            {/* ✅ NEW: "Why This Works" section for recommended */}
                            {isRecommended && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase" as const,
                                    color: "rgba(67,67,43,0.50)",
                                    fontFamily:
                                      "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  Why This Works
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Supports your direction while staying flexible across product categories — easier to execute without losing brand clarity.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowAllAesthetics((v) => !v)}
                  style={{
                    marginTop: "14px",
                    fontSize: "13px",
                    fontWeight: 650,
                    color: "rgba(67, 67, 43, 0.55)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    padding: 0,
                  }}
                >
                  {showAllAesthetics ? "Show less" : "Show more"}
                </button>
              </div>

              {/* Refine — only after selection */}
              {selectedAesthetic && (
                <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                  <label
                    style={{
                      fontSize: "18px",
                      fontWeight: 650,
                      color: BRAND.oliveInk,
                      marginBottom: "10px",
                      display: "block",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    }}
                  >
                    Add texture, mood, references, or constraint{" "}
                    <span style={{ color: "rgba(67, 67, 43, 0.45)", fontWeight: 400, fontSize: "14px" }}>
                      (optional)
                    </span>
                  </label>

                  <div style={{ position: "relative", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                    <input
                      ref={refineInputRef}
                      type="text"
                      value={refineDraft}
                      onChange={(e) => setRefineDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitRefine();
                        }
                      }}
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        padding: "14px 52px 14px 16px",
                        fontSize: "14px",
                        borderRadius: "14px",
                        border: "1px solid rgba(67, 67, 43, 0.12)",
                        background: "rgba(255,255,255,0.78)",
                        color: BRAND.oliveInk,
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        outline: "none",
                        boxShadow: "0 14px 40px rgba(67, 67, 43, 0.06)",
                      }}
                      placeholder="e.g., more refined, ethereal, minimal"
                    />

                    <button
                      onClick={submitRefine}
                      disabled={!selectedAesthetic || !refineDraft.trim()}
                      aria-label="Submit refinement"
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: "1px solid rgba(67, 67, 43, 0.12)",
                        background: "rgba(255,255,255,0.86)",
                        boxShadow: "0 10px 24px rgba(67, 67, 43, 0.08)",
                        cursor: !selectedAesthetic || !refineDraft.trim() ? "not-allowed" : "pointer",
                        opacity: !selectedAesthetic || !refineDraft.trim() ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(67, 67, 43, 0.70)",
                      }}
                    >
                      →
                    </button>
                  </div>

                  {interpretation && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "14px 16px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.60)",
                        border: "1px solid rgba(67, 67, 43, 0.10)",
                        boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "rgba(67, 67, 43, 0.38)",
                            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          }}
                        >
                          Interpretation
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 650,
                            color:
                              interpretation.confidence === "high"
                                ? "rgba(67, 67, 43, 0.60)"
                                : interpretation.confidence === "med"
                                  ? "rgba(169, 123, 143, 0.85)"
                                  : "rgba(181, 141, 94, 0.95)",
                            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          }}
                        >
                          {interpretation.confidence === "high"
                            ? "High confidence"
                            : interpretation.confidence === "med"
                              ? "Medium confidence"
                              : "Low confidence"}
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {boldParts({
                          base: interpretation.base,
                          modifiers: interpretation.modifiers ?? [],
                        })}
                      </div>

                      {/* ✅ NEW: Detailed insight about interpretation */}
                      {interpretation.modifiers?.length > 0 && (
                        <>
                          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {interpretation.modifiers.map((m) => (
                              <span
                                key={m}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 650,
                                  color: "rgba(67, 67, 43, 0.66)",
                                  background: "rgba(171, 171, 99, 0.10)",
                                  border: "1px solid rgba(171, 171, 99, 0.18)",
                                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                                }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                color: "rgba(67,67,43,0.62)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                              }}
                            >
                              These modifiers add specificity — they'll influence how materials, silhouettes, and palette read in the next step.
                            </div>
                          </div>
                        </>
                      )}

                      {interpretation.confidence === "low" && !acceptedInterpretation && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={() => setAcceptedInterpretation(true)}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: "1px solid rgba(67, 67, 43, 0.14)",
                                background: "rgba(255,255,255,0.84)",
                                fontSize: 12,
                                fontWeight: 650,
                                cursor: "pointer",
                                color: "rgba(67, 67, 43, 0.75)",
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              }}
                            >
                              Accept
                            </button>

                            <button
                              onClick={() => setShowAdjust((v) => !v)}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: "1px solid rgba(181, 141, 94, 0.30)",
                                background: "rgba(181, 141, 94, 0.10)",
                                fontSize: 12,
                                fontWeight: 650,
                                cursor: "pointer",
                                color: "rgba(67, 67, 43, 0.74)",
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              }}
                            >
                              Adjust
                            </button>
                          </div>

                          {showAdjust && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: 12,
                                borderRadius: 14,
                                background: "rgba(255,255,255,0.74)",
                                border: "1px solid rgba(67, 67, 43, 0.10)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 650,
                                  color: "rgba(67, 67, 43, 0.70)",
                                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                  marginBottom: 8,
                                }}
                              >
                                Adjust interpretation
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(67, 67, 43, 0.55)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Closest base:
                                </span>

                                <select
                                  value={baseOverride ?? selectedAesthetic ?? ""}
                                  onChange={(e) => setBaseOverride(e.target.value)}
                                  style={{
                                    padding: "8px 10px",
                                    fontSize: 12,
                                    fontWeight: 650,
                                    color: "rgba(67, 67, 43, 0.78)",
                                    background: "rgba(255,255,255,0.85)",
                                    border: "1px solid rgba(67, 67, 43, 0.14)",
                                    borderRadius: 10,
                                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                    outline: "none",
                                  }}
                                >
                                  {AESTHETICS.map((a) => (
                                    <option key={a} value={a}>
                                      {a}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => {
                                    const nextBase = baseOverride ?? selectedAesthetic;
                                    if (nextBase && nextBase !== selectedAesthetic) {
                                      handleSelectAesthetic(nextBase);
                                    }
                                    setAcceptedInterpretation(true);
                                    setShowAdjust(false);
                                  }}
                                  style={{
                                    padding: "8px 12px",
                                    fontSize: 12,
                                    fontWeight: 650,
                                    color: "rgba(67, 67, 43, 0.78)",
                                    background: "rgba(171, 171, 99, 0.12)",
                                    border: "1px solid rgba(171, 171, 99, 0.32)",
                                    borderRadius: 999,
                                    cursor: "pointer",
                                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                  }}
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {interpretation.confidence === "low" && acceptedInterpretation && (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "rgba(67, 67, 43, 0.45)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                          }}
                        >
                          Interpretation accepted — you can keep refining anytime.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirm direction */}
                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={handleConfirmClick}
                      disabled={!confirmClickable}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: confirmClickable ? "pointer" : "default",
                        opacity: confirmEnabledBySelection ? (confirmClickable ? 1 : 0.55) : 0.35,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        fontSize: 18,
                        fontWeight: 650,
                        color: isConfirmed
                          ? "rgba(67, 67, 43, 0.90)"
                          : confirmEnabledBySelection
                            ? "rgba(67, 67, 43, 0.78)"
                            : "rgba(67, 67, 43, 0.55)",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: isConfirmed ? "none" : "1.5px solid rgba(67, 67, 43, 0.20)",
                          background: isConfirmed ? "rgba(171, 171, 99, 0.22)" : "transparent",
                          color: isConfirmed ? "rgba(67, 67, 43, 0.85)" : "transparent",
                          boxShadow: isConfirmed ? "0 10px 26px rgba(171, 171, 99, 0.14)" : "none",
                        }}
                      >
                        ✓
                      </span>
                      <span>{isConfirmed ? "Confirmed" : "Confirm direction"}</span>
                    </button>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "rgba(67, 67, 43, 0.45)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      If you edit the direction, you'll confirm again.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MIDDLE — MOODBOARD */}
            <div style={{ minWidth: 0 }}>
              <div style={{ position: "sticky", top: 96 }}>
                {/* ✅ UPDATED: removed subtitle under moodboard title */}
                {moodboardTitle ? (
                  <div style={{ marginBottom: 14 }}>
                    <h2
                      style={{
                        fontSize: "26px",
                        fontWeight: 400,
                        color: BRAND.oliveInk,
                        margin: 0,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {moodboardTitle}
                    </h2>
                  </div>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    <h2
                      style={{
                        fontSize: "26px",
                        fontWeight: 400,
                        color: "rgba(67, 67, 43, 0.40)",
                        margin: 0,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      }}
                    >
                      Hover an aesthetic to preview
                    </h2>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "14px",
                  }}
                >
                  {moodboardImages.length > 0 ? (
                    moodboardImages.map((src, i) => (
                      <div
                        key={`${matchedAestheticFolder}-${i}`}
                        style={{
                          aspectRatio: "1",
                          borderRadius: "14px",
                          overflow: "hidden",
                          border: "none",
                          boxShadow: "0 12px 34px rgba(67, 67, 43, 0.10)",
                          position: "relative",
                          transition:
                            "transform 260ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 260ms cubic-bezier(0.4, 0, 0.2, 1)",
                          animation: `fadeIn 360ms ease-out ${i * 40}ms both`,
                          background: "transparent",
                        }}
                      >
                        <img
                          src={src}
                          alt={`${previewAesthetic} moodboard ${i + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                          loading="lazy"
                        />
                      </div>
                    ))
                  ) : (
                    Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1",
                          borderRadius: "14px",
                          background:
                            "linear-gradient(90deg, rgba(235, 232, 228, 0.30) 0%, rgba(245, 242, 238, 0.70) 50%, rgba(235, 232, 228, 0.30) 100%)",
                          backgroundSize: "200% 100%",
                          animation: "skeleton-loading 1.5s ease-in-out infinite",
                          border: "none",
                          boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — PULSE + INSIGHT + CONTINUE */}
            <div style={{ position: "relative" }}>
              {/* ✅ Ambient gradient mesh — gives the glass something to blur */}
              <div
                style={{
                  position: "absolute",
                  inset: "-40px -30px",
                  zIndex: 0,
                  pointerEvents: "none",
                  overflow: "hidden",
                  borderRadius: 32,
                }}
              >
                {/* Rose wash — top right, very soft */}
                <div
                  style={{
                    position: "absolute",
                    width: 380,
                    height: 380,
                    top: "-15%",
                    right: "-15%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(186, 156, 168, 0.32) 0%, rgba(186, 156, 168, 0.08) 40%, transparent 65%)",
                    filter: "blur(60px)",
                    animation: "blobDrift1 12s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.95 : 0.75,
                    transition: "opacity 800ms ease",
                  }}
                />
                {/* Sage wash — mid left */}
                <div
                  style={{
                    position: "absolute",
                    width: 340,
                    height: 340,
                    top: "25%",
                    left: "-18%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(178, 180, 140, 0.28) 0%, rgba(178, 180, 140, 0.06) 40%, transparent 65%)",
                    filter: "blur(65px)",
                    animation: "blobDrift2 14s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.9 : 0.65,
                    transition: "opacity 800ms ease",
                  }}
                />
                {/* Cool mist — bottom right */}
                <div
                  style={{
                    position: "absolute",
                    width: 300,
                    height: 300,
                    bottom: "0%",
                    right: "5%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(180, 192, 204, 0.26) 0%, rgba(180, 192, 204, 0.06) 40%, transparent 65%)",
                    filter: "blur(60px)",
                    animation: "blobDrift3 10s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.85 : 0.6,
                    transition: "opacity 800ms ease",
                  }}
                />
                {/* Warm undertone — center */}
                <div
                  style={{
                    position: "absolute",
                    width: 260,
                    height: 260,
                    top: "45%",
                    left: "15%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(200, 182, 160, 0.20) 0%, transparent 60%)",
                    filter: "blur(55px)",
                    animation: "blobDrift4 16s ease-in-out infinite alternate",
                    opacity: 0.55,
                  }}
                />
              </div>

              <div style={{ position: "sticky", top: 96, zIndex: 1 }}>
                {/* ✅ Glassmorphic Pulse Rail */}
                <div
                  style={{
                    ...glassPanelBase,
                    padding: 18,
                    transition: "box-shadow 500ms ease, border-color 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: pulseUpdated ? "translateY(-3px) scale(1.008)" : "translateY(0) scale(1)",
                    animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1" : "none",
                  }}
                >
                  <div style={glassSheen} />
                  {/* Rose glow overlay */}
                  <div style={roseGlowStyle} />

                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "rgba(67, 67, 43, 0.42)",
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        marginBottom: 12,
                      }}
                    >
                      Pulse
                    </div>

                    {[
                      {
                        label: "Identity",
                        dot:
                          typeof identityScore === "number"
                            ? identityColor
                            : "rgba(67, 67, 43, 0.22)",
                        icon: <IconIdentity size={16} />,
                        score: typeof identityScore === "number" ? `${identityScore}` : "—",
                        accent:
                          typeof identityScore === "number" ? identityColor : "rgba(67, 67, 43, 0.30)",
                      },
                      {
                        label: "Resonance",
                        dot:
                          typeof resonanceScore === "number"
                            ? resonanceColor
                            : "rgba(67, 67, 43, 0.22)",
                        icon: <IconResonance size={16} />,
                        score: typeof resonanceScore === "number" ? `${resonanceScore}` : "—",
                        accent:
                          typeof resonanceScore === "number" ? resonanceColor : "rgba(67, 67, 43, 0.30)",
                      },
                      {
                        label: "Execution",
                        dot: "rgba(67, 67, 43, 0.18)",
                        icon: <IconExecution size={16} />,
                        score: "Pending",
                        accent: "rgba(67, 67, 43, 0.32)",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(255, 255, 255, 0.30)",
                          background: "rgba(255, 255, 255, 0.18)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: row.dot,
                              boxShadow:
                                row.label !== "Execution" && (conceptLocked || isConfirmed)
                                  ? "0 0 0 4px rgba(171, 171, 99, 0.14)"
                                  : "none",
                            }}
                          />
                          <div
                            style={{
                              fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              fontWeight: 750,
                              fontSize: 12,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "rgba(67, 67, 43, 0.74)",
                            }}
                          >
                            {row.label}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...scoreIconWrapStyle, color: row.accent }}>
                            {row.icon}
                          </span>
                          <span style={scoreTextStyle}>{row.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ✅ UPDATED: Glassmorphic Muko Insight with enhanced content */}
                <div
                  style={{
                    ...glassPanelBase,
                    marginTop: 16,
                    padding: 18,
                    transition: "box-shadow 500ms ease, border-color 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
                    transform: pulseUpdated ? "translateY(-2px) scale(1.005)" : "translateY(0) scale(1)",
                    animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1 150ms" : "none",
                  }}
                >
                  <div style={glassSheen} />
                  {/* Rose glow overlay */}
                  <div style={roseGlowStyle} />

                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "rgba(67, 67, 43, 0.42)",
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      Muko Insight
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.58,
                        color: "rgba(67, 67, 43, 0.88)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      {/* ✅ NEW: Use enhanced insight generator - handles both JSX and string */}
                      {typeof generateEnhancedMukoInsight() === 'string' 
                        ? generateEnhancedMukoInsight()
                        : generateEnhancedMukoInsight()
                      }
                    </div>

                    {/* ✅ NEW: Suggestions section */}
                    {selectedAesthetic && generateSuggestions().length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "rgba(67, 67, 43, 0.42)",
                            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                            marginBottom: 10,
                          }}
                        >
                          Suggestions
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {generateSuggestions().map((sug, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "14px 16px",
                                borderRadius: 14,
                                background: "rgba(255,255,255,0.46)",
                                border: "1px solid rgba(67,67,43,0.10)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 650,
                                    color: "rgba(67,67,43,0.82)",
                                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  {sug.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.45,
                                    color: "rgba(67,67,43,0.55)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  {sug.sub}
                                </div>
                              </div>

                              <button
                                onClick={sug.action}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 650,
                                  color: BRAND.chartreuse,
                                  border: `1px solid ${BRAND.chartreuse}`,
                                  borderRadius: 999,
                                  padding: "8px 16px",
                                  background: "rgba(171,171,99,0.08)",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                  flex: "0 0 auto",
                                  transition: "all 180ms ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(171,171,99,0.14)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(171,171,99,0.08)";
                                }}
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Continue button — outlined steel blue */}
                <button
                  onClick={() => {
                    if (!canContinue) return;
                    setCurrentStep(3);
                    console.log("Continue to Spec Studio");
                  }}
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
                      ? "rgba(169, 191, 214, 0.08)"
                      : "rgba(255,255,255,0.46)",
                    border: canContinue
                      ? `1.5px solid ${STEEL_BLUE}`
                      : "1.5px solid rgba(67, 67, 43, 0.10)",
                    cursor: canContinue ? "pointer" : "not-allowed",
                    boxShadow: canContinue
                      ? "0 14px 44px rgba(169, 191, 214, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.60)"
                      : "none",
                    transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: canContinue ? 1 : 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    animation: canContinue ? "continueReady 600ms ease-out 1" : "none",
                  }}
                >
                  <span>Continue to Spec Studio</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      transition: "transform 280ms ease",
                      transform: canContinue ? "translateX(0)" : "translateX(-2px)",
                      opacity: canContinue ? 1 : 0.4,
                      animation: canContinue ? "arrowNudge 2s ease-in-out infinite 1s" : "none",
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
              </div>
            </div>
          </div>

          <style>{`
            @keyframes skeleton-loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes insightSparkle {
              0%, 100% { opacity: 0.7; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.15); }
            }
            @keyframes continueReady {
              0% { transform: translateY(4px); opacity: 0.6; }
              100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes arrowNudge {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(3px); }
            }

            /* Ambient gradient mesh blob animations */
            @keyframes blobDrift1 {
              0% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(-15px, 20px) scale(1.08); }
              66% { transform: translate(10px, -10px) scale(0.95); }
              100% { transform: translate(-8px, 15px) scale(1.04); }
            }
            @keyframes blobDrift2 {
              0% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(20px, -15px) scale(1.1); }
              100% { transform: translate(-10px, 10px) scale(0.96); }
            }
            @keyframes blobDrift3 {
              0% { transform: translate(0, 0) scale(1); }
              40% { transform: translate(-12px, -18px) scale(1.06); }
              100% { transform: translate(15px, 8px) scale(0.98); }
            }
            @keyframes blobDrift4 {
              0% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(10px, 12px) scale(1.05); }
              100% { transform: translate(-8px, -6px) scale(0.97); }
            }

            /* Panel glow bloom on score change */
            @keyframes panelGlowPulse {
              0% {
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.05), 0 8px 32px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12);
              }
              35% {
                box-shadow: 0 30px 100px rgba(186, 156, 168, 0.22), 0 12px 48px rgba(186, 156, 168, 0.12), 0 0 60px rgba(186, 156, 168, 0.15), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -1px 0 rgba(255,255,255,0.15);
              }
              100% {
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.05), 0 8px 32px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12);
              }
            }

            @media (max-width: 1180px) {
              main > div > div[style*="grid-template-columns: 440px"] {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      </main>
    </div>
  );
}