import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  variant?: 'dark' | 'light';
  showTagline?: boolean;
}

export default function Logo({ 
  width = 200, 
  height = 60, 
  variant = 'dark',
  showTagline = true 
}: LogoProps) {
  
  const textColor = variant === 'dark' ? '#FFFFFF' : '#2E3744';
  const taglineColor = variant === 'dark' ? '#999999' : '#666666';
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 200 60" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="icon">
        <rect x="8" y="20" width="30" height="30" fill="#2196F3" rx="2"/>
        <rect x="12" y="24" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="21" y="24" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="30" y="24" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="12" y="33" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="21" y="33" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="30" y="33" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="12" y="42" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="21" y="42" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <rect x="30" y="42" width="6" height="6" fill="#FFFFFF" opacity="0.9"/>
        <path d="M 6 20 L 23 10 L 40 20 Z" fill="#1976D2"/>
        <line x1="14" y1="28" x2="34" y2="28" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7"/>
        <line x1="14" y1="37" x2="34" y2="37" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7"/>
        <line x1="14" y1="46" x2="34" y2="46" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7"/>
      </g>
      
      <text 
        x="50" 
        y="40" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="24" 
        fontWeight="700"
      >
        <tspan fill={textColor}>Publi</tspan>
        <tspan fill="#2196F3">plan</tspan>
      </text>
      
      {showTagline && (
        <text 
          x="50" 
          y="52" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontSize="9" 
          fontWeight="400" 
          fill={taglineColor} 
          letterSpacing="1"
        >
          GESTION DE PROJETS
        </text>
      )}
    </svg>
  );
}