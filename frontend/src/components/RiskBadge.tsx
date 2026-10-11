import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, showScore = false }) => {
  const getLabel = () => {
    switch (level) {
      case 'green':
        return 'Low Risk';
      case 'yellow':
        return 'Moderate Warning';
      case 'red':
        return 'High Alert';
      default:
        return level;
    }
  };

  const getBadgeClass = () => {
    switch (level) {
      case 'green':
        return 'badge-risk badge-green';
      case 'yellow':
        return 'badge-risk badge-yellow';
      case 'red':
        return 'badge-risk badge-red';
      default:
        return 'badge-risk';
    }
  };

  return (
    <span className={getBadgeClass()}>
      <span style={{ fontSize: '10px' }}>●</span>
      {getLabel()}
      {showScore && score !== undefined && (
        <span style={{ opacity: 0.85, marginLeft: '4px', fontWeight: 400 }}>
          ({score})
        </span>
      )}
    </span>
  );
};
