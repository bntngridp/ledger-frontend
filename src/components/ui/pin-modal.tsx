import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Card } from './card';
import { useTheme } from '@/hooks/use-theme';
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

  // Clear state when modal opens/closes
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
      <View style={styles.modalBackdrop}>
        <Card
          style={[
            styles.pinModalCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
          bordered
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.lockIconBox, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="lock-closed" size={24} color={theme.primary} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} id="pin-modal-close-btn">
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ThemedText type="subtitle" style={styles.titleText}>
            {title}
          </ThemedText>
          <ThemedText type="code" style={[styles.subtitleText, { color: theme.textSecondary }]}>
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

          {/* Error / Loading Feedback */}
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
                        style={[styles.keyBtn, { backgroundColor: theme.background }]}
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
                        style={[styles.keyBtn, { backgroundColor: theme.background }]}
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

          {/* Biometric Fingerprint Button */}
          {biometricAvailable && (
            <TouchableOpacity
              onPress={async () => {
                setBiometricLoading(true);
                setError('');
                const result = await verifyBiometric();
                setBiometricLoading(false);
                if (result.success) {
                  onSuccess();
                } else {
                  setError(result.error || 'Verifikasi biometrik gagal');
                }
              }}
              disabled={loading || biometricLoading}
              style={[
                styles.biometricBtn,
                {
                  backgroundColor: theme.primary + '15',
                  borderColor: theme.primary + '40',
                  opacity: (loading || biometricLoading) ? 0.5 : 1,
                },
              ]}
              id="pin-biometric-btn"
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="finger-print" size={22} color={theme.primary} />
              )}
              <ThemedText
                type="smallBold"
                style={{ color: theme.primary, fontSize: 13, marginLeft: 8 }}
              >
                {biometricLoading ? 'Memverifikasi...' : 'Gunakan Sidik Jari'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pinModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  feedbackContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keypadGrid: {
    width: '100%',
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyBtn: {
    flex: 1,
    height: 52,
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
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
});
