import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Settings states
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    // Log out logic (mock)
    router.replace('/welcome');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Profile & Settings
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <Card style={styles.profileCard} bordered>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                BR
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                Bintang Ridwan
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                bintangridwan30@gmail.com
              </ThemedText>
            </View>
          </Card>

          {/* Section: Security */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              SECURITY
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    Two-Factor Authentication (2FA)
                  </ThemedText>
                </View>
                <Switch
                  value={tfaEnabled}
                  onValueChange={(val) => {
                    setTfaEnabled(val);
                    if (val) {
                      router.push('/2fa');
                    }
                  }}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    Change Password
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Section: Preferences */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              PREFERENCES
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="notifications-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    Push Notifications
                  </ThemedText>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="globe-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    Language
                  </ThemedText>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: 6 }}>
                    Bahasa Indonesia
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Section: About */}
          <View style={styles.section}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              ABOUT
            </ThemedText>
            <Card style={styles.settingsGroup} bordered>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLabelWrapper}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold" style={styles.settingsLabel}>
                    App Version
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
            title="Log Out"
            variant="danger"
            onPress={handleLogout}
            style={styles.logoutBtn}
          />
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
});
