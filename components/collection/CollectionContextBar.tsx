"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sanitizeContextBarSummary } from "@/lib/collections/contextBarSummary";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";
const mutedBrown = "#6B524F";
export const COLLECTION_CONTEXT_BAR_OFFSET = 96;

export interface CollectionContextBarProps {
  strategySummary?: string | null;
  collectionName?: string | null;
  season?: string | null;
  titleOverride?: string | null;
  direction?: string | null;
  pointOfView?: string | null;
  collectionLanguage?: string[];
  silhouette?: string | null;
  palette?: string | null;
  expressionSignals?: string[];
  moodboardImages?: string[];
  action?: React.ReactNode;
  stickyTop?: number;
  isSticky?: boolean;
  forceLowercase?: boolean;
}

type AttributeItem = {
  icon: React.ReactNode;
  value: string;
};

function matchesPhrase(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a?.trim() && b?.trim() && a.trim().toLowerCase() === b.trim().toLowerCase());
}

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function summarizeList(values: string[], limit = 3) {
  const normalized = normalizeList(values);
  if (normalized.length === 0) return null;
  if (normalized.length <= limit) return normalized.join(", ");
  return `${normalized.slice(0, limit).join(", ")} +${normalized.length - limit}`;
}

function renderValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return summarizeList(value);
  const normalized = value?.trim();
  return normalized || null;
}

function dedupePhrases(values: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result.slice(0, limit);
}

