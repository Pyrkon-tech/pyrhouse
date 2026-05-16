import React from 'react';
import type { Zone, ZoneMetrics } from '../types';
import { centroid, bbox, toSvgPoints } from '../utils/geometry';

interface ZoneOverlayProps {
  zone: Zone;
  metrics: ZoneMetrics;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDispatch?: (zoneId: string) => void;
}

const ZoneOverlay: React.FC<ZoneOverlayProps> = ({ zone, metrics, isSelected, onSelect, onDispatch }) => {
  const hasQuests = metrics.total > 0;
  const isUrgent = metrics.urgent > 0;
  const isActive = metrics.inProgress > 0;

  const [cx, cy] = zone.lx != null && zone.ly != null ? [zone.lx, zone.ly] : centroid(zone.points);
  const bb = bbox(zone.points);

  const fill = isSelected
    ? 'rgba(255,152,0,0.40)'
    : isUrgent ? 'rgba(255,152,0,0.30)'
    : isActive ? 'rgba(0,172,193,0.22)'
    : hasQuests ? 'rgba(102,187,106,0.20)'
    : 'rgba(255,255,255,0.03)';

  const stroke = isSelected
    ? '#ff9800'
    : isUrgent ? '#ff9800'
    : isActive ? '#00acc1'
    : hasQuests ? '#66bb6a'
    : 'rgba(255,255,255,0.08)';

  const strokeW = isSelected ? 4 : hasQuests ? 3 : 1;
  const labelLines = zone.label.split('\n');

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        if (isUrgent && onDispatch) onDispatch(zone.id);
        else onSelect(zone.id);
      }}
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
          fontSize={hasQuests ? 28 : 23}
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
          fill={isUrgent ? '#ff9800' : isActive ? '#00acc1' : '#66bb6a'}
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

      {/* Exclamation circle — visible 24h before delivery (or same day if no time) */}
      {metrics.alertVisible > 0 && (() => {
        const r = 30;
        const [px, py] = zone.points[0];
        const pulsing = metrics.alertPulsing > 0;
        return (
          <g style={{ pointerEvents: 'none' }}>
            {/* Outer expanding ring */}
            {pulsing && (
              <circle cx={px} cy={py} r={r} fill="none" stroke="#ff9800" strokeWidth={3} opacity={0}>
                <animate attributeName="r" values={`${r};${r + 22};${r + 22}`} dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Glow */}
            <circle cx={px} cy={py} r={r + 8} fill="#ff9800" style={{ filter: 'blur(10px)' }}>
              {pulsing
                ? <animate attributeName="opacity" values="0.6;0.05;0.6" dur="1.2s" repeatCount="indefinite" />
                : <animate attributeName="opacity" values="0.2;0.35;0.2" dur="2.4s" repeatCount="indefinite" />}
            </circle>
            {/* Circle background */}
            <circle cx={px} cy={py} r={r} fill="#ff9800" stroke="rgba(255,255,255,0.8)" strokeWidth={2.5}>
              {pulsing
                ? <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
                : <animate attributeName="opacity" values="1;0.8;1" dur="2.4s" repeatCount="indefinite" />}
            </circle>
            {/* Exclamation mark */}
            <text
              x={px} y={py + 1}
              textAnchor="middle" dominantBaseline="central"
              fill="#fff" fontSize={r * 1.4} fontWeight="bold" fontFamily="monospace"
            >!</text>
            {/* Counter badge */}
            {metrics.alertVisible > 1 && (
              <>
                <circle cx={px + r - 2} cy={py - r + 2} r={9} fill="#d32f2f" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                <text
                  x={px + r - 2} y={py - r + 3}
                  textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize={11} fontWeight="bold" fontFamily="monospace"
                >{metrics.alertVisible}</text>
              </>
            )}
          </g>
        );
      })()}
      {metrics.inProgress > 0 && metrics.pending === 0 && (
        <circle cx={bb.maxX - 18} cy={bb.minY + 18} r={8} fill="#00acc1">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* SD new badge — teal pulsing, anchored to centroid bottom-right to stay inside the zone */}
      {metrics.sdNew > 0 && (() => {
        const sdx = Math.round(cx + (bb.maxX - cx) * 0.60);
        const sdy = Math.round(cy + (bb.maxY - cy) * 0.40);
        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={sdx} cy={sdy} r={40} fill="#00acc1" opacity={0.15}
              style={{ filter: 'blur(10px)' }}>
              <animate attributeName="opacity" values="0.15;0.4;0.15" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={sdx} cy={sdy} r={30} fill="#00304a" stroke="#00acc1" strokeWidth={2.5}>
              <animate attributeName="opacity" values="1;0.55;1" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <text x={sdx} y={sdy + 1}
              textAnchor="middle" dominantBaseline="central"
              fill="#00e5ff" fontSize={20} fontWeight="bold" fontFamily="monospace"
            >SD</text>
            {metrics.sdNew > 1 && (
              <>
                <circle cx={sdx + 30} cy={sdy - 30} r={9} fill="#d32f2f" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                <text x={sdx + 30} y={sdy - 29}
                  textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize={11} fontWeight="bold" fontFamily="monospace"
                >{metrics.sdNew}</text>
              </>
            )}
          </g>
        );
      })()}
    </g>
  );
};

export default ZoneOverlay;
