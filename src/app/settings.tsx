import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/context/theme-context';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { API_BASE_URL } from '@/services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', shortName: 'EN' },
  { code: 'id', label: 'Bahasa Indonesia', shortName: 'ID' },
  { code: 'es', label: 'Español', shortName: 'ES' },
  { code: 'ar', label: 'العربية', shortName: 'AR' },
] as const;

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

  // Preference states
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [pushNotifEnabled, setPushNotifEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => {
      setCacheCleared(false);
      Alert.alert(
        'Cache Dibersihkan',
        'Cache data lokal sementara telah berhasil disegarkan.'
      );
    }, 600);
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            id="settings-back-btn"
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('settings.settingsTitle')}
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hub Akun & Keamanan Banner Shortcut */}
          <TouchableOpacity
            style={[
              styles.profileBannerCard,
              {
                backgroundColor: theme.primary + '12',
                borderColor: theme.primary + '35',
              },
            ]}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
            id="settings-to-profile-banner"
          >
            <View style={styles.bannerLeft}>
              <View
                style={[
                  styles.bannerIconCircle,
                  { backgroundColor: theme.primary + '20' },
                ]}
              >
                <Ionicons name="person-circle" size={26} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {t('profile.sidebarSubtitle') || 'Profil & Keamanan Akun'}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}
                >
                  {t('profile.pinSubtitle') || 'Kelola PIN 6-digit, 2FA, biometrik, dan detail wallet Anda di Halaman Profil.'}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.bannerPill,
                { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: '#FFFFFF', fontSize: 11 }}
              >
                {t('common.profile') || 'Buka Profil'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Section: Tampilan & Tema */}
          <View style={styles.section}>
            <ThemedText
              type="small"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {t('settings.themeMode') || 'TAMPILAN & TEMA'}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setShowThemeModal(true)}
                id="settings-theme-picker-row"
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="color-palette-outline"
                    size={20}
                    color={theme.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.settingsLabel}>
                      {t('settings.themeMode')}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}
                    >
                      {t('settings.selectThemeDesc') || 'Pilih tampilan gelap, terang, atau mengikuti sistem'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText
                    type="small"
                    style={{ color: theme.primary, fontWeight: '700', marginRight: 6 }}
                  >
                    {themePreference === 'system'
                      ? t('settings.systemDefault')
                      : themePreference === 'dark'
                      ? t('settings.darkMode')
                      : t('settings.lightMode')}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Section: Bahasa & Wilayah */}
          <View style={styles.section}>
            <ThemedText
              type="small"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {t('settings.languagePreference') || 'BAHASA & WILAYAH'}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setShowLanguageModal(true)}
                id="settings-language-picker-row"
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={theme.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.settingsLabel}>
                      {t('settings.languagePreference')}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}
                    >
                      {t('settings.selectLanguageDesc') || 'Bahasa tampilan seluruh menu dan transaksi'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.langCodeChip, { backgroundColor: theme.primary + '18' }]}>
                    <ThemedText
                      type="code"
                      style={{ color: theme.primary, fontWeight: '700', fontSize: 11 }}
                    >
                      {currentLangObj.shortName}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, marginRight: 6 }}
                  >
                    {currentLangObj.label}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Section: Notifikasi */}
          <View style={styles.section}>
            <ThemedText
              type="small"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {t('notifications.title') || 'PREFERENSI NOTIFIKASI'}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={theme.text}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.settingsLabel}>
                      {t('settings.pushNotifications') || 'Notifikasi Push'}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}
                    >
                      {t('notifications.emptyDesc') || 'Pemberitahuan transfer, top up, dan deposit kripto'}
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={pushNotifEnabled}
                  onValueChange={setPushNotifEnabled}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: theme.border }]}
              />

              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.text}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.settingsLabel}>
                      Email Alerts
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}
                    >
                      Security and transaction receipts via email
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={emailAlertsEnabled}
                  onValueChange={setEmailAlertsEnabled}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </Card>
          </View>

          {/* Section: Sistem & Informasi Aplikasi */}
          <View style={styles.section}>
            <ThemedText
              type="small"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {t('settings.aboutSection') || 'INFORMASI APLIKASI'}
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    {t('settings.appVersionLabel') || 'Versi Aplikasi'}
                  </ThemedText>
                </View>
                <View style={[styles.statusChip, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
                    v1.2.0 (Build 2026.08)
                  </ThemedText>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: theme.border }]}
              />

              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="server-outline"
                    size={20}
                    color={theme.success}
                  />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    API Server
                  </ThemedText>
                </View>
                <View style={[styles.statusChip, { backgroundColor: theme.success + '18' }]}>
                  <View style={[styles.activeDot, { backgroundColor: theme.success }]} />
                  <ThemedText type="code" style={{ color: theme.success, fontSize: 11, fontWeight: '700' }}>
                    Online
                  </ThemedText>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={handleClearCache}
                id="settings-clear-cache-btn"
              >
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons
                    name="trash-bin-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    Cache Storage
                  </ThemedText>
                </View>
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, fontWeight: '600', fontSize: 12 }}
                >
                  {cacheCleared ? (t('common.loading') || 'Clearing...') : (t('common.done') || 'Clear')}
                </ThemedText>
              </TouchableOpacity>
            </Card>
          </View>

          <View style={styles.footerNote}>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 11 }}
            >
              Ledger Financial Platform • End-to-End Encrypted
            </ThemedText>
          </View>
        </ScrollView>

        {/* Modal: Theme Picker */}
        <Modal
          visible={showThemeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowThemeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowThemeModal(false)}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={styles.modalTitle}>
                  {t('settings.themeMode')}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {[
                  { value: 'system', label: t('settings.systemDefault'), icon: 'phone-portrait-outline' },
                  { value: 'dark', label: t('settings.darkMode'), icon: 'moon-outline' },
                  { value: 'light', label: t('settings.lightMode'), icon: 'sunny-outline' },
                ].map((opt) => {
                  const isSelected = themePreference === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionItem,
                        { borderColor: isSelected ? theme.primary : theme.border },
                        isSelected && { backgroundColor: theme.primary + '12' },
                      ]}
                      onPress={() => {
                        setThemePreference(opt.value as any);
                        setShowThemeModal(false);
                      }}
                      id={`theme-opt-${opt.value}`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={opt.icon as any}
                          size={18}
                          color={isSelected ? theme.primary : theme.text}
                        />
                        <ThemedText
                          type="smallBold"
                          style={[
                            styles.optionLabel,
                            isSelected && { color: theme.primary },
                          ]}
                        >
                          {opt.label}
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal: Language Picker */}
        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={styles.modalTitle}>
                  {t('settings.selectLanguage')}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.optionItem,
                        { borderColor: isSelected ? theme.primary : theme.border },
                        isSelected && { backgroundColor: theme.primary + '12' },
                      ]}
                      onPress={() => {
                        setLanguage(lang.code as any);
                        setShowLanguageModal(false);
                      }}
                      id={`lang-opt-${lang.code}`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={[
                            styles.langCodeChip,
                            { backgroundColor: isSelected ? theme.primary + '25' : theme.background },
                          ]}
                        >
                          <ThemedText
                            type="code"
                            style={{
                              color: isSelected ? theme.primary : theme.textSecondary,
                              fontWeight: '700',
                              fontSize: 11,
                            }}
                          >
                            {lang.shortName}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="smallBold"
                          style={[
                            styles.optionLabel,
                            isSelected && { color: theme.primary },
                          ]}
                        >
                          {lang.label}
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
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
    padding: Spacing.one,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  profileBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  settingsGroup: {
    padding: 0,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  settingsLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  settingsLabel: {
    fontSize: 14,
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langCodeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerNote: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 14,
  },
});
