import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function ChangePasswordScreen() {
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

  // Form & Security states
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [emailOtpSuccessMsg, setEmailOtpSuccessMsg] = useState('');

  useEffect(() => {
    const checkUserStatus = async () => {
      const token = await storage.getItem('auth_token');
      if (token) {
        const decoded = decodeJwt(token);
        if (decoded?.two_factor_enabled) {
          setTfaEnabled(true);
        }
      }
    };
    checkUserStatus();
  }, []);

  // Cooldown Timer for Email OTP
  useEffect(() => {
    let timer: any;
    if (emailOtpCooldown > 0) {
      timer = setInterval(() => {
        setEmailOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpCooldown]);

  const handleSendEmailOTP = async () => {
    setEmailOtpSending(true);
    setError('');
    setEmailOtpSuccessMsg('');

    try {
      const resp = await api.auth.sendChangePasswordEmailOTP();
      setEmailOtpSending(false);
      if (resp.status === 'success') {
        setEmailOtpSuccessMsg(t('auth.otpSentToEmail'));
        setEmailOtpCooldown(60);
      } else {
        setError(resp.message || 'Gagal mengirim kode OTP email');
      }
    } catch (err: any) {
      setEmailOtpSending(false);
      setError(err.message || 'Gagal mengirim kode OTP email');
    }
  };

  const handleSubmit = async () => {
    if (!oldPassword) {
      setError(t('auth.oldPasswordLabel') + ' ' + t('common.required', 'wajib diisi'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auth.newPasswordLabel'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (!emailOtp || emailOtp.length !== 6) {
      setError('Kode OTP email 6-digit wajib diisi');
      return;
    }
    if (tfaEnabled && (!twoFactorCode || twoFactorCode.length !== 6)) {
      setError('Kode 2FA Authenticator 6-digit wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await api.auth.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        email_otp: emailOtp,
        two_factor_code: tfaEnabled ? twoFactorCode : undefined,
      });

      setLoading(false);

      if (resp.status === 'success') {
        Alert.alert(t('common.success'), t('auth.changePasswordSuccess'), [
          {
            text: 'OK',
            onPress: () => handleBack(),
          },
        ]);
      } else {
        setError(resp.message || 'Gagal memperbarui kata sandi');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Gagal memperbarui kata sandi');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('auth.changePasswordTitle')}
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardWrapper}>
            <Card style={{ backgroundColor: theme.backgroundElement, padding: Spacing.four }}>
              {/* Header Icon & Title */}
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="lock-closed-outline" size={28} color={theme.primary} />
                </View>
                <ThemedText type="subtitle" style={styles.titleText}>
                  {t('auth.changePasswordTitle')}
                </ThemedText>
                <ThemedText style={[styles.subtitleText, { color: theme.textSecondary }]}>
                  {t('auth.changePasswordSubtitle')}
                </ThemedText>
              </View>

              <View style={styles.formGroup}>
                {/* 1. Old Password */}
                <View style={styles.fieldWrapper}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('auth.oldPasswordLabel')}
                  </ThemedText>
                  <View style={[styles.passwordInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.text }]}
                      placeholder={t('auth.oldPasswordPlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      secureTextEntry={!showOldPassword}
                    />
                    <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showOldPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. New Password */}
                <View style={styles.fieldWrapper}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('auth.newPasswordLabel')}
                  </ThemedText>
                  <View style={[styles.passwordInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.text }]}
                      placeholder={t('auth.newPasswordPlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Confirm Password */}
                <View style={styles.fieldWrapper}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('auth.confirmPasswordLabel')}
                  </ThemedText>
                  <View style={[styles.passwordInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.text }]}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Email OTP Section */}
                <View style={styles.fieldWrapper}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t('auth.emailOTPLabel')}
                  </ThemedText>
                  <View style={styles.otpRow}>
                    <TextInput
                      style={[
                        styles.otpTextInput,
                        {
                          backgroundColor: theme.background,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder={t('auth.emailOTPPlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={emailOtp}
                      onChangeText={(text) => setEmailOtp(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                    />
                    <Button
                      title={emailOtpCooldown > 0 ? `${emailOtpCooldown}s` : t('auth.sendEmailOTP')}
                      variant="secondary"
                      loading={emailOtpSending}
                      disabled={emailOtpCooldown > 0}
                      onPress={handleSendEmailOTP}
                      style={styles.sendOtpBtn}
                    />
                  </View>
                  {emailOtpSuccessMsg ? (
                    <ThemedText type="small" style={{ color: theme.primary, marginTop: 4, fontWeight: '500' }}>
                      {emailOtpSuccessMsg}
                    </ThemedText>
                  ) : null}
                </View>

                {/* 5. 2FA Code if Enabled */}
                {tfaEnabled && (
                  <View style={styles.fieldWrapper}>
                    <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                      {t('auth.twoFactorCodeLabel')}
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.standardInput,
                        {
                          backgroundColor: theme.background,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder={t('auth.twoFactorCodePlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      value={twoFactorCode}
                      onChangeText={(text) => setTwoFactorCode(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                    />
                  </View>
                )}

                {/* Error Banner */}
                {error ? (
                  <View style={[styles.errorBanner, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
                    <ThemedText style={{ color: theme.danger, marginLeft: 8, fontSize: 13, flex: 1, fontWeight: '500' }}>
                      {error}
                    </ThemedText>
                  </View>
                ) : null}

                {/* Submit Action Button */}
                <Button
                  title="Simpan Kata Sandi Baru"
                  variant="primary"
                  loading={loading}
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                />
              </View>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  titleText: {
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: Spacing.two,
  },
  formGroup: {
    gap: 16,
  },
  fieldWrapper: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 8,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  otpTextInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
    letterSpacing: 2,
  },
  sendOtpBtn: {
    width: 'auto',
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standardInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
    letterSpacing: 2,
    width: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
});
