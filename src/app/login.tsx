import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform, Linking, Alert, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';

import { api, API_BASE_URL } from '@/services/api';
import { storage } from '@/services/storage';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  // Safe back navigation — if no history stack (e.g. direct URL access), go to /welcome
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/welcome');
    }
  };
  const params = useLocalSearchParams();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string; api?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA Flow states
  const [requires2FA, setRequires2FA] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = React.useRef<Array<any>>([]);

  // Handle URL redirect query parameters for Google OAuth and registration redirect
  useEffect(() => {
    const handleQueryParams = async () => {
      // 1. Google OAuth tokens
      if (params.token) {
        const token = Array.isArray(params.token) ? params.token[0] : params.token;
        await storage.setItem('auth_token', token);
        router.replace('/(tabs)');
      } else if (params.pre_auth_token && params.requires_2fa === 'true') {
        const pat = Array.isArray(params.pre_auth_token) ? params.pre_auth_token[0] : params.pre_auth_token;
        setPreAuthToken(pat);
        setRequires2FA(true);
      } else if (params.error) {
        const errMsg = Array.isArray(params.error) ? params.error[0] : params.error;
        setErrors({ api: decodeURIComponent(errMsg) });
      }

      // 2. Pre-filled Email from Registration
      if (params.email) {
        const mailParam = Array.isArray(params.email) ? params.email[0] : params.email;
        setEmail(decodeURIComponent(mailParam));
      }
      if (params.registered === 'true') {
        setSuccessMessage(t('auth.registerSuccess'));
      }
    };

    handleQueryParams();
  }, [params]);

  const validateForm = () => {
    const tempErrors: typeof errors = {};
    if (!email) {
      tempErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await api.auth.login({ email, password });
      setLoading(false);

      if (response.status === 'success' && response.data) {
        const { token, two_factor_required, pre_auth_token } = response.data;

        if (two_factor_required) {
          setPreAuthToken(pre_auth_token || '');
          setRequires2FA(true);
        } else if (token) {
          await storage.setItem('auth_token', token);
          router.replace('/(tabs)');
        }
      } else {
        setErrors({ api: response.message });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ api: err.message || 'An error occurred during login' });
    }
  };

  const verifyLogin2FADirect = async (codeStr: string) => {
    if (codeStr.length !== 6) {
      setErrors({ otp: 'Code must be 6 digits' });
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      const response = await api.auth.verify2FALogin({
        pre_auth_token: preAuthToken,
        code: codeStr,
      });
      setLoading(false);

      if (response.status === 'success' && response.data?.token) {
        await storage.setItem('auth_token', response.data.token);
        router.replace('/(tabs)');
      } else {
        setErrors({ otp: response.message || 'Verification failed' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ otp: err.message || 'Verification failed' });
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    // Handle Paste (user pastes 6 digits into any box)
    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      
      const targetIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[targetIndex]?.focus();

      if (pastedDigits.length === 6) {
        verifyLogin2FADirect(pastedDigits.join(''));
      }
      return;
    }

    // Normal single digit typing
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto-advance focus to next input box if typed
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits completed, auto-submit
    const fullCode = newOtp.join('');
    if (fullCode.length === 6) {
      verifyLogin2FADirect(fullCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Focus previous input box on Backspace
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleVerify2FA = async () => {
    const fullCode = otp.join('');
    verifyLogin2FADirect(fullCode);
  };

  const handleGoogleLogin = () => {
    const serverRoot = API_BASE_URL.replace('/api/v1', '');
    const googleAuthUrl = `${serverRoot}/api/v1/auth/google`;

    if (Platform.OS === 'web') {
      window.location.href = googleAuthUrl;
    } else {
      Linking.openURL(googleAuthUrl).catch(() => {
        Alert.alert('Error', 'Failed to open browser redirections.');
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!requires2FA ? (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                {t('auth.welcomeBack')}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                {t('auth.loginSubtitle')}
              </ThemedText>

              {successMessage ? (
                <View style={[styles.successBanner, { backgroundColor: theme.success + '15', borderColor: theme.success }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} />
                  <ThemedText style={{ color: theme.success, marginLeft: 8, fontWeight: '600', flex: 1, fontSize: 13 }}>
                    {successMessage}
                  </ThemedText>
                </View>
              ) : null}

              <Input
                label={t('auth.emailLabel')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                iconLeft="mail-outline"
              />

              <Input
                label={t('auth.passwordLabel')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoCapitalize="none"
                iconLeft="lock-closed-outline"
              />

              {errors.api && (
                <ThemedText style={{ color: theme.danger, marginBottom: Spacing.two, fontWeight: '500' }}>
                  {errors.api}
                </ThemedText>
              )}

              <Button
                title={t('auth.logIn')}
                variant="primary"
                loading={loading}
                onPress={handleLogin}
                style={styles.submitBtn}
              />

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="small" style={[styles.dividerText, { color: theme.textSecondary }]}>
                  {t('common.or')}
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <Button
                title={t('auth.continueWithGoogle')}
                variant="ghost"
                onPress={handleGoogleLogin}
                iconLeft={
                  <Image
                    source={require('@/assets/images/google.png')}
                    style={{ width: 20, height: 20, resizeMode: 'contain' }}
                  />
                }
                style={[styles.googleBtn, { borderColor: theme.border, borderWidth: 1 }]}
              />

              <TouchableOpacity
                onPress={() => router.replace('/register')}
                style={styles.footerLink}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('auth.dontHaveAccount')}{' '}
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {t('auth.signUp')}
                  </ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                {t('auth.twoFactorVerification')}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                {t('auth.twoFactorSubtitle')}
              </ThemedText>

              {/* 6 box digit input */}
              <View style={styles.otpInputRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref: any) => {
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
                    onChangeText={(text: string) => handleOtpChange(text, idx)}
                    onKeyPress={(e: any) => handleKeyPress(e, idx)}
                    keyboardType="numeric"
                    maxLength={6}
                    selectTextOnFocus
                    textAlign="center"
                  />
                ))}
              </View>

              {errors.otp ? (
                <ThemedText style={{ color: theme.danger, marginTop: Spacing.two, fontWeight: '500' }}>
                  {errors.otp}
                </ThemedText>
              ) : null}

              <Button
                title={t('auth.verifyCode')}
                variant="primary"
                loading={loading}
                onPress={handleVerify2FA}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                onPress={() => {
                  setRequires2FA(false);
                  setOtp(['', '', '', '', '', '']);
                }}
                style={styles.footerLink}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {t('auth.backToLogin')}
                </ThemedText>
              </TouchableOpacity>
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 12,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  formContainer: {
    marginTop: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: Spacing.five,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: Spacing.four,
  },
  submitBtn: {
    marginTop: Spacing.four,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    fontWeight: '600',
  },
  googleBtn: {
    marginBottom: Spacing.four,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    marginVertical: Spacing.three,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
  },
});
