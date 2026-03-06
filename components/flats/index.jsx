// ─────────────────────────────────────────────────────────────
// MUKO FASHION FLATS — Complete SVG Library
// 30 unique garment types, all viewBox="0 0 120 160"
// Props: color (fill), strokeAlpha (optional, default 0.15)
// ─────────────────────────────────────────────────────────────

const s = (a = 0.15) => `rgba(0,0,0,${a})`;

// ── OUTERWEAR ────────────────────────────────────────────────

export const PufferFlat = ({ color = "#D4C8B8" }) => (
  <svg viewBox="0 0 120 140" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M25 45 Q20 42 18 50 L18 110 Q18 118 30 118 L90 118 Q102 118 102 110 L102 50 Q100 42 95 45 L25 45Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[62,78,94,110].map(y => <path key={y} d={`M19 ${y} Q60 ${y-4} 101 ${y}`} stroke={s(.1)} strokeWidth="1.5" fill="none"/>)}
    <path d="M42 45 Q60 38 78 45 L72 52 Q60 46 48 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M25 45 Q8 48 6 62 Q4 74 8 86 Q12 94 22 92 L26 78 Q22 70 24 60 L25 45Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[64,76].map(y => <path key={y} d={`M7 ${y} Q15 ${y-3} 25 ${y}`} stroke={s(.1)} strokeWidth="1.2" fill="none"/>)}
    <path d="M95 45 Q112 48 114 62 Q116 74 112 86 Q108 94 98 92 L94 78 Q98 70 96 60 L95 45Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[64,76].map(y => <path key={y} d={`M113 ${y} Q105 ${y-3} 95 ${y}`} stroke={s(.1)} strokeWidth="1.2" fill="none"/>)}
    <line x1="60" y1="46" x2="60" y2="118" stroke={s(.08)} strokeWidth="1.5" strokeDasharray="3,2"/>
    <path d="M42 45 Q60 28 78 45" stroke={s(.1)} strokeWidth="1.5" fill="none" strokeDasharray="4,3"/>
  </svg>
);

export const ParkaFlat = ({ color = "#C8C0A8" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M26 38 L18 148 Q18 154 32 154 L88 154 Q102 154 102 148 L94 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[65,90,115,138].map(y => <path key={y} d={`M19 ${y} Q60 ${y-3} 101 ${y}`} stroke={s(.08)} strokeWidth="1" fill="none"/>)}
    <path d="M40 38 Q60 30 80 38 L76 26 Q60 18 44 26Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M26 38 L6 48 L8 106 L24 104 L28 70 L28 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M94 38 L114 48 L112 106 L96 104 L92 70 L92 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M8 102 Q16 99 24 102 L24 110 Q16 107 8 110Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M96 102 Q104 99 112 102 L112 110 Q104 107 96 110Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <line x1="60" y1="38" x2="60" y2="154" stroke={s(.1)} strokeWidth="1.2" strokeDasharray="3,2"/>
    <path d="M32 98 L46 98 L46 106 L32 106Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <path d="M74 98 L88 98 L88 106 L74 106Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <path d="M44 38 Q60 24 76 38" stroke={s(.08)} strokeWidth="1.2" fill="none" strokeDasharray="4,3"/>
  </svg>
);

export const JacketFlat = ({ color = "#C8C0B0" }) => (
  <svg viewBox="0 0 120 150" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 36 L22 136 Q22 142 36 142 L84 142 Q98 142 98 136 L92 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 Q38 32 50 36 L54 58 Q44 54 36 62Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M92 36 Q82 32 70 36 L66 58 Q76 54 84 62Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M50 36 Q60 28 70 36 L66 44 Q60 38 54 44Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 L10 46 L12 104 L26 102 L28 68 L30 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 36 L110 46 L108 104 L94 102 L92 68 L90 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M10 100 Q18 97 26 100 L26 108 Q18 105 10 108Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 100 Q102 97 110 100 L110 108 Q102 105 94 108Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <circle cx="60" cy="88" r="3" fill={s(.12)}/>
    <path d="M28 104 L42 104 L42 110 L28 110Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <path d="M78 104 L92 104 L92 110 L78 110Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <line x1="60" y1="62" x2="60" y2="142" stroke={s(.1)} strokeWidth="1.2"/>
  </svg>
);

