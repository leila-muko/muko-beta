"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

const CHARTREUSE = "#A8B475";
const MUTED = "#888078";
const TEXT = "#191919";
const BORDER = "#E2DDD6";
const OLIVE = "#43432B";
const FLOW_BG = "#FAF9F6";

const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const inter = "var(--font-inter), -ui-sans-serif, sans-serif";

export interface MukoNavProps {
  activeTab: "setup" | "pieces" | "report";
  setupComplete?: boolean;
  piecesComplete?: boolean;
  collectionName?: string;
  seasonLabel?: string;
  onBack?: () => void;
  onSaveClose?: () => void;
}

const TABS = [
  { id: "setup" as const, label: "Setup" },
  { id: "pieces" as const, label: "Pieces" },
  { id: "report" as const, label: "Report" },
];

const STEP_INDEX = {
  setup: 0,
  pieces: 1,
  report: 2,
} as const;

export function MukoNav({
  activeTab,
  setupComplete = false,
  piecesComplete = false,
  collectionName,
  seasonLabel,
  onBack,
  onSaveClose,
}: MukoNavProps) {
  const router = useRouter();

  const isComplete = (tabId: string) => {
    if (tabId === "setup") return setupComplete;
    if (tabId === "pieces") return piecesComplete;
    return false;
  };

  const handleBack = () => {
    if (onBack) onBack();
    else if (typeof window !== "undefined") window.history.back();
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 72,
        background: FLOW_BG,
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        borderBottom: `1px solid ${BORDER}`,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        justifyContent: "space-between",
        gap: 20,
      }}
    >
      {/* Left: logo + tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <button
          type="button"
          onClick={() => router.push("/entry")}
          aria-label="Go to entry page"
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 6,
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
          <span>muko</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 16,
              padding: "1px 6px",
              borderRadius: 999,
              background: "rgba(60, 60, 60, 0.08)",
              border: "1px solid rgba(60, 60, 60, 0.14)",
              color: "rgba(67,67,43,0.62)",
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              lineHeight: 1,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            beta
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            const done = isComplete(tab.id) && !active;

            let bg = "transparent";
            let color = MUTED;
            let border = `1px solid ${BORDER}`;
            let shadow = "none";

            if (active) {
              bg = "white";
              color = TEXT;
              border = `1px solid ${BORDER}`;
              shadow = "0 1px 3px rgba(0,0,0,0.08)";
            } else if (done) {
              bg = "rgba(168,180,117,0.08)";
              color = CHARTREUSE;
              border = `1px solid ${CHARTREUSE}`;
            }

            const tabRoute = tab.id === "setup" ? "/concept" : tab.id === "pieces" ? "/pieces" : "/report";
            return (
              <div
                key={tab.id}
                onClick={() => {
                  if (active) return;
                  if (STEP_INDEX[tab.id] > STEP_INDEX[activeTab]) {
                    trackEvent(null, "step_completed", {
                      from_step: activeTab,
                      to_step: tab.id,
                      collection_id: collectionName ?? null,
                    });
                  }
                  router.push(tabRoute);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 13px",
                  borderRadius: 100,
                  background: bg,
                  border,
                  boxShadow: shadow,
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  color,
                  letterSpacing: "0.01em",
                  transition: "background 0.15s, color 0.15s",
                  userSelect: "none",
                  cursor: active ? "default" : "pointer",
                }}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3.5 7L5.5 9.5L10.5 4"
                      stroke={CHARTREUSE}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : active ? (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: TEXT,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: BORDER,
                    }}
                  />
                )}
                {tab.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: season/collection + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {(seasonLabel || collectionName) && (
          <span
            style={{
              fontFamily: sohne,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(67,67,43,0.50)",
              letterSpacing: "0.03em",
            }}
          >
            {seasonLabel}
            {seasonLabel && collectionName && (
              <span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>
            )}
            {collectionName}
          </span>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 13px 7px 10px",
              borderRadius: 999,
              border: `1px solid rgba(67,67,43,0.14)`,
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
            onClick={onSaveClose ?? (() => {})}
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
  );
}
