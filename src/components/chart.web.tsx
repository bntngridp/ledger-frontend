import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Chart() {
  const theme = useTheme();

  return (
    <View style={{ width: '100%', height: 160, marginVertical: 16 }}>
      <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Gradient fill */}
        <path
          d="M 0 140 Q 80 80 150 110 T 300 40 T 450 80 T 500 30 L 500 160 L 0 160 Z"
          fill="url(#chartGradient)"
        />
        
        {/* Stroke line */}
        <path
          d="M 0 140 Q 80 80 150 110 T 300 40 T 450 80 T 500 30"
          fill="none"
          stroke={theme.primary}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Dynamic points on chart line */}
        <circle cx="150" cy="110" r="5" fill="#ffffff" stroke={theme.primary} strokeWidth="2" />
        <circle cx="300" cy="40" r="5" fill="#ffffff" stroke={theme.primary} strokeWidth="2" />
      </svg>
    </View>
  );
}
