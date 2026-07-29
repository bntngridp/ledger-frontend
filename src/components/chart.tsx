import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface ChartProps {
  dataPoints?: number[];
  color?: string;
}

/**
 * Catmull-Rom to Cubic Bezier curve interpolation algorithm.
 * Generates smooth, natural curved SVG paths without sharp angles ("melengkung halus").
 */
function getSmoothCurvePath(coords: { x: number; y: number }[]) {
  if (coords.length < 2) return '';
  if (coords.length === 2) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const k = 0.22; // Curve tension factor

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

export function Chart({ dataPoints = [], color }: ChartProps) {
  const theme = useTheme();
  const strokeColor = color || theme.primary;

  // Generate SVG smooth curve path and gradient fill
  const { linePath, fillPath, isFlat, lastX, lastY } = useMemo(() => {
    const width = 500;
    const height = 150;
    const padding = 15;

    const N = dataPoints.length;
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const range = maxVal - minVal;

    // Handle flat balance histories or empty datasets
    if (range === 0 || N < 2) {
      const midY = height / 2;
      return {
        linePath: `M 0 ${midY} L ${width} ${midY}`,
        fillPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
        isFlat: true,
        lastX: width,
        lastY: midY,
      };
    }

    // Construct coordinates
    const coords = dataPoints.map((val, i) => {
      const x = (i / (N - 1)) * width;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return { x, y };
    });

    const smoothLine = getSmoothCurvePath(coords);
    const smoothFill = `${smoothLine} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

    const lastCoord = coords[coords.length - 1];

    return {
      linePath: smoothLine,
      fillPath: smoothFill,
      isFlat: false,
      lastX: lastCoord.x,
      lastY: lastCoord.y,
    };
  }, [dataPoints]);

  return (
    <View style={styles.chartWrapper}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 500 150"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Soft vertical gradient fade under curve */}
          <linearGradient id="chartGradientNative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
            <stop offset="60%" stopColor={strokeColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>

          {/* Glow drop shadow filter */}
          <filter id="chartGlowNative" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Gradient Fill under curve */}
        <path d={fillPath} fill="url(#chartGradientNative)" stroke="none" />

        {/* Glowing smooth curve line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#chartGlowNative)"
        />

        {/* Pulse end dot marker */}
        {!isFlat && dataPoints.length > 0 && (
          <g>
            {/* Outer pulse aura */}
            <circle
              cx={lastX}
              cy={lastY}
              r="7"
              fill={strokeColor}
              fillOpacity="0.3"
            />
            {/* Inner solid dot */}
            <circle
              cx={lastX}
              cy={lastY}
              r="4"
              fill={strokeColor}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    width: '100%',
    height: 150,
    marginTop: 8,
  },
});