export const RaincoatFlat = ({ color = "#9098A0" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 48 L20 148 Q20 154 35 154 L85 154 Q100 154 100 148 L92 48Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 48 Q24 80 60 78 Q96 80 92 48Z" fill="rgba(255,255,255,0.05)"/>
    <path d="M40 48 Q60 38 80 48 L76 36 Q60 28 44 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M60 48 L48 72" stroke={s(.12)} strokeWidth="1.2"/>
    <path d="M60 48 L72 72" stroke={s(.12)} strokeWidth="1.2"/>
    <path d="M28 48 L8 56 L10 112 L24 110 L28 80 L30 50Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 48 L112 56 L110 112 L96 110 L92 80 L90 50Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[80,110].map(y => <path key={y} d={`M20 ${y} Q60 ${y-4} 100 ${y}`} stroke={s(.1)} strokeWidth="1" fill="none"/>)}
    <line x1="60" y1="48" x2="60" y2="154" stroke={s(.12)} strokeWidth="1.5"/>
    {[62,80,98,116,134].map(y => <circle key={y} cx="60" cy={y} r="2.5" fill={s(.15)}/>)}
    <path d="M32 100 L44 100 L44 108 L32 108Z" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M76 100 L88 100 L88 108 L76 108Z" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M10 108 Q17 105 24 108 L24 114 Q17 111 10 114Z" fill={color} stroke={s(.12)} strokeWidth="0.8"/>
    <path d="M96 108 Q103 105 110 108 L110 114 Q103 111 96 114Z" fill={color} stroke={s(.12)} strokeWidth="0.8"/>
  </svg>
);

export const TrenchFlat = ({ color = "#C8B898" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M26 36 L16 154 Q16 158 32 158 L88 158 Q104 158 104 154 L94 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M26 36 Q36 30 48 36 L52 60 Q40 56 32 66Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M94 36 Q84 30 72 36 L68 60 Q80 56 88 66Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M48 36 Q60 26 72 36 L68 46 Q60 38 52 46Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M26 36 L4 46 L6 110 L22 108 L26 74 L28 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M94 36 L116 46 L114 110 L98 108 L94 74 L92 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M4 106 Q13 103 22 106 L22 114 Q13 111 4 114Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M98 106 Q107 103 116 106 L116 114 Q107 111 98 114Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <line x1="60" y1="60" x2="60" y2="158" stroke={s(.1)} strokeWidth="1.2"/>
    {[72,90,108,126].map(y => <circle key={y} cx="60" cy={y} r="2.5" fill={s(.12)}/>)}
    <path d="M28 108 Q44 104 60 108 Q76 104 92 108 L92 116 Q76 112 60 116 Q44 112 28 116Z" fill={color} stroke={s(.1)} strokeWidth="0.8"/>
    <path d="M26 86 L44 86 L44 96 L26 96Z" stroke={s(.12)} strokeWidth="0.8" fill="none"/>
    <path d="M76 86 L94 86 L94 96 L76 96Z" stroke={s(.12)} strokeWidth="0.8" fill="none"/>
  </svg>
);

export const CapeFlat = ({ color = "#9098A0" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M44 22 Q60 16 76 22 L74 34 Q60 28 46 34Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M48 24 Q60 20 72 24" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M46 34 Q20 40 8 70 Q2 90 6 120 Q10 138 22 144 Q60 148 98 144 Q110 138 114 120 Q118 90 112 70 Q100 40 74 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[55,82,108,130].map(y => <path key={y} d={`M${y===55?20:y===82?12:y===108?8:8} ${y} Q60 ${y-8} ${y===55?100:y===82?108:y===108?112:112} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M60 34 Q58 80 55 144" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M60 34 Q62 80 65 144" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M46 34 Q32 38 20 50" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M74 34 Q88 38 100 50" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M30 70 Q46 90 40 120" stroke={s(.06)} strokeWidth="1.2" fill="none"/>
    <path d="M90 70 Q74 90 80 120" stroke={s(.06)} strokeWidth="1.2" fill="none"/>
  </svg>
);

export const ShellFlat = ({ color = "#B8C8C0" }) => (
  <svg viewBox="0 0 120 140" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 32 L22 126 Q22 132 38 132 L82 132 Q98 132 98 126 L92 32Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 32 L10 40 L12 92 L26 90 L28 60 L30 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 32 L110 40 L108 92 L94 90 L92 60 L90 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M40 32 Q60 24 80 32 L78 22 Q60 16 42 22Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[55,80,105].map(y => <path key={y} d={`M22 ${y} Q60 ${y-3} 98 ${y}`} stroke={s(.08)} strokeWidth="1" fill="none"/>)}
    <line x1="60" y1="32" x2="60" y2="132" stroke={s(.08)} strokeWidth="1" strokeDasharray="3,2"/>
    <path d="M10 88 Q18 85 26 88 L26 94 Q18 91 10 94Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 88 Q102 85 110 88 L110 94 Q102 91 94 94Z" fill={color} stroke={s()} strokeWidth="0.8"/>
  </svg>
);

export const BoilersuitFlat = ({ color = "#B0B8A8" }) => (
  <svg viewBox="0 0 120 170" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 32 L24 88 L18 160 Q18 166 30 166 L50 166 L50 90 L70 90 L70 166 L90 166 Q102 166 102 160 L96 88 L90 32Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M40 32 Q60 24 80 32 L78 22 Q60 16 42 22Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 32 L10 40 L12 90 L26 88 L28 58 L32 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M90 32 L110 40 L108 90 L94 88 L92 58 L88 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M10 86 Q18 83 26 86 L26 94 Q18 91 10 94Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 86 Q102 83 110 86 L110 94 Q102 91 94 94Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M24 88 Q60 84 96 88" stroke={s(.12)} strokeWidth="1.5" fill="none"/>
    <line x1="60" y1="32" x2="60" y2="90" stroke={s(.1)} strokeWidth="1.2"/>
    {[48,62,76].map(y => <circle key={y} cx="60" cy={y} r="2" fill={s(.12)}/>)}
    <path d="M18 138 Q34 134 50 138" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M70 138 Q86 134 102 138" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M30 110 L42 110 L42 118 L30 118Z" stroke={s(.12)} strokeWidth="0.8" fill="none"/>
  </svg>
);

// ── TOPS ────────────────────────────────────────────────────

export const KnitSweaterFlat = ({ color = "#C8C0B8" }) => (
  <svg viewBox="0 0 120 150" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 50 L22 130 Q22 136 35 136 L85 136 Q98 136 98 130 L90 50Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[35,40,45,50,55,60,65,70,75,80,85].map(x => <path key={x} d={`M${x} 52 Q${x+1} 80 ${x} 108 Q${x-1} 120 ${x} 136`} stroke={s(.08)} strokeWidth="1" fill="none"/>)}
    <path d="M40 50 Q60 42 80 50 L78 35 Q60 26 42 35Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[43,48,53,58,63,68,73,77].map(x => <line key={x} x1={x} y1="35" x2={x-1} y2="50" stroke={s(.1)} strokeWidth="0.8"/>)}
    <path d="M30 50 L10 58 L12 100 L24 98 L28 70 L32 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M90 50 L110 58 L108 100 L96 98 L92 70 L88 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    <rect x="10" y="96" width="14" height="8" rx="2" fill={color} stroke={s()} strokeWidth="1"/>
    <rect x="96" y="96" width="14" height="8" rx="2" fill={color} stroke={s()} strokeWidth="1"/>
    {[40,52,64,76,88].map(x => [70,85,100,115].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={s(.06)}/>))}
  </svg>
);

