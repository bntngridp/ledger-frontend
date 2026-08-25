import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import {
  isBiometricSupported,
  isBiometricRegistered,
  registerBiometric,
  verifyBiometric,
} from '@/hooks/use-biometric';
import { api } from '@/services/api';

interface BiometricModalProps {
  visible: boolean;
  onClose: () => void;
  user: {
    userId: string;
    username: string;
    email: string;
  };
  onSuccess?: () => void;
}

export function BiometricManagementModal({
  visible,
  onClose,
  user,
  onSuccess,
}: BiometricModalProps) {
  const theme = useTheme();

  const [supported, setSupported] = useState<boolean>(true);
  const [registered, setRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      setError('');
      setMessage('');
      isBiometricSupported().then((isSupp) => {
        setSupported(isSupp);
        setRegistered(isBiometricRegistered());
      });

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const userIdBytes = new TextEncoder().encode(user.userId);
      const result = await registerBiometric(userIdBytes, user.username, user.email);

      if (result.success) {
        setRegistered(true);
        setMessage('Sensor sidik jari / Face ID berhasil didaftarkan ke akun Anda.');
        onSuccess?.();
      } else {
        setError(result.error || 'Pendaftaran biometrik dibatalkan atau gagal');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleTestVerify = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await verifyBiometric();
      if (result.success) {
        setMessage('Autentikasi biometrik berhasil diverifikasi!');
      } else {
        setError(result.error || 'Autentikasi biometrik tidak cocok atau dibatalkan');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memverifikasi biometrik');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.auth.disableBiometric();
      if (res.status === 'success') {
        localStorage.removeItem('ledger_biometric_registered');
        localStorage.removeItem('ledger_biometric_credential_id');
        setRegistered(false);
        setMessage('Data sensor biometrik telah dihapus dari akun.');
        onSuccess?.();
      } else {
        setError(res.message || 'Gagal menonaktifkan biometrik');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menonaktifkan biometrik');
    } finally {
      setLoading(false);
    }
  };

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
              Sidik Jari & Biometrik
            </ThemedText>
            <TouchableOpacity onPress={onClose} id="biometric-modal-close-btn">
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Central Animated Biometric Graphic */}
          <View style={styles.graphicContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: registered ? theme.success : theme.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: registered
                    ? theme.success + '18'
                    : theme.primary + '18',
                },
              ]}
            >
              <Ionicons
                name="finger-print"
                size={44}
                color={registered ? theme.success : theme.primary}
              />
            </View>
          </View>

          {/* Device Capability Badge */}
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: registered
                  ? theme.success + '15'
                  : theme.primary + '15',
                borderColor: registered
                  ? theme.success + '40'
                  : theme.primary + '40',
              },
            ]}
          >
            <Ionicons
              name={registered ? 'checkmark-circle' : 'shield-checkmark-outline'}
              size={15}
              color={registered ? theme.success : theme.primary}
            />
            <ThemedText
              type="smallBold"
              style={{
                color: registered ? theme.success : theme.primary,
                fontSize: 12,
              }}
            >
              {registered
                ? 'Sensor Terdaftar & Aktif'
                : supported
                ? 'Touch ID / Windows Hello Didukung'
                : 'Sensor Perangkat Siap'}
            </ThemedText>
          </View>

          {/* Descriptive Information */}
          <ThemedText
            type="small"
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {registered
              ? 'Autentikasi biometrik aktif pada akun ini. Anda dapat mengotorisasi transfer, penarikan, dan swap instan dengan sidik jari.'
              : 'Daftarkan Touch ID, Face ID, atau Windows Hello perangkat Anda untuk keamanan transaksi kelas institusi.'}
          </ThemedText>

          {/* Feedback Messages */}
          {message ? (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: theme.success + '15',
                  borderColor: theme.success,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={theme.success}
              />
              <ThemedText
                type="smallBold"
                style={{ color: theme.success, flex: 1, fontSize: 12 }}
              >
                {message}
              </ThemedText>
            </View>
          ) : null}

          {error ? (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: theme.danger + '15',
                  borderColor: theme.danger,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={theme.danger}
              />
              <ThemedText
                type="small"
                style={{ color: theme.danger, flex: 1, fontSize: 12 }}
              >
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionGroup}>
            {!registered ? (
              <Button
                title="Daftarkan Sensor Biometrik"
                variant="primary"
                loading={loading}
                onPress={handleRegister}
                style={styles.fullBtn}
                id="btn-register-biometric"
              />
            ) : (
              <>
                <Button
                  title="Uji Autentikasi Sensor"
                  variant="primary"
                  loading={loading}
                  onPress={handleTestVerify}
                  style={styles.fullBtn}
                  id="btn-test-biometric"
                />
                <Button
                  title="Hapus / Reset Data Biometrik"
                  variant="ghost"
                  disabled={loading}
                  onPress={handleDisable}
                  style={[styles.fullBtn, { marginTop: 4 }]}
                  id="btn-disable-biometric"
                />
              </>
            )}

            <Button
              title="Tutup"
              variant="secondary"
              onPress={onClose}
              style={[styles.fullBtn, { marginTop: 6 }]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
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
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  graphicContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  description: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  alertBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  actionGroup: {
    width: '100%',
    marginTop: Spacing.three,
  },
  fullBtn: {
    width: '100%',
    borderRadius: 12,
  },
});
