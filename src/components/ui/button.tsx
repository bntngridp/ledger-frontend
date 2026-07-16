import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  title: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  loading = false,
  title,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  // Color mappings
  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: 'transparent',
          border: theme.primary,
          text: theme.primary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          text: theme.textSecondary,
        };
      case 'danger':
        return {
          bg: theme.danger,
          border: theme.danger,
          text: '#ffffff',
        };
      case 'primary':
      default:
        return {
          bg: theme.primary,
          border: theme.primary,
          text: '#ffffff',
        };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[size],
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: disabled || loading ? 0.6 : pressed ? 0.85 : 1.0,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${size}`],
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_small: {
    fontSize: 13,
  },
  text_medium: {
    fontSize: 15,
  },
  text_large: {
    fontSize: 16,
  },
});
