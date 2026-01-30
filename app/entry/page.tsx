'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EntryScreen() {
  const router = useRouter();

  const BRAND = {
    ink: '#191919',
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
  };

  const allSeasons = useMemo(
    () => [
      { id: 'spring26', label: 'Spring 2026' },
      { id: 'resort26', label: 'Resort 26' },
      { id: 'summer26', label: 'Summer 26' },
      { id: 'fall26', label: 'Fall 26' },
      { id: 'winter26', label: 'Winter 26' },
    ],
    []
  );

  const [collectionName, setCollectionName] = useState('Spring Requiem');
  const [selectedSeason, setSelectedSeason] = useState<string | null>('spring26');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchedName, setTouchedName] = useState(false);
  const [touchedSeason, setTouchedSeason] = useState(false);

  const visibleSeasons = allSeasons.slice(carouselIndex, carouselIndex + 3);
  const canScrollNext = carouselIndex < allSeasons.length - 3;
  const canScrollBack = carouselIndex > 0;

  const recentCollections = [
    { id: 1, name: 'Italy Winter 25' },
    { id: 2, name: 'Urban Fall 2025' },
  ];

  const nameError = touchedName && !collectionName.trim() ? 'Please enter a collection name.' : '';
  const seasonError = touchedSeason && !selectedSeason ? 'Please select a season.' : '';
  const canContinue = !!collectionName.trim() && !!selectedSeason;

  const handleContinue = () => {
    setTouchedName(true);
    setTouchedSeason(true);
    if (!canContinue) return;
    router.push('/concept');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, selectedSeason]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 520px at 58% 20%, rgba(255,255,255,0.92) 0%, rgba(249,248,245,0.62) 42%, rgba(242,239,233,0.72) 70%, rgba(235,232,228,0.94) 100%)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes wash-drift {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(40px, 28px, 0); }
        }

        @keyframes wash-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(-36px, -22px, 0); }
        }

        .grain-overlay {
          position: fixed;
          inset: 0;
          background: transparent url('data:image/svg+xml;utf8,<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>') repeat 0 0;
          background-size: 240px 240px;
          opacity: 0.16;
          mix-blend-mode: soft-light;
          pointer-events: none;
          z-index: 1;
        }

        .glaze-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background:
            radial-gradient(900px 560px at 62% 26%,
              rgba(169,123,143,0.08) 0%,
              rgba(125,150,172,0.06) 35%,
              rgba(196,207,142,0.06) 58%,
              transparent 76%),
            linear-gradient(115deg,
              rgba(255,255,255,0.10) 0%,
              rgba(255,255,255,0.00) 40%,
              rgba(255,255,255,0.08) 100%);
          mix-blend-mode: soft-light;
          opacity: 0.9;
        }

        .vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background: radial-gradient(circle at 58% 24%,
            transparent 0%,
            rgba(25,25,25,0.06) 88%,
            rgba(25,25,25,0.10) 100%);
          opacity: 0.55;
        }

        .wash-rose {
          position: absolute;
          left: 72%;
          top: 26%;
          width: 980px;
          height: 780px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 35% 35%,
            rgba(169, 123, 143, 0.28) 0%,
            rgba(205, 170, 179, 0.16) 34%,
            rgba(169, 123, 143, 0.10) 54%,
            transparent 74%);
          filter: blur(52px);
          opacity: 0.95;
          animation: wash-drift 18s ease-in-out infinite;
          z-index: 0;
        }

        .wash-blue {
          position: absolute;
          left: 56%;
          top: 78%;
          width: 1080px;
          height: 860px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 55% 45%,
            rgba(125, 150, 172, 0.26) 0%,
            rgba(138, 164, 184, 0.15) 36%,
            rgba(125, 150, 172, 0.10) 56%,
            transparent 76%);
          filter: blur(54px);
          opacity: 0.92;
          animation: wash-drift-2 20s ease-in-out infinite;
          z-index: 0;
        }
      `}</style>

      <div className="grain-overlay" />
      <div className="glaze-overlay" />
      <div className="vignette" />
      <div className="wash-rose" />
      <div className="wash-blue" />

      {/* Sidebar */}
      <aside
        style={{
          width: '280px',
          minWidth: '280px',
          backgroundColor: 'rgba(255, 255, 255, 0.74)',
          backdropFilter: 'blur(24px) saturate(170%)',
          WebkitBackdropFilter: 'blur(24px) saturate(170%)',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow:
            '0 18px 52px rgba(67, 67, 43, 0.08), 0 2px 10px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
          position: 'relative',
          zIndex: 10,
          margin: '24px',
          marginRight: 0,
          borderRadius: '18px',
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 400,
            color: BRAND.oliveInk,
            marginBottom: '48px',
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
          }}
        >
          muko
        </h1>

        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '15px',
            color: BRAND.rose,
            backgroundColor: 'transparent',
            border: '1px solid rgba(169, 123, 143, 0.25)',
            padding: '12px 20px',
            borderRadius: '999px',
            marginBottom: '32px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            fontWeight: 500,
            transition: 'all 220ms ease',
            boxShadow: '0 2px 10px rgba(169, 123, 143, 0.08)',
            width: 'fit-content',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.40)';
            e.currentTarget.style.backgroundColor = 'rgba(169, 123, 143, 0.05)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(169, 123, 143, 0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.25)';
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(169, 123, 143, 0.08)';
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 300 }}>+</span>
          <span>New Collection</span>
        </button>

        <div>
          <h2
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'rgba(67, 67, 43, 0.50)',
              marginBottom: '24px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Recents
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentCollections.map((collection) => (
              <button
                key={collection.id}
                style={{
                  textAlign: 'left',
                  fontSize: '15px',
                  color: BRAND.rose,
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '10px 0',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  fontWeight: 500,
                }}
              >
                {collection.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px clamp(40px, 8vw, 120px)',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            display: 'flex',
            flexDirection: 'column',
            gap: '56px',
          }}
        >
          {/* Hero */}
          <div>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(67, 67, 43, 0.42)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginBottom: '16px',
              }}
            >
              Creative Intelligence Workspace
            </div>

            <h1
              style={{
                fontSize: 'clamp(40px, 5.4vw, 62px)',
                fontWeight: 520,
                color: BRAND.oliveInk,
                lineHeight: 1.08,
                marginBottom: '14px',
                letterSpacing: '-0.015em',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              }}
            >
              Begin the collection.
            </h1>

            <p
              style={{
                fontSize: 'clamp(15px, 1.9vw, 18px)',
                color: 'rgba(67, 67, 43, 0.55)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                lineHeight: 1.55,
              }}
            >
              Direction in, clarity out.
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '52px' }}>
            {/* Collection Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(67, 67, 43, 0.50)',
                  marginBottom: '12px',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                Collection name
              </label>

              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                onBlur={() => setTouchedName(true)}
                style={{
                  width: '100%',
                  padding: 'clamp(20px, 2.5vw, 24px) clamp(24px, 3.5vw, 32px)',
                  fontSize: 'clamp(24px, 3vw, 34px)',
                  fontWeight: 400,
                  color: BRAND.ink,
                  backgroundColor: 'rgba(255, 255, 255, 0.62)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(67, 67, 43, 0.10)',
                  borderRadius: '999px',
                  outline: 'none',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                  transition: 'all 220ms ease',
                  boxShadow: '0 12px 44px rgba(67, 67, 43, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.78)';
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.22)';
                  e.currentTarget.style.boxShadow =
                    '0 18px 60px rgba(125, 150, 172, 0.14), 0 0 0 3px rgba(125, 150, 172, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.62)';
                  e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.10)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 44px rgba(67, 67, 43, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)';
                }}
              />

              {nameError && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: 'rgba(169, 123, 143, 0.90)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  {nameError}
                </div>
              )}
            </div>

            {/* Season Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(67, 67, 43, 0.50)',
                  marginBottom: '16px',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                Select a season
              </label>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}
                >
                  {visibleSeasons.map((season) => {
                    const active = selectedSeason === season.id;

                    return (
                      <button
                        key={season.id}
                        onClick={() => {
                          setSelectedSeason(season.id);
                          setTouchedSeason(true);
                        }}
                        style={{
                          padding: 'clamp(16px, 2vw, 20px) clamp(20px, 2.5vw, 24px)',
                          fontSize: 'clamp(16px, 2vw, 20px)',
                          fontWeight: 520,
                          color: active ? BRAND.oliveInk : 'rgba(67, 67, 43, 0.65)',
                          backgroundColor: active 
                            ? 'rgba(196, 207, 142, 0.35)' 
                            : 'rgba(235, 232, 228, 0.55)',
                          backdropFilter: 'blur(10px)',
                          border: active
                            ? '1px solid rgba(168, 180, 117, 0.32)'
                            : '1px solid rgba(67, 67, 43, 0.12)',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                          transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: active
                            ? '0 8px 24px rgba(168, 180, 117, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.50)'
                            : '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)',
                          transform: active ? 'translateY(-1px)' : 'translateY(0)',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.25)';
                            e.currentTarget.style.borderColor = 'rgba(168, 180, 117, 0.22)';
                            e.currentTarget.style.color = BRAND.oliveInk;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow =
                              '0 8px 24px rgba(168, 180, 117, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.backgroundColor = 'rgba(235, 232, 228, 0.55)';
                            e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                            e.currentTarget.style.color = 'rgba(67, 67, 43, 0.65)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow =
                              '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                          }
                        }}
                      >
                        {season.label}
                      </button>
                    );
                  })}
                </div>

                {canScrollNext && (
                  <button
                    onClick={() => setCarouselIndex(carouselIndex + 1)}
                    style={{
                      position: 'absolute',
                      right: '-68px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(67, 67, 43, 0.20)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 220ms ease',
                      opacity: 0.8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(67, 67, 43, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.30)';
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.20)';
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(0)';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 15L12.5 10L7.5 5"
                        stroke={BRAND.oliveInk}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </button>
                )}

                {canScrollBack && (
                  <button
                    onClick={() => setCarouselIndex(carouselIndex - 1)}
                    style={{
                      position: 'absolute',
                      left: '-68px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(67, 67, 43, 0.20)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 220ms ease',
                      opacity: 0.8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(67, 67, 43, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.30)';
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.20)';
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(0)';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M12.5 15L7.5 10L12.5 5"
                        stroke={BRAND.oliveInk}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.65"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {seasonError && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: 'rgba(169, 123, 143, 0.90)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  {seasonError}
                </div>
              )}
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                style={{
                  padding: 'clamp(16px, 2vw, 18px) clamp(48px, 6vw, 56px)',
                  fontSize: 'clamp(14px, 1.8vw, 16px)',
                  fontWeight: 650,
                  color: BRAND.steelBlue,
                  background: 'rgba(255, 255, 255, 0.25)',
                  border: '1.5px solid rgba(125, 150, 172, 0.42)',
                  borderRadius: '999px',
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 12px 40px rgba(125, 150, 172, 0.14)',
                  opacity: canContinue ? 1 : 0.55,
                }}
                onMouseEnter={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.62)';
                  e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(125, 150, 172, 0.22)';
                }}
                onMouseLeave={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.42)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(125, 150, 172, 0.14)';
                }}
              >
                Continue
              </button>

              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(67, 67, 43, 0.45)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                Press{' '}
                <span style={{ fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif', color: 'rgba(67,67,43,0.70)' }}>
                  Enter
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}