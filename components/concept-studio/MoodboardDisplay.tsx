'use client';

import React from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

export const MoodboardDisplay: React.FC = () => {
  const { aestheticInput, moodboardImages } = useSessionStore();

  return (
    <div className="h-full w-full p-8 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto pb-32">
      {/* Extra padding-bottom for floating pulse rail */}
      
      <div className="max-w-4xl mx-auto">
        {aestheticInput && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {aestheticInput}
            </h2>
            <p className="text-sm text-gray-600">
              Visual exploration
            </p>
          </div>
        )}

        {/* Moodboard Grid */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-white border-2 border-gray-200 overflow-hidden relative group"
            >
              {/* Placeholder gradient based on index */}
              <div
                className="w-full h-full transition-transform group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(${i * 30}, 40%, 85%) 0%, 
                    hsl(${i * 30 + 60}, 35%, 75%) 100%)`
                }}
              />
              
              {/* Image number overlay */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        {!aestheticInput && (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg mb-2">
              Select or enter an aesthetic to see moodboard
            </div>
            <p className="text-gray-500 text-sm">
              Images will update based on your aesthetic direction
            </p>
          </div>
        )}
      </div>
    </div>
  );
};