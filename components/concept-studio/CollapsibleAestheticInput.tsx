'use client';

import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

export const CollapsibleAestheticInput: React.FC = () => {
  const { aestheticInput, setAestheticInput } = useSessionStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand if user has already entered something
  React.useEffect(() => {
    if (aestheticInput) {
      setIsExpanded(true);
    }
  }, [aestheticInput]);

  if (!isExpanded) {
    return (
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Aesthetic Direction
        </label>
        <button
          onClick={() => setIsExpanded(true)}
          className="
            w-full px-4 py-3 rounded-lg border-2 border-gray-300
            text-left text-gray-400 flex items-center justify-between
            hover:border-gray-400 hover:bg-gray-50 transition-all
          "
        >
          <span>Enter aesthetic direction...</span>
          <span className="text-blue-600">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Aesthetic Direction
      </label>
      <div className="relative">
        <input
          type="text"
          value={aestheticInput}
          onChange={(e) => setAestheticInput(e.target.value)}
          placeholder="e.g., Neo-Western, Dark Romantic, Coastal Minimalism..."
          autoFocus
          className="
            w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-300
            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
            focus:outline-none transition-all
          "
        />
        <button
          onClick={() => {
            setIsExpanded(false);
            setAestheticInput('');
          }}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-gray-400 hover:text-gray-600 text-sm
          "
          aria-label="Clear and collapse"
        >
          ✕
        </button>
      </div>
    </div>
  );
};