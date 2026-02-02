'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getRecommendations } from '@/lib/recommendations';

export const RecommendedAesthetics: React.FC = () => {
  const { season, setAestheticInput } = useSessionStore();
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    // Get recommendations based on season and brand keywords
    // For now, using mock brand keywords - will pull from brand profile in Phase 2
    const mockBrandKeywords = ['Minimalist', 'Sustainable']; // TODO: Get from brand profile
    
    const recs = getRecommendations({
      season: season || 'SS26',
      brandKeywords: mockBrandKeywords,
      limit: 3
    });
    
    setRecommendations(recs);
  }, [season]);

  const handleSelectRecommendation = (aesthetic: string) => {
    setAestheticInput(aesthetic);
  };

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Recommended
      </label>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {recommendations.map((aesthetic, index) => (
          <button
            key={index}
            onClick={() => handleSelectRecommendation(aesthetic)}
            className="
              px-4 py-2 rounded-full font-medium whitespace-nowrap
              bg-[#ABAB63] text-white hover:bg-[#9a9a55]
              transition-all active:scale-95
              text-sm
            "
          >
            {aesthetic}
          </button>
        ))}
        <button 
          className="text-gray-400 hover:text-gray-600 text-lg px-2"
          aria-label="More options"
        >
          →
        </button>
      </div>
    </div>
  );
};