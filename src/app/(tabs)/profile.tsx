import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { storage } from '@/services/storage';
import { api } from '@/services/api';
import {
  isBiometricSupported,
  isBiometricRegistered,
  registerBiometric,
} from '@/hooks/use-biometric';
import { BiometricManagementModal } from '@/components/ui/biometric-modal';

interface UserProfileData {
  user_id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  pin_enabled: boolean;
  biometric_enabled: boolean;
  created_at: string;
  wallet_id?: string | null;
}

interface DashboardStats {
  total_idr: number;
  assets_count: number;
  transactions_count: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_idr: 0,
    assets_count: 3,
    transactions_count: 0,
  });

  // Copied feedback states
  const [copiedUserId, setCopiedUserId] = useState<boolean>(false);
  const [copiedWalletId, setCopiedWalletId] = useState<boolean>(false);

  // Biometric states
  const [showBiometricModal, setShowBiometricModal] = useState<boolean>(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean>(true);
  const [biometricRegistered, setBiometricRegistered] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [biometricMessage, setBiometricMessage] = useState<string>('');

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // PIN Setup modal states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinMessage, setPinMessage] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const loadProfileData = async () => {
    try {
      // 1. Fetch user profile from backend
      const res = await api.auth.getMe();
      if (res.status === 'success' && res.data) {
        setProfile(res.data);
      } else {
        // Fallback: Decode token from localStorage
        const token = await storage.getItem('auth_token');
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              setProfile({
                user_id: payload.user_id || 'user-uuid',
                username: payload.email ? payload.email.split('@')[0] : 'User',
                email: payload.email || 'user@ledger.io',
                is_active: true,
                two_factor_enabled: false,
                pin_enabled: true,
                biometric_enabled: false,
                created_at: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.error('Error fallback decode token:', e);
          }
        }
      }

      // 2. Fetch wallet dashboard for portfolio metrics
      const dashRes = await api.wallet.getDashboard();
      if (dashRes.status === 'success' && dashRes.data) {
        const totalIdr = Number(dashRes.data.total_estimated_idr || 0);
        const balances = dashRes.data.balances || [];
        setStats((prev) => ({
          ...prev,
          total_idr: totalIdr,
          assets_count: balances.length > 0 ? balances.length : 3,
        }));
      }

      // 3. Fetch transaction count
      const txRes = await api.wallet.getTransactions({ page: 1, per_page: 1 });
      if (txRes.status === 'success' && txRes.data?.meta) {
        setStats((prev) => ({
          ...prev,
          transactions_count: txRes.data.meta.total || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      isBiometricSupported().then((supported) => {
        setBiometricSupported(supported);
        if (supported) {
          setBiometricRegistered(isBiometricRegistered());
        }
      });
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleCopy = (text: string, type: 'user' | 'wallet') => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'user') {
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
    } else {
      setCopiedWalletId(true);
      setTimeout(() => setCopiedWalletId(false), 2000);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!profile) return;
    setBiometricLoading(true);
    setBiometricMessage('');
    try {
      const userIdBytes = new TextEncoder().encode(profile.user_id);
      const result = await registerBiometric(userIdBytes, profile.username, profile.email);
      if (result.success) {
        setBiometricRegistered(true);
        setBiometricMessage('Fingerprint berhasil didaftarkan');
        loadProfileData();
      } else {
        setBiometricMessage(result.error || 'Pendaftaran sidik jari gagal');
      }
    } catch (err: any) {
      setBiometricMessage(err?.message || 'Terjadi kesalahan');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSetupPin = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinError('PIN harus berupa 6 digit angka');
      return;
    }
    setPinLoading(true);
    setPinError('');
    setPinMessage('');
    try {
      const res = await api.auth.setupPin(newPin);
      if (res.status === 'success') {
        setPinMessage('PIN transaksi berhasil diperbarui');
        setNewPin('');
        setTimeout(() => {
          setShowPinModal(false);
          setPinMessage('');
          loadProfileData();
        }, 1200);
      } else {
        setPinError(res.message || 'Gagal menyimpan PIN');
      }
    } catch (err: any) {
      setPinError(err?.message || 'Terjadi kesalahan saat menyimpan PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await storage.removeItem('auth_token');
      await storage.removeItem('user_email');
      setShowLogoutModal(false);
      router.replace('/welcome');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Bar */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Profil Pengguna
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement }]}
          id="profile-settings-btn"
        >
          <Ionicons name="settings-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 12 }}>
                Memuat data profil...
              </ThemedText>
            </View>
          ) : (
            <>
              {/* 1. Hero User Banner */}
              <Card style={[styles.heroCard, { borderColor: theme.border }]} bordered>
                <View style={styles.heroBackgroundGlow} />
                <View style={styles.heroContent}>
                  <View style={[styles.avatarWrapper, { backgroundColor: theme.primary, borderColor: theme.backgroundElement }]}>
                    <ThemedText style={styles.avatarInitials}>
                      {getInitials(profile?.username || 'User')}
                    </ThemedText>
                    <View style={[styles.activeStatusDot, { backgroundColor: theme.success }]} />
                  </View>

                  <View style={styles.heroInfo}>
                    <View style={styles.nameBadgeRow}>
                      <ThemedText type="subtitle" style={styles.userName} numberOfLines={1}>
                        {profile?.username || 'Ledger User'}
                      </ThemedText>
                      <View style={[styles.verifiedBadge, { backgroundColor: theme.success + '20', borderColor: theme.success + '50' }]}>
                        <Ionicons name="shield-checkmark" size={12} color={theme.success} />
                        <ThemedText type="code" style={[styles.verifiedBadgeText, { color: theme.success }]}>
                          Verified Tier 1
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {profile?.email || 'user@ledger.io'}
                    </ThemedText>
                    <View style={styles.joinDateRow}>
                      <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
                      <ThemedText type="code" style={[styles.joinDateText, { color: theme.textSecondary }]}>
                        Bergabung {profile?.created_at ? formatDate(profile.created_at) : 'Agustus 2026'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </Card>

              {/* 2. Portfolio Summary Metrics Grid */}
              <View style={styles.metricsRow}>
                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]} bordered>
                  <View style={styles.metricHeader}>
                    <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      TOTAL ESTIMASI
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={[styles.metricValue, { color: theme.text }]}>
                    Rp {stats.total_idr.toLocaleString('id-ID')}
                  </ThemedText>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]} bordered>
                  <View style={styles.metricHeader}>
                    <Ionicons name="pie-chart-outline" size={16} color="#8B5CF6" />
                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      ASET AKTIF
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={[styles.metricValue, { color: theme.text }]}>
                    {stats.assets_count} Aset
                  </ThemedText>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: theme.backgroundElement }]} bordered>
                  <View style={styles.metricHeader}>
                    <Ionicons name="swap-horizontal-outline" size={16} color={theme.success} />
                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      TRANSAKSI
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={[styles.metricValue, { color: theme.text }]}>
                    {stats.transactions_count}
                  </ThemedText>
                </Card>
              </View>

              {/* 3. Security Center Card */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    PUSAT KEAMANAN (SECURITY CENTER)
                  </ThemedText>
                  <View style={[styles.secureShieldBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="lock-closed" size={12} color={theme.primary} />
                    <ThemedText type="code" style={{ color: theme.primary, fontSize: 10, fontWeight: '700' }}>
                      Level Keamanan: Tinggi
                    </ThemedText>
                  </View>
                </View>

                <Card style={styles.sectionCard} bordered>
                  {/* Two-Factor Authentication (2FA) Row */}
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/2fa')}
                    id="profile-2fa-row-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">Autentikasi Dua Faktor (2FA)</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                          Proteksi TOTP Authenticator & OTP
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.actionRowRight}>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: profile?.two_factor_enabled ? theme.success + '20' : theme.textSecondary + '20',
                          },
                        ]}
                      >
                        <ThemedText
                          type="code"
                          style={{
                            color: profile?.two_factor_enabled ? theme.success : theme.textSecondary,
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {profile?.two_factor_enabled ? 'Aktif' : 'Nonaktif'}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

                  {/* 6-Digit Transaction PIN Row */}
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => setShowPinModal(true)}
                    id="profile-pin-row-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="keypad" size={18} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">PIN Transaksi 6-Digit</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                          Verifikasi saat transfer & penarikan aset
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.actionRowRight}>
                      <View style={[styles.statusPill, { backgroundColor: theme.success + '20' }]}>
                        <ThemedText type="code" style={{ color: theme.success, fontSize: 10, fontWeight: '700' }}>
                          {profile?.pin_enabled ? 'Tersetel' : 'Aktif'}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>

                  {/* Fingerprint / WebAuthn Biometric Row */}
                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => setShowBiometricModal(true)}
                    id="profile-biometric-row-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: '#8B5CF615' }]}>
                        <Ionicons name="finger-print" size={18} color="#8B5CF6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">Sidik Jari / Biometrik</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                          {biometricRegistered ? 'Aktif & Terdaftar pada perangkat' : 'Touch ID, Face ID & Windows Hello'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.actionRowRight}>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: biometricRegistered ? theme.success + '20' : theme.primary + '20',
                          },
                        ]}
                      >
                        <ThemedText
                          type="code"
                          style={{
                            color: biometricRegistered ? theme.success : theme.primary,
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {biometricRegistered ? 'Aktif' : 'Atur'}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

                  {/* Change Password Shortcut */}
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/change-password')}
                    id="profile-change-pw-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}>
                        <Ionicons name="lock-closed-outline" size={18} color="#F59E0B" />
                      </View>
                      <View>
                        <ThemedText type="smallBold">Ganti Kata Sandi</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}>
                          Perbarui kata sandi akun secara berkala
                        </ThemedText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </Card>
              </View>

              {/* 4. Account & Wallet Identifiers Card */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  DETAIL AKUN & DOMPET
                </ThemedText>

                <Card style={styles.sectionCard} bordered>
                  {/* User ID Row */}
                  <View style={styles.idRow}>
                    <View style={styles.idLabelGroup}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        User ID
                      </ThemedText>
                      <ThemedText type="code" style={[styles.idValueText, { color: theme.text }]} numberOfLines={1}>
                        {profile?.user_id || '-'}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      onPress={() => profile?.user_id && handleCopy(profile.user_id, 'user')}
                      style={[styles.copyBtn, { backgroundColor: theme.backgroundElement }]}
                      id="profile-copy-userid-btn"
                    >
                      <Ionicons
                        name={copiedUserId ? 'checkmark-circle' : 'copy-outline'}
                        size={14}
                        color={copiedUserId ? theme.success : theme.primary}
                      />
                      <ThemedText
                        type="code"
                        style={{
                          color: copiedUserId ? theme.success : theme.primary,
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        {copiedUserId ? 'Tersalin' : 'Salin'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {profile?.wallet_id && (
                    <>
                      <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
                      {/* Wallet ID Row */}
                      <View style={styles.idRow}>
                        <View style={styles.idLabelGroup}>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            Wallet ID
                          </ThemedText>
                          <ThemedText type="code" style={[styles.idValueText, { color: theme.text }]} numberOfLines={1}>
                            {profile.wallet_id}
                          </ThemedText>
                        </View>
                        <TouchableOpacity
                          onPress={() => profile?.wallet_id && handleCopy(profile.wallet_id, 'wallet')}
                          style={[styles.copyBtn, { backgroundColor: theme.backgroundElement }]}
                          id="profile-copy-walletid-btn"
                        >
                          <Ionicons
                            name={copiedWalletId ? 'checkmark-circle' : 'copy-outline'}
                            size={14}
                            color={copiedWalletId ? theme.success : theme.primary}
                          />
                          <ThemedText
                            type="code"
                            style={{
                              color: copiedWalletId ? theme.success : theme.primary,
                              fontSize: 11,
                              marginLeft: 4,
                            }}
                          >
                            {copiedWalletId ? 'Tersalin' : 'Salin'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

                  {/* Status Row */}
                  <View style={styles.idRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Status Akun
                    </ThemedText>
                    <View style={styles.activePillGroup}>
                      <View style={[styles.activeDot, { backgroundColor: theme.success }]} />
                      <ThemedText type="smallBold" style={{ color: theme.success, fontSize: 12 }}>
                        Aktif & Terverifikasi
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              </View>

              {/* 5. Shortcuts & Preferences */}
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  PENGATURAN & PREFERENSI
                </ThemedText>

                <Card style={styles.sectionCard} bordered>
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/notifications')}
                    id="profile-notif-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <Ionicons name="notifications-outline" size={20} color={theme.text} />
                      <ThemedText type="smallBold" style={styles.shortcutLabel}>
                        Pusat Notifikasi
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>

                  <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => router.push('/settings')}
                    id="profile-general-settings-btn"
                  >
                    <View style={styles.actionRowLeft}>
                      <Ionicons name="color-palette-outline" size={20} color={theme.text} />
                      <ThemedText type="smallBold" style={styles.shortcutLabel}>
                        Tema & Bahasa
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </Card>
              </View>

              {/* 6. Logout Button */}
              <View style={styles.logoutWrapper}>
                <Button
                  title="Keluar dari Akun"
                  variant="danger"
                  onPress={() => setShowLogoutModal(true)}
                  id="profile-logout-btn"
                  style={styles.logoutButton}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} bordered>
            <View style={[styles.modalIconWrapper, { backgroundColor: theme.danger + '15' }]}>
              <Ionicons name="log-out-outline" size={28} color={theme.danger} />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Konfirmasi Keluar
            </ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Apakah Anda yakin ingin keluar dari akun Ledger ini? Anda harus login kembali untuk mengakses dompet.
            </ThemedText>
            <View style={styles.modalBtnRow}>
              <Button
                title="Batal"
                variant="ghost"
                onPress={() => setShowLogoutModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Ya, Keluar"
                variant="danger"
                onPress={handleLogout}
                style={{ flex: 1 }}
                id="confirm-logout-btn"
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} bordered>
            <View style={[styles.modalIconWrapper, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="keypad" size={28} color={theme.primary} />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Atur PIN Transaksi Baru
            </ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Masukkan 6 digit angka untuk PIN keamanan transaksi Anda.
            </ThemedText>

            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.background,
                  borderColor: pinError ? theme.danger : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              value={newPin}
              onChangeText={(val) => setNewPin(val.replace(/\D/g, ''))}
              id="new-pin-input"
            />

            {pinError ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: 6, textAlign: 'center' }}>
                {pinError}
              </ThemedText>
            ) : null}

            {pinMessage ? (
              <ThemedText type="small" style={{ color: theme.success, marginTop: 6, textAlign: 'center' }}>
                {pinMessage}
              </ThemedText>
            ) : null}

            <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
              <Button
                title="Tutup"
                variant="ghost"
                onPress={() => {
                  setShowPinModal(false);
                  setNewPin('');
                  setPinError('');
                }}
                disabled={pinLoading}
                style={{ flex: 1 }}
              />
              <Button
                title="Simpan PIN"
                variant="primary"
                loading={pinLoading}
                onPress={handleSetupPin}
                style={{ flex: 1.5 }}
                id="save-new-pin-btn"
              />
            </View>
          </Card>
        </View>
      </Modal>
      {profile && (
        <BiometricManagementModal
          visible={showBiometricModal}
          onClose={() => setShowBiometricModal(false)}
          user={{
            userId: profile.user_id,
            username: profile.username,
            email: profile.email,
          }}
          onSuccess={() => {
            loadProfileData();
            setBiometricRegistered(isBiometricRegistered() || !!profile.biometric_enabled);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  loadingWrapper: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  heroBackgroundGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#6366F115',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  activeStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroInfo: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  joinDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  joinDateText: {
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.three,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secureShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  shortcutLabel: {
    fontSize: 14,
    marginLeft: 4,
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  idLabelGroup: {
    flex: 1,
    marginRight: 12,
  },
  idValueText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activePillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logoutWrapper: {
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
  },
  logoutButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.five,
    alignItems: 'center',
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
  },
  pinInput: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 10,
  },
});
