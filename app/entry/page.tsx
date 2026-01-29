'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EntryScreen() {
  const [collectionName, setCollectionName] = useState('Spring Re');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const router = useRouter();

  const handleLetsGo = () => {
    // Validate that both fields are filled
    if (!collectionName.trim()) {
      alert('Please enter a collection name');
      return;
    }
    if (!selectedSeason) {
      alert('Please select a season');
      return;
    }
    
    // Navigate to concept page
    router.push('/concept');
  };

  const allSeasons = [
    { id: 'spring26', label: 'Spring 2026' },
    { id: 'resort26', label: 'Resort 26' },
    { id: 'summer26', label: 'Summer 26' },
    { id: 'fall26', label: 'Season' },
    { id: 'winter26', label: 'Season' },
  ];

  const visibleSeasons = allSeasons.slice(carouselIndex, carouselIndex + 3);
  const canScrollNext = carouselIndex < allSeasons.length - 3;
  const canScrollBack = carouselIndex > 0;

  const recentCollections = [
    { id: 1, name: 'Italy Winter 25' },
    { id: 2, name: 'Urban Fall 2025' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F9F8F5 0%, #F5F2EE 35%, #F0EDE9 65%, #EBE8E4 100%)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes blob-drift {
          0%, 100% {
            left: 65%;
            top: 25%;
          }
          50% {
            left: 80%;
            top: 45%;
          }
        }
        
        @keyframes blob-drift-2 {
          0%, 100% {
            left: 50%;
            top: 70%;
          }
          50% {
            left: 75%;
            top: 80%;
          }
        }
        
        @keyframes blob-drift-3 {
          0%, 100% {
            left: 85%;
            top: 55%;
          }
          50% {
            left: 60%;
            top: 35%;
          }
        }
        
        @keyframes blob-morph {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
        }
        
        @keyframes blob-morph-2 {
          0%, 100% {
            border-radius: 40% 60% 50% 50% / 70% 30% 60% 40%;
          }
          50% {
            border-radius: 70% 30% 40% 60% / 40% 70% 30% 60%;
          }
        }
        
        .grain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>') repeat 0 0;
          background-size: 180px 180px;
          opacity: 0.6;
          pointer-events: none;
          z-index: 1;
          mix-blend-mode: overlay;
        }
        
        .soft-blob-rose {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, 
            rgba(169, 123, 143, 0.28) 0%, 
            rgba(205, 170, 179, 0.14) 40%,
            rgba(169, 123, 143, 0.06) 60%,
            transparent 60%);
          filter: blur(40px);
          animation: 
            blob-drift 16s ease-in-out infinite,
            blob-morph 15s ease-in-out infinite;
          transform: translate(-50%, -50%);
          box-shadow: inset 0 0 100px rgba(255, 255, 255, 0.1);
        }
        
        .soft-blob-blue {
          position: absolute;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, 
            rgba(125, 150, 172, 0.25) 0%, 
            rgba(138, 164, 184, 0.12) 40%,
            rgba(125, 150, 172, 0.06) 60%,
            transparent 60%);
          filter: blur(38px);
          animation: 
            blob-drift-2 17s ease-in-out infinite,
            blob-morph-2 17s ease-in-out infinite;
          transform: translate(-50%, -50%);
          box-shadow: inset 0 0 100px rgba(255, 255, 255, 0.1);
        }
        
        .soft-blob-chartreuse {
          position: absolute;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, 
            rgba(196, 207, 142, 0.30) 0%, 
            rgba(168, 180, 117, 0.16) 40%,
            rgba(196, 207, 142, 0.08) 60%,
            transparent 60%);
          filter: blur(35px);
          animation: 
            blob-drift-3 15s ease-in-out infinite,
            blob-morph 16s ease-in-out infinite;
          transform: translate(-50%, -50%);
          box-shadow: inset 0 0 100px rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Three glassy blobs - rose, steel blue, chartreuse */}
      <div className="soft-blob-rose" />
      <div className="soft-blob-blue" />
      <div className="soft-blob-chartreuse" />

      {/* Left Sidebar */}
      <aside style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 'none',
        boxShadow: '0 8px 32px rgba(67, 67, 43, 0.08), 0 2px 8px rgba(67, 67, 43, 0.04), inset 1px 0 0 rgba(255, 255, 255, 0.8)',
        position: 'relative',
        zIndex: 10,
        margin: '24px',
        marginRight: 0,
        borderRadius: '16px',
        height: 'calc(100vh - 48px)',
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 400,
          color: '#43432B',
          marginBottom: '48px',
          letterSpacing: '0em',
          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif'
        }}>
          muko
        </h1>

        {/* New Collection Button */}
        <button style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '15px',
          color: '#A97B8F',
          backgroundColor: 'transparent',
          border: '1px solid rgba(169, 123, 143, 0.25)',
          padding: '12px 20px',
          borderRadius: '24px',
          marginBottom: '32px',
          cursor: 'pointer',
          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
          fontWeight: 500,
          letterSpacing: '0.01em',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(169, 123, 143, 0.06)',
          width: 'fit-content'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.4)';
          e.currentTarget.style.backgroundColor = 'rgba(169, 123, 143, 0.04)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(169, 123, 143, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.25)';
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(169, 123, 143, 0.06)';
        }}
        >
          <span style={{ fontSize: '18px', fontWeight: 300 }}>+</span>
          <span>New Collection</span>
        </button>

        {/* Recents Section */}
        <div>
          <h2 style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(67, 67, 43, 0.5)',
            marginBottom: '24px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-inter), system-ui, sans-serif'
          }}>
            Recents
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentCollections.map((collection) => (
              <button
                key={collection.id}
                style={{
                  textAlign: 'left',
                  fontSize: '15px',
                  color: '#A97B8F',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '12px 0',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  fontWeight: 500
                }}
              >
                {collection.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px clamp(40px, 8vw, 120px)',
        minHeight: '100vh'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
          gap: '56px'
        }}>
          {/* Hero Section */}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 400,
              color: '#43432B',
              lineHeight: '1.15',
              marginBottom: '16px',
              letterSpacing: '0em',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif'
            }}>
              Lets shape your next drop.
            </h1>
            <p style={{
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: 'rgba(67, 67, 43, 0.5)',
              fontWeight: 400,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              letterSpacing: '0.005em',
              lineHeight: '1.5'
            }}>
              Give me a direction, and we'll run with it.
            </p>
          </div>

          {/* Form Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
            {/* Collection Name Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(67, 67, 43, 0.5)',
                marginBottom: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-inter), system-ui, sans-serif'
              }}>
                Name your collection
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'clamp(20px, 2.5vw, 24px) clamp(24px, 3.5vw, 32px)',
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  fontWeight: 400,
                  color: '#43432B',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(67, 67, 43, 0.1)',
                  borderRadius: '48px',
                  outline: 'none',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 12px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                  e.target.style.borderColor = 'rgba(168, 180, 117, 0.25)';
                  e.target.style.boxShadow = '0 4px 20px rgba(168, 180, 117, 0.08), 0 0 0 3px rgba(168, 180, 117, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                  e.target.style.borderColor = 'rgba(67, 67, 43, 0.1)';
                  e.target.style.boxShadow = '0 2px 12px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                }}
              />
            </div>

            {/* Season Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(67, 67, 43, 0.5)',
                marginBottom: '16px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-inter), system-ui, sans-serif'
              }}>
                Select a season
              </label>
              <div style={{ position: 'relative' }}>
                {/* Season chips container - matches input width exactly */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  width: '100%'
                }}>
                  {visibleSeasons.map((season) => (
                    <button
                      key={season.id}
                      onClick={() => setSelectedSeason(season.id)}
                      style={{
                        padding: 'clamp(16px, 2vw, 20px) clamp(20px, 2.5vw, 24px)',
                        fontSize: 'clamp(16px, 2vw, 20px)',
                        fontWeight: 500,
                        color: selectedSeason === season.id ? '#43432B' : 'rgba(67, 67, 43, 0.75)',
                        backgroundColor: selectedSeason === season.id ? '#C4CF8E' : 'rgba(196, 207, 142, 0.4)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: selectedSeason === season.id ? '1px solid rgba(168, 180, 117, 0.4)' : '1px solid rgba(168, 180, 117, 0.25)',
                        borderRadius: '48px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        letterSpacing: '0.01em',
                        boxShadow: selectedSeason === season.id 
                          ? '0 4px 16px rgba(168, 180, 117, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.5)' 
                          : '0 2px 8px rgba(168, 180, 117, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSeason !== season.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.65)';
                          e.currentTarget.style.color = '#43432B';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(168, 180, 117, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSeason !== season.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.4)';
                          e.currentTarget.style.color = 'rgba(67, 67, 43, 0.75)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(168, 180, 117, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                        }
                      }}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
                
                {/* Right Carousel Arrow - positioned absolutely outside grid */}
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
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(67, 67, 43, 0.2)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(67, 67, 43, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-50%) translateX(0)';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 15L12.5 10L7.5 5" stroke="#43432B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button 
                onClick={handleLetsGo}
                style={{
                padding: 'clamp(16px, 2vw, 18px) clamp(48px, 6vw, 56px)',
                fontSize: 'clamp(14px, 1.8vw, 16px)',
                fontWeight: 600,
                color: '#7D96AC',
                background: 'transparent',
                border: '1.5px solid rgba(125, 150, 172, 0.35)',
                borderRadius: '48px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '0.02em',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 16px rgba(125, 150, 172, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.5)';
                e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.05)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(125, 150, 172, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.35)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(125, 150, 172, 0.08)';
              }}
              >
                Let's Go!
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}