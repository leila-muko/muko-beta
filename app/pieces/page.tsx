"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { KeyPiece } from "@/lib/store/sessionStore";
import { getFlatForPiece } from "@/components/flats";
import { MukoNav } from "@/components/MukoNav";
import { createClient } from "@/lib/supabase/client";
import aestheticsData from "@/data/aesthetics.json";
import categoriesData from "@/data/categories.json";

// ── Design tokens ──────────────────────────────────────────────
const BG = "#F9F7F4";
const BG2 = "#F2EFE9";
const TEXT = "#191919";
const MUTED = "#888078";
const BORDER = "#E2DDD6";
const CHARTREUSE = "#A8B475";
const CAMEL = "#B8876B";
const GREEN = "#7A9E7E";
const AMBER = "#C4955A";
const RED = "#B85C5C";

const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const inter = "var(--font-inter), -ui-sans-serif, sans-serif";

// ── Types ──────────────────────────────────────────────────────
interface CollectionPiece {
  id: string;
  piece_name: string;
  score: number | null;
  dimensions: Record<string, number> | null;
  collection_role: string | null;
  category: string | null;
  silhouette: string | null;
  aesthetic_matched_id: string | null;
  aesthetic_inflection: string | null;
  construction_tier: string | null;
}

interface AestheticDataEntry {
  id?: string;
  name: string;
  keywords?: string[];
  key_pieces?: Record<string, KeyPiece[]>;
}

type CategoriesData = { categories: Array<{ id: string; name: string }> };

const ROLE_LABELS: Record<string, string> = {
  hero: "Hero",
  directional: "Directional",
  "core-evolution": "Core Evolution",
  "volume-driver": "Volume Driver",
};

const ROLE_IDS = ["hero", "directional", "core-evolution", "volume-driver"] as const;

// ── Placeholder SVG ────────────────────────────────────────────
function PiecePlaceholder({ category }: { category: string | null }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 80" fill="none">
      <rect x="4" y="4" width="52" height="72" rx="6" fill="#E8E3D6" />
      <path d="M14 22 Q30 14 46 22 L48 72 H12 Z" fill="#C8C2BA" opacity="0.7" />
      {category && (
        <text
          x="30"
          y="52"
          textAnchor="middle"
          fontSize="6"
          fill={MUTED}
          fontFamily="system-ui, sans-serif"
        >
          {category}
        </text>
      )}
    </svg>
  );
}

// ── Flat illustration wrapper ──────────────────────────────────
function PieceFlat({
  type,
  signal,
  category,
  size = 65,
}: {
  type: string | null;
  signal: string | null;
  category: string | null;
  size?: number;
}) {
  if (type) {
    const result = getFlatForPiece(type, signal);
    if (result) {
      const { Flat, color } = result as { Flat: React.ComponentType<{ color: string }>; color: string };
      return (
        <div style={{ width: size * 0.77, height: size }}>
          <Flat color={color} />
        </div>
      );
    }
  }
  return <PiecePlaceholder category={category} />;
}

