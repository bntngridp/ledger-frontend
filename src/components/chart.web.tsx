import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface ChartProps {
  dataPoints?: number[];
  color?: string;
}

/**
 * Catmull-Rom to Cubic Bezier curve interpolation algorithm.
 * Generates smooth, natural curved SVG paths without sharp angles.
 */
function getSmoothCurvePath(coords: { x: number; y: number }[]) {
  if (coords.length < 2) return '';
  if (coords.length === 2) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const k = 0.22;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * k;
    const cp1y = p1.y + (p2.y - p0.y) * k;
    const cp2x = p2.x - (p3.x - p1.x) * k;
    const cp2y = p2.y - (p3.y - p1.y) * k;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

const VIEW_W = 500;
const VIEW_H = 200;

export function Chart({ dataPoints = [], color }: ChartProps) {
  const theme = useTheme();
  const strokeColor = color || theme.primary;

  const { linePath, fillPath, isFlat, lastXPct, lastYPct } = useMemo(() => {
    const width = VIEW_W;
    const height = VIEW_H;
    const padding = 8;
    const paddingRight = 14;

    const N = dataPoints.length;
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const range = maxVal - minVal;

    if (range === 0 || N < 2) {
      const midY = height * 0.75;
      return {
        linePath: `M 0 ${midY} L ${width} ${midY}`,
        fillPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
        isFlat: true,
        lastXPct: 100,
        lastYPct: 75,
      };
    }

    const coords = dataPoints.map((val, i) => {
      const x = paddingRight + (i / (N - 1)) * (width - paddingRight * 2);
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return { x, y };
    });

    const lastCoord = coords[coords.length - 1];
    const firstCoord = coords[0];

    const smoothLine = getSmoothCurvePath(coords);
    const smoothFill = `${smoothLine} L ${lastCoord.x.toFixed(1)} ${(height + 2).toFixed(1)} L ${firstCoord.x.toFixed(1)} ${(height + 2).toFixed(1)} Z`;

    return {
      linePath: smoothLine,
      fillPath: smoothFill,
      isFlat: false,
      // Convert viewBox coords to percentage for CSS overlay positioning
      lastXPct: (lastCoord.x / width) * 100,
      lastYPct: (lastCoord.y / height) * 100,
    };
  }, [dataPoints]);

  return (
    <View style={styles.chartWrapper}>
      {/* SVG chart — preserveAspectRatio="none" distorts circles, so dot is rendered outside */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="55%" stopColor={strokeColor} stopOpacity="0.07" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill */}
        <path d={fillPath} fill="url(#chartGradient)" stroke="none" />

        {/* Smooth crisp curve line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>

      {/* CSS Pulse Ring Overlay — perfectly circular, not distorted by SVG scaling */}
      {!isFlat && dataPoints.length > 0 && (
        <View
          style={[
            styles.dotOverlay,
            { left: `${lastXPct}%` as any, top: `${lastYPct}%` as any },
          ]}
        >
          {/* Animated pulse ring via CSS */}
          <style>{`
            @keyframes chartPulse {
              0%   { transform: scale(1);   opacity: 0.55; }
              70%  { transform: scale(2.6); opacity: 0;    }
              100% { transform: scale(2.6); opacity: 0;    }
            }
            .chart-pulse-ring {
              position: absolute;
              width: 12px;
              height: 12px;
              top: 50%;
              left: 50%;
              margin-top: -6px;
              margin-left: -6px;
              border-radius: 50%;
              background-color: ${strokeColor};
              opacity: 0.55;
              animation: chartPulse 2s ease-out infinite;
              transform-origin: center center;
              pointer-events: none;
            }
          `}</style>

          {/* Outer pulse ring (CSS animated) */}
          <div className="chart-pulse-ring" />

          {/* Outer glow ring (static) */}
          <View style={[styles.dotRingOuter, { borderColor: strokeColor }]} />

          {/* Inner solid dot */}
          <View style={[styles.dotInner, { backgroundColor: strokeColor }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    width: '100%',
    height: 200,
    marginTop: 8,
    position: 'relative',
  } as any,

  // Absolutely positioned CSS overlay — bypasses SVG distortion entirely
  dotOverlay: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,

  // Static outer translucent ring
  dotRingOuter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    opacity: 0.35,
  } as any,

  // Inner solid filled circle
  dotInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  } as any,
});
