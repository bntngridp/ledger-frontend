import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  ScrollView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Button } from './button';
import { Input } from './input';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing } from '@/constants/theme';
import { api } from '@/services/api';
import {
  isBiometricSupported,
  isBiometricRegistered,
  verifyBiometric,
} from '@/hooks/use-biometric';
import { toLocalizedDigits } from '@/utils/format';

export interface SecurityAuthResult {
  twoFactorCode?: string;
  emailOTP?: string;
}

interface PaymentSecurityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (authData: SecurityAuthResult) => void;
  title?: string;
  subtitle?: string;
}

export function PaymentSecurityModal({
  visible,
  onClose,
  onSuccess,
  title,
  subtitle,
}: PaymentSecurityModalProps) {
  const theme = useTheme();
  const { t, language } = useTranslation();

  // User profile & 2FA status
  const [checkingUser, setCheckingUser] = useState<boolean>(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // 2FA + Email OTP Form state
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [emailOtp, setEmailOtp] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // PIN fallback state (if 2FA not enabled)
  const [pin, setPin] = useState<string>('');
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = (seconds: number = 60) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fetch user 2FA status and auto-send OTP if 2FA enabled
  useEffect(() => {
    if (visible) {
      setError('');
      setLoading(false);
      setTwoFactorCode('');
      setEmailOtp('');
      setPin('');
      setOtpSent(false);
      setCheckingUser(true);

      (async () => {
        try {
          const res = await api.auth.getMe();
          if (res.status === 'success' && res.data) {
            const has2FA = !!(res.data.two_factor_enabled ?? res.data.is_2fa_enabled);
            setIs2FAEnabled(has2FA);
            setUserEmail(res.data.email || '');

            if (has2FA) {
              // Automatically send the first Email OTP
              setOtpLoading(true);
              const otpRes = await api.auth.sendPaymentEmailOtp();
              setOtpLoading(false);
              if (otpRes.status === 'success') {
                setOtpSent(true);
                startCountdown(60);
              }
            } else {
              // Check biometric support for PIN mode
              isBiometricSupported().then((supported) => {
                setBiometricAvailable(supported && isBiometricRegistered());
              });
            }
          }
        } catch (err) {
          console.error('Failed to get user 2FA status:', err);
        } finally {
          setCheckingUser(false);
        }
      })();

      // Pulse animation for shield icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
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
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible]);

  // Handle manual resend of Email OTP
  const handleSendEmailOtp = async () => {
    if (countdown > 0 || otpLoading) return;
    setOtpLoading(true);
    setError('');
    try {
      const res = await api.auth.sendPaymentEmailOtp();
      setOtpLoading(false);
      if (res.status === 'success') {
        setOtpSent(true);
        startCountdown(60);
      } else {
        setError(res.message || 'Gagal mengirim kode OTP email');
      }
    } catch (err: any) {
      setOtpLoading(false);
      setError(err?.message || 'Gagal mengirim kode OTP email');
    }
  };

  const handlePaste2FA = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setTwoFactorCode(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handlePasteEmailOtp = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setEmailOtp(text.trim());
      }
    } catch {
      // ignore
    }
  };

  // Confirm dual 2FA + Email OTP
  const handleConfirm2FAAuth = () => {
    const cleaned2FA = twoFactorCode.trim();
    const cleanedEmail = emailOtp.trim();

    if (!cleaned2FA) {
      setError(t('paymentSecurityModal.missing2FACode') || 'Kode 2FA Authenticator wajib diisi');
      return;
    }
    if (!cleanedEmail) {
      setError(t('paymentSecurityModal.missingEmailOTP') || 'Kode OTP Email wajib diisi');
      return;
    }

    setError('');
    onSuccess({
      twoFactorCode: cleaned2FA,
      emailOTP: cleanedEmail,
    });
  };

  // --- PIN Fallback Logic (When 2FA is not enabled) ---
  const handlePressDigit = (digit: string) => {
    if (pin.length < 6 && !loading) {
      setError('');
      const newPin = pin + digit;
      setPin(newPin);

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
        onSuccess({});
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
        onSuccess({});
      } else {
        setBiometricLoading(false);
        setError(result.error || 'Verifikasi biometrik gagal');
      }
    } catch (err: any) {
      setBiometricLoading(false);
      setError(err?.message || 'Gagal memverifikasi biometrik');
    }
  };

  // Masked Email Helper
  const maskedEmail = userEmail
    ? userEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`)
    : 'email terdaftar Anda';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          {/* Close Header */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View
                style={[
                  styles.securityBadge,
                  { backgroundColor: is2FAEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
                ]}
              >
                <Ionicons
                  name={is2FAEnabled ? 'shield-checkmark' : 'lock-closed'}
                  size={14}
                  color={is2FAEnabled ? '#3B82F6' : '#10B981'}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: is2FAEnabled ? '#3B82F6' : '#10B981',
                    fontSize: 11,
                    fontWeight: '700',
                    marginLeft: 4,
                  }}
                >
                  {is2FAEnabled ? '2FA + EMAIL OTP AKTIF' : 'PIN KEAMANAN'}
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.background }]}
              id="payment-security-cancel-btn"
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {checkingUser ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>
                Memeriksa status keamanan...
              </ThemedText>
            </View>
          ) : is2FAEnabled ? (
            /* --- DUAL 2FA + EMAIL OTP FORM --- */
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
              </Animated.View>

              <ThemedText type="subtitle" style={styles.titleText}>
                {title || t('paymentSecurityModal.title') || 'Otorisasi Keamanan Transaksi'}
              </ThemedText>
              <ThemedText style={[styles.subtitleText, { color: theme.textSecondary }]}>
                {subtitle ||
                  t('paymentSecurityModal.subtitle2FA') ||
                  'Akun Anda dilindungi 2FA. Masukkan kode Authenticator dan kode OTP Email untuk menyelesaikan transaksi ini.'}
              </ThemedText>

              {/* Email OTP Note */}
              <View
                style={[
                  styles.emailNoticeBox,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="mail" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                    Kode OTP dikirimkan ke <ThemedText type="smallBold">{maskedEmail}</ThemedText>
                  </ThemedText>
                </View>
              </View>

              {/* Field 1: 2FA Authenticator Code */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('paymentSecurityModal.twoFactorLabel') || '1. KODE 2FA AUTHENTICATOR'}
                  </ThemedText>
                  <TouchableOpacity onPress={handlePaste2FA} style={styles.pasteBtn}>
                    <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                      Tempel
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <Input
                  value={twoFactorCode}
                  onChangeText={(val) => {
                    setTwoFactorCode(val);
                    setError('');
                  }}
                  placeholder={
                    t('paymentSecurityModal.twoFactorPlaceholder') ||
                    '6-digit kode Authenticator / Recovery code'
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  id="payment-2fa-code-input"
                  iconLeft="key-outline"
                />
              </View>

              {/* Field 2: Email OTP */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('paymentSecurityModal.emailOtpLabel') || '2. KODE OTP EMAIL'}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handlePasteEmailOtp}
                    style={styles.pasteBtn}
                  >
                    <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                      Tempel
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.emailOtpInputRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={emailOtp}
                      onChangeText={(val) => {
                        setEmailOtp(val);
                        setError('');
                      }}
                      placeholder={
                        t('paymentSecurityModal.emailOtpPlaceholder') || '6-digit kode email'
                      }
                      keyboardType="numeric"
                      maxLength={8}
                      id="payment-email-otp-input"
                      iconLeft="mail-outline"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSendEmailOtp}
                    disabled={countdown > 0 || otpLoading}
                    style={[
                      styles.resendOtpButton,
                      {
                        backgroundColor:
                          countdown > 0 || otpLoading
                            ? theme.background
                            : 'rgba(59, 130, 246, 0.15)',
                        borderColor: countdown > 0 ? theme.border : '#3B82F6',
                      },
                    ]}
                    id="payment-send-otp-btn"
                  >
                    {otpLoading ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: countdown > 0 ? theme.textSecondary : '#3B82F6',
                          fontSize: 12,
                        }}
                      >
                        {countdown > 0
                          ? `${t('paymentSecurityModal.resendOtpBtn') || 'Kirim Ulang'} (${countdown}s)`
                          : otpSent
                          ? t('paymentSecurityModal.resendOtpBtn') || 'Kirim Ulang'
                          : t('paymentSecurityModal.sendOtpBtn') || 'Kirim OTP'}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <Button
                  title={t('paymentSecurityModal.cancelBtn') || 'Batal'}
                  variant="ghost"
                  onPress={onClose}
                  style={styles.cancelButton}
                />
                <Button
                  title={t('paymentSecurityModal.confirmBtn') || 'Konfirmasi & Otorisasi'}
                  onPress={handleConfirm2FAAuth}
                  loading={loading}
                  style={styles.confirmButton}
                  id="payment-security-confirm-btn"
                />
              </View>
            </ScrollView>
          ) : (
            /* --- PIN FALLBACK MODE (When 2FA is not enabled) --- */
            <View style={styles.pinBody}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons name="lock-closed" size={32} color="#10B981" />
              </Animated.View>

              <ThemedText type="subtitle" style={styles.titleText}>
                {t('pinModal.verifyTitle') || 'Verifikasi PIN Transaksi'}
              </ThemedText>
              <ThemedText style={[styles.subtitleText, { color: theme.textSecondary }]}>
                {t('pinModal.verifySubtitle') || 'Masukkan 6 digit PIN keamanan Anda'}
              </ThemedText>

              {/* 6 Digit Indicators */}
              <View style={styles.dotsRow}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isFilled = index < pin.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.pinDot,
                        {
                          backgroundColor: isFilled ? theme.primary : 'transparent',
                          borderColor: isFilled ? theme.primary : theme.border,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Loading Indicator */}
              {loading ? (
                <View style={styles.statusBox}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText style={{ marginLeft: 8, color: theme.textSecondary }}>
                    Memverifikasi PIN...
                  </ThemedText>
                </View>
              ) : null}

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              {/* PIN Keypad Grid */}
              <View style={styles.keypadGrid}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['clear', '0', 'backspace'],
                ].map((row, rIndex) => (
                  <View key={rIndex} style={styles.keypadRow}>
                    {row.map((btn) => {
                      if (btn === 'clear') {
                        return (
                          <TouchableOpacity
                            key={btn}
                            style={[styles.keyButton, { backgroundColor: theme.background }]}
                            onPress={handleClear}
                            disabled={loading}
                          >
                            <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                              C
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      }
                      if (btn === 'backspace') {
                        return (
                          <TouchableOpacity
                            key={btn}
                            style={[styles.keyButton, { backgroundColor: theme.background }]}
                            onPress={handleBackspace}
                            disabled={loading}
                          >
                            <Ionicons name="backspace-outline" size={22} color={theme.text} />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={btn}
                          style={[styles.keyButton, { backgroundColor: theme.background }]}
                          onPress={() => handlePressDigit(btn)}
                          disabled={loading}
                        >
                          <ThemedText type="subtitle" style={styles.digitText}>
                            {toLocalizedDigits(btn, language)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Biometric Button */}
              {biometricAvailable ? (
                <TouchableOpacity
                  style={[styles.biometricBtn, { borderColor: theme.border }]}
                  onPress={handleBiometricAuth}
                  disabled={loading || biometricLoading}
                >
                  {biometricLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="finger-print-outline" size={20} color={theme.primary} />
                      <ThemedText type="smallBold" style={{ color: theme.primary, marginLeft: 8 }}>
                        {t('pinModal.useBiometrics') || 'Gunakan Biometrik'}
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    maxHeight: '90%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    alignItems: 'center',
  },
  pinBody: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  titleText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  emailNoticeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  inputGroup: {
    width: '100%',
    marginBottom: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  pasteBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  emailOtpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendOtpButton: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: Spacing.three,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: Spacing.one,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
  // Keypad Styles for PIN fallback
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: Spacing.three,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  keypadGrid: {
    width: '100%',
    gap: 10,
    marginTop: Spacing.one,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  keyButton: {
    width: 64,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 20,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: Spacing.three,
    width: '100%',
  },
});
