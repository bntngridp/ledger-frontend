import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface ChartProps {
  dataPoints?: number[];
}

export function Chart({ dataPoints = [] }: ChartProps) {
  const theme = useTheme();

  // Generate SVG path for the chart data
  const { linePath, fillPath, isFlat, lastY } = useMemo(() => {
    const width = 500;
    const height = 150;
    const padding = 15;

    const N = dataPoints.length;
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const range = maxVal - minVal;

    // Handle new users or flat balance histories
    if (range === 0 || N < 2) {
      const midY = height / 2;
      return {
        linePath: `M 0 ${midY} L ${width} ${midY}`,
        fillPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
        isFlat: true,
        lastY: midY,
      };
    }

    // Construct curve using smooth coordinate interpolation
    const coords = dataPoints.map((val, i) => {
      const x = (i / (N - 1)) * width;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return { x, y };
    });

    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      path += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const fill = `${path} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

    return {
      linePath: path,
      fillPath: fill,
      isFlat: false,
      lastY: coords[coords.length - 1].y,
    };
  }, [dataPoints]);

  return (
    <View style={styles.chartWrapper}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 500 150"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="polyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.22" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Area under the path */}
        <path d={fillPath} fill="url(#polyGradient)" stroke="none" />

        {/* Main trend line */}
        <path
          d={linePath}
          fill="none"
          stroke={theme.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Highlight end dot if not a flat line */}
        {!isFlat && dataPoints.length > 0 && (
          <circle
            cx="500"
            cy={lastY}
            r="4"
            fill={theme.primary}
            stroke={theme.backgroundElement}
            strokeWidth="1.5"
          />
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
