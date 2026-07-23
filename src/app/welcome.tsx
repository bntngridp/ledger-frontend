import React from 'react';
import { StyleSheet, View, Image, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { API_BASE_URL } from '@/services/api';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleGoogleLogin = () => {
    // Generate clean Google Auth URL to backend
    // Remove /api/v1 suffix from base URL to get absolute server root
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
        <View style={styles.heroSection}>
          {/* Brand Logo Icon */}
          <View style={[styles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
            <Image
              source={require('@/assets/images/logo-leder.png')}
              style={{ width: 64, height: 64, borderRadius: 16, resizeMode: 'contain' }}
            />
          </View>
          
          <ThemedText type="title" style={styles.appName}>
            Ledger
          </ThemedText>
          <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
            Your one wallet for Rupiah, USDT & USDC.
          </ThemedText>
        </View>

        <View style={styles.actionContainer}>
          <Button
            title="Sign Up"
            variant="primary"
            onPress={() => router.push('/register')}
            style={styles.button}
          />
          
          <Button
            title="Log In"
            variant="secondary"
            onPress={() => router.push('/login')}
            style={styles.button}
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
            onPress={handleGoogleLogin}
            iconLeft={
              <Image
                source={require('@/assets/images/google.png')}
                style={{ width: 20, height: 20, resizeMode: 'contain' }}
              />
            }
            style={[styles.button, styles.googleButton, { borderColor: theme.border, borderWidth: 1 }]}
          />
        </View>
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
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    paddingVertical: Spacing.five,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
    // Shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    lineHeight: 22,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  googleButton: {
    // Custom styles if needed
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    fontWeight: '600',
  },
});