function EditorialMark({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: 11,
        height: 11,
        alignItems: "center",
        justifyContent: "center",
        color: mutedBrown,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function IconFrame() {
  return (
    <EditorialMark>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 1.25H8V2.15H2V1.25ZM2 4.55H8V5.45H2V4.55ZM2 7.85H8V8.75H2V7.85Z" fill="currentColor" />
      </svg>
    </EditorialMark>
  );
}

function IconPalette() {
  return (
    <EditorialMark>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.4 5C1.4 2.96 3.02 1.35 5.1 1.35C7.13 1.35 8.65 2.8 8.65 4.7C8.65 6.13 7.73 6.95 6.65 6.95H5.66C5.1 6.95 4.72 7.27 4.72 7.74C4.72 8.24 4.42 8.65 3.78 8.65C2.42 8.65 1.4 7.18 1.4 5Z" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="3.25" cy="4.35" r="0.45" fill="currentColor" />
        <circle cx="5.1" cy="3.25" r="0.45" fill="currentColor" />
        <circle cx="6.85" cy="4.4" r="0.45" fill="currentColor" />
      </svg>
    </EditorialMark>
  );
}

export function ContextBarSignalIcon() {
  return (
    <EditorialMark>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.25 6.9C2.18 6.9 2.18 3.1 3.1 3.1C4.03 3.1 4.03 6.9 4.95 6.9C5.88 6.9 5.88 3.1 6.8 3.1C7.73 3.1 7.73 6.9 8.65 6.9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    </EditorialMark>
  );
}

function IconLanguage() {
  return (
    <EditorialMark>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.75 2.2H8.25" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M3 5H7" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M4 7.8H6" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    </EditorialMark>
  );
}

export function CollectionContextBar({
  strategySummary,
  collectionName,
  season,
  titleOverride,
  direction,
  pointOfView,
  collectionLanguage = [],
  silhouette,
  palette,
  expressionSignals = [],
  moodboardImages = [],
  action,
  stickyTop,
  isSticky = false,
  forceLowercase: _forceLowercase = false,
}: CollectionContextBarProps) {
  void _forceLowercase;
  const collectionValue = [collectionName, season].filter(Boolean).join(" · ");
  const collectionTitleValue = renderValue(titleOverride) ?? renderValue(collectionName) ?? "Collection";
  const seasonValue = renderValue(season);
  const strategyValue = sanitizeContextBarSummary(renderValue(strategySummary));
  const directionValue = renderValue(direction);
  const collectionMeta = renderValue(collectionValue);
  const pointOfViewValue = renderValue(pointOfView);
  const attributeItems: AttributeItem[] = [];
  if (silhouette) attributeItems.push({ icon: <IconFrame />, value: silhouette });
  if (palette) attributeItems.push({ icon: <IconPalette />, value: palette });
  dedupePhrases(collectionLanguage, 2).forEach((value) => {
    if (matchesPhrase(value, pointOfViewValue)) return;
    attributeItems.push({ icon: <IconLanguage />, value });
  });
  dedupePhrases(expressionSignals, Math.max(expressionSignals.length, 2)).forEach((value) => {
    if (matchesPhrase(value, pointOfViewValue)) return;
    attributeItems.push({ icon: <ContextBarSignalIcon />, value });
  });
  const previewImages = moodboardImages.slice(0, 6);
  const [isHovering, setIsHovering] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isPinnedClosed, setIsPinnedClosed] = useState(false);
  const hasExpandableContent = Boolean(
    pointOfViewValue || collectionMeta || attributeItems.length || strategyValue || previewImages.length || action
  );
  const isExpanded = hasExpandableContent ? isPinnedOpen || (isHovering && !isPinnedClosed) : true;

  function handleToggle() {
    if (!hasExpandableContent) return;
    if (isPinnedOpen) {
      setIsPinnedOpen(false);
      setIsPinnedClosed(true);
      return;
    }
    setIsPinnedOpen(true);
    setIsPinnedClosed(false);
  }

  return (
    <div
      style={{
        position: isSticky ? "sticky" : "relative",
        top: isSticky ? (stickyTop ?? 0) : undefined,
        zIndex: isSticky ? 20 : undefined,
        marginBottom: 16,
      }}
      onMouseEnter={() => {
        if (!hasExpandableContent) return;
        setIsHovering(true);
      }}
      onMouseLeave={() => {
        if (!hasExpandableContent) return;
        setIsHovering(false);
      }}
      onClick={handleToggle}
    >
      <motion.div
        animate={{
          paddingTop: isExpanded ? 26 : 16,
          paddingBottom: isExpanded ? 22 : 14,
        }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        style={{
          position: "relative",
          width: "100%",
          paddingLeft: 28,
          paddingRight: 64,
          background:
            "linear-gradient(180deg, rgba(252,251,247,0.82) 0%, rgba(250,249,246,0.72) 58%, rgba(246,243,236,0.62) 100%)",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          borderTop: "1px solid rgba(255,255,255,0.52)",
          borderBottom: "1px solid rgba(255,255,255,0.36)",
          boxShadow: "0 18px 48px rgba(67,67,43,0.06), inset 0 1px 0 rgba(255,255,255,0.34)",
          cursor: hasExpandableContent ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            minWidth: 0,
            alignItems: "start",
            justifyContent: "flex-start",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: isExpanded ? 14 : 6, flex: "0 1 760px" }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  minWidth: 0,
                  flexWrap: "wrap",
                  marginBottom: directionValue || pointOfViewValue ? 8 : 0,
                }}
              >
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: isExpanded ? 26 : 22,
                    fontWeight: 500,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.98,
                    color: "rgba(67,67,43,0.9)",
                    textTransform: "lowercase",
                  }}
                >
                  {collectionTitleValue}
                </div>
                {seasonValue && !titleOverride ? (
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(67,67,43,0.42)",
                    }}
                  >
                    {seasonValue}
                  </div>
                ) : null}
              </div>

              <AnimatePresence initial={false} mode="wait">
                {directionValue || (isExpanded && pointOfViewValue) ? (
                  <motion.div
                    key={`${directionValue ?? ""}-${isExpanded ? pointOfViewValue ?? "" : ""}`}
                    initial={{ opacity: 0, y: 4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                      fontFamily: inter,
                      fontSize: isExpanded ? 11.5 : 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      lineHeight: 1.35,
                      color: "rgba(67,67,43,0.42)",
                      maxWidth: 760,
                      overflow: "hidden",
                    }}
                  >
                    {directionValue ? <span>{directionValue}</span> : null}
                    {directionValue && isExpanded && pointOfViewValue ? (
                      <span
                        aria-hidden="true"
                        style={{
                          color: "rgba(67,67,43,0.34)",
                          fontSize: isExpanded ? 14 : 12,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        ·
                      </span>
                    ) : null}
                    {isExpanded && pointOfViewValue ? <span>{pointOfViewValue}</span> : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && attributeItems.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px 14px",
                    maxWidth: 760,
                    overflow: "hidden",
                  }}
                >
                  {attributeItems.map((item, index) => (
                    <React.Fragment key={`${item.value}-${index}`}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          minWidth: 0,
                          fontFamily: inter,
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.4,
                          color: mutedBrown,
                          textTransform: "lowercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.icon}
                        <span>{item.value}</span>
                      </span>
                      {index < attributeItems.length - 1 ? (
                        <span
                          style={{
                            fontFamily: inter,
                            fontSize: 11,
                            color: "rgba(67,67,43,0.22)",
                            marginRight: 1,
                          }}
                          aria-hidden="true"
                        >
                          ·
                        </span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isExpanded && strategyValue ? (
                <motion.div
                  initial={{ opacity: 0, y: 4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{
                    maxWidth: 720,
                    fontFamily: inter,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "rgba(67,67,43,0.5)",
                    overflow: "hidden",
                  }}
                >
                  {strategyValue}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isExpanded && action ? (
                <motion.div
                  initial={{ opacity: 0, y: 4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    paddingTop: 2,
                    overflow: "hidden",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {action}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && previewImages.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 4, width: 0 }}
                animate={{ opacity: 1, y: 0, width: "auto" }}
                exit={{ opacity: 0, y: -4, width: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{
                  flex: "1 1 420px",
                  minWidth: 320,
                  display: "grid",
                  gridTemplateColumns: `repeat(${previewImages.length}, minmax(0, 1fr))`,
                  gap: 14,
                  alignSelf: "start",
                  paddingTop: 6,
                  paddingRight: 64,
                  overflow: "hidden",
                }}
                aria-hidden="true"
              >
                {previewImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    style={{
                      aspectRatio: "0.78 / 1",
                      borderRadius:
                        index === 0
                          ? "20px 8px 8px 8px"
                          : index === previewImages.length - 1
                            ? "8px 20px 8px 8px"
                            : 8,
                      overflow: "hidden",
                      backgroundColor: "rgba(67,67,43,0.06)",
                      backgroundImage: `linear-gradient(180deg, rgba(250,249,246,0.02) 0%, rgba(67,67,43,0.12) 100%), url(${image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      boxShadow: "0 12px 28px rgba(67,67,43,0.07)",
                    }}
                  />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
