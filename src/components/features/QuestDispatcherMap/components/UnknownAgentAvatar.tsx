import React from 'react';

interface UnknownAgentAvatarProps {
  width?: number | string;
  height?: number | string;
}

const UnknownAgentAvatar: React.FC<UnknownAgentAvatarProps> = ({ width = '100%', height = '100%' }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="uaa-grid" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#0c1e30" strokeWidth="0.5" />
      </pattern>
      <radialGradient id="uaa-vignette" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#060e1a" stopOpacity="0" />
        <stop offset="100%" stopColor="#020810" stopOpacity="0.85" />
      </radialGradient>
      <linearGradient id="uaa-scanline" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00acc1" stopOpacity="0.06" />
        <stop offset="50%" stopColor="#00acc1" stopOpacity="0.02" />
        <stop offset="100%" stopColor="#00acc1" stopOpacity="0.06" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="100" height="100" fill="#060e1a" />
    <rect width="100" height="100" fill="url(#uaa-grid)" />

    {/* Neck */}
    <rect x="43" y="46" width="14" height="12" rx="3" fill="#0a1829" />

    {/* Head silhouette */}
    <circle cx="50" cy="35" r="19" fill="#0a1829" stroke="#1a3d52" strokeWidth="1" />

    {/* Shoulders / body */}
    <path
      d="M2 102 Q4 72 20 63 Q30 57 50 57 Q70 57 80 63 Q96 72 98 102 Z"
      fill="#0a1829"
      stroke="#1a3d52"
      strokeWidth="1"
    />

    {/* Face "?" */}
    <text
      x="50"
      y="41"
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#1e4d62"
      fontFamily="monospace"
      fontSize="22"
      fontWeight="900"
    >
      ?
    </text>

    {/* Corner targeting brackets */}
    <path d="M6 6 L6 14 M6 6 L14 6" stroke="#1a4a5a" strokeWidth="1.2" fill="none" strokeLinecap="square" />
    <path d="M94 6 L94 14 M94 6 L86 6" stroke="#1a4a5a" strokeWidth="1.2" fill="none" strokeLinecap="square" />
    <path d="M6 94 L6 86 M6 94 L14 94" stroke="#1a4a5a" strokeWidth="1.2" fill="none" strokeLinecap="square" />
    <path d="M94 94 L94 86 M94 94 L86 94" stroke="#1a4a5a" strokeWidth="1.2" fill="none" strokeLinecap="square" />

    {/* Scanline gradient overlay */}
    <rect width="100" height="100" fill="url(#uaa-scanline)" />
    {/* Vignette */}
    <rect width="100" height="100" fill="url(#uaa-vignette)" />
  </svg>
);

export default UnknownAgentAvatar;