export const CardiganFlat = ({ color = "#D0C8C0" }) => (
  <svg viewBox="0 0 120 150" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 46 L22 132 Q22 138 36 138 L84 138 Q98 138 98 132 L90 46Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[35,42,49,56,63,70,77,84].map(x => <path key={x} d={`M${x} 48 Q${x+1} 85 ${x} 138`} stroke={s(.07)} strokeWidth="0.9" fill="none"/>)}
    <path d="M30 46 Q40 40 52 44 L56 60 Q46 56 36 64Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M90 46 Q80 40 68 44 L64 60 Q74 56 84 64Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M52 44 Q60 36 68 44 L66 52 Q60 46 54 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 46 L10 54 L12 100 L26 98 L28 68 L32 48Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M90 46 L110 54 L108 100 L94 98 L92 68 L88 48Z" fill={color} stroke={s()} strokeWidth="1"/>
    <rect x="10" y="98" width="14" height="7" rx="2" fill={color} stroke={s()} strokeWidth="0.8"/>
    <rect x="96" y="98" width="14" height="7" rx="2" fill={color} stroke={s()} strokeWidth="0.8"/>
    {[56,70,84,98,112].map(y => <circle key={y} cx="60" cy={y} r="2.5" fill={s(.12)}/>)}
    <line x1="60" y1="60" x2="60" y2="138" stroke={s(.1)} strokeWidth="1.2"/>
  </svg>
);

