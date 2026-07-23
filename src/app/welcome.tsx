import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Platform,
  Linking,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/api';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;

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
    <View style={[styles.mainWrapper, { backgroundColor: isDesktop ? '#2E1E6B' : theme.background }]}>
      <View style={[styles.contentContainer, isDesktop ? styles.desktopLayout : styles.mobileLayout]}>
        {/* ================= LEFT PANEL (BRAND & HERO) ================= */}
        <View style={[styles.leftPanel, isDesktop ? styles.leftPanelDesktop : styles.leftPanelMobile]}>
          {/* Header Brand Logo */}
          <View style={styles.brandHeader}>
            <View style={styles.brandLogoBg}>
              <Image
                source={require('@/assets/images/logo-leder.png')}
                style={{ width: 56, height: 56, resizeMode: 'contain' }}
              />
            </View>
            <ThemedText style={styles.brandNameText}>Ledger</ThemedText>
          </View>

          {/* Hero Headline & Subtitle */}
          <View style={styles.heroContent}>
            <ThemedText style={styles.heroHeadline}>
              Your money,{"\n"}all in one place.
            </ThemedText>
            <ThemedText style={styles.heroTagline}>
              Manage Rupiah, USDT & USDC with ease.
            </ThemedText>

            {/* Feature Badges / Chips */}
            <View style={styles.badgesRow}>
              <View style={styles.featureBadge}>
                <ThemedText style={styles.badgeText}>💸  Instant Transfer</ThemedText>
              </View>
              <View style={styles.featureBadge}>
                <ThemedText style={styles.badgeText}>🔒  2FA Protected</ThemedText>
              </View>
              <View style={styles.featureBadge}>
                <ThemedText style={styles.badgeText}>🔄  Crypto Swap</ThemedText>
              </View>
            </View>
          </View>

          {/* Overlapping Glassmorphism Cards Graphic (Desktop only) */}
          {isDesktop && (
            <View style={styles.cardGraphicContainer}>
              <View style={[styles.glassCard, styles.glassCardBack]} />
              <View style={[styles.glassCard, styles.glassCardFront]} />
            </View>
          )}
        </View>

        {/* ================= RIGHT PANEL (AUTH ACTIONS) ================= */}
        <View style={[styles.rightPanel, { backgroundColor: theme.backgroundElement }, isDesktop ? styles.rightPanelDesktop : styles.rightPanelMobile]}>
          <SafeAreaView style={styles.rightPanelInner}>
            <ScrollView
              contentContainerStyle={styles.authFormScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formHeader}>
                <ThemedText type="subtitle" style={[styles.formTitle, { color: theme.text }]}>
                  Get Started
                </ThemedText>
                <ThemedText style={[styles.formSubtitle, { color: theme.textSecondary }]}>
                  Join thousands managing their wallet securely.
                </ThemedText>
              </View>

              <View style={styles.actionsGroup}>
                <Button
                  title="Create Account"
                  variant="primary"
                  onPress={() => router.push('/register')}
                  style={styles.primaryBtn}
                />

                <Button
                  title="Log In"
                  variant="secondary"
                  onPress={() => router.push('/login')}
                  style={styles.secondaryBtn}
                />

                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  <ThemedText type="small" style={[styles.dividerText, { color: theme.textSecondary }]}>
                    OR
                  </ThemedText>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                </View>

                <Button
                  title="Continue with Google"
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
              </View>

              <ThemedText style={[styles.legalText, { color: theme.placeholder || theme.textSecondary }]}>
                By continuing, you agree to our Terms & Privacy Policy.
              </ThemedText>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  desktopLayout: {
    flexDirection: 'row',
  },
  mobileLayout: {
    flexDirection: 'column',
  },

  /* LEFT PANEL STYLES */
  leftPanel: {
    paddingHorizontal: 40,
    paddingVertical: 48,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  leftPanelDesktop: {
    flex: 1.25,
    backgroundColor: '#30206F',
  },
  leftPanelMobile: {
    backgroundColor: '#30206F',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandLogoBg: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  brandNameText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  heroContent: {
    marginVertical: 40,
    gap: 16,
    maxWidth: 500,
  },
  heroHeadline: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
    letterSpacing: -0.8,
  },
  heroTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '400',
    lineHeight: 26,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  featureBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* GLASSMOPRHISM OVERLAPPING CARDS (DESKTOP VISUAL) */
  cardGraphicContainer: {
    position: 'absolute',
    bottom: -40,
    right: -20,
    width: 320,
    height: 220,
    pointerEvents: 'none',
  },
  glassCard: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  glassCardBack: {
    width: 240,
    height: 160,
    top: 20,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '-8deg' }],
  },
  glassCardFront: {
    width: 260,
    height: 170,
    top: 40,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    transform: [{ rotate: '-3deg' }],
  },

  /* RIGHT PANEL STYLES */
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPanelDesktop: {
    maxWidth: 520,
  },
  rightPanelMobile: {
    width: '100%',
  },
  rightPanelInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },

  authFormScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    width: '100%',
  },
  formHeader: {
    width: '100%',
    maxWidth: 380,
    marginBottom: 32,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  actionsGroup: {
    width: '100%',
    maxWidth: 380,
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 24,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 24,
  },
  googleBtn: {
    width: '100%',
    borderRadius: 24,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontWeight: '600',
    fontSize: 12,
  },

  legalText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    maxWidth: 340,
  },
});
