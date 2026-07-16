import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface TransactionItem {
  transaction_id: string;
  asset_symbol: string;
  amount: number | string;
  type: string;
  status: string;
  transaction_notes: string;
  created_at: string;
}

interface ChartProps {
  transactions?: TransactionItem[];
  currentBalance?: number;
}

export function Chart({ transactions = [], currentBalance = 0 }: ChartProps) {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('ALL');

  // Filter and process transactions chronologically to build balance history
  const chartData = useMemo(() => {
    // 1. Filter out failed transactions
    const successfulTx = transactions.filter(
      (tx) => tx.status.toLowerCase() !== 'failed'
    );

    // 2. Sort from oldest to newest to build cumulative history
    const sortedTx = [...successfulTx].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 3. Filter based on selected time range
    const now = new Date();
    const filteredTx = sortedTx.filter((tx) => {
      const txDate = new Date(tx.created_at);
      const diffTime = Math.abs(now.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeRange === '1D') return diffDays <= 1;
      if (timeRange === '1W') return diffDays <= 7;
      if (timeRange === '1M') return diffDays <= 30;
      return true; // 'ALL'
    });

    // 4. Calculate historical data points starting backward from current balance
    let runningBalance = currentBalance;
    const points: number[] = [runningBalance];

    // Read transactions backwards (newest to oldest) to reconstruct past balances
    for (let i = filteredTx.length - 1; i >= 0; i--) {
      const tx = filteredTx[i];
      const amount = parseFloat(String(tx.amount)) || 0;

      // Invert transaction operation to go back in time
      if (tx.type === 'topup' || tx.type === 'transfer_in') {
        runningBalance -= amount;
      } else if (tx.type === 'withdraw' || tx.type === 'transfer_out') {
        runningBalance += amount;
      } else if (tx.type === 'swap') {
        // Simple heuristic for swap: if notes show buying/selling, or just keep it neutral
        // For dashboard consistency, we treat swap as balance-neutral or slight fee reduction
        runningBalance += amount * 0.005; // minor fee adjustment going backwards
      }
      points.unshift(Math.max(0, runningBalance));
    }

    // Ensure we have at least 2 points for a line graph
    if (points.length < 2) {
      return [currentBalance, currentBalance];
    }

    return points;
  }, [transactions, currentBalance, timeRange]);

  // Generate SVG path for the chart data
  const { linePath, fillPath, isFlat } = useMemo(() => {
    const width = 500;
    const height = 150;
    const padding = 15;

    const N = chartData.length;
    const minVal = Math.min(...chartData);
    const maxVal = Math.max(...chartData);
    const range = maxVal - minVal;

    // Handle new users or flat balance histories
    if (range === 0 || N < 2) {
      const midY = height / 2;
      return {
        linePath: `M 0 ${midY} L ${width} ${midY}`,
        fillPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
        isFlat: true,
      };
    }

    // Construct curve using smooth coordinate interpolation
    const coords = chartData.map((val, i) => {
      const x = (i / (N - 1)) * width;
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return { x, y };
    });

    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      // Draw straight clean lines mimicking modern trading charts
      path += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const fill = `${path} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

    return {
      linePath: path,
      fillPath: fill,
      isFlat: false,
    };
  }, [chartData]);

  // Calculate overall profit/loss percentage
  const stats = useMemo(() => {
    const start = chartData[0];
    const end = chartData[chartData.length - 1];
    const diff = end - start;
    const percent = start === 0 ? 0 : (diff / start) * 100;

    return {
      diff,
      percent,
      isPositive: diff >= 0,
    };
  }, [chartData]);

  return (
    <View style={styles.container}>
      {/* Header section with profit stats & time range selector */}
      <View style={styles.header}>
        <View>
          <View style={styles.trendRow}>
            <ThemedText
              type="smallBold"
              style={{
                color: stats.isPositive ? theme.success : theme.danger,
                fontSize: 12,
              }}
            >
              {stats.isPositive ? '▲' : '▼'} Profit/Loss
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.trendPercent, { color: stats.isPositive ? theme.success : theme.danger }]}
            >
              {stats.diff >= 0 ? '+' : ''}
              {stats.percent.toFixed(2)}% (All time)
            </ThemedText>
          </View>
        </View>

        {/* Time Selector Buttons */}
        <View style={[styles.timeSelector, { backgroundColor: theme.background }]}>
          {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeBtn,
                timeRange === range && { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  fontSize: 10,
                  color: timeRange === range ? theme.primary : theme.textSecondary,
                }}
              >
                {range}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SVG Line Chart View */}
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
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.25" />
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
          {!isFlat && chartData.length > 0 && (
            <circle
              cx="500"
              cy={
                150 -
                15 -
                ((chartData[chartData.length - 1] - Math.min(...chartData)) /
                  (Math.max(...chartData) - Math.min(...chartData) || 1)) *
                  120
              }
              r="4"
              fill={theme.primary}
              stroke={theme.backgroundElement}
              strokeWidth="1.5"
            />
          )}
        </svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  timeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    width: '100%',
    height: 150,
    marginTop: Spacing.one,
  },
});
