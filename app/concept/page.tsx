"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
} from "../../lib/concept-studio/utils";
import AskMuko from "@/components/AskMuko";
import aestheticsData from "@/data/aesthetics.json";

/* ─── Pulse icons ─────────────────────────────────────────────────────────── */
function IconIdentity({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconResonance({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.6" />
      <path d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconExecution({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const CHARTREUSE = "#A8B475";
const STEEL = BRAND.steelBlue; // #7D96AC
const PULSE_GREEN = "#4D7A56";
const PULSE_YELLOW = "#9B7A3A";
const PULSE_RED = "#8A3A3A";
const OLIVE = BRAND.oliveInk; // #43432B

/* ─── Type aliases ────────────────────────────────────────────────────────── */
type Confidence = "high" | "med" | "low";
type Interpretation = {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
};

/* ─── Chip data types ─────────────────────────────────────────────────────── */
interface AestheticChip {
  label: string;
  type: "spec" | "mood";
  material: string | null;
  silhouette: Record<string, string> | null;
  complexity_mod: number;
  palette: string | null;
  isCustom?: boolean;
}

function getAestheticChips(aestheticName: string): AestheticChip[] {
  if (!aestheticName) return [];
  const slug = aestheticName.toLowerCase().replace(/\s+/g, "-");
  const entry = (
    aestheticsData as unknown as Array<{
      id: string;
      name: string;
      chips: AestheticChip[];
    }>
  ).find((a) => a.id === slug || a.name === aestheticName);
  return entry?.chips ?? [];
}

/* ─── Free-form aesthetic matcher ─────────────────────────────────────────── */
function matchFreeFormToAesthetic(input: string): string | null {
  if (!input.trim() || input.trim().length < 2) return null;
  const normalized = input.toLowerCase().trim();

  for (const aesthetic of AESTHETICS) {
    const aLower = aesthetic.toLowerCase();
    if (aLower === normalized || normalized.includes(aLower)) return aesthetic;
  }

  const keywordMap: Array<{ keywords: string[]; aesthetic: string }> = [
    { keywords: ["quiet luxury","minimal","minimalist","clean","sleek","structural","monochrome","old money","column silhouette","tonal","matte","architectural","refined","precision","crisp","pared","understated"], aesthetic: "Quiet Structure" },
    { keywords: ["rugged","outdoor","gorpcore","utility","durable","earthy","adventure","workwear","tactical","mountain","trail","protection","terrain","technical"], aesthetic: "Terrain Luxe" },
    { keywords: ["academic","poetry","poet","romantic","bookish","literary","vintage knit","blazer","dark academia","cinematic","analog","nostalgic romance","literary romance","knitwear"], aesthetic: "Romantic Analog" },
    { keywords: ["craft","artisan","handmade","sustainable","woven","natural","organic","fiber","handcraft","textile","loom","slow fashion","heritage","heirloom","circularity"], aesthetic: "Heritage Hand" },
    { keywords: ["grunge","indie","punk","edgy","distressed","90s","nineties","sleaze","raw","worn","grungy","garage","undone","anti-polish","messy"], aesthetic: "Undone Glam" },
    { keywords: ["gummy","jelly","squishy","haptic","rubber","bouncy","inflated","asmr","sensory","tactile softness","haptic play"], aesthetic: "Haptic Play" },
    { keywords: ["glam","glamour","sequin","power dressing","bold shoulders","metallic","80s","gold","maximalist","bold","diva","extra","opulent","eighties","high shine","showstopper","voltage"], aesthetic: "High Voltage" },
    { keywords: ["cute","kawaii","adorable","sweet","pastel","whimsy","cartoon","childlike","precious","toy","bubbly","saccharine","subversion","chunky","color blocking"], aesthetic: "Sweet Subversion" },
  ];

  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const { keywords, aesthetic } of keywordMap) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) score += keyword.split(" ").length * 2;
    }
    if (score > bestScore) { bestScore = score; bestMatch = aesthetic; }
  }

  if (bestScore < 2) {
    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    for (const aesthetic of AESTHETICS) {
      const content = AESTHETIC_CONTENT[aesthetic];
      const description = (content?.description ?? "").toLowerCase();
      const aLower = aesthetic.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (aLower.includes(word)) score += 3;
        if (description.includes(word)) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestMatch = aesthetic; }
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

/* ─── Pulse status helpers ────────────────────────────────────────────────── */
function getIdentityStatus(score: number | undefined): { label: string; color: string; sublabel: string } {
  if (score === undefined) return { label: "—", color: "rgba(67,67,43,0.35)", sublabel: "Select a direction to score" };
  if (score >= 85) return { label: "Strong", color: PULSE_GREEN, sublabel: "Reinforces core DNA" };
  if (score >= 70) return { label: "Moderate", color: PULSE_YELLOW, sublabel: "Some tension with core values" };
  return { label: "Tension", color: PULSE_RED, sublabel: "Significant brand tension" };
}

function getResonanceStatus(score: number | undefined, velocity?: string): { label: string; color: string; sublabel: string } {
  if (score === undefined) return { label: "—", color: "rgba(67,67,43,0.35)", sublabel: "Select a direction to score" };
  if (velocity === "emerging") return { label: "Ascending", color: PULSE_GREEN, sublabel: "Early momentum building" };
  if (velocity === "declining") return { label: "Declining", color: PULSE_RED, sublabel: "Window closing" };
  if (score >= 80) return { label: "Growing", color: PULSE_GREEN, sublabel: "Strong market pull" };
  if (score >= 65) return { label: "Growing", color: PULSE_YELLOW, sublabel: "Early momentum building" };
  return { label: "Saturated", color: PULSE_RED, sublabel: "Market is crowded" };
}

/* ─── Direction insight content per aesthetic ─────────────────────────────── */
function getDirectionInsight(
  aesthetic: string,
  identityScore: number,
  resonanceScore: number,
  topChips: string[],
  velocity: string
): { headline: string; p1: string; p2: string; p3: string; opportunity: string[]; sharpenChips: string[] } {
  const chipList = topChips.slice(0, 3).join(", ");
  const chipA = topChips[0] ?? "key material signals";
  const chipB = topChips[1] ?? "construction details";
  const highId = identityScore >= 80;
  const highRes = resonanceScore >= 80;
  const ascending = velocity === "emerging";

  if (highId && highRes) {
    return {
      headline: `${aesthetic} — strong alignment, move with confidence.`,
      p1: `Brand fit is high and market timing is favorable. ${aesthetic} maps naturally to your design language — the identity signals are consistent without forcing.`,
      p2: `${chipA} and ${chipB} are the strongest entry points here. They carry the aesthetic without overcommitting to the trend — exactly the right leverage.`,
      p3: ascending ? `The market window is open and still early. Move now with a full direction commitment — waiting dilutes the advantage.` : `Consumer appetite is strong. This is the moment to invest fully rather than test cautiously.`,
      opportunity: [
        `Lead with ${chipA} as the brand's signature entry into this direction`,
        `Invest in the hero fabrication — half-measures won't register`,
        `Own the aesthetic fully across touchpoints for maximum impact`,
      ],
      sharpenChips: topChips.slice(3, 6),
    };
  }

  if (highId && !highRes) {
    return {
      headline: `${aesthetic} fits your brand — the market timing needs navigation.`,
      p1: `Brand alignment is solid at ${identityScore} — this direction maps well to your DNA. The challenge is market timing: consumer demand is present but softer than optimal.`,
      p2: `${chipA} and ${chipB} are the signals with clearest commercial read. Anchor in these rather than the broader aesthetic signals to sharpen the consumer proposition.`,
      p3: ascending ? `The market is still building. You have time to establish presence before saturation, but move deliberately.` : `Specificity is your differentiation play here — a tighter edit creates its own demand.`,
      opportunity: [
        `Use brand authenticity as the differentiator — this is genuinely your territory`,
        `${chipA} is the most commercially transferable signal in this direction`,
        `A tighter silhouette edit will sharpen the resonance without compromising identity`,
      ],
      sharpenChips: topChips.slice(2, 5),
    };
  }

  if (!highId && highRes) {
    return {
      headline: `${aesthetic} has real momentum — but requires intentional ownership.`,
      p1: `Market traction is building with clear upward velocity, but brand alignment is moderate — there's tension between ${aesthetic}'s signals and your core positioning. You can enter this space, but you need to do it on your terms.`,
      p2: `${chipA} and ${chipB} are the signals with the most traction, but they can read as costume if not handled with your specific brand lens. Lead with your brand's point of view, not the trend.`,
      p3: ascending ? `A limited capsule to test reception before committing to a full direction is the right call here.` : `Consumer appetite is strong, but differentiation is now required. Enter with a clear editorial position.`,
      opportunity: [
        `Lead with your existing credentials — approach the aesthetic through your brand's lens`,
        `${chipA} is the highest-traction signal — use it as an anchor, not decoration`,
        `Consider a capsule test before committing the full collection`,
      ],
      sharpenChips: topChips.slice(2, 5),
    };
  }

  // Both moderate or low
  return {
    headline: `${aesthetic} — proceed with clear creative conviction.`,
    p1: `Both brand alignment and market timing present real challenges here. ${aesthetic} requires significant creative investment to execute convincingly across brand and consumer touchpoints.`,
    p2: `${chipList ? `The strongest entry signals are ${chipList}.` : "Focus on the most brand-adjacent signals in this direction."} Refinement is essential — the generic read of this aesthetic won't work for your positioning.`,
    p3: `If you have a strong creative reason to pursue this, proceed with conviction. A tentative approach in difficult territory produces the worst outcomes.`,
    opportunity: [
      `Push the aesthetic further than the category expects — half-measures won't work`,
      `Find the unexpected material within the direction to create differentiation`,
      `Anchor in your strongest brand signals to make the direction feel earned`,
    ],
    sharpenChips: topChips.slice(0, 4),
  };
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ConceptStudioPage() {
  const router = useRouter();
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

  const [headerCollectionName, setHeaderCollectionName] = useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || "—");

  useEffect(() => { setCurrentStep(2); }, [setCurrentStep]);

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

  const [hoveredAesthetic, setHoveredAesthetic] = useState<string | null>(null);
  const [browsingList, setBrowsingList] = useState(false);
  const [pulseExpandedRow, setPulseExpandedRow] = useState<string | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);

  const openHover = (aesthetic: string) => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    setHoveredAesthetic(aesthetic);
  };

  const closeHoverSoft = () => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setHoveredAesthetic(null), 120);
  };

  const selectedAesthetic = AESTHETICS.includes(aestheticInput as any) ? aestheticInput : null;
  // Show preview on hover, OR when a direction is selected (unless user explicitly chose to browse the list)
  const previewAesthetic = hoveredAesthetic ?? (selectedAesthetic && !browsingList ? selectedAesthetic : "");
  const showPreview = !!hoveredAesthetic || (!!selectedAesthetic && !browsingList);
  // Preview is in "selected" state when the previewed direction IS the selected one
  const previewIsSelected = !!selectedAesthetic && previewAesthetic === selectedAesthetic;
  const previewOpacity = previewIsSelected ? 1.0 : 0.88;
  const showChartreuseAccent = previewIsSelected;

  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [customChips, setCustomChips] = useState<Record<string, AestheticChip[]>>({});

  const toggleElement = (key: string) => {
    setSelectedElements((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const [freeFormDraft, setFreeFormDraft] = useState("");
  const [freeFormMatch, setFreeFormMatch] = useState<string | null>(null);
  const [freeFormLoading, setFreeFormLoading] = useState(false);

  useEffect(() => {
    const trimmed = freeFormDraft.trim();
    if (trimmed.length < 2) { setFreeFormMatch(null); setFreeFormLoading(false); return; }
    setFreeFormLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/match-aesthetic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        });
        const data = await res.json();
        setFreeFormMatch(data.match ?? null);
      } catch {
        setFreeFormMatch(matchFreeFormToAesthetic(trimmed));
      } finally {
        setFreeFormLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [freeFormDraft]);

  const [refineText, setRefineText] = useState("");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);

  useEffect(() => {
    if (!selectedAesthetic) { setRefineText(""); setInterpretation(null); return; }
    const initial = `${selectedAesthetic}, but…`;
    setRefineText(initial);
    setInterpretation({ base: selectedAesthetic, modifiers: [], note: `Interpreting this as: ${selectedAesthetic}`, confidence: "high", unsupportedHits: [] });
  }, [selectedAesthetic]);

  const [moodboardImages, setMoodboardImages] = useState<string[]>([]);
  const [matchedAestheticFolder, setMatchedAestheticFolder] = useState<string | null>(null);

  const moodboardSeedKey = `${previewAesthetic}::`;

  useEffect(() => {
    if (!previewAesthetic || previewAesthetic.length < 2) { setMoodboardImages([]); setMatchedAestheticFolder(null); return; }
    const folder = matchAestheticToFolder(previewAesthetic);
    if (!folder) { setMoodboardImages([]); setMatchedAestheticFolder(null); return; }
    const allImages = Array.from({ length: 10 }, (_, i) => `/images/aesthetics/${folder}/${i + 1}.jpg`);
    const shuffled = seededShuffle(allImages, moodboardSeedKey);
    setMoodboardImages(shuffled.slice(0, 9));
    setMatchedAestheticFolder(folder);
  }, [previewAesthetic, moodboardSeedKey]);

  /* ─── Hero direction ──────────────────────────────────────────────────────── */
  const recommendedAesthetic = useMemo(() => {
    const getDiffBonus = (velocity: string, saturation: number) => {
      if (velocity === "emerging") return saturation < 45 ? 100 : saturation < 60 ? 75 : 50;
      if (velocity === "peak") return saturation < 50 ? 40 : 20;
      return 0;
    };
    const scored = AESTHETICS.map((aesthetic) => {
      const content = AESTHETIC_CONTENT[aesthetic];
      const entry = (aestheticsData as Array<{ id: string; name: string; trend_velocity: string; saturation_score: number }>)
        .find((a) => a.name === aesthetic || a.id === aesthetic.toLowerCase().replace(/\s+/g, "-"));
      const velocity = entry?.trend_velocity ?? "peak";
      const saturation = entry?.saturation_score ?? 50;
      const bonus = getDiffBonus(velocity, saturation);
      const heroScore = (content?.identityScore ?? 0) * 0.4 + (content?.resonanceScore ?? 0) * 0.4 + bonus * 0.2;
      return { aesthetic, heroScore };
    });
    scored.sort((a, b) => b.heroScore - a.heroScore);
    return scored[0]?.aesthetic ?? TOP_SUGGESTED[0];
  }, []);

  /* ─── Score color helper ──────────────────────────────────────────────────── */
  const scoreColor = (score: number) =>
    score >= 80 ? CHARTREUSE : score >= 65 ? BRAND.camel : BRAND.rose;

  /* ─── handleSelectAesthetic ───────────────────────────────────────────────── */
  const handleSelectAesthetic = (aesthetic: string) => {
    if (aesthetic !== aestheticInput) {
      setSelectedElements(new Set());
      setCustomChips({});
    }
    setBrowsingList(false);   // stay on preview after selecting
    setHoveredAesthetic(null); // clear hover (preview driven by selectedAesthetic)
    setAestheticInput(aesthetic);

    const base = AESTHETIC_CONTENT[aesthetic];
    const mockIdentity = base?.identityScore ?? Math.floor(Math.random() * 30) + 70;
    const mockResonance = base?.resonanceScore ?? Math.floor(Math.random() * 30) + 65;
    const identityStatus = mockIdentity >= 80 ? "green" : mockIdentity >= 60 ? "yellow" : "red";
    const resonanceStatus = mockResonance >= 80 ? "green" : mockResonance >= 60 ? "yellow" : "red";

    useSessionStore.setState({
      identityPulse: {
        score: mockIdentity,
        status: identityStatus,
        message: identityStatus === "green" ? "Strong alignment" : identityStatus === "yellow" ? "Moderate alignment" : "Weak alignment",
      },
      resonancePulse: {
        score: mockResonance,
        status: resonanceStatus,
        message: resonanceStatus === "green" ? "Strong opportunity" : resonanceStatus === "yellow" ? "Moderate opportunity" : "Saturated market",
      },
      conceptLocked: true,
    });

    try { lockConcept?.(); } catch {}
  };

  // Pre-populate pulse rail with Muko's Pick data on first visit (no selection made)
  useEffect(() => {
    if (!aestheticInput && recommendedAesthetic && !identityPulse) {
      const base = AESTHETIC_CONTENT[recommendedAesthetic];
      const identity = base?.identityScore ?? 80;
      const resonance = base?.resonanceScore ?? 75;
      useSessionStore.setState({
        identityPulse: { score: identity, status: identity >= 80 ? "green" : identity >= 60 ? "yellow" : "red", message: "Based on Muko's Pick" },
        resonancePulse: { score: resonance, status: resonance >= 80 ? "green" : resonance >= 60 ? "yellow" : "red", message: "Based on Muko's Pick" },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const identityScore = identityPulse?.score;
  const resonanceScore = resonancePulse?.score;

  const selectedAestheticEntry = selectedAesthetic
    ? (aestheticsData as Array<{ id: string; name: string; trend_velocity: string; saturation_score: number }>)
        .find((a) => a.name === selectedAesthetic)
    : null;

  const idStatus = getIdentityStatus(identityScore);
  const resStatus = getResonanceStatus(resonanceScore, selectedAestheticEntry?.trend_velocity);

  /* ─── Sorted direction list ───────────────────────────────────────────────── */
  const sortedDirections = useMemo(() => {
    return AESTHETICS
      .filter((a) => a !== recommendedAesthetic)
      .sort((a, b) => {
        const ca = AESTHETIC_CONTENT[a];
        const cb = AESTHETIC_CONTENT[b];
        const sa = ((ca?.identityScore ?? 0) * 0.5) + ((ca?.resonanceScore ?? 0) * 0.5);
        const sb = ((cb?.identityScore ?? 0) * 0.5) + ((cb?.resonanceScore ?? 0) * 0.5);
        return sb - sa;
      });
  }, [recommendedAesthetic]);

  /* ─── Muko Insight content ────────────────────────────────────────────────── */
  const insightContent = useMemo(() => {
    const ae = selectedAesthetic ?? recommendedAesthetic;
    const content = AESTHETIC_CONTENT[ae];
    const chips = getAestheticChips(ae).map((c) => c.label);
    const entry = (aestheticsData as Array<{ id: string; name: string; trend_velocity: string }>)
      .find((a) => a.name === ae);
    return getDirectionInsight(
      ae,
      content?.identityScore ?? 80,
      content?.resonanceScore ?? 75,
      chips,
      entry?.trend_velocity ?? "peak"
    );
  }, [selectedAesthetic, recommendedAesthetic]);

  const sharpenChips = useMemo(() => {
    if (!selectedAesthetic) return insightContent.sharpenChips;
    const activeKeys = Array.from(selectedElements).filter((k) => k.startsWith(`${selectedAesthetic}::`));
    const activeLabels = activeKeys.map((k) => k.replace(`${selectedAesthetic}::`, ""));
    return insightContent.sharpenChips.filter((c) => !activeLabels.includes(c)).slice(0, 3);
  }, [selectedAesthetic, selectedElements, insightContent]);

  const canContinue = Boolean(selectedAesthetic);

  /* ─── Shared typography styles ────────────────────────────────────────────── */
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
  const inter = "var(--font-inter), system-ui, sans-serif";

  /* ─── Pulse row data ──────────────────────────────────────────────────────── */
  const pulseRows = [
    {
      key: "Identity",
      label: "IDENTITY",
      icon: (color: string) => <IconIdentity size={13} color={color} />,
      score: identityScore,
      status: idStatus,
      barColor: idStatus.color,
      what: `Identity measures how well this direction aligns with your brand DNA — keywords, aesthetic positioning, and customer profile. A high score means this direction reinforces who you already are. A low score signals tension that requires intentional navigation.`,
      how: `Keyword overlap between your brand profile and this direction's signals, weighted by conflict detection. Intentional tensions acknowledged in onboarding are factored in.`,
      pending: false,
    },
    {
      key: "Resonance",
      label: "RESONANCE",
      icon: (color: string) => <IconResonance size={13} color={color} />,
      score: resonanceScore,
      status: resStatus,
      barColor: resStatus.color,
      what: `Resonance measures market timing — how much consumer interest exists for this direction right now, and whether you're entering at the right moment. High resonance with ascending velocity means the window is open. Peak saturation means you're late.`,
      how: `Saturation score from our curated aesthetics library, weighted by trend velocity (emerging / ascending / peak / declining). Updated manually every Monday from WGSN and market data.`,
      pending: false,
    },
    {
      key: "Execution",
      label: "EXECUTION",
      icon: (color: string) => <IconExecution size={13} color={color} />,
      score: undefined,
      status: { label: "Pending", color: "rgba(67,67,43,0.35)", sublabel: "Unlocks in Spec Studio" },
      barColor: "rgba(67,67,43,0.12)",
      what: `Execution measures whether the physical product you're building is feasible given your timeline, materials, and construction complexity. It unlocks in Spec Studio once you define your product inputs.`,
      how: `Timeline buffer score based on material lead times and construction complexity relative to your season deadline. Negative buffer scores red. Margin gate applied as a 30% score penalty if COGS exceeds target.`,
      pending: true,
    },
  ];

  /* ─── RENDER ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#FAF9F6", overflow: "hidden" }}>

      {/* ── Fixed Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
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
        {/* Left: logo + stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: sohne, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: OLIVE }}>muko</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "Intent", done: true, active: false },
              { label: "Concept", done: false, active: true },
              { label: "Spec", done: false, active: false },
              { label: "Report", done: false, active: false },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: s.done ? `1.5px solid ${CHARTREUSE}` : s.active ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)",
                  background: s.done ? "rgba(168,180,117,0.08)" : s.active ? "rgba(125,150,172,0.07)" : "rgba(67,67,43,0.03)",
                  fontFamily: sohne, fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
                  color: s.done ? "rgba(67,67,43,0.70)" : s.active ? OLIVE : "rgba(67,67,43,0.35)",
                }}
              >
                {s.done ? (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={CHARTREUSE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : s.active ? (
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: STEEL, boxShadow: `0 0 0 3px rgba(125,150,172,0.20)` }} />
                ) : (
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(67,67,43,0.18)" }} />
                )}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: season/collection + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.50)", letterSpacing: "0.03em" }}>
            {headerSeasonLabel}<span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>{headerCollectionName}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => window.history.back()}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px 7px 10px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "rgba(67,67,43,0.62)", cursor: "pointer", letterSpacing: "0.01em" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back
            </button>
            <button
              onClick={() => {}}
              style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: OLIVE, fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "#F5F0E8", cursor: "pointer", letterSpacing: "0.01em" }}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      </header>

      {/* ── Two-column body ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, paddingTop: 72, overflow: "hidden", height: "calc(100vh - 72px)", marginTop: 0 }}>

        {/* ── LEFT COLUMN ── scrollable ────────────────────────────────────────── */}
        <div
          style={{ width: "50%", height: "100%", overflowY: "auto", overflowX: "hidden" }}
          onMouseEnter={() => { if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current); }}
          onMouseLeave={closeHoverSoft}
        >
          {/* Title section — always visible above list/preview */}
          <div style={{ padding: "36px 44px 24px" }}>
            <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 28, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Concept Studio
            </h1>
            <p style={{ margin: "10px 0 0", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.52)", lineHeight: 1.55, maxWidth: 460 }}>
              Choose a direction, refine it in your own words — we'll interpret identity and resonance in real time, guided by Muko Insight.
            </p>
          </div>

          {/* ── PREVIEW VIEW ────────────────────────────────────────────────────── */}
          {showPreview ? (
            <div
              key="preview"
              style={{
                padding: "0 44px 48px",
                opacity: previewOpacity,
                transition: "opacity 180ms ease",
                borderLeft: showChartreuseAccent ? `3px solid ${CHARTREUSE}` : "3px solid transparent",
                background: showChartreuseAccent ? `rgba(168,180,117,0.03)` : "transparent",
              }}
            >
              {/* "Browse other directions" — top-left, always in preview */}
              <button
                onClick={() => { setBrowsingList(true); setHoveredAesthetic(null); }}
                style={{
                  marginBottom: 16,
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: inter,
                  fontSize: 12,
                  fontWeight: 650,
                  color: "rgba(67,67,43,0.68)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  letterSpacing: "0.01em",
                }}
              >
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                  <path d="M10.5 5.5H3.5M3.5 5.5L6.5 2.5M3.5 5.5L6.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Browse other directions
              </button>

              {/* Direction name + select button (top row) */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: sohne,
                    fontWeight: 500,
                    fontSize: 24,
                    color: OLIVE,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  {previewAesthetic}
                </h2>
                {previewIsSelected ? (
                  <div
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 13px",
                      borderRadius: 999,
                      background: `rgba(168,180,117,0.12)`,
                      border: `1.5px solid ${CHARTREUSE}`,
                      fontFamily: inter,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: CHARTREUSE,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginTop: 4,
                    }}
                  >
                    ✓ Selected
                  </div>
                ) : (
                  <button
                    onClick={() => previewAesthetic && handleSelectAesthetic(previewAesthetic)}
                    style={{
                      flexShrink: 0,
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      background: STEEL,
                      border: "none",
                      color: "#fff",
                      fontFamily: inter,
                      cursor: "pointer",
                      marginTop: 4,
                    }}
                  >
                    Select
                  </button>
                )}
              </div>

              {/* Description */}
              {AESTHETIC_CONTENT[previewAesthetic]?.description && (
                <p style={{ margin: "0 0 18px", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.62)", lineHeight: 1.6 }}>
                  {AESTHETIC_CONTENT[previewAesthetic].description}
                </p>
              )}

              {/* Chips — steel blue, no-fill default, distinct hover + active */}
              {(() => {
                const chips = getAestheticChips(previewAesthetic);
                if (!chips.length) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    {previewIsSelected && (
                      <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 10 }}>
                        Layer these in
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {chips.map((chip) => {
                      const chipKey = `${previewAesthetic}::${chip.label}`;
                      const isActive = selectedElements.has(chipKey);
                      return (
                        <PreviewChip
                          key={chip.label}
                          label={chip.label}
                          isActive={isActive}
                          onClick={() => toggleElement(chipKey)}
                          steel={STEEL}
                          inter={inter}
                        />
                      );
                    })}
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 500,
                        background: "transparent",
                        border: `1.5px dashed rgba(125,150,172,0.50)`,
                        color: "rgba(125,150,172,0.70)",
                        fontFamily: inter,
                        cursor: "pointer",
                      }}
                    >
                      + add
                    </span>
                    </div>
                  </div>
                );
              })()}

              {/* Moodboard 3×3 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {moodboardImages.length > 0
                  ? moodboardImages.map((src, i) => (
                      <div
                        key={`${matchedAestheticFolder}-${i}`}
                        style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", animation: `fadeIn 250ms ease-out ${i * 25}ms both` }}
                      >
                        <img src={src} alt={`${previewAesthetic} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                      </div>
                    ))
                  : Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 8,
                          background: "linear-gradient(90deg, rgba(235,232,228,0.30) 0%, rgba(245,242,238,0.70) 50%, rgba(235,232,228,0.30) 100%)",
                          backgroundSize: "200% 100%",
                          animation: "skeleton-loading 1.5s ease-in-out infinite",
                        }}
                      />
                    ))}
              </div>
            </div>
          ) : (
            /* ── LIST VIEW ────────────────────────────────────────────────────── */
            <div key="list" style={{ padding: "0 44px 48px", animation: "fadeIn 180ms ease" }}>

              {/* MUKO'S PICK label + horizontal line */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.rose, whiteSpace: "nowrap" }}>
                  MUKO&apos;S PICK
                </span>
                <div style={{ flex: 1, height: 1, background: `rgba(169,123,143,0.25)` }} />
              </div>

              {/* Hero card */}
              {(() => {
                const heroContent = AESTHETIC_CONTENT[recommendedAesthetic];
                const heroIsSelected = selectedAesthetic === recommendedAesthetic;
                const heroChips = getAestheticChips(recommendedAesthetic);
                const specChips = heroChips.filter((c) => c.type === "spec").slice(0, 4);
                const moodChips = heroChips.filter((c) => c.type === "mood").slice(0, 2);
                const displayChips = [...specChips, ...moodChips];
                return (
                  <button
                    onClick={() => handleSelectAesthetic(recommendedAesthetic)}
                    onMouseEnter={() => openHover(recommendedAesthetic)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "18px 20px",
                      borderRadius: 10,
                      background: heroIsSelected ? "rgba(169,123,143,0.04)" : "#fff",
                      border: `1.5px solid rgba(169,123,143,0.28)`,
                      boxShadow: "0 0 0 3px rgba(169,123,143,0.05), 0 2px 10px rgba(169,123,143,0.07)",
                      cursor: "pointer",
                      outline: "none",
                      marginBottom: 28,
                      transition: "all 200ms ease",
                    }}
                  >
                    {/* Top row: name + scores inline */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 20, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                        {recommendedAesthetic}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontFamily: inter, fontSize: 10.5, fontWeight: 650, color: scoreColor(heroContent?.identityScore ?? 0), display: "flex", alignItems: "center", gap: 2 }}>
                          <IconIdentity size={10} color={scoreColor(heroContent?.identityScore ?? 0)} />{heroContent?.identityScore ?? "—"}
                        </span>
                        <span style={{ fontFamily: inter, fontSize: 10.5, fontWeight: 650, color: scoreColor(heroContent?.resonanceScore ?? 0), display: "flex", alignItems: "center", gap: 2 }}>
                          <IconResonance size={10} color={scoreColor(heroContent?.resonanceScore ?? 0)} />{heroContent?.resonanceScore ?? "—"}
                        </span>
                      </div>
                    </div>
                    {/* Description */}
                    {heroContent?.description && (
                      <p style={{ margin: "0 0 12px", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.58)", lineHeight: 1.55 }}>
                        {heroContent.description}
                      </p>
                    )}
                    {/* Chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {displayChips.map((chip) => {
                        const isSpec = chip.type === "spec";
                        return (
                          <span
                            key={chip.label}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: inter,
                              background: isSpec ? `rgba(125,150,172,0.12)` : "transparent",
                              border: isSpec ? `1px solid ${STEEL}` : "1px solid rgba(67,67,43,0.18)",
                              color: isSpec ? STEEL : "rgba(67,67,43,0.52)",
                            }}
                          >
                            {chip.label}
                          </span>
                        );
                      })}
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: inter,
                          background: "transparent",
                          border: `1px dashed ${STEEL}`,
                          color: STEEL,
                        }}
                      >
                        + add
                      </span>
                    </div>
                  </button>
                );
              })()}

              {/* EXPLORE OTHER DIRECTIONS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 5 }}>
                  EXPLORE OTHER DIRECTIONS
                </div>
                <div style={{ fontFamily: inter, fontSize: 12, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>
                  Type a direction and we'll match it — or select from below.
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={freeFormDraft}
                    onChange={(e) => setFreeFormDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && freeFormMatch) { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); }
                    }}
                    placeholder="e.g. quiet luxury with edge, grunge romance, coastal dark…"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px 48px 12px 14px",
                      fontSize: 13,
                      borderRadius: 10,
                      border: "1px solid rgba(67,67,43,0.12)",
                      background: "rgba(255,255,255,0.80)",
                      color: OLIVE,
                      fontFamily: inter,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => { if (freeFormMatch) { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); } }}
                    disabled={!freeFormMatch || !freeFormDraft.trim()}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      width: 32, height: 32, borderRadius: 999,
                      border: "1px solid rgba(67,67,43,0.12)",
                      background: "rgba(255,255,255,0.90)",
                      cursor: !freeFormMatch || !freeFormDraft.trim() ? "not-allowed" : "pointer",
                      opacity: !freeFormMatch || !freeFormDraft.trim() ? 0.45 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: "rgba(67,67,43,0.65)",
                    }}
                  >
                    →
                  </button>
                </div>
                {freeFormLoading && freeFormDraft.trim().length > 1 && (
                  <div style={{ marginTop: 7, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.36)" }}>Interpreting…</div>
                )}
                {!freeFormLoading && freeFormMatch && freeFormDraft.trim().length > 1 && (
                  <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.40)" }}>Closest match:</span>
                    <button
                      onClick={() => { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); }}
                      style={{ padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "rgba(125,150,172,0.08)", border: `1px solid ${STEEL}`, color: STEEL, cursor: "pointer", fontFamily: inter }}
                    >
                      {freeFormMatch} →
                    </button>
                  </div>
                )}
              </div>

              {/* Direction cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sortedDirections.map((aesthetic) => {
                  const isSelected = selectedAesthetic === aesthetic;
                  const content = AESTHETIC_CONTENT[aesthetic];
                  const chips = getAestheticChips(aesthetic).slice(0, 3);
                  const idCol = scoreColor(content?.identityScore ?? 0);
                  const resCol = scoreColor(content?.resonanceScore ?? 0);

                  const selContent = selectedAesthetic ? AESTHETIC_CONTENT[selectedAesthetic] : null;
                  return (
                    <DirectionCard
                      key={aesthetic}
                      aesthetic={aesthetic}
                      content={content}
                      chips={chips}
                      isSelected={isSelected}
                      idColor={idCol}
                      resColor={resCol}
                      selectedIdScore={selContent?.identityScore ?? null}
                      selectedResScore={selContent?.resonanceScore ?? null}
                      hasSelection={!!selectedAesthetic}
                      onHover={() => openHover(aesthetic)}
                      onHoverLeave={() => {}}
                      onSelect={() => handleSelectAesthetic(aesthetic)}
                      inter={inter}
                      sohne={sohne}
                      steelBlue={STEEL}
                      chartreuse={CHARTREUSE}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── fixed scroll, independent ────────────────────────── */}
        <div
          style={{
            width: "50%",
            height: "100%",
            overflowY: "auto",
            borderLeft: "1px solid rgba(67,67,43,0.08)",
            background: "rgba(250,249,246,0.60)",
          }}
        >
          <div style={{ padding: "36px 44px 48px" }}>

            {/* ── PULSE RAIL ─────────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 16 }}>
                PULSE
              </div>

              {pulseRows.map((row) => {
                const isExpanded = pulseExpandedRow === row.key;
                const scoreVal = row.score;
                const barWidth = row.pending ? 0 : scoreVal != null ? scoreVal : 0;

                return (
                  <div
                    key={row.key}
                    style={{
                      borderBottom: "1px solid rgba(67,67,43,0.07)",
                      paddingBottom: 14,
                      marginBottom: 14,
                      opacity: row.pending ? 0.55 : 1,
                    }}
                  >
                    {/* Row header */}
                    <button
                      onClick={() => setPulseExpandedRow(isExpanded ? null : row.key)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", background: "none", border: "none", padding: 0,
                        cursor: "pointer", textAlign: "left",
                        marginBottom: 8,
                      }}
                    >
                      {/* Left: icon + label */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ display: "flex", alignItems: "center", flexShrink: 0, opacity: row.pending ? 0.35 : 1 }}>
                          {row.icon(row.pending ? "rgba(67,67,43,0.40)" : row.status.color)}
                        </span>
                        <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(67,67,43,0.68)" }}>
                          {row.label}
                        </span>
                      </div>

                      {/* Right: status tag + score + chevron */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {row.pending ? (
                          <span style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.40)" }}>⚙ Pending</span>
                        ) : (
                          <>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 600,
                                fontFamily: inter,
                                background: row.status.color === PULSE_GREEN
                                  ? "rgba(77,122,86,0.10)"
                                  : row.status.color === PULSE_YELLOW
                                    ? "rgba(155,122,58,0.10)"
                                    : row.status.color === PULSE_RED
                                      ? "rgba(138,58,58,0.10)"
                                      : "rgba(67,67,43,0.06)",
                                color: row.status.color,
                              }}
                            >
                              {row.status.label}
                            </span>
                            <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 700, color: OLIVE }}>{scoreVal}</span>
                          </>
                        )}
                        <span style={{ fontSize: 14, color: "rgba(67,67,43,0.30)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 220ms ease" }}>›</span>
                      </div>
                    </button>

                    {/* Progress bar */}
                    {!row.pending && (
                      <div style={{ height: 2, background: "rgba(67,67,43,0.08)", borderRadius: 1, marginBottom: 6, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${barWidth}%`,
                            background: row.barColor,
                            borderRadius: 1,
                            transition: "width 500ms ease",
                          }}
                        />
                      </div>
                    )}

                    {/* Sub-label */}
                    <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.44)", paddingLeft: 20 }}>
                      {row.status.sublabel}
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid rgba(67,67,43,0.06)",
                          overflow: "hidden",
                          animation: "expandDown 220ms ease",
                        }}
                      >
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.36)", marginBottom: 4 }}>
                            What this means
                          </div>
                          <div style={{ fontFamily: inter, fontSize: 12, lineHeight: 1.6, color: "rgba(67,67,43,0.58)" }}>
                            {row.what}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.36)", marginBottom: 4 }}>
                            How it&apos;s calculated
                          </div>
                          <div style={{ fontFamily: inter, fontSize: 12, lineHeight: 1.6, color: "rgba(67,67,43,0.52)" }}>
                            {row.how}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── MUKO INSIGHT ────────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 16 }}>
                MUKO INSIGHT
              </div>

              {/* Headline */}
              <div style={{ fontFamily: sohne, fontWeight: 500, fontSize: 17, color: OLIVE, lineHeight: 1.3, marginBottom: 16 }}>
                {insightContent.headline}
              </div>

              {/* 3 paragraphs */}
              <p style={{ margin: "0 0 12px", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.64)", lineHeight: 1.7 }}>
                {insightContent.p1}
              </p>
              <p style={{ margin: "0 0 12px", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.60)", lineHeight: 1.7 }}>
                {insightContent.p2}
              </p>
              <p style={{ margin: "0 0 20px", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.7 }}>
                {insightContent.p3}
              </p>

              {/* THE OPPORTUNITY */}
              {insightContent.opportunity.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.camel, marginBottom: 10 }}>
                    THE OPPORTUNITY
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                    {insightContent.opportunity.map((point, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.62)", lineHeight: 1.5 }}>
                        <span style={{ color: BRAND.camel, flexShrink: 0, marginTop: 1 }}>•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SHARPEN YOUR DIRECTION */}
              {sharpenChips.length > 0 && (
                <div>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 6 }}>
                    SHARPEN YOUR DIRECTION
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 12, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>
                    Try adding these signals to strengthen your position:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {sharpenChips.map((chip) => (
                      <SharpenRow
                        key={chip}
                        label={chip}
                        onAdd={() => {
                          if (selectedAesthetic) {
                            const key = `${selectedAesthetic}::${chip}`;
                            toggleElement(key);
                          }
                        }}
                        inter={inter}
                        steelBlue={STEEL}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── AskMuko ─────────────────────────────────────────────────────────── */}
            <AskMuko
              step="concept"
              suggestedQuestions={[
                "Why is Resonance at this level?",
                "How does this compare to other directions?",
                "What brands are doing this well?",
              ]}
              context={{
                aesthetic: selectedAesthetic,
                refineText,
                identityScore: identityPulse?.score,
                resonanceScore: resonancePulse?.score,
              }}
            />

            {/* ── Continue button ──────────────────────────────────────────────────── */}
            <button
              onClick={() => {
                if (!canContinue) return;
                const activeKeys = Array.from(selectedElements).filter((k) => k.startsWith(`${selectedAesthetic}::`));
                const libraryChips = getAestheticChips(selectedAesthetic!);
                const customChipsForDir = customChips[selectedAesthetic!] ?? [];
                const activatedChips = activeKeys.map((k) => {
                  const label = k.replace(`${selectedAesthetic}::`, "");
                  const lib = libraryChips.find((c) => c.label === label);
                  if (lib) return { ...lib, isCustom: false as const };
                  const custom = customChipsForDir.find((c) => c.label === label);
                  if (custom) return { ...custom, isCustom: true as const };
                  return { label, type: "mood" as const, material: null, silhouette: null, complexity_mod: 0, palette: null, isCustom: false as const };
                });
                useSessionStore.setState({
                  aestheticMatchedId: selectedAesthetic,
                  refinementModifiers: interpretation?.modifiers ?? [],
                  moodboardImages,
                  chipSelection: {
                    directionId: selectedAesthetic!.toLowerCase().replace(/\s+/g, "-"),
                    activatedChips,
                  },
                });
                setCurrentStep(3);
                router.push("/spec");
              }}
              disabled={!canContinue}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: sohne,
                letterSpacing: "0.02em",
                color: canContinue ? STEEL : "rgba(67,67,43,0.30)",
                background: canContinue ? "rgba(125,150,172,0.07)" : "rgba(255,255,255,0.46)",
                border: canContinue ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)",
                cursor: canContinue ? "pointer" : "not-allowed",
                transition: "all 280ms ease",
                opacity: canContinue ? 1 : 0.65,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <span>Lock direction &amp; build specs</span>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ opacity: canContinue ? 1 : 0.4 }}>
                <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 860px) {
          .concept-two-col { flex-direction: column !important; }
          .concept-two-col > div { width: 100% !important; height: auto !important; overflow-y: visible !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Preview chip sub-component (no-fill default, clear hover/active) ───── */
function PreviewChip({ label, isActive, onClick, steel, inter }: { label: string; isActive: boolean; onClick: () => void; steel: string; inter: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: isActive ? 650 : 500,
        fontFamily: inter,
        cursor: "pointer",
        transition: "all 130ms ease",
        background: isActive
          ? steel
          : hovered
            ? "rgba(125,150,172,0.10)"
            : "transparent",
        border: isActive
          ? `1.5px solid ${steel}`
          : hovered
            ? `1.5px solid ${steel}`
            : "1.5px solid rgba(125,150,172,0.35)",
        color: isActive ? "#fff" : steel,
        boxShadow: isActive ? `0 2px 8px rgba(125,150,172,0.25)` : "none",
      }}
    >
      {label}
    </button>
  );
}

/* ─── Direction Card sub-component ───────────────────────────────────────── */
function DirectionCard({
  aesthetic,
  content,
  chips,
  isSelected,
  idColor,
  resColor,
  selectedIdScore,
  selectedResScore,
  hasSelection,
  onHover,
  onSelect,
  inter,
  sohne,
  steelBlue,
  chartreuse,
}: {
  aesthetic: string;
  content: { description: string; identityScore: number; resonanceScore: number } | undefined;
  chips: AestheticChip[];
  isSelected: boolean;
  idColor: string;
  resColor: string;
  selectedIdScore: number | null;
  selectedResScore: number | null;
  hasSelection: boolean;
  onHover: () => void;
  onHoverLeave: () => void;
  onSelect: () => void;
  inter: string;
  sohne: string;
  steelBlue: string;
  chartreuse: string;
}) {
  const [hovered, setHovered] = useState(false);

  // Score display: delta when a direction is selected, raw scores otherwise
  const idScore = content?.identityScore ?? 0;
  const resScore = content?.resonanceScore ?? 0;
  const idDelta = hasSelection && !isSelected && selectedIdScore != null ? idScore - selectedIdScore : null;
  const resDelta = hasSelection && !isSelected && selectedResScore != null ? resScore - selectedResScore : null;

  const deltaColor = (d: number) => d > 0 ? "#4D7A56" : d < 0 ? "#8A3A3A" : "rgba(67,67,43,0.35)";
  const deltaLabel = (d: number) => d > 0 ? `+${d}` : `${d}`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        background: isSelected ? `rgba(168,180,117,0.08)` : "rgba(255,255,255,0.75)",
        border: "1px solid rgba(67,67,43,0.09)",
        borderLeft: isSelected
          ? `3px solid ${chartreuse}`
          : hovered
            ? `3px solid ${steelBlue}`
            : "3px solid transparent",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 180ms ease",
        overflow: "hidden",
      }}
      onMouseEnter={() => { setHovered(true); onHover(); }}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Top row: dot + name + scores inline, Select top-right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        {/* Left: dot + name + scores */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSelected ? idColor : "rgba(67,67,43,0.20)", flexShrink: 0, transition: "background 200ms ease" }} />
          <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 13.5, color: isSelected ? BRAND.oliveInk : "rgba(67,67,43,0.78)", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {aesthetic}
          </span>
          {/* Scores inline, right after name */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 4 }}>
            {idDelta !== null ? (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: deltaColor(idDelta), display: "flex", alignItems: "center", gap: 2 }}>
                <IconIdentity size={10} color={deltaColor(idDelta)} />{deltaLabel(idDelta)}
              </span>
            ) : (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: idColor, display: "flex", alignItems: "center", gap: 2 }}>
                <IconIdentity size={10} color={idColor} />{idScore}
              </span>
            )}
            {resDelta !== null ? (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: deltaColor(resDelta), display: "flex", alignItems: "center", gap: 2 }}>
                <IconResonance size={10} color={deltaColor(resDelta)} />{deltaLabel(resDelta)}
              </span>
            ) : (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: resColor, display: "flex", alignItems: "center", gap: 2 }}>
                <IconResonance size={10} color={resColor} />{resScore}
              </span>
            )}
          </div>
        </div>

        {/* Select button — top-right, hover only */}
        {!isSelected && (
          <span
            style={{
              flexShrink: 0,
              padding: "3px 9px",
              borderRadius: 4,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: steelBlue,
              color: "#fff",
              fontFamily: inter,
              opacity: hovered ? 1 : 0,
              transition: "opacity 150ms ease",
              pointerEvents: "none",
            }}
          >
            Select
          </span>
        )}
      </div>

      {/* Description */}
      {content?.description && (
        <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", lineHeight: 1.5, marginBottom: chips.length > 0 ? 8 : 0, paddingLeft: 12 }}>
          {content.description}
        </div>
      )}

      {/* Chips — muted no-fill */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 12 }}>
          {chips.map((chip) => (
            <span
              key={chip.label}
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid rgba(67,67,43,0.14)",
                color: "rgba(67,67,43,0.46)",
                fontFamily: inter,
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SharpenRow sub-component ────────────────────────────────────────────── */
function SharpenRow({ label, onAdd, inter, steelBlue }: { label: string; onAdd: () => void; inter: string; steelBlue: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 6,
        border: `1px dashed ${hovered ? steelBlue : "rgba(67,67,43,0.16)"}`,
        marginBottom: 6,
        transition: "border-color 150ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onAdd}
    >
      <span style={{ fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.65)" }}>{label}</span>
      <span
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: steelBlue,
          opacity: hovered ? 1 : 0.6,
          transition: "opacity 150ms ease",
        }}
      >
        ADD
      </span>
    </div>
  );
}
