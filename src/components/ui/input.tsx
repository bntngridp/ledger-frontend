import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onPressIconRight?: () => void;
}

export function Input({
  label,
  error,
  containerStyle,
  secureTextEntry,
  iconLeft,
  iconRight,
  onPressIconRight,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPasswordInput = secureTextEntry !== undefined;
  const shouldSecure = isPasswordInput && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error
              ? theme.danger
              : isFocused
              ? theme.primary
              : theme.border,
            borderWidth: 1.5,
          },
        ]}
      >
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={20}
            color={theme.textSecondary}
            style={styles.iconLeft}
          />
        )}

        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={shouldSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {isPasswordInput ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.iconRight}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        ) : iconRight ? (
          <TouchableOpacity
            onPress={onPressIconRight}
            disabled={!onPressIconRight}
            style={styles.iconRight}
          >
            <Ionicons name={iconRight} size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error && (
        <Text style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
