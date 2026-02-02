'use client';

import React from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

interface PulseIndicatorProps {
  icon: string;
  label: string;
  score?: number;
  status?: 'green' | 'yellow' | 'red' | 'locked';
  animate?: boolean;
}

const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  icon,
  label,
  score,
  status = 'locked',
  animate = false
}) => {
  const statusColors = {
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    locked: 'text-gray-400 bg-gray-50'
  };

  const statusIcons = {
    green: '✓',
    yellow: '⚠',
    red: '!',
    locked: '🔒'
  };

  return (
    <div 
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
        ${statusColors[status]}
        ${animate ? 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse' : ''}
      `}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        {score !== undefined ? (
          <span className="text-sm font-bold">{score}</span>
        ) : (
          <span className="text-xs">{statusIcons[status]}</span>
        )}
      </div>
    </div>
  );
};

export const FloatingPulseRail: React.FC = () => {
  const {
    identityPulse,
    resonancePulse,
    executionPulse,
    conceptLocked
  } = useSessionStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t-2 border-gray-200 px-8 py-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Pulse Indicators */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-600 mr-2">
            Pulse Rail
          </span>
          
          <PulseIndicator
            icon="🛡️"
            label="Identity"
            score={identityPulse?.score}
            status={
              conceptLocked ? 'locked' :
              identityPulse ? identityPulse.status : 'locked'
            }
          />
          
          <PulseIndicator
            icon="👥"
            label="Resonance"
            score={resonancePulse?.score}
            status={
              conceptLocked ? 'locked' :
              resonancePulse ? resonancePulse.status : 'locked'
            }
          />
          
          <PulseIndicator
            icon="📦"
            label="Execution"
            status="locked"
          />
        </div>
        
        {/* Right: Lock Button */}
        <button
          disabled={!identityPulse || !resonancePulse || conceptLocked}
          className="
            px-8 py-3 rounded-lg font-semibold transition-all
            bg-blue-600 text-white hover:bg-blue-700 
            disabled:bg-gray-300 disabled:cursor-not-allowed
            active:scale-95
          "
        >
          {conceptLocked ? '✓ Locked' : 'Lock →'}
        </button>
      </div>
    </div>
  );
};