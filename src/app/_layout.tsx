import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import '@/global.css';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/theme-context';
import { LanguageProvider } from '@/context/language-context';
import Head from 'expo-router/head';

SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { activeTheme } = useAppTheme();
  
  return (
    <NavigationThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <title>Ledger - Digital Finance & Crypto Platform</title>
        <meta name="description" content="Secure Crypto & Fiat Platform" />
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <meta name="theme-color" content="#0F0C1D" />
      </Head>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="topup" />
        <Stack.Screen name="transfer" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="2fa" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <LanguageProvider>
        <LayoutContent />
      </LanguageProvider>
    </AppThemeProvider>
  );
}
