import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

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

    try {
      setTimeout(() => {
        setLoading(false);
        router.replace('/(tabs)');
      }, 1500);
    } catch (err) {
      setLoading(false);
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
          <View style={styles.formContainer}>
            <ThemedText type="subtitle" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join the precision trading ecosystem
            </ThemedText>

            <Input
              label="USERNAME"
              placeholder="Enter a unique handle"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              autoCapitalize="none"
              iconLeft="person-outline"
            />

            <Input
              label="EMAIL ADDRESS"
              placeholder="alex@ledger.io"
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

            <Button
              title="Create Account"
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

            <Button
              title="Continue with Google"
              variant="ghost"
              onPress={() => router.replace('/(tabs)')}
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
});
