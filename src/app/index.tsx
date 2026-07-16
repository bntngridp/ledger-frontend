import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { storage } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.getItem('auth_token');
        if (token) {
          // Token exists, redirect directly to dashboard
          router.replace('/(tabs)');
        } else {
          // No token found, redirect to Welcome Screen
          router.replace('/welcome');
        }
      } catch (err) {
        // Fallback to welcome screen on storage issues
        router.replace('/welcome');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
