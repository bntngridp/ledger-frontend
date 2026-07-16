import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Chart() {
  const theme = useTheme();

  // Chart path: smooth S-curve going up left-to-right
  // ViewBox: 0 0 500 200, with comfortable padding top/bottom
  const linePath = 'M 0 160 C 60 160, 80 120, 120 110 S 200 70, 250 60 S 340 40, 400 50 S 460 55, 500 30';
  const fillPath = `${linePath} L 500 200 L 0 200 Z`;

  return (
    <View
      style={{
        width: '100%',
        height: 200,
        marginVertical: 8,
        overflow: 'hidden',
        borderRadius: 8,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 500 200"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.35" />
            <stop offset="70%" stopColor={theme.primary} stopOpacity="0.05" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
          </linearGradient>
          {/* Clip path to keep everything inside bounds */}
          <clipPath id="chartClip">
            <rect x="0" y="0" width="500" height="200" />
          </clipPath>
        </defs>

        <g clipPath="url(#chartClip)">
          {/* Gradient fill area */}
          <path
            d={fillPath}
            fill="url(#chartGradient)"
            stroke="none"
          />

          {/* Main chart line */}
          <path
            d={linePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data point dots */}
          <circle cx="250" cy="60" r="4.5" fill={theme.background} stroke={theme.primary} strokeWidth="2" />
          <circle cx="400" cy="50" r="4.5" fill={theme.background} stroke={theme.primary} strokeWidth="2" />
        </g>
      </svg>
    </View>
  );
}