// ── Confirmed piece card ───────────────────────────────────────
function ConfirmedPieceCard({
  piece,
  onClick,
}: {
  piece: CollectionPiece;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const score = piece.score;
  const scoreDotBg =
    score === null ? BG2 : score >= 70 ? "#EDF5EE" : score >= 50 ? "#FBF3EA" : "#FAECE7";
  const scoreDotColor =
    score === null ? MUTED : score >= 70 ? GREEN : score >= 50 ? AMBER : RED;

  const roleLabel = piece.collection_role ? ROLE_LABELS[piece.collection_role] ?? null : null;
  const rolePillBg = piece.collection_role ? "#EDF5EE" : BG2;
  const rolePillColor = piece.collection_role ? GREEN : MUTED;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "white",
        border: hovered ? "1px solid #C4BDB5" : `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
        overflow: "hidden",
      }}
    >
      {/* Illustration area */}
      <div
        style={{
          height: 120,
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PieceFlat type={null} signal={null} category={piece.category} size={65} />
        {/* Score dot */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: scoreDotBg,
            color: scoreDotColor,
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: inter,
          }}
        >
          {score !== null ? score : "—"}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "16px 18px 18px" }}>
        {/* Piece name */}
        <div
          style={{
            fontFamily: sohne,
            fontWeight: 700,
            fontSize: 13,
            color: TEXT,
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          {piece.piece_name}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: inter, fontSize: 10, color: MUTED }}>Fit</span>
            <span
              style={{
                background: "#EDF5EE",
                color: GREEN,
                borderRadius: 100,
                padding: "3px 10px",
                fontWeight: 500,
                fontFamily: inter,
                fontSize: 10,
              }}
            >
              Core to direction
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: inter, fontSize: 10, color: MUTED }}>Market</span>
            <span
              style={{
                background: BG2,
                color: MUTED,
                borderRadius: 100,
                padding: "3px 10px",
                fontWeight: 500,
                fontFamily: inter,
                fontSize: 10,
              }}
            >
              —
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: inter, fontSize: 10, color: MUTED }}>Role</span>
            <span
              style={{
                background: rolePillBg,
                color: rolePillColor,
                borderRadius: 100,
                padding: "3px 10px",
                fontWeight: 500,
                fontFamily: inter,
                fontSize: 10,
              }}
            >
              {roleLabel ?? "Pending"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Suggested piece card ───────────────────────────────────────
function SuggestedPieceCard({
  piece,
  onBuild,
}: {
  piece: KeyPiece;
  onBuild: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isTrending = piece.signal === "ascending" || piece.signal === "high-volume";

  const marketLabel =
    piece.signal === "high-volume"
      ? "High volume"
      : piece.signal === "ascending" || piece.signal === "emerging"
      ? "Emerging"
      : null;
  const marketPillColor = marketLabel === "High volume" ? GREEN : AMBER;
  const marketPillBg = marketLabel === "High volume" ? "#EDF5EE" : "#FBF3EA";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "white",
        border: hovered ? "1px solid #C4BDB5" : `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
      }}
    >
      {/* Illustration area */}
      <div
        style={{
          height: 120,
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ opacity: 0.45 }}>
          <PieceFlat type={piece.type} signal={piece.signal} category={piece.category} size={65} />
        </div>

        {/* Trending / Emerging badge */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: isTrending ? "#FBF3EA" : BG2,
            color: isTrending ? CAMEL : MUTED,
            border: isTrending ? "1px solid #E8C9A8" : `1px solid ${BORDER}`,
            borderRadius: 100,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            padding: "3px 9px",
            fontFamily: inter,
            whiteSpace: "nowrap" as const,
          }}
        >
          {isTrending ? "Trending" : "Emerging"}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "16px 18px 18px" }}>
        {/* Piece name */}
        <div
          style={{
            fontFamily: sohne,
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          {piece.item}
        </div>

        {/* Tags: Fit + Market only */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: inter, fontSize: 10, color: MUTED }}>Fit</span>
            <span
              style={{
                background: "#EDF5EE",
                color: GREEN,
                borderRadius: 100,
                padding: "3px 10px",
                fontWeight: 500,
                fontFamily: inter,
                fontSize: 10,
              }}
            >
              Core to direction
            </span>
          </div>
          {marketLabel && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: inter, fontSize: 10, color: MUTED }}>Market</span>
              <span
                style={{
                  background: marketPillBg,
                  color: marketPillColor,
                  borderRadius: 100,
                  padding: "3px 10px",
                  fontWeight: 500,
                  fontFamily: inter,
                  fontSize: 10,
                }}
              >
                {marketLabel}
              </span>
            </div>
          )}
        </div>

        {/* Build this piece CTA */}
        <div
          onClick={onBuild}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 13,
            borderTop: `1px solid ${BG2}`,
            fontFamily: inter,
            fontSize: 12,
            fontWeight: 500,
            color: CHARTREUSE,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span>Build this piece</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Drawer ─────────────────────────────────────────────
