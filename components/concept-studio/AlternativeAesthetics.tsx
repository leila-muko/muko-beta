'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { findAlternatives, shouldShowAlternatives } from '@/lib/alternatives';

interface Alternative {
  name: string;
  identityDelta: number;
  resonanceDelta: number;
  reason: string;
}

export const AlternativeAesthetics: React.FC = () => {
  const { 
    aestheticInput, 
    identityPulse, 
    resonancePulse,
    setAestheticInput 
  } = useSessionStore();
  
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);

  useEffect(() => {
    // Only show alternatives if:
    // 1. User has entered an aesthetic
    // 2. We have pulse scores
    // 3. Scores indicate we should show alternatives (yellow/red territory)
    if (!aestheticInput || !identityPulse || !resonancePulse) {
      setAlternatives([]);
      return;
    }

    const scores = {
      identity: identityPulse.score,
      resonance: resonancePulse.score
    };

    if (!shouldShowAlternatives(scores)) {
      setAlternatives([]);
      return;
    }

    // Find alternatives
    const alts = findAlternatives({
      currentAesthetic: aestheticInput,
      currentScores: scores,
      limit: 2
    });

    setAlternatives(alts);
  }, [aestheticInput, identityPulse, resonancePulse]);

  if (alternatives.length === 0) {
    return null;
  }

  const handleSelectAlternative = (aesthetic: string) => {
    setAestheticInput(aesthetic);
  };

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-600 mb-2 block">
        Try These...
      </label>
      <div className="flex flex-col gap-2">
        {alternatives.map((alt, index) => (
          <button
            key={index}
            onClick={() => handleSelectAlternative(alt.name)}
            className="
              px-4 py-3 rounded-lg border-2 border-gray-200
              hover:border-[#ABAB63] hover:bg-[#ABAB63]/5
              transition-all text-left group
            "
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 group-hover:text-[#ABAB63]">
                {alt.name}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {alt.identityDelta > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                    +{alt.identityDelta} 🛡️
                  </span>
                )}
                {alt.resonanceDelta > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    +{alt.resonanceDelta} 👥
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600">
              {alt.reason}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};