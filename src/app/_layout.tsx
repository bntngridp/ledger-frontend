import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import '@/global.css';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { activeTheme } = useAppTheme();
  
  return (
    <NavigationThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
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
      <LayoutContent />
    </AppThemeProvider>
  );
}
