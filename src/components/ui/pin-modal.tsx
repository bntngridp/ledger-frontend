import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { api } from '@/services/api';
import {
  isBiometricSupported,
  isBiometricRegistered,
  verifyBiometric,
} from '@/hooks/use-biometric';

interface PinVerificationModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PinVerificationModal({
  visible,
  title = 'Verifikasi PIN Transaksi',
  subtitle = 'Masukkan 6 digit PIN keamanan Anda',
  onClose,
  onSuccess,
}: PinVerificationModalProps) {
  const theme = useTheme();
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Clear state when modal opens/closes & trigger pulse animation
  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      setLoading(false);
      setBiometricLoading(false);

      // Check if biometric is available & registered on this device
      isBiometricSupported().then((supported) => {
        setBiometricAvailable(supported && isBiometricRegistered());
      });

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    }
  }, [visible]);

  // Handle digit click or keypress
  const handlePressDigit = (digit: string) => {
    if (pin.length < 6 && !loading) {
      setError('');
      const newPin = pin + digit;
      setPin(newPin);

      // Auto verify when 6 digits entered
      if (newPin.length === 6) {
        verifyPinCode(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !loading) {
      setError('');
      setPin(pin.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!loading) {
      setError('');
      setPin('');
    }
  };

  const verifyPinCode = async (codeToVerify: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.auth.verifyPin(codeToVerify);
      if (res.status === 'success') {
        setLoading(false);
        onSuccess();
      } else {
        setLoading(false);
        setError(res.message || 'PIN transaksi salah. Silakan coba lagi.');
        setPin('');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Gagal memverifikasi PIN. Silakan periksa koneksi.');
      setPin('');
    }
  };

  const handleBiometricAuth = async () => {
    setBiometricLoading(true);
    setError('');

    try {
      const result = await verifyBiometric();
      if (result.success) {
        setBiometricLoading(false);
        onSuccess();
      } else {
        setBiometricLoading(false);
        setError(result.error || 'Verifikasi biometrik gagal atau dibatalkan');
      }
    } catch (err: any) {
      setBiometricLoading(false);
      setError(err?.message || 'Gagal memverifikasi biometrik');
    }
  };

  // Keyboard listener for Web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePressDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, pin, loading]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
            <TouchableOpacity onPress={onClose} id="pin-modal-close-btn">
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Central Animated Pulse Graphic */}
          <View style={styles.graphicContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: error ? theme.danger : theme.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: (error ? theme.danger : theme.primary) + '18',
                },
              ]}
            >
              <Ionicons
                name={error ? 'alert-circle-outline' : 'keypad'}
                size={36}
                color={error ? theme.danger : theme.primary}
              />
            </View>
          </View>

          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>

          {/* 6 Dots Indicator */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: error ? theme.danger : isFilled ? theme.primary : theme.border,
                      backgroundColor: isFilled
                        ? error
                          ? theme.danger
                          : theme.primary
                        : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Feedback / Alert */}
          <View style={styles.feedbackContainer}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="code" style={{ fontSize: 11, color: theme.primary, marginLeft: 8 }}>
                  Memverifikasi PIN...
                </ThemedText>
              </View>
            ) : error ? (
              <ThemedText type="smallBold" style={{ color: theme.danger, fontSize: 11, textAlign: 'center' }}>
                {error}
              </ThemedText>
            ) : (
              <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, textAlign: 'center' }}>
                Gunakan PIN default <ThemedText type="smallBold">123456</ThemedText> jika belum membuat PIN
              </ThemedText>
            )}
          </View>

          {/* Keypad Grid (3x4) */}
          <View style={styles.keypadGrid}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', 'DEL'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key) => {
                  if (key === 'C') {
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={handleClear}
                        style={[styles.keyBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                        disabled={loading}
                        id="pin-key-clear"
                      >
                        <ThemedText type="smallBold" style={{ color: theme.textSecondary, fontSize: 13 }}>
                          C
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  }
                  if (key === 'DEL') {
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={handleBackspace}
                        style={[styles.keyBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                        disabled={loading}
                        id="pin-key-del"
                      >
                        <Ionicons name="backspace-outline" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handlePressDigit(key)}
                      style={[styles.keyBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                      disabled={loading}
                      id={`pin-key-${key}`}
                    >
                      <ThemedText type="subtitle" style={{ fontSize: 20, fontWeight: '700' }}>
                        {key}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Biometric Shortcut Button (if available) */}
          {biometricAvailable && (
            <TouchableOpacity
              onPress={handleBiometricAuth}
              disabled={loading || biometricLoading}
              style={[
                styles.biometricBtn,
                {
                  backgroundColor: theme.primary + '12',
                  borderColor: theme.primary + '30',
                },
              ]}
              id="pin-biometric-btn"
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="finger-print" size={20} color={theme.primary} />
              )}
              <ThemedText
                type="smallBold"
                style={{ color: theme.primary, fontSize: 13, marginLeft: 8 }}
              >
                {biometricLoading ? 'Memverifikasi...' : 'Gunakan Sidik Jari'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      } as any,
      default: {
        flex: 1,
      },
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100000,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  graphicContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  feedbackContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keypadGrid: {
    width: '100%',
    gap: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  keyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
});
