import React from 'react';
import type { Zone, ZoneMetrics } from '../types';
import { centroid, bbox, toSvgPoints } from '../utils/geometry';

interface ZoneOverlayProps {
  zone: Zone;
  metrics: ZoneMetrics;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ZoneOverlay: React.FC<ZoneOverlayProps> = ({ zone, metrics, isSelected, onSelect }) => {
  const hasQuests = metrics.total > 0;
  const isUrgent = metrics.pending > 0;
  const isActive = metrics.inProgress > 0;

  const [cx, cy] = zone.lx != null && zone.ly != null ? [zone.lx, zone.ly] : centroid(zone.points);
  const bb = bbox(zone.points);

  const fill = isSelected
    ? 'rgba(255,152,0,0.40)'
    : isUrgent ? 'rgba(255,152,0,0.30)'
    : isActive ? 'rgba(255,213,79,0.22)'
    : hasQuests ? 'rgba(102,187,106,0.20)'
    : 'rgba(255,255,255,0.03)';

  const stroke = isSelected
    ? '#ff9800'
    : isUrgent ? '#ff9800'
    : isActive ? '#ffd54f'
    : hasQuests ? '#66bb6a'
    : 'rgba(255,255,255,0.08)';

  const strokeW = isSelected ? 4 : hasQuests ? 3 : 1;
  const labelLines = zone.label.split('\n');

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect(zone.id); }}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Pawilon ${zone.label}`}
    >
      {/* Shape — ellipse or polygon */}
      {zone.shape === 'ellipse' ? (() => {
        const rx = (bb.maxX - bb.minX) / 2;
        const ry = (bb.maxY - bb.minY) / 2;
        const ecx = bb.minX + rx;
        const ecy = bb.minY + ry;
        return (
          <>
            {isUrgent && (
              <ellipse cx={ecx} cy={ecy} rx={rx + 6} ry={ry + 6}
                fill="none" stroke="#ff9800" strokeWidth={10} opacity={0.2}
                style={{ filter: 'blur(12px)' }} />
            )}
            {isSelected && !isUrgent && (
              <ellipse cx={ecx} cy={ecy} rx={rx + 4} ry={ry + 4}
                fill="none" stroke={stroke} strokeWidth={8} opacity={0.25}
                style={{ filter: 'blur(8px)' }} />
            )}
            <ellipse cx={ecx} cy={ecy} rx={rx} ry={ry}
              fill={fill} stroke={stroke} strokeWidth={strokeW}
              style={{ transition: 'fill 0.25s, stroke 0.25s' }} />
          </>
        );
      })() : (
        <>
          {isUrgent && (
            <polygon points={toSvgPoints(zone.points)}
              fill="none" stroke="#ff9800" strokeWidth={10} opacity={0.2}
              style={{ filter: 'blur(12px)' }} />
          )}
          {isSelected && !isUrgent && (
            <polygon points={toSvgPoints(zone.points)}
              fill="none" stroke={stroke} strokeWidth={8} opacity={0.25}
              style={{ filter: 'blur(8px)' }} />
          )}
          <polygon
            points={toSvgPoints(zone.points)}
            fill={fill} stroke={stroke} strokeWidth={strokeW}
            strokeLinejoin="round"
            style={{ transition: 'fill 0.25s, stroke 0.25s' }} />
        </>
      )}

      {/* Label */}
      {labelLines.map((line, i) => (
        <text
          key={i}
          x={cx} y={cy + i * 28 - (labelLines.length - 1) * 14 + (hasQuests ? -12 : 0)}
          textAnchor="middle" dominantBaseline="central"
          fill={hasQuests ? '#fff' : 'rgba(255,255,255,0.35)'}
          fontSize={hasQuests ? 26 : 22}
          fontFamily="'Courier New', monospace"
          fontWeight="700"
          style={{ userSelect: 'none', pointerEvents: 'none', textShadow: hasQuests ? '0 2px 8px rgba(0,0,0,0.8)' : 'none' }}
        >
          {line}
        </text>
      ))}

      {/* Quest count badge */}
      {hasQuests && (
        <text
          x={cx} y={cy + (labelLines.length > 1 ? 28 : 16)}
          textAnchor="middle" dominantBaseline="central"
          fill={isUrgent ? '#ff9800' : isActive ? '#ffd54f' : '#66bb6a'}
          fontSize={18}
          fontFamily="'Courier New', monospace"
          fontWeight="700"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {isUrgent
            ? `⚡${metrics.pending}${metrics.inProgress > 0 ? ` ▶${metrics.inProgress}` : ''}`
            : isActive
            ? `▶ ${metrics.inProgress}`
            : `✓ ${metrics.completed}`}
        </text>
      )}

      {/* Pulsing beacon */}
      {metrics.pending > 0 && (
        <circle cx={bb.maxX - 18} cy={bb.minY + 18} r={10} fill="#ff9800">
          <animate attributeName="r" values="8;14;8" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}
      {metrics.inProgress > 0 && metrics.pending === 0 && (
        <circle cx={bb.maxX - 18} cy={bb.minY + 18} r={8} fill="#ffd54f">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
};

export default ZoneOverlay;
