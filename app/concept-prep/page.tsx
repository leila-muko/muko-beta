"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MukoNav } from "@/components/MukoNav";
import { useSessionStore } from "@/lib/store/sessionStore";
import { preloadCriticScores } from "@/lib/concept-studio/preloadCriticScores";

const TEXT = "#191919";
const MUTED = "#888078";
const CHARTREUSE = "#A8B475";
const STEEL = "#7D96AC";
const CAMEL = "#B8876B";

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
          "radial-gradient(circle at 16% 18%, rgba(168,180,117,0.18), transparent 0 28%), radial-gradient(circle at 82% 16%, rgba(125,150,172,0.16), transparent 0 30%), linear-gradient(180deg, #FCFAF6 0%, #F2ECE2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes prepFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -10px, 0) scale(1.02); }
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

        @keyframes prepShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .prep-card {
          border-radius: 34px;
        }

        .prep-orb {
          animation: prepFloat 4.8s ease-in-out infinite;
        }

        .prep-orb::before {
          content: "";
          position: absolute;
          inset: 18%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.12) 72%, transparent 100%);
          filter: blur(6px);
        }

        .prep-orb::after {
          content: "";
          position: absolute;
          inset: -14%;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.42);
          animation: prepPulse 2.8s ease-in-out infinite;
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

        .prep-active-line {
          background: linear-gradient(90deg, rgba(25,25,25,0.95), rgba(25,25,25,0.58), rgba(25,25,25,0.95));
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: prepShimmer 3s linear infinite;
        }

        @media (max-width: 860px) {
          .prep-card {
            border-radius: 28px;
          }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(67,67,43,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(67,67,43,0.028) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.18), transparent 82%)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "14%",
          left: "-10vw",
          width: "36vw",
          height: "36vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,135,107,0.16), transparent 64%)",
          filter: "blur(22px)",
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

      <main
        style={{
          minHeight: "calc(100vh - 72px)",
          padding: "116px 24px 48px",
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <section
          className="prep-card"
          style={{
            width: "min(760px, 100%)",
            padding: "34px 28px 28px",
            border: "1px solid rgba(67,67,43,0.08)",
            background: "rgba(255,255,255,0.58)",
            backdropFilter: "blur(24px) saturate(120%)",
            boxShadow: "0 30px 100px rgba(67,67,43,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
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
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: CHARTREUSE,
              }}
            >
              Editorial AI Ordering
            </div>
            <div
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.54)",
                border: "1px solid rgba(67,67,43,0.07)",
                fontFamily: inter,
                fontSize: 10,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.54)",
              }}
            >
              {season || "Season pending"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 220px",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 14px",
                  fontFamily: sohne,
                  fontSize: "clamp(24px, 3vw, 34px)",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: TEXT,
                  maxWidth: 380,
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
                  lineHeight: 1.72,
                  color: MUTED,
                  maxWidth: 500,
                }}
              >
                Muko is ordering the strongest directions for <span style={{ color: TEXT }}>{resolvedCollectionName}</span>,
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
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(67,67,43,0.46)",
                  }}
                >
                  Recommendation Pass
                </div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 19,
                    color: TEXT,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {Math.round(progress)}%
                </div>
              </div>

              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(67,67,43,0.08)",
                  padding: 2,
                }}
              >
                <div
                  className="prep-progress-fill"
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${CHARTREUSE} 0%, ${STEEL} 64%, ${CAMEL} 100%)`,
                    boxShadow: "0 0 24px rgba(125,150,172,0.24)",
                    transition: "width 260ms ease",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                className="prep-orb"
                style={{
                  width: 182,
                  height: 182,
                  borderRadius: "50%",
                  position: "relative",
                  background:
                    "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.45) 18%, rgba(168,180,117,0.24) 42%, rgba(125,150,172,0.3) 68%, rgba(184,135,107,0.22) 100%)",
                  boxShadow:
                    "inset 0 1px 1px rgba(255,255,255,0.84), 0 20px 42px rgba(67,67,43,0.12), 0 0 42px rgba(168,180,117,0.16)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid rgba(67,67,43,0.08)",
              display: "grid",
              gap: 14,
            }}
          >
            {STATUS_LINES.map((line, index) => {
              const isComplete = index < activeLine;
              const isActive = index === activeLine;

              return (
                <div
                  key={line}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr)",
                    gap: 14,
                    alignItems: "start",
                    padding: "6px 0",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(168,180,117,0.2), rgba(125,150,172,0.18))"
                        : isComplete
                          ? "rgba(255,255,255,0.72)"
                          : "rgba(255,255,255,0.34)",
                      border: `1px solid ${
                        isActive || isComplete ? "rgba(67,67,43,0.12)" : "rgba(67,67,43,0.06)"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: isActive ? CHARTREUSE : isComplete ? STEEL : "rgba(136,128,120,0.28)",
                        boxShadow: isActive ? "0 0 0 6px rgba(168,180,117,0.1)" : "none",
                        transition: "all 180ms ease",
                      }}
                    />
                  </div>

                  <div>
                    <div
                      className={isActive ? "prep-active-line" : undefined}
                      style={{
                        fontFamily: sohne,
                        fontSize: 22,
                        lineHeight: 1.08,
                        letterSpacing: "-0.035em",
                        color: !isActive ? (isComplete ? TEXT : "rgba(67,67,43,0.48)") : undefined,
                        marginBottom: 4,
                      }}
                    >
                      {line}
                    </div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 12.5,
                        lineHeight: 1.65,
                        color: "rgba(67,67,43,0.56)",
                      }}
                    >
                      {STATUS_NOTES[index]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
