import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export function Card({ style, bordered = false, children, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: bordered ? 1.5 : 0,
          shadowColor: '#000000',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    // iOS Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    // Android Shadow
    elevation: 3,
  },
});