export const BlazerFlat = ({ color = "#C8C0B0" }) => (
  <svg viewBox="0 0 120 150" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 36 L22 136 Q22 142 36 142 L84 142 Q98 142 98 136 L92 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 Q38 32 50 36 L54 60 Q44 56 36 64Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M92 36 Q82 32 70 36 L66 60 Q76 56 84 64Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M50 36 Q60 28 70 36 L66 44 Q60 38 54 44Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 L10 46 L12 108 L26 106 L28 72 L30 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 36 L110 46 L108 108 L94 106 L92 72 L90 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M10 104 Q18 101 26 104 L26 112 Q18 109 10 112Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 104 Q102 101 110 104 L110 112 Q102 109 94 112Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <circle cx="60" cy="90" r="3" fill={s(.12)}/>
    <path d="M28 106 L42 106 L42 112 L28 112Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <path d="M78 106 L92 106 L92 112 L78 112Z" stroke={s()} strokeWidth="0.8" fill="none"/>
    <line x1="60" y1="64" x2="60" y2="142" stroke={s(.1)} strokeWidth="1.2"/>
  </svg>
);

export const BlouseFlat = ({ color = "#E0D8D0" }) => (
  <svg viewBox="0 0 120 140" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M32 40 L26 122 Q26 128 40 128 L80 128 Q94 128 94 122 L88 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M32 40 Q38 34 48 36 L50 54 Q42 50 36 58Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M88 40 Q82 34 72 36 L70 54 Q78 50 84 58Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M48 36 Q60 28 72 36 L70 46 Q60 40 50 46Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M32 40 L12 48 Q8 56 10 80 Q12 94 22 92 L28 72 L32 42Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M88 40 L108 48 Q112 56 110 80 Q108 94 98 92 L92 72 L88 42Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[56,70,84,98,112].map(y => <circle key={y} cx="60" cy={y} r="2" fill={s(.1)}/>)}
    <line x1="60" y1="46" x2="60" y2="128" stroke={s(.08)} strokeWidth="1"/>
    <path d="M26 90 Q60 86 94 90" stroke={s(.08)} strokeWidth="1" fill="none"/>
  </svg>
);

export const CorsetTopFlat = ({ color = "#D8C8C0" }) => (
  <svg viewBox="0 0 120 110" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M24 20 Q60 12 96 20 L100 95 Q60 100 20 95Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M24 20 Q60 14 96 20" stroke={s(.12)} strokeWidth="1.5" fill="none"/>
    {[35,50,65,80].map(y => <path key={y} d={`M22 ${y} Q60 ${y-3} 98 ${y}`} stroke={s(.1)} strokeWidth="1.2" fill="none"/>)}
    {[35,45,55,65,75,85].map(y => [38,50,62,74,86].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill={s(.08)}/>))}
    <line x1="60" y1="20" x2="60" y2="95" stroke={s(.1)} strokeWidth="1" strokeDasharray="3,2"/>
    <path d="M32 20 Q28 16 26 12 Q28 8 32 10" stroke={s(.15)} strokeWidth="1" fill="none"/>
    <path d="M88 20 Q92 16 94 12 Q92 8 88 10" stroke={s(.15)} strokeWidth="1" fill="none"/>
    <path d="M20 92 Q60 96 100 92 L100 100 Q60 104 20 100Z" fill={color} stroke={s()} strokeWidth="0.8"/>
  </svg>
);

export const TankFlat = ({ color = "#C8D0C8" }) => (
  <svg viewBox="0 0 120 140" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M34 24 L28 124 Q28 130 44 130 L76 130 Q92 130 92 124 L86 24Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M34 24 Q26 28 24 40" stroke={s(.12)} strokeWidth="1.2" fill="none"/>
    <path d="M86 24 Q94 28 96 40" stroke={s(.12)} strokeWidth="1.2" fill="none"/>
    <path d="M34 24 Q60 16 86 24" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M34 24 Q42 18 50 22 Q56 14 64 14 Q72 18 70 22 Q78 18 86 24" stroke={s(.12)} strokeWidth="1" fill="none"/>
    {[38,42,46,50,54,58,62,66,70,74,78,82].map(x => <line key={x} x1={x} y1="26" x2={x} y2="130" stroke={s(.06)} strokeWidth="0.8"/>)}
    <path d="M28 80 Q60 76 92 80" stroke={s(.1)} strokeWidth="1" fill="none"/>
  </svg>
);

export const TopFlat = ({ color = "#D0C8D0" }) => (
  <svg viewBox="0 0 120 130" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 36 L24 116 Q24 122 40 122 L80 122 Q96 122 96 116 L90 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M42 36 Q60 28 78 36 L76 24 Q60 18 44 24Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 36 L10 44 Q6 52 8 74 Q10 86 20 84 L26 64 L30 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M90 36 L110 44 Q114 52 112 74 Q110 86 100 84 L94 64 L90 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M24 76 Q60 72 96 76" stroke={s(.1)} strokeWidth="1" fill="none"/>
  </svg>
);

