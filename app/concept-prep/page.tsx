"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MukoNav } from "@/components/MukoNav";
import { CollectionContextBar, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";
import { useSessionStore } from "@/lib/store/sessionStore";
import { preloadCriticScores } from "@/lib/concept-studio/preloadCriticScores";

const TEXT = "#191919";
const SOFT_TEXT = "#2E2C25";
const MUTED = "#888078";
const CHARTREUSE = "#A8B475";
const STEEL = "#7D96AC";

const inter = "var(--font-inter), -ui-sans-serif, sans-serif";
const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const MIN_LOADING_MS = 1100;

const STATUS_LINES = [
  "Reading brand context",
  "Ranking directional whitespace",
  "Ordering concept recommendations",
] as const;

const STATUS_NOTES = [
  "Pulling the brand signal into frame.",
  "Balancing whitespace against momentum.",
  "Setting the opening order for Concept Studio.",
] as const;

export default function ConceptPrepPage() {
  const router = useRouter();
  const collectionName = useSessionStore((state) => state.collectionName);
  const season = useSessionStore((state) => state.season);
  const setCurrentStep = useSessionStore((state) => state.setCurrentStep);
  const setPreloadedCriticScores = useSessionStore((state) => state.setPreloadedCriticScores);
  const [activeLine, setActiveLine] = useState(0);

  const resolvedCollectionName = useMemo(() => collectionName || "Collection", [collectionName]);
  const progress = ((activeLine + 1) / STATUS_LINES.length) * 100;

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    const progressTimer = window.setInterval(() => {
      setActiveLine((current) => Math.min(current + 1, STATUS_LINES.length - 1));
    }, 340);

    const run = async () => {
      try {
        const scores = await preloadCriticScores();
        if (!cancelled && Object.keys(scores).length > 0) {
          setPreloadedCriticScores(scores);
        }
      } catch {
        // Fall through to concept even if preloading fails.
      } finally {
        const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - start));
        window.setTimeout(() => {
          if (!cancelled) {
            router.replace("/concept");
          }
        }, remaining);
      }
    };

    run();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
    };
  }, [router, setPreloadedCriticScores]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 84% 18%, rgba(205,170,179,0.22), transparent 0 30%), radial-gradient(circle at 18% 14%, rgba(168,180,117,0.12), transparent 0 28%), linear-gradient(180deg, #FCFAF6 0%, #F4EEE5 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes prepFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -8px, 0) scale(1.015); }
        }

        @keyframes prepPulse {
          0%, 100% { opacity: 0.42; transform: scale(0.94); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }

        @keyframes prepSweep {
          0% { transform: translateX(-38%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(138%); opacity: 0; }
        }

        @keyframes prepDrift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(8px, -6px, 0) rotate(6deg); }
        }

        @keyframes prepOrbit {
          0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
          50% { opacity: 0.5; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
        }

        @keyframes prepDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 0 0 rgba(168,180,117,0.24); }
          60% { transform: scale(1.14); opacity: 1; box-shadow: 0 0 0 8px rgba(168,180,117,0); }
        }

        .prep-card {
          border-radius: 34px;
        }

        .prep-orb-wrap {
          position: relative;
          width: 230px;
          height: 230px;
          display: grid;
          place-items: center;
          animation: prepFloat 7.2s ease-in-out infinite;
        }

        .prep-orb {
          position: relative;
          width: 172px;
          height: 172px;
          border-radius: 999px;
          animation: prepDrift 8s ease-in-out infinite;
        }

        .prep-orb::before {
          content: "";
          position: absolute;
          inset: 16%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.18) 72%, transparent 100%);
          filter: blur(8px);
        }

        .prep-orb::after {
          content: "";
          position: absolute;
          inset: -14%;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.42);
          animation: prepPulse 3.2s ease-in-out infinite;
        }

        .prep-orbit,
        .prep-orbit-two {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(67,67,43,0.1);
          opacity: 0.55;
          animation: prepOrbit 18s linear infinite;
        }

        .prep-orbit {
          width: 214px;
          height: 214px;
        }

        .prep-orbit-two {
          width: 246px;
          height: 170px;
          animation-duration: 24s;
          animation-direction: reverse;
        }

        .prep-orbit::before,
        .prep-orbit-two::before {
          content: "";
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(184,135,107,0.28);
          top: -4px;
          left: calc(50% - 4px);
          box-shadow: 0 0 18px rgba(184,135,107,0.26);
        }

        .prep-contour {
          position: absolute;
          inset: 26px;
          border-radius: 999px;
          border: 1px dashed rgba(125,150,172,0.14);
          transform: rotate(-14deg);
        }

        .prep-progress-fill {
          position: relative;
          overflow: hidden;
        }

        .prep-progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: prepSweep 1.9s linear infinite;
        }

        .prep-in-progress-dot {
          animation: prepDotPulse 1.9s ease-out infinite;
        }

        @media (max-width: 860px) {
          .prep-card {
            border-radius: 28px;
          }

          .prep-hero {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .prep-visual {
            order: -1;
            justify-content: flex-start;
          }

          .prep-orb-wrap {
            width: 154px;
            height: 154px;
          }

          .prep-orb {
            width: 112px;
            height: 112px;
          }

          .prep-orbit {
            width: 138px;
            height: 138px;
          }

          .prep-orbit-two {
            width: 156px;
            height: 110px;
          }

          .prep-contour {
            inset: 18px;
          }
        }

        @media (max-width: 640px) {
          .prep-orb-wrap {
            width: 118px;
            height: 118px;
          }

          .prep-steps-row {
            grid-template-columns: 20px minmax(0, 1fr);
            gap: 12px;
          }

          .prep-step-head {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 4px !important;
          }

          .prep-step-status {
            justify-self: start !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(67,67,43,0.024) 1px, transparent 1px), linear-gradient(90deg, rgba(67,67,43,0.024) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.18), transparent 82%)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "8%",
          right: "-12vw",
          width: "42vw",
          height: "42vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(205,170,179,0.22), transparent 64%)",
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />

      <MukoNav
        activeTab="setup"
        setupComplete={false}
        piecesComplete={false}
        collectionName={collectionName || undefined}
        seasonLabel={season || undefined}
        onSaveClose={() => {}}
      />

      <div
        style={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <CollectionContextBar
          collectionName={collectionName || undefined}
          season={season || undefined}
        />
      </div>

      <main
        style={{
          minHeight: "calc(100vh - 72px)",
          padding: `${72 + COLLECTION_CONTEXT_BAR_OFFSET + 44}px 24px 48px`,
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <section
          className="prep-card"
          style={{
            width: "min(760px, 100%)",
            padding: "34px 30px 24px",
            border: "1px solid rgba(67,67,43,0.08)",
            background: "linear-gradient(180deg, rgba(255,252,248,0.84) 0%, rgba(251,244,239,0.72) 100%)",
            backdropFilter: "blur(24px) saturate(120%)",
            boxShadow: "0 30px 100px rgba(67,67,43,0.08), inset 0 1px 0 rgba(255,255,255,0.68)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 26,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.56)",
              }}
            >
              Editorial AI Ordering
            </div>
            <div
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.46)",
                border: "1px solid rgba(67,67,43,0.08)",
                fontFamily: inter,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.58)",
              }}
            >
              {season || "Season pending"}
            </div>
          </div>

          <div
            className="prep-hero"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 240px",
              gap: 30,
              alignItems: "center",
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 16px",
                  fontFamily: sohne,
                  fontSize: "clamp(30px, 4vw, 44px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.04em",
                  color: SOFT_TEXT,
                  maxWidth: 470,
                  fontWeight: 500,
                }}
              >
                Shaping the first read before Concept Studio opens.
              </h1>
              <p
                style={{
                  margin: "0 0 24px",
                  fontFamily: inter,
                  fontSize: 15,
                  lineHeight: 1.76,
                  color: MUTED,
                  maxWidth: 530,
                }}
              >
                Muko is ordering the strongest directions for{" "}
                <span style={{ color: SOFT_TEXT, fontStyle: "italic" }}>{resolvedCollectionName}</span>{" "}
                balancing authorship, whitespace, and commercial pressure.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(67,67,43,0.46)",
                  }}
                >
                  Progress
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 13,
                    color: "rgba(46,44,37,0.68)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {Math.round(progress)}%
                </div>
              </div>

              <div
                style={{
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(67,67,43,0.1)",
                }}
              >
                <div
                  className="prep-progress-fill"
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${CHARTREUSE} 0%, rgba(205,170,179,0.92) 58%, rgba(207,188,163,0.95) 100%)`,
                    boxShadow: "0 0 20px rgba(184,135,107,0.18)",
                    transition: "width 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
            </div>

            <div
              className="prep-visual"
              style={{
                display: "grid",
                placeItems: "center",
                justifyContent: "end",
              }}
            >
              <div className="prep-orb-wrap">
                <div className="prep-orbit" />
                <div className="prep-orbit-two" />
                <div className="prep-contour" />
                <div
                  className="prep-orb"
                  style={{
                    background:
                      "radial-gradient(circle at 36% 30%, rgba(255,255,255,0.98), rgba(255,255,255,0.52) 18%, rgba(168,180,117,0.22) 40%, rgba(205,170,179,0.22) 62%, rgba(184,135,107,0.28) 100%)",
                    boxShadow:
                      "inset 0 1px 1px rgba(255,255,255,0.84), 0 18px 42px rgba(67,67,43,0.08), 0 0 44px rgba(205,170,179,0.14)",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 30,
              paddingTop: 22,
              borderTop: "1px solid rgba(67,67,43,0.07)",
              display: "grid",
              gap: 10,
            }}
          >
            {STATUS_LINES.map((line, index) => {
              const isComplete = index < activeLine;
              const isActive = index === activeLine;
              const statusLabel = isComplete ? "Complete" : isActive ? "In progress" : "Pending";

              return (
                <div
                  className="prep-steps-row"
                  key={line}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr)",
                    gap: 16,
                    alignItems: "start",
                    padding: "12px 0",
                    borderTop: index === 0 ? "none" : "1px solid rgba(67,67,43,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      marginTop: 2,
                      background: isActive
                        ? "linear-gradient(135deg, rgba(168,180,117,0.18), rgba(205,170,179,0.14))"
                        : isComplete
                          ? "rgba(255,255,255,0.76)"
                          : "rgba(255,255,255,0.34)",
                      border: `1px solid ${
                        isActive || isComplete ? "rgba(67,67,43,0.12)" : "rgba(67,67,43,0.06)"
                      }`,
                    }}
                  >
                    {isComplete ? (
                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 12,
                          lineHeight: 1,
                          color: STEEL,
                          fontWeight: 600,
                        }}
                      >
                        ✓
                      </div>
                    ) : (
                      <div
                        className={isActive ? "prep-in-progress-dot" : undefined}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: isActive ? CHARTREUSE : "rgba(136,128,120,0.28)",
                          boxShadow: isActive ? "0 0 0 6px rgba(168,180,117,0.08)" : "none",
                          transition: "all 180ms ease",
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <div
                      className="prep-step-head"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "baseline",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: sohne,
                          fontSize: 20,
                          lineHeight: 1.08,
                          letterSpacing: "-0.03em",
                          color: isActive ? SOFT_TEXT : isComplete ? TEXT : "rgba(67,67,43,0.42)",
                          transition: "color 180ms ease, opacity 180ms ease",
                        }}
                      >
                        {line}
                      </div>
                      <div
                        className="prep-step-status"
                        style={{
                          justifySelf: "end",
                          fontFamily: inter,
                          fontSize: 11,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: isActive
                            ? "rgba(67,67,43,0.72)"
                            : isComplete
                              ? "rgba(125,150,172,0.92)"
                              : "rgba(67,67,43,0.28)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 12.5,
                        lineHeight: 1.65,
                        color: isActive ? "rgba(67,67,43,0.58)" : "rgba(67,67,43,0.48)",
                        maxWidth: 460,
                      }}
                    >
                      {STATUS_NOTES[index]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid rgba(67,67,43,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(67,67,43,0.44)",
              }}
            >
              This may take a few moments. Curating clarity.
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(67,67,43,0.38)",
              }}
            >
              A collection is a system of decisions.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
