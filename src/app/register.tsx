import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

import { api, API_BASE_URL } from '@/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; api?: string }>({});
  const [loading, setLoading] = useState(false);

  // Safe back navigation — if no history, go to /welcome
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/welcome');
    }
  };

  const validateForm = () => {
    const tempErrors: typeof errors = {};
    if (!username) {
      tempErrors.username = 'Username is required';
    } else if (username.length < 3) {
      tempErrors.username = 'Username must be at least 3 characters';
    }
    if (!email) {
      tempErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      const response = await api.auth.register({ username, email, password });

      if (response.status === 'success') {
        // Best practice: do NOT auto-login. Redirect to login with pre-filled
        // email and a success flag so the login screen shows a success banner.
        router.replace(`/login?email=${encodeURIComponent(email)}&registered=true`);
      } else {
        setErrors({ api: response.message });
      }
    } catch (err: any) {
      setErrors({ api: err.message || 'An error occurred during registration' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // Google OAuth handles both sign-up and sign-in in one unified flow.
    // After consent, the backend will redirect to /login?token=JWT
    // and the login screen will automatically navigate to the dashboard.
    const serverRoot = API_BASE_URL.replace('/api/v1', '');
    const googleAuthUrl = `${serverRoot}/api/v1/auth/google`;

    if (Platform.OS === 'web') {
      window.location.href = googleAuthUrl;
    } else {
      Linking.openURL(googleAuthUrl).catch(() => {
        Alert.alert('Error', 'Failed to open Google sign-in.');
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with safe back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <ThemedText type="subtitle" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join Ledger to manage your assets securely
            </ThemedText>

            <Input
              label="USERNAME"
              placeholder="E.g. bintangrp"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              autoCapitalize="none"
              iconLeft="person-outline"
            />

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
              label="PASSWORD (MIN 6 CHARACTERS)"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              iconLeft="lock-closed-outline"
            />

            {errors.api && (
              <View style={[styles.errorBanner, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
                <ThemedText style={{ color: theme.danger, marginLeft: 8, fontSize: 13, flex: 1 }}>
                  {errors.api}
                </ThemedText>
              </View>
            )}

            <Button
              title="Sign Up"
              variant="primary"
              loading={loading}
              onPress={handleRegister}
              style={styles.submitBtn}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <ThemedText type="small" style={[styles.dividerText, { color: theme.textSecondary }]}>
                or
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google — unified sign-up / sign-in via OAuth */}
            <Button
              title="Continue with Google"
              variant="ghost"
              onPress={handleGoogleSignUp}
              style={[styles.googleBtn, { borderColor: theme.border, borderWidth: 1 }]}
            />

            <TouchableOpacity
              onPress={() => router.replace('/login')}
              style={styles.footerLink}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Already have an account?{' '}
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Log In
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: Spacing.two,
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
});