export const TunicFlat = ({ color = "#C8D0C0" }) => (
  <svg viewBox="0 0 120 155" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 36 L20 138 Q20 144 36 144 L84 144 Q100 144 100 138 L92 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 Q38 30 50 34 L52 52 Q42 48 36 56Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M92 36 Q82 30 70 34 L68 52 Q78 48 84 56Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M50 34 Q60 26 70 34 L68 44 Q60 38 52 44Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 36 L10 44 L12 86 L26 84 L28 60 L30 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 36 L110 44 L108 86 L94 84 L92 60 L90 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[60,80,100,120].map(y => <path key={y} d={`M20 ${y} Q60 ${y-3} 100 ${y}`} stroke={s(.08)} strokeWidth="1" fill="none"/>)}
    <path d="M20 138 Q60 134 100 138" stroke={s(.1)} strokeWidth="1" fill="none"/>
  </svg>
);

export const MidLayerFlat = ({ color = "#B8C8C0" }) => (
  <svg viewBox="0 0 120 140" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 36 L24 122 Q24 128 38 128 L82 128 Q96 128 96 122 L90 36Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 36 Q38 30 50 34 L52 50 Q44 46 36 54Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M90 36 Q82 30 70 34 L68 50 Q76 46 84 54Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M50 34 Q60 26 70 34 L68 42 Q60 36 52 42Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 36 L10 44 L12 96 L26 94 L28 66 L32 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M90 36 L110 44 L108 96 L94 94 L92 66 L88 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M10 92 Q18 89 26 92 L26 100 Q18 97 10 100Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 92 Q102 89 110 92 L110 100 Q102 97 94 100Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <line x1="60" y1="42" x2="60" y2="128" stroke={s(.1)} strokeWidth="1.2" strokeDasharray="3,2"/>
    {[54,70,86,102,118].map(y => <circle key={y} cx="60" cy={y} r="2" fill={s(.1)}/>)}
    {[55,75,95,115].map(y => <path key={y} d={`M24 ${y} Q60 ${y-2} 96 ${y}`} stroke={s(.06)} strokeWidth="0.8" fill="none"/>)}
  </svg>
);

export const VestFlat = ({ color = "#B8C0C8" }) => (
  <svg viewBox="0 0 120 150" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 30 L24 140 Q24 146 40 146 L80 146 Q96 146 96 140 L90 30Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M30 30 Q45 26 60 46 Q75 26 90 30" stroke={s(.12)} strokeWidth="1.2" fill="none"/>
    <path d="M30 30 Q22 44 24 68" stroke={s()} strokeWidth="1" fill="none"/>
    <path d="M90 30 Q98 44 96 68" stroke={s()} strokeWidth="1" fill="none"/>
    <line x1="60" y1="46" x2="60" y2="146" stroke={s(.1)} strokeWidth="1.2"/>
    {[60,80,100,120,140].map(y => <circle key={y} cx="60" cy={y} r="2.5" fill={s(.12)}/>)}
    <path d="M24 68 Q22 108 24 140" stroke={s(.08)} strokeWidth="0.8" fill="none"/>
    <path d="M96 68 Q98 108 96 140" stroke={s(.08)} strokeWidth="0.8" fill="none"/>
    <path d="M30 100 L42 100 L42 108 L30 108Z" stroke={s(.12)} strokeWidth="0.8" fill="none"/>
    <path d="M78 100 L90 100 L90 108 L78 108Z" stroke={s(.12)} strokeWidth="0.8" fill="none"/>
  </svg>
);

// ── BOTTOMS ──────────────────────────────────────────────────

export const TrouserFlat = ({ color = "#C0B8D0" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M22 20 Q60 16 98 20 L98 34 Q60 30 22 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[24,28].map(y => <path key={y} d={`M24 ${y} Q60 ${y-3} 96 ${y}`} stroke={s(.08)} strokeWidth="0.8" fill="none"/>)}
    <path d="M22 34 Q18 36 16 50 Q10 80 14 120 Q16 140 28 148 Q40 154 50 148 Q58 142 58 130 L58 80 Q58 60 56 50 Q54 38 60 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[60,90,118].map(y => <path key={y} d={`M16 ${y} Q35 ${y-5} 56 ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M98 34 Q102 36 104 50 Q110 80 106 120 Q104 140 92 148 Q80 154 70 148 Q62 142 62 130 L62 80 Q62 60 64 50 Q66 38 60 34Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[60,90,118].map(y => <path key={y} d={`M104 ${y} Q85 ${y-5} 64 ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M60 34 Q58 52 60 68 Q62 52 60 34" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M14 140 Q28 136 50 140 L50 150 Q34 147 14 150Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M70 140 Q92 136 106 140 L106 150 Q86 147 70 150Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M20 50 Q18 64 20 76" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M100 50 Q102 64 100 76" stroke={s(.12)} strokeWidth="1" fill="none"/>
  </svg>
);

