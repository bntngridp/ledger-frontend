import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/context/theme-context';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { storage } from '@/services/storage';
import { api } from '@/services/api';
import {
  isBiometricSupported,
  isBiometricRegistered,
  registerBiometric,
} from '@/hooks/use-biometric';

// Simple JWT decoder helper to extract email
function decodeJwt(token: string): { email?: string; user_id?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Base64URL decode the payload (part 2)
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad with '=' if necessary
    while (payload.length % 4) {
      payload += '=';
    }
    
    const jsonStr = atob(payload);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode JWT:', err);
    return null;
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themePreference, setThemePreference } = useAppTheme();
  const { t, language, setLanguage } = useTranslation();

  // Safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Settings states
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState('user@ledger.io');
  const [username, setUsername] = useState('Ledger User');

  // Change Password Modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [emailOtpSuccessMsg, setEmailOtpSuccessMsg] = useState('');

  // Biometric states
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState('');

  // Check biometric support on mount
  React.useEffect(() => {
    isBiometricSupported().then((supported) => {
      setBiometricSupported(supported);
      if (supported) {
        setBiometricRegistered(isBiometricRegistered());
      }
    });
  }, []);

  const handleRegisterBiometric = async () => {
    setBiometricLoading(true);
    setBiometricStatus('');
    try {
      const token = await storage.getItem('auth_token');
      if (!token) {
        setBiometricStatus('Silakan login terlebih dahulu');
        setBiometricLoading(false);
        return;
      }
      // Decode user info from JWT
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const userId = payload.user_id || 'user';
      const email = payload.email || userEmail;
      const userIdBytes = new TextEncoder().encode(userId);
      const result = await registerBiometric(userIdBytes, username, email);
      if (result.success) {
        setBiometricRegistered(true);
        setBiometricStatus('Fingerprint berhasil didaftarkan');
      } else {
        setBiometricStatus(result.error || 'Gagal mendaftarkan fingerprint');
      }
    } catch (err: any) {
      setBiometricStatus(err?.message || 'Terjadi kesalahan');
    }
    setBiometricLoading(false);
  };

  // Cooldown Timer for Email OTP
  React.useEffect(() => {
    let timer: any;
    if (emailOtpCooldown > 0) {
      timer = setInterval(() => {
        setEmailOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpCooldown]);

  const handleSendChangePasswordEmailOTP = async () => {
    setEmailOtpSending(true);
    setChangePasswordError('');
    setEmailOtpSuccessMsg('');

    try {
      const resp = await api.auth.sendChangePasswordEmailOTP();
      setEmailOtpSending(false);
      if (resp.status === 'success') {
        setEmailOtpSuccessMsg(t('auth.otpSentToEmail'));
        setEmailOtpCooldown(60);
      } else {
        setChangePasswordError(resp.message || 'Failed to send OTP email');
      }
    } catch (err: any) {
      setEmailOtpSending(false);
      setChangePasswordError(err.message || 'Failed to send OTP email');
    }
  };

  const handleConfirmChangePassword = async () => {
    if (!oldPassword) {
      setChangePasswordError(t('auth.oldPasswordLabel') + ' is required');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError(t('auth.newPasswordLabel'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError(t('auth.passwordMismatch'));
      return;
    }
    if (!emailOtp || emailOtp.length !== 6) {
      setChangePasswordError('6-digit Email OTP code is required');
      return;
    }
    if (tfaEnabled && (!twoFactorCodeInput || twoFactorCodeInput.length !== 6)) {
      setChangePasswordError('6-digit 2FA Authenticator code is required');
      return;
    }

    setChangePasswordLoading(true);
    setChangePasswordError('');

    try {
      const resp = await api.auth.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        email_otp: emailOtp,
        two_factor_code: tfaEnabled ? twoFactorCodeInput : undefined,
      });

      setChangePasswordLoading(false);

      if (resp.status === 'success') {
        setShowChangePasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEmailOtp('');
        setTwoFactorCodeInput('');
        Alert.alert(t('common.success'), t('auth.changePasswordSuccess'));
      } else {
        setChangePasswordError(resp.message || 'Failed to change password');
      }
    } catch (err: any) {
      setChangePasswordLoading(false);
      setChangePasswordError(err.message || 'Failed to change password');
    }
  };

  // Disable 2FA Modal states
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableMode, setDisableMode] = useState<'totp' | 'recovery'>('totp');
  const [otpCode, setOtpCode] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const token = await storage.getItem('auth_token');
        if (token) {
          const decoded = decodeJwt(token);
          if (decoded?.email) {
            setUserEmail(decoded.email);
            const namePart = decoded.email.split('@')[0];
            setUsername(namePart.charAt(0).toUpperCase() + namePart.slice(1));
          }
        }

        const tfa = await storage.getItem('two_factor_enabled');
        setTfaEnabled(tfa === 'true');
      };

      loadSettings();
    }, [])
  );

  const handleLogout = async () => {
    await storage.removeItem('auth_token');
    await storage.removeItem('two_factor_enabled');
    router.replace('/welcome');
  };

  const handleTfaToggle = async (val: boolean) => {
    if (val) {
      // Direct user to setup page to enable 2FA
      router.push('/2fa');
    } else {
      // Require verification code to disable 2FA
      setOtpCode('');
      setRecoveryCodeInput('');
      setDisableMode('totp');
      setDisableError('');
      setShowDisableModal(true);
    }
  };

  const confirmDisable2FA = async () => {
    setDisableLoading(true);
    setDisableError('');

    try {
      let payload: { code?: string; recovery_code?: string } = {};

      if (disableMode === 'totp') {
        if (otpCode.length !== 6) {
          setDisableError('OTP code must be 6 digits');
          setDisableLoading(false);
          return;
        }
        payload.code = otpCode;
      } else if (disableMode === 'recovery') {
        if (!recoveryCodeInput.trim()) {
          setDisableError('Please enter a valid recovery code');
          setDisableLoading(false);
          return;
        }
        payload.recovery_code = recoveryCodeInput.trim();
      }

      const response = await api.auth.disable2FA(payload);
      setDisableLoading(false);

      if (response.status === 'success') {
        await storage.setItem('two_factor_enabled', 'false');
        setTfaEnabled(false);
        setShowDisableModal(false);
        Alert.alert('Success', t('auth.disableSuccess'));
      } else {
        setDisableError(response.message || 'Failed to disable 2FA');
      }
    } catch (err: any) {
      setDisableLoading(false);
      setDisableError(err.message || 'An error occurred');
    }
  };

  // Get initials for profile avatar
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('settings.settingsTitle')}
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <Card style={styles.profileCard} bordered>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {getInitials(username)}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                {username}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {userEmail}
              </ThemedText>
            </View>
          </Card>

          {/* Section: Security */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('settings.securitySection')}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.securityTwoFactor')}
                  </ThemedText>
                </View>
                <Switch
                  value={tfaEnabled}
                  onValueChange={handleTfaToggle}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => router.push('/change-password')}
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.securityChangePassword')}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Biometric Registration Row */}
              {biometricSupported && (
                <>
                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
                  <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={handleRegisterBiometric}
                    disabled={biometricLoading}
                    id="settings-biometric-btn"
                  >
                    <View style={styles.settingsLabelWrapper}>
                      <Ionicons name="finger-print" size={20} color={biometricRegistered ? theme.success : theme.text} />
                      <View>
                        <ThemedText type="smallBold" style={[styles.settingsLabel, biometricRegistered && { color: theme.success }]}>
                          {biometricRegistered ? 'Fingerprint Terdaftar' : 'Daftarkan Fingerprint'}
                        </ThemedText>
                        {biometricStatus ? (
                          <ThemedText type="small" style={{ color: biometricRegistered ? theme.success : theme.danger, fontSize: 10, marginTop: 2 }}>
                            {biometricStatus}
                          </ThemedText>
                        ) : (
                          <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                            {biometricRegistered ? 'Tap untuk daftarkan ulang' : 'Aktifkan autentikasi sidik jari'}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                    {biometricLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                </>
              )}
            </Card>
          </View>

          {/* Section: Preferences */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('settings.preferencesSection')}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => router.push('/notifications')}
                id="settings-notif-btn"
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="notifications-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('notifications.title')}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity style={styles.settingsRow} onPress={() => setShowThemeModal(true)}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="color-palette-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.themeMode')}
                  </ThemedText>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: 6 }}>
                    {themePreference === 'system' ? t('settings.systemDefault') : themePreference === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setShowLanguageModal(true)}
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="globe-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.languagePreference')}
                  </ThemedText>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: '700', marginRight: 6 }}>
                    {language === 'en'
                      ? 'English'
                      : language === 'id'
                      ? 'Bahasa Indonesia'
                      : language === 'ar'
                      ? 'العربية'
                      : 'Español'}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Section: About */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('settings.aboutSection')}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.appVersionLabel')}
                  </ThemedText>
                </View>
                <ThemedText type="code" style={{ color: theme.textSecondary }}>
                  v1.0.0
                </ThemedText>
              </View>
            </Card>
          </View>

          {/* Logout button */}
          <Button
            title={t('common.logout')}
            variant="danger"
            onPress={handleLogout}
            style={styles.logoutBtn}
          />
        </ScrollView>

        {/* Disable 2FA Modal */}
        <Modal visible={showDisableModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, maxWidth: 440 }]}>
              <ThemedText type="smallBold" style={{ marginBottom: 4, fontSize: 16 }}>
                {t('auth.disable2FATitle')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.three }}>
                {t('auth.disable2FASubtitle')}
              </ThemedText>

              {/* 2 Verification Mode Tabs */}
              <View style={[styles.tabSelector, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TouchableOpacity
                  onPress={() => { setDisableMode('totp'); setDisableError(''); }}
                  style={[styles.tabBtn, disableMode === 'totp' && { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="smallBold" style={{ color: disableMode === 'totp' ? '#ffffff' : theme.textSecondary, fontSize: 12 }}>
                    {t('auth.tabTOTP')}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setDisableMode('recovery'); setDisableError(''); }}
                  style={[styles.tabBtn, disableMode === 'recovery' && { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="smallBold" style={{ color: disableMode === 'recovery' ? '#ffffff' : theme.textSecondary, fontSize: 12 }}>
                    {t('auth.tabRecovery')}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Tab 1: TOTP Code */}
              {disableMode === 'totp' && (
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={theme.textSecondary}
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                />
              )}

              {/* Tab 2: Recovery Code */}
              {disableMode === 'recovery' && (
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="e.g. 77dec-fdc31"
                  placeholderTextColor={theme.textSecondary}
                  value={recoveryCodeInput}
                  onChangeText={setRecoveryCodeInput}
                  autoCapitalize="none"
                  textAlign="center"
                />
              )}

              {disableError ? (
                <ThemedText style={{ color: theme.danger, marginTop: Spacing.two, fontWeight: '500' }}>
                  {disableError}
                </ThemedText>
              ) : null}

              <View style={styles.modalButtons}>
                <Button
                  title={t('common.cancel')}
                  variant="ghost"
                  onPress={() => setShowDisableModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('settings.disableBtn')}
                  variant="danger"
                  loading={disableLoading}
                  onPress={confirmDisable2FA}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Theme Picker Modal */}
        <Modal visible={showThemeModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ marginBottom: Spacing.two, fontSize: 16 }}>
                {t('settings.selectTheme')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.four }}>
                {t('settings.selectThemeDesc')}
              </ThemedText>

              {([
                { label: t('settings.systemDefault'), value: 'system', icon: 'settings-outline' },
                { label: t('settings.lightMode'), value: 'light', icon: 'sunny-outline' },
                { label: t('settings.darkMode'), value: 'dark', icon: 'moon-outline' },
              ] as const).map((opt) => {
                const isSelected = themePreference === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={async () => {
                      await setThemePreference(opt.value);
                      setShowThemeModal(false);
                    }}
                    style={[
                      styles.themeOptionRow,
                      { borderColor: isSelected ? theme.primary : theme.border },
                      isSelected && { backgroundColor: theme.primary + '10' }
                    ]}
                  >
                    <View style={styles.themeOptionLabel}>
                      <Ionicons name={opt.icon} size={18} color={isSelected ? theme.primary : theme.textSecondary} />
                      <ThemedText
                        type="smallBold"
                        style={{
                          marginLeft: 12,
                          color: isSelected ? theme.primary : theme.text,
                        }}
                      >
                        {opt.label}
                      </ThemedText>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setShowThemeModal(false)}
                style={{ marginTop: Spacing.three, width: '100%' }}
              />
            </View>
          </View>
        </Modal>

        {/* Language Picker Modal */}
        <Modal visible={showLanguageModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ marginBottom: Spacing.two, fontSize: 16 }}>
                {t('settings.selectLanguage')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.four }}>
                {t('settings.selectLanguageDesc')}
              </ThemedText>

              {([
                { label: 'English', value: 'en' },
                { label: 'Bahasa Indonesia', value: 'id' },
                { label: 'العربية (Arabic)', value: 'ar' },
                { label: 'Español (Spanish)', value: 'es' },
              ] as const).map((opt) => {
                const isSelected = language === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={async () => {
                      await setLanguage(opt.value);
                      setShowLanguageModal(false);
                    }}
                    style={[
                      styles.themeOptionRow,
                      { borderColor: isSelected ? theme.primary : theme.border },
                      isSelected && { backgroundColor: theme.primary + '10' }
                    ]}
                  >
                    <View style={styles.themeOptionLabel}>
                      <Ionicons name="globe-outline" size={18} color={isSelected ? theme.primary : theme.textSecondary} />
                      <ThemedText
                        type="smallBold"
                        style={{
                          marginLeft: 12,
                          color: isSelected ? theme.primary : theme.text,
                        }}
                      >
                        {opt.label}
                      </ThemedText>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Button
                title={t('common.cancel', 'Cancel')}
                variant="secondary"
                onPress={() => setShowLanguageModal(false)}
                style={{ marginTop: Spacing.three, width: '100%' }}
              />
            </View>
          </View>
        </Modal>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    marginVertical: Spacing.two,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    gap: 2,
  },
  section: {
    marginTop: Spacing.three,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
    marginBottom: 8,
    paddingHorizontal: Spacing.one,
  },
  settingsGroup: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingsLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 14,
    marginLeft: 12,
  },
  rowDivider: {
    height: 1.5,
    width: '100%',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: Spacing.five,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: Spacing.four,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    marginVertical: Spacing.two,
    width: '100%',
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.three,
    width: '100%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
  },
  themeOptionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
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
});
