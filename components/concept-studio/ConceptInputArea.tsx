'use client';

import React from 'react';

export const ConceptInputArea: React.FC = () => {
  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Concept Studio
          </h1>
          <p className="text-gray-600">
            Define your aesthetic direction
          </p>
        </div>

        {/* Placeholder for aesthetic input - Coming Tuesday */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Aesthetic / Vibe (Coming Tuesday)
          </label>
          <div className="w-full h-12 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Text input placeholder</span>
          </div>
        </div>

        {/* Placeholder for moodboard - Coming Wednesday */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Moodboard (Coming Wednesday)
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center"
              >
                <span className="text-gray-400 text-xs">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for color palette - Coming Tuesday */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Color Palette (Coming Tuesday)
          </label>
          <div className="flex gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-12 h-12 bg-gray-100 rounded-full border-2 border-gray-200"
              />
            ))}
          </div>
        </div>

        {/* Placeholder for lock button - Coming Friday */}
        <div className="w-full h-14 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Lock Concept Button - Coming Friday</span>
        </div>
      </div>
    </div>
  );
};