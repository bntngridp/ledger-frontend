import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';

export default function TwoFactorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  // Safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  };

  // 2FA Setup states
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // References for OTP inputs to support auto-focus / backspace-focus
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Fetch 2FA details on mount
    const load2FADetails = async () => {
      try {
        const response = await api.auth.enable2FA();
        if (response.status === 'success' && response.data) {
          setSecret(response.data.secret || '');
          setQrCodeUrl(response.data.qr_code_url || '');
        } else {
          setError(response.message || 'Failed to initialize 2FA setup');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during 2FA setup');
      } finally {
        setSetupLoading(false);
      }
    };

    load2FADetails();
  }, []);

  const handleCopySecret = () => {
    if (secret) {
      Clipboard.setString(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto-advance focus to next input box if typed
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Focus previous input box on backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify2FA = async () => {
    const fullCode = otp.join('');
    if (fullCode.length !== 6) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.verify2FAActivation({
        code: fullCode,
      });
      setLoading(false);

      if (response.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          handleBack(); // Return back to settings
        }, 2000);
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Verification failed');
    }
  };

  const isOtpComplete = otp.every((val) => val !== '');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('twofa.title')}
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {setupLoading ? (
            <View style={styles.loadingState}>
              <ThemedText style={{ color: theme.textSecondary }}>{t('twofa.loading')}</ThemedText>
            </View>
          ) : !success ? (
            <View style={styles.body}>
              <ThemedText style={[styles.instruction, { color: theme.textSecondary }]}>
                {t('twofa.scanQr')}
              </ThemedText>

              {/* QR Code Container */}
              <View style={[styles.qrContainer, { borderColor: theme.border, backgroundColor: '#ffffff' }]}>
                {qrCodeUrl ? (
                  <QRCode value={qrCodeUrl} size={160} />
                ) : (
                  <Ionicons name="qr-code-outline" size={160} color="#000000" />
                )}
              </View>

              {/* Secret Key Box */}
              <View style={styles.secretSection}>
                <ThemedText type="code" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {t('twofa.secretKey')}
                </ThemedText>
                <View style={[styles.secretRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="code" style={styles.secretText}>
                    {secret}
                  </ThemedText>
                  <TouchableOpacity onPress={handleCopySecret} style={styles.copyBtn}>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText type="small" style={[styles.secretHint, { color: theme.textSecondary }]}>
                  {t('twofa.manualKeyHint')}
                </ThemedText>
              </View>

              {/* Verification Code Box */}
              <View style={styles.verificationSection}>
                <ThemedText type="smallBold" style={[styles.otpLabel, { color: theme.textSecondary }]}>
                  {t('twofa.enterCode')}
                </ThemedText>
                <ThemedText type="small" style={[styles.otpDesc, { color: theme.textSecondary }]}>
                  {t('twofa.codeHint')}
                </ThemedText>

                {/* 6 box digit input */}
                <View style={styles.otpInputRow}>
                  {otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(ref) => {
                        inputRefs.current[idx] = ref;
                      }}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: digit ? theme.primary : theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus
                      textAlign="center"
                    />
                  ))}
                </View>
              </View>

              {error ? (
                <ThemedText style={{ color: theme.danger, marginBottom: Spacing.two, fontWeight: '500' }}>
                  {error}
                </ThemedText>
              ) : null}

              <Button
                title={t('twofa.verifyBtn')}
                variant="primary"
                disabled={!isOtpComplete}
                loading={loading}
                onPress={handleVerify2FA}
                style={styles.submitBtn}
              />
            </View>
          ) : (
            <View style={styles.successState}>
              <View style={[styles.successIconContainer, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={56} color={theme.success} />
              </View>
              <ThemedText type="subtitle" style={{ marginTop: Spacing.three }}>
                {t('twofa.activatedTitle')}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one, textAlign: 'center' }}>
                {t('twofa.activatedDesc')}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  body: {
    alignItems: 'center',
    width: '100%',
  },
  instruction: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  qrContainer: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
    padding: 12,
  },
  secretSection: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  secretText: {
    flex: 1,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '700',
  },
  copyBtn: {
    padding: 4,
  },
  secretHint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  verificationSection: {
    width: '100%',
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  otpDesc: {
    fontSize: 13,
    marginBottom: Spacing.three,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    marginTop: Spacing.two,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five * 2,
  },
});