function ConfirmDrawer({
  piece,
  pieceName,
  category,
  categories,
  directionName,
  onPieceNameChange,
  onCategoryChange,
  onStartBuilding,
  onCancel,
}: {
  piece: KeyPiece;
  pieceName: string;
  category: string;
  categories: Array<{ id: string; name: string }>;
  directionName: string;
  onPieceNameChange: (name: string) => void;
  onCategoryChange: (cat: string) => void;
  onStartBuilding: () => void;
  onCancel: () => void;
}) {
  const isTrending = piece.signal === "ascending" || piece.signal === "high-volume";
  const fitValue = piece.custom ? "From interpretation" : "Core to direction";
  const fitColor = fitValue === "Core to direction" ? GREEN : AMBER;
  const marketValue =
    piece.signal === "high-volume"
      ? "High volume"
      : piece.signal === "emerging" || piece.signal === "ascending"
      ? "Emerging"
      : null;
  const marketColor = marketValue === "High volume" ? GREEN : AMBER;

  const flatResult = piece.type
    ? (getFlatForPiece(piece.type, piece.signal) as {
        Flat: React.ComponentType<{ color: string }>;
        color: string;
      } | null)
    : null;

  return (
    <>
      <style>{`
        @keyframes mukoSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(25,25,25,0.45)",
          zIndex: 300,
        }}
        onClick={onCancel}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 400,
          background: "white",
          borderTop: `1px solid ${BORDER}`,
          padding: "28px 36px 36px",
          display: "flex",
          alignItems: "flex-start",
          gap: 28,
          animation: "mukoSlideUp 200ms ease-out",
        }}
      >
        {/* Left: piece preview */}
        <div style={{ width: 88, flexShrink: 0 }}>
          <div
            style={{
              width: 88,
              height: 110,
              background: BG2,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {flatResult ? (
              <div style={{ width: 56, height: 72 }}>
                <flatResult.Flat color={flatResult.color} />
              </div>
            ) : (
              <PiecePlaceholder category={piece.category} />
            )}
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {isTrending ? "TRENDING" : "MUKO PICK"}
          </div>
        </div>

        {/* Middle: confirm fields */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: MUTED,
              marginBottom: 6,
            }}
          >
            CLAIM THIS PIECE
          </div>
          <div
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 22,
              color: TEXT,
              marginBottom: 20,
              lineHeight: 1.2,
            }}
          >
            {piece.item}
          </div>

          {/* 2-col field grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {/* Name field */}
            <div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 6,
                }}
              >
                WHAT DO YOU CALL THIS PIECE?
              </div>
              <input
                value={pieceName}
                onChange={(e) => onPieceNameChange(e.target.value)}
                placeholder={piece.item}
                style={{
                  width: "100%",
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT,
                  fontFamily: inter,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = CHARTREUSE)}
                onBlur={(e) => (e.target.style.borderColor = BORDER)}
              />
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  color: MUTED,
                  marginTop: 4,
                }}
              >
                Name it in your own language
              </div>
            </div>

            {/* Category field */}
            <div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 6,
                }}
              >
                CATEGORY
              </div>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                style={{
                  width: "100%",
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: category ? TEXT : MUTED,
                  fontFamily: inter,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = CHARTREUSE)}
                onBlur={(e) => (e.target.style.borderColor = BORDER)}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context strip */}
          <div
            style={{
              background: BG2,
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap" as const,
            }}
          >
            <span>
              <span style={{ fontFamily: inter, fontSize: 11, color: MUTED }}>Fit: </span>
              <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 500, color: fitColor }}>
                {fitValue}
              </span>
            </span>
            {marketValue && (
              <span>
                <span style={{ fontFamily: inter, fontSize: 11, color: MUTED }}>Market: </span>
                <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 500, color: marketColor }}>
                  {marketValue}
                </span>
              </span>
            )}
            <span>
              <span style={{ fontFamily: inter, fontSize: 11, color: MUTED }}>Direction: </span>
              <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 500, color: TEXT }}>
                {directionName}
              </span>
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 36,
          }}
        >
          <button
            onClick={onStartBuilding}
            style={{
              background: CHARTREUSE,
              color: "#3A4020",
              borderRadius: 100,
              padding: "11px 22px",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: inter,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap" as const,
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#95A164")}
            onMouseLeave={(e) => (e.currentTarget.style.background = CHARTREUSE)}
          >
            Start Building →
          </button>
          <button
            onClick={onCancel}
            style={{
              fontFamily: inter,
              fontSize: 11,
              color: MUTED,
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "center",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PiecesPage() {
  const router = useRouter();
  const {
    collectionName,
    season,
    collectionAesthetic,
    aestheticInflection,
    directionInterpretationChips,
    conceptLocked,
    setSelectedKeyPiece,
    setCategory,
  } = useSessionStore();

  // Confirmed pieces from Supabase
  const [confirmedPieces, setConfirmedPieces] = useState<CollectionPiece[]>([]);

  useEffect(() => {
    if (!collectionName) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("analyses")
        .select(
          "id, piece_name, score, dimensions, collection_role, category, silhouette, aesthetic_matched_id, aesthetic_inflection, construction_tier"
        )
        .eq("collection_name", collectionName)
        .eq("user_id", user.id)
        .then(({ data, error }) => {
          if (error) console.warn("[Pieces] fetch error:", error);
          if (data) setConfirmedPieces(data.filter((p) => p.piece_name));
        });
    });
  }, [collectionName]);

  // Key pieces from aesthetics data
  const keyPieces = useMemo((): KeyPiece[] => {
    if (!collectionAesthetic) return [];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) =>
        a.name === collectionAesthetic ||
        a.id === collectionAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    if (!entry?.key_pieces) return [];
    const seasonKey =
      season.includes("FW") || season.includes("Fall") || season.includes("fall")
        ? "fw26"
        : "ss27";
    return (
      entry.key_pieces[seasonKey] ??
      entry.key_pieces["fw26"] ??
      Object.values(entry.key_pieces)[0] ??
      []
    );
  }, [collectionAesthetic, season]);

  // Suggested = key pieces not yet confirmed
  const suggestedPieces = useMemo((): KeyPiece[] => {
    const confirmedNames = new Set(
      confirmedPieces.map((p) => (p.piece_name ?? "").toLowerCase())
    );
    return keyPieces.filter((p) => !confirmedNames.has(p.item.toLowerCase()));
  }, [keyPieces, confirmedPieces]);

  // Role counts from confirmed pieces
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      hero: 0,
      directional: 0,
      "core-evolution": 0,
      "volume-driver": 0,
    };
    confirmedPieces.forEach((p) => {
      if (p.collection_role && counts[p.collection_role] !== undefined) {
        counts[p.collection_role]++;
      }
    });
    return counts;
  }, [confirmedPieces]);

  const totalConfirmed = confirmedPieces.length;
  const specCount = useMemo(
    () => confirmedPieces.filter((p) => p.score !== null).length,
    [confirmedPieces]
  );

  // Muko's Read message (deterministic, no LLM)
  const mukosReadData = useMemo(() => {
    if (totalConfirmed === 0)
      return {
        headline: "Your collection structure starts here.",
        body: "Pick pieces and assign roles to reveal how the collection is balanced. Muko will flag tension and gaps as you build.",
      };
    if (roleCounts["core-evolution"] === 0)
      return {
        headline: "Core Evolution is empty — add a proven category piece.",
        body: "A proven category piece grounds the commercial balance and gives the assortment stability beneath the directional work.",
      };
    if (roleCounts["hero"] > 1)
      return {
        headline: "Multiple Hero pieces create assortment tension.",
        body: "Consider reassigning one to Directional — a collection with two Heroes dilutes both.",
      };
    return {
      headline: "Collection structure is balanced.",
      body: "Review piece scores before generating the report.",
    };
  }, [totalConfirmed, roleCounts]);

  // Drawer state
  const [drawerPiece, setDrawerPiece] = useState<KeyPiece | null>(null);
  const [drawerPieceName, setDrawerPieceName] = useState("");
  const [drawerCategory, setDrawerCategory] = useState("");

  const openDrawer = useCallback((piece: KeyPiece) => {
    setDrawerPiece(piece);
    setDrawerPieceName(piece.item);
    setDrawerCategory(piece.category ?? "");
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerPiece(null);
    setDrawerPieceName("");
    setDrawerCategory("");
  }, []);

  const handleStartBuilding = useCallback(() => {
    if (!drawerPiece) return;
    const finalPiece: KeyPiece = { ...drawerPiece, item: drawerPieceName || drawerPiece.item };
    setSelectedKeyPiece(finalPiece);
    if (drawerCategory) setCategory(drawerCategory);
    router.push("/spec");
  }, [drawerPiece, drawerPieceName, drawerCategory, setSelectedKeyPiece, setCategory, router]);

  const directionName = collectionAesthetic ?? "—";
  const categories = (categoriesData as CategoriesData).categories;
  const allSpecd = totalConfirmed > 0 && specCount === totalConfirmed;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: inter }}>
      <MukoNav
        activeTab="pieces"
        setupComplete={conceptLocked}
        collectionName={collectionName || undefined}
        seasonLabel={season || undefined}
        onBack={() => router.push("/concept")}
      />

      {/* ── Collection context strip ─────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
        }}
      >
        {/* Left: eyebrow + direction name + inflection + chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              color: MUTED,
            }}
          >
            Collection Direction
          </div>
          <div
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 26,
              color: TEXT,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {directionName}
          </div>
          {aestheticInflection && (
            <div
              style={{
                fontFamily: inter,
                fontSize: 13,
                color: MUTED,
                fontStyle: "italic",
              }}
            >
              {aestheticInflection}
            </div>
          )}
          {directionInterpretationChips.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap" as const,
                marginTop: 2,
              }}
            >
              {directionInterpretationChips.slice(0, 5).map((chip, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "4px 12px",
                    borderRadius: 100,
                    background: "#EFF2E5",
                    border: "1px solid #C8D49A",
                    color: "#6B7A40",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: locked badge + separator + edit link */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {conceptLocked && (
            <span
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                padding: "5px 12px",
                borderRadius: 100,
                background: "#EFF2E5",
                color: "#6B7A40",
                border: "1px solid #C8D49A",
                whiteSpace: "nowrap" as const,
              }}
            >
              ✓ Collection Locked
            </span>
          )}
          <div style={{ width: 1, height: 14, background: BORDER, display: "inline-block" }} />
          <button
            onClick={() => router.push("/concept")}
            style={{
              fontFamily: inter,
              fontSize: 11,
              color: MUTED,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            Edit Setup
          </button>
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────── */}
      <div
        style={{
          paddingTop: 72 + 165,
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Left panel */}
        <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
          {/* "Your Collection" section header */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: MUTED,
                marginBottom: 6,
              }}
            >
              Your Collection
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontFamily: sohne,
                  fontWeight: 700,
                  fontSize: 32,
                  color: TEXT,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                Build piece by piece.
              </div>
              <button
                onClick={() =>
                  openDrawer({
                    item: "",
                    signal: null,
                    category: null,
                    type: null,
                    recommended_material_id: null,
                    redirect_material_id: null,
                    custom: true,
                  })
                }
                style={{
                  fontFamily: inter,
                  fontSize: 12,
                  color: CHARTREUSE,
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  marginLeft: 16,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                + Add your own
              </button>
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 13,
                color: MUTED,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Pick a starting point from Muko&apos;s suggestions, or add your own piece to spec.
            </div>
          </div>

          {/* Confirmed pieces grid or empty state */}
          {totalConfirmed === 0 ? (
            <div
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "52px 40px",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase" as const,
                  color: BORDER,
                  marginBottom: 12,
                }}
              >
                No pieces yet
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 14,
                  color: MUTED,
                  lineHeight: 1.7,
                  maxWidth: 340,
                  margin: "0 auto",
                }}
              >
                Your collection is waiting. Pick a starting point below or add your own piece to begin.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {confirmedPieces.map((piece) => (
                <ConfirmedPieceCard
                  key={piece.id}
                  piece={piece}
                  onClick={() => router.push("/spec")}
                />
              ))}
            </div>
          )}

          {/* Section divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "4px 0 22px",
            }}
          >
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: MUTED,
                padding: "0 16px",
                whiteSpace: "nowrap" as const,
              }}
            >
              Muko&apos;s Starting Points
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: inter,
              fontSize: 13,
              color: MUTED,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Trending pieces for{" "}
            <span style={{ fontStyle: "italic", color: TEXT, fontWeight: 500 }}>{directionName}</span>{" "}
            based on your brand interpretation. Pick one to build, or add your own above.
          </div>

          {/* Suggested pieces grid */}
          {suggestedPieces.length === 0 ? (
            <div
              style={{
                fontFamily: inter,
                fontSize: 12,
                color: MUTED,
                lineHeight: 1.6,
              }}
            >
              {collectionAesthetic
                ? "All suggested pieces have been added to your collection."
                : "Set a collection direction to see suggested pieces."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {suggestedPieces.map((piece) => (
                <SuggestedPieceCard
                  key={piece.item}
                  piece={piece}
                  onBuild={() => openDrawer(piece)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────── */}
        <div
          style={{
            width: 320,
            padding: "28px 28px",
            background: BG,
            borderLeft: `1px solid ${BORDER}`,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              color: MUTED,
              marginBottom: 20,
            }}
          >
            PULSE
          </div>

          {/* Role balance bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {ROLE_IDS.map((roleId) => {
              const count = roleCounts[roleId] ?? 0;
              const pct = totalConfirmed > 0 ? (count / totalConfirmed) * 100 : 0;
              return (
                <div
                  key={roleId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 11,
                      color: TEXT,
                      width: 100,
                      flexShrink: 0,
                    }}
                  >
                    {ROLE_LABELS[roleId]}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: BG2,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: CHARTREUSE,
                        borderRadius: 2,
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 11,
                      color: MUTED,
                      width: 16,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, margin: "0 0 24px" }} />

          {/* Muko's Read */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: MUTED,
                marginBottom: 12,
              }}
            >
              MUKO&apos;S READ
            </div>
            <div
              style={{
                fontFamily: sohne,
                fontWeight: 700,
                fontSize: 20,
                color: TEXT,
                lineHeight: 1.3,
                marginBottom: 12,
                letterSpacing: "-0.01em",
              }}
            >
              {mukosReadData.headline}
            </div>
            <div style={{ fontFamily: inter, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
              {mukosReadData.body}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, margin: "0 0 24px" }} />

          {/* Report Readiness card */}
          <div
            style={{
              background: BG2,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase" as const,
                  color: MUTED,
                }}
              >
                REPORT READINESS
              </span>
              <span style={{ fontFamily: inter, fontSize: 11, color: MUTED }}>
                {specCount} of {totalConfirmed} spec&apos;d
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: BORDER,
                borderRadius: 2,
                margin: "10px 0 16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: totalConfirmed > 0 ? `${(specCount / totalConfirmed) * 100}%` : "0%",
                  height: "100%",
                  background: CHARTREUSE,
                  borderRadius: 2,
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <button
              onClick={() => allSpecd && router.push("/report")}
              disabled={!allSpecd}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                padding: "11px 0",
                borderRadius: 100,
                border: "none",
                background: allSpecd ? CHARTREUSE : BORDER,
                color: allSpecd ? "#3A4020" : MUTED,
                fontFamily: inter,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.02em",
                cursor: allSpecd ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (allSpecd) e.currentTarget.style.background = "#95A164";
              }}
              onMouseLeave={(e) => {
                if (allSpecd) e.currentTarget.style.background = CHARTREUSE;
              }}
            >
              View Collection Report →
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirm Drawer ─────────────────────────────────── */}
      {drawerPiece && (
        <ConfirmDrawer
          piece={drawerPiece}
          pieceName={drawerPieceName}
          category={drawerCategory}
          categories={categories}
          directionName={directionName}
          onPieceNameChange={setDrawerPieceName}
          onCategoryChange={setDrawerCategory}
          onStartBuilding={handleStartBuilding}
          onCancel={closeDrawer}
        />
      )}
    </div>
  );
}