export const StraightPantFlat = ({ color = "#B8C0C8" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M26 18 Q60 14 94 18 L94 30 Q60 26 26 30Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[21,25].map(y => <path key={y} d={`M28 ${y} Q60 ${y-2} 92 ${y}`} stroke={s(.08)} strokeWidth="0.8" fill="none"/>)}
    <path d="M26 30 Q22 32 20 44 Q18 80 20 130 Q20 144 34 148 L52 148 L52 80 Q54 52 56 44 Q58 36 60 30Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[55,85,115,138].map(y => <line key={y} x1="20" y1={y} x2="52" y2={y} stroke={s(.08)} strokeWidth="0.8"/>)}
    <path d="M94 30 Q98 32 100 44 Q102 80 100 130 Q100 144 86 148 L68 148 L68 80 Q66 52 64 44 Q62 36 60 30Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[55,85,115,138].map(y => <line key={y} x1="68" y1={y} x2="100" y2={y} stroke={s(.08)} strokeWidth="0.8"/>)}
    <path d="M60 30 Q58 50 60 65 Q62 50 60 30" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M20 128 Q36 124 52 128 L52 148 Q36 144 20 148Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M68 128 Q84 124 100 128 L100 148 Q84 144 68 148Z" fill={color} stroke={s()} strokeWidth="0.8"/>
  </svg>
);

