import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

import { api } from '@/services/api';
import { storage } from '@/services/storage';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string; api?: string }>({});
  const [loading, setLoading] = useState(false);

  // 2FA Flow states
  const [requires2FA, setRequires2FA] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

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

  const handleVerify2FA = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Code must be 6 digits' });
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      const response = await api.auth.verify2FALogin({
        email,
        otp_code: otpCode,
      });
      setLoading(false);

      if (response.status === 'success' && response.data?.token) {
        await storage.setItem('auth_token', response.data.token);
        router.replace('/(tabs)');
      } else {
        setErrors({ otp: response.message });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ otp: err.message || 'Verification failed' });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!requires2FA ? (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                Welcome Back
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                Access your secure financial dashboard
              </ThemedText>

              <Input
                label="EMAIL ADDRESS"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                iconLeft="mail-outline"
              />

              <Input
                label="PASSWORD"
                placeholder="••••••••"
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
                title="Log In"
                variant="primary"
                loading={loading}
                onPress={handleLogin}
                style={styles.submitBtn}
              />

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="small" style={[styles.dividerText, { color: theme.textSecondary }]}>
                  or
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <Button
                title="Continue with Google"
                variant="ghost"
                onPress={() => router.replace('/(tabs)')}
                style={[styles.googleBtn, { borderColor: theme.border, borderWidth: 1 }]}
              />

              <TouchableOpacity
                onPress={() => router.replace('/register')}
                style={styles.footerLink}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Don't have an account?{' '}
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Sign Up
                  </ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                2FA Verification
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter the 6-digit code generated by your authenticator app
              </ThemedText>

              <Input
                label="AUTHENTICATION CODE"
                placeholder="000 000"
                value={otpCode}
                onChangeText={setOtpCode}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={6}
                iconLeft="shield-checkmark-outline"
                style={styles.otpInput}
              />

              <Button
                title="Verify & Continue"
                variant="primary"
                loading={loading}
                onPress={handleVerify2FA}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                onPress={() => setRequires2FA(false)}
                style={styles.footerLink}
              >
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                  Back to Log In
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
    paddingTop: Spacing.two,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: Spacing.four,
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: Spacing.two,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.three,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    fontWeight: '600',
    fontSize: 14,
  },
  googleBtn: {
    marginVertical: 4,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: Spacing.four,
    padding: 8,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
  },
});
