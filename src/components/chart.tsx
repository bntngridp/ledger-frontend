import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

export function Chart() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '40%' }]} />
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '60%' }]} />
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '50%' }]} />
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '80%' }]} />
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '70%' }]} />
      <View style={[styles.bar, { backgroundColor: theme.primary, height: '90%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    padding: 12,
    marginVertical: 12,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    opacity: 0.8,
  },
});