export const SkirtFlat = ({ color = "#C0B8D0" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M36 28 Q60 24 84 28 L84 40 Q60 36 36 40Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M38 32 Q60 29 82 32" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M36 40 Q30 60 24 100 Q20 124 18 148 L102 148 Q100 124 96 100 Q90 60 84 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[60,85,112,135].map(y => <path key={y} d={`M${y===60?34:y===85?30:y===112?24:20} ${y} Q60 ${y-4} ${y===60?86:y===85?90:y===112?96:100} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <line x1="60" y1="40" x2="60" y2="148" stroke={s(.06)} strokeWidth="1" strokeDasharray="4,3"/>
    <path d="M18 148 Q60 144 102 148" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M36 40 Q30 94 18 148" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M84 40 Q90 94 102 148" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
  </svg>
);

export const MiniSkirtFlat = ({ color = "#D0B8C0" }) => (
  <svg viewBox="0 0 120 100" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M30 18 Q60 12 90 18 L90 30 Q60 26 30 30Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M32 22 Q60 19 88 22" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M30 30 Q24 46 18 80 L102 80 Q96 46 90 30Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[48,62,74].map(y => <path key={y} d={`M${y===48?28:y===62?22:18} ${y} Q60 ${y-3} ${y===48?92:y===62?98:102} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M18 80 Q60 76 102 80" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <line x1="60" y1="30" x2="60" y2="80" stroke={s(.06)} strokeWidth="1" strokeDasharray="3,2"/>
  </svg>
);

// ── DRESSES ─────────────────────────────────────────────────

export const MidiDressFlat = ({ color = "#D4C0B8" }) => (
  <svg viewBox="0 0 120 170" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M36 30 Q60 22 84 30 L88 75 Q60 72 32 75Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M36 30 Q26 34 24 48 L32 75 L30 32Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M84 30 Q94 34 96 48 L88 75 L90 32Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M44 30 Q60 20 76 30 L74 20 Q60 12 46 20Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M32 75 Q20 90 16 130 Q14 150 20 162 L100 162 Q106 150 104 130 Q100 90 88 75Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[95,115,140,158].map(y => <path key={y} d={`M${y<=115?18:16} ${y} Q60 ${y-6} ${y<=115?102:104} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M32 75 Q60 70 88 75" stroke={s(.12)} strokeWidth="1.5" fill="none"/>
    <path d="M24 46 Q22 60 24 72" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M96 46 Q98 60 96 72" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
  </svg>
);

export const MaxiDressFlat = ({ color = "#C8D0C8" }) => (
  <svg viewBox="0 0 120 180" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M36 26 Q60 18 84 26 L88 70 Q60 66 32 70Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M36 26 Q24 30 22 46 L32 70 L28 28Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M84 26 Q96 30 98 46 L88 70 L92 28Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M44 26 Q60 16 76 26 L74 16 Q60 8 46 16Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M32 70 Q16 90 10 140 Q8 162 14 174 L106 174 Q112 162 110 140 Q104 90 88 70Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[95,120,148,168].map(y => <path key={y} d={`M${y<=120?14:10} ${y} Q60 ${y-8} ${y<=120?106:110} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M32 70 Q60 65 88 70" stroke={s(.12)} strokeWidth="1.5" fill="none"/>
    <path d="M22 44 Q20 58 22 68" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M98 44 Q100 58 98 68" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
  </svg>
);

export const SlipDressFlat = ({ color = "#E0D0D8" }) => (
  <svg viewBox="0 0 120 165" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M32 22 L28 148 Q28 154 44 154 L76 154 Q92 154 92 148 L88 22Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M32 22 Q28 16 30 10" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M88 22 Q92 16 90 10" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M32 22 Q60 14 88 22" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M32 22 Q40 16 46 18 Q52 10 60 10 Q68 10 74 18 Q80 16 88 22" stroke={s(.12)} strokeWidth="1" fill="none"/>
    {[40,65,90,115,138].map(y => <path key={y} d={`M28 ${y} Q60 ${y-2} 92 ${y}`} stroke={s(.06)} strokeWidth="0.8" fill="none"/>)}
    <path d="M34 140 Q42 136 52 140" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M68 140 Q78 136 86 140" stroke={s(.1)} strokeWidth="1" fill="none"/>
  </svg>
);

export const ShirtDressFlat = ({ color = "#D8D0C0" }) => (
  <svg viewBox="0 0 120 170" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M28 38 L20 152 Q20 158 36 158 L84 158 Q100 158 100 152 L92 38Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 38 Q38 32 50 36 L52 54 Q44 50 36 58Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M92 38 Q82 32 70 36 L68 54 Q76 50 84 58Z" fill={color} stroke={s(.12)} strokeWidth="1"/>
    <path d="M50 36 Q60 28 70 36 L68 46 Q60 40 52 46Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M28 38 L10 46 L12 96 L26 94 L28 66 L30 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M92 38 L110 46 L108 96 L94 94 L92 66 L90 40Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M10 92 Q18 89 26 92 L26 100 Q18 97 10 100Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <path d="M94 92 Q102 89 110 92 L110 100 Q102 97 94 100Z" fill={color} stroke={s()} strokeWidth="0.8"/>
    <line x1="60" y1="46" x2="60" y2="158" stroke={s(.1)} strokeWidth="1.2"/>
    {[58,74,90,106,122,138].map(y => <circle key={y} cx="60" cy={y} r="2" fill={s(.1)}/>)}
    <path d="M20 100 Q60 96 100 100" stroke={s(.08)} strokeWidth="1" fill="none"/>
  </svg>
);

export const SundressFlat = ({ color = "#E8D8C8" }) => (
  <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M36 24 L30 80 Q24 110 20 148 L100 148 Q96 110 90 80 L84 24Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M36 24 Q30 18 32 12" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M84 24 Q90 18 88 12" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M36 24 Q44 16 52 18 Q56 10 64 10 Q72 10 68 18 Q76 16 84 24" stroke={s(.12)} strokeWidth="1.2" fill="none"/>
    {[50,70,95,118,138].map(y => <path key={y} d={`M${y<=70?28:y<=95?22:20} ${y} Q60 ${y-5} ${y<=70?92:y<=95?98:100} ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M30 80 Q60 76 90 80" stroke={s(.1)} strokeWidth="1.2" fill="none"/>
  </svg>
);

export const BabyDollDressFlat = ({ color = "#E0D8E0" }) => (
  <svg viewBox="0 0 120 145" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M38 22 Q60 14 82 22 L86 52 Q60 48 34 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M38 22 Q28 26 26 38 L34 52 L32 24Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M82 22 Q92 26 94 38 L86 52 L88 24Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M46 22 Q60 14 74 22 L72 14 Q60 8 48 14Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M34 52 Q18 62 16 100 Q16 118 20 132 L100 132 Q104 118 104 100 Q102 62 86 52Z" fill={color} stroke={s()} strokeWidth="1"/>
    {[70,88,108,126].map(y => <path key={y} d={`M18 ${y} Q60 ${y-5} 102 ${y}`} stroke={s(.08)} strokeWidth="1.2" fill="none"/>)}
    <path d="M34 52 Q60 47 86 52" stroke={s(.12)} strokeWidth="1.5" fill="none"/>
    <path d="M26 36 Q24 44 26 50" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
    <path d="M94 36 Q96 44 94 50" stroke={s(.1)} strokeWidth="0.8" fill="none"/>
  </svg>
);

export const ColumnDressFlat = ({ color = "#C8C8D0" }) => (
  <svg viewBox="0 0 120 170" fill="none" style={{ width: "100%", height: "100%" }}>
    <path d="M34 20 L30 152 Q30 158 46 158 L74 158 Q90 158 90 152 L86 20Z" fill={color} stroke={s()} strokeWidth="1"/>
    <path d="M34 20 Q30 14 32 8" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M86 20 Q90 14 88 8" stroke={s(.12)} strokeWidth="1" fill="none"/>
    <path d="M34 20 Q60 12 86 20" stroke={s(.12)} strokeWidth="1.2" fill="none"/>
    <path d="M34 20 Q40 14 46 16 Q52 8 60 8 Q68 8 74 16 Q80 14 86 20" stroke={s(.12)} strokeWidth="1" fill="none"/>
    {[45,70,95,120,145].map(y => <path key={y} d={`M30 ${y} Q60 ${y-1} 90 ${y}`} stroke={s(.06)} strokeWidth="0.8" fill="none"/>)}
    <path d="M30 80 Q60 78 90 80" stroke={s(.1)} strokeWidth="1" fill="none"/>
    <path d="M30 152 Q60 148 90 152" stroke={s(.1)} strokeWidth="1" fill="none"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
// FLAT REGISTRY — maps type string to component + default color
// ─────────────────────────────────────────────────────────────

export const FLAT_REGISTRY = {
  "puffer":        { Flat: PufferFlat,       color: "#D4C8B8" },
  "parka":         { Flat: ParkaFlat,         color: "#C8C0A8" },
  "jacket":        { Flat: JacketFlat,        color: "#C8C0B0" },
  "raincoat":      { Flat: RaincoatFlat,      color: "#9098A0" },
  "trench":        { Flat: TrenchFlat,        color: "#C8B898" },
  "coat":          { Flat: TrenchFlat,        color: "#C8B898" },
  "cape":          { Flat: CapeFlat,          color: "#9098A0" },
  "shell":         { Flat: ShellFlat,         color: "#B8C8C0" },
  "boilersuit":    { Flat: BoilersuitFlat,    color: "#B0B8A8" },
  "knit-sweater":  { Flat: KnitSweaterFlat,   color: "#C8C0B8" },
  "cardigan":      { Flat: CardiganFlat,      color: "#D0C8C0" },
  "blazer":        { Flat: BlazerFlat,        color: "#C8C0B0" },
  "blouse":        { Flat: BlouseFlat,        color: "#E0D8D0" },
  "corset-top":    { Flat: CorsetTopFlat,     color: "#D8C8C0" },
  "tank":          { Flat: TankFlat,          color: "#C8D0C8" },
  "top":           { Flat: TopFlat,           color: "#D0C8D0" },
  "tunic":         { Flat: TunicFlat,         color: "#C8D0C0" },
  "mid-layer":     { Flat: MidLayerFlat,      color: "#B8C8C0" },
  "vest":          { Flat: VestFlat,          color: "#B8C0C8" },
  "trouser":       { Flat: TrouserFlat,       color: "#C0B8D0" },
  "straight-pant": { Flat: StraightPantFlat,  color: "#B8C0C8" },
  "skirt":         { Flat: SkirtFlat,         color: "#C0B8D0" },
  "mini-skirt":    { Flat: MiniSkirtFlat,     color: "#D0B8C0" },
  "midi-dress":    { Flat: MidiDressFlat,     color: "#D4C0B8" },
  "maxi-dress":    { Flat: MaxiDressFlat,     color: "#C8D0C8" },
  "slip-dress":    { Flat: SlipDressFlat,     color: "#E0D0D8" },
  "shirt-dress":   { Flat: ShirtDressFlat,    color: "#D8D0C0" },
  "sundress":      { Flat: SundressFlat,      color: "#E8D8C8" },
  "babydoll-dress":{ Flat: BabyDollDressFlat, color: "#E0D8E0" },
  "column-dress":  { Flat: ColumnDressFlat,   color: "#C8C8D0" },
};

export function getFlatForPiece(type, signal) {
  const entry = FLAT_REGISTRY[type?.toLowerCase()];
  if (!entry) return null;

  let color = entry.color;
  const [r, g, b] = color.match(/\w\w/g).map(x => parseInt(x, 16));

  if (signal === "high-volume") {
    color = `rgb(${Math.round(r*.88)},${Math.round(g*.88)},${Math.round(b*.88)})`;
  } else if (signal === "emerging") {
    color = `rgb(${Math.max(0,r-8)},${g},${Math.min(255,b+8)})`;
  } else if (signal === "declining") {
    color = "#C8C0B8";
  }

  return { Flat: entry.Flat, color };
}
