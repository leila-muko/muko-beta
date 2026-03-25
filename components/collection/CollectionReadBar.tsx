"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

export const COLLECTION_READ_BAR_OFFSET = 94;

export function CollectionReadBar({
  collectionName,
  season,
  summary,
  stage,
  stickyTop,
  isSticky = false,
}: {
  collectionName?: string | null;
  season?: string | null;
  summary: string;
  stage: 0 | 1 | 2 | 3;
  stickyTop?: number;
  isSticky?: boolean;
}) {
  const summaryWeight = stage >= 3 ? 460 : stage === 2 ? 440 : stage === 1 ? 425 : 390;
  const [isHovering, setIsHovering] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isPinnedClosed, setIsPinnedClosed] = useState(false);
  const hasExpandableContent = Boolean(summary?.trim());
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
        position: isSticky ? "fixed" : "relative",
        top: isSticky ? (stickyTop ?? 0) : undefined,
        left: isSticky ? 0 : undefined,
        right: isSticky ? 0 : undefined,
        zIndex: isSticky ? 90 : undefined,
        background: "transparent",
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
      <div
        style={{
          padding: "0 0 14px",
        }}
      >
        <motion.div
          animate={{
            paddingTop: isExpanded ? 22 : 16,
            paddingBottom: isExpanded ? 18 : 14,
          }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{
            margin: "0 20px",
            paddingInline: 40,
            borderTop: "1px solid rgba(255,255,255,0.52)",
            borderBottom: "1px solid rgba(255,255,255,0.34)",
            background:
              "linear-gradient(180deg, rgba(252,251,247,0.82) 0%, rgba(250,249,246,0.72) 58%, rgba(246,243,236,0.62) 100%)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            boxShadow: "0 18px 48px rgba(67,67,43,0.06), inset 0 1px 0 rgba(255,255,255,0.34)",
            cursor: hasExpandableContent ? "pointer" : "default",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: isExpanded ? 8 : 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontFamily: sohne,
                  fontSize: isExpanded ? 26 : 22,
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.98,
                  color: "rgba(67,67,43,0.92)",
                  textTransform: "lowercase",
                }}
              >
                {collectionName?.trim() || "Collection"}
              </div>
              {season?.trim() ? (
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
                  {season}
                </div>
              ) : null}
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={isExpanded ? "expanded" : "collapsed"}
                initial={{ opacity: 0, y: 4, height: isExpanded ? 24 : 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{
                  overflow: "hidden",
                  maxWidth: 920,
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={summary}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{
                      margin: 0,
                      fontFamily: sohne,
                      fontSize: isExpanded ? 18 : 15,
                      fontWeight: summaryWeight,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      lineHeight: 1.3,
                      color: stage === 0 ? "rgba(67,67,43,0.48)" : "rgba(67,67,43,0.74)",
                      display: "-webkit-box",
                      WebkitLineClamp: isExpanded ? 2 : 1,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                      textWrap: "balance",
                    }}
                  >
                    {summary}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
