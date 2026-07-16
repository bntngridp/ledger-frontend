import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs style={styles.tabsContainer}>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home-outline">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/history" asChild>
            <TabButton icon="time-outline">History</TabButton>
          </TabTrigger>
          <TabTrigger name="swap" href="/swap" asChild>
            <TabButton icon="swap-horizontal-outline">Swap</TabButton>
          </TabTrigger>
          <TabTrigger name="crypto" href="/crypto" asChild>
            <TabButton icon="key-outline">Crypto</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={styles.tabSlot} />
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  icon: keyof typeof Ionicons.glyphMap;
}

export function TabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable {...props} style={({ pressed }) => [
      styles.tabPressable,
      pressed && styles.pressed
    ]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[
          styles.tabButtonView,
          isFocused && { borderColor: theme.primary, borderWidth: 1 }
        ]}>
        <Ionicons
          name={icon}
          size={18}
          color={isFocused ? theme.primary : theme.textSecondary}
          style={{ marginRight: 12 }}
        />
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? 'text' : 'textSecondary'}
          style={styles.buttonText}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const router = useRouter();
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={[styles.tabListContainer, { backgroundColor: theme.backgroundElement, borderRightColor: theme.border }]}>
      <View style={styles.innerContainer}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.brandLogo, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="wallet-outline" size={22} color={theme.primary} />
          </View>
          <ThemedText type="subtitle" style={styles.brandText}>
            Ledger
          </ThemedText>
        </View>

        {/* Tab Items */}
        <View style={styles.tabsWrapper}>
          {props.children}
        </View>

        {/* Profile Link at the Bottom */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.profileButton, { borderTopColor: theme.border }]}
        >
          <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="code" style={styles.avatarText}>
              BR
            </ThemedText>
          </View>
          <View style={styles.profileTextWrapper}>
            <ThemedText type="smallBold">Bintang Ridwan</ThemedText>
            <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
              Profile & Settings
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  tabSlot: {
    flex: 1,
    height: '100%',
  },
  tabListContainer: {
    width: 260,
    height: '100%',
    padding: Spacing.four,
    borderRightWidth: 1.5,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tabsWrapper: {
    flex: 1,
    gap: 8,
  },
  tabPressable: {
    width: '100%',
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.three,
    borderTopWidth: 1.5,
    gap: 10,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  profileTextWrapper: {
    flex: 1,
  },
});
