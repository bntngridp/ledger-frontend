import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/use-translation';
import { Colors, Spacing } from '@/constants/theme';
import { storage } from '@/services/storage';

// Context to share sidebar collapse state across Tab components
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
});

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { t } = useTranslation();

  // Responsive state: automatically collapse on medium screens (<1280px), expand on wide screens
  const [isCollapsed, setIsCollapsed] = useState(width < 1280);

  useEffect(() => {
    setIsCollapsed(width < 1280);
  }, [width < 1280]);

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);

  if (isDesktop) {
    // Desktop: Vertical Responsive Collapsible Sidebar layout
    return (
      <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
        <Tabs style={styles.tabsContainer}>
          <TabList asChild>
            <CustomTabList>
              <TabTrigger name="home" href="/" asChild>
                <TabButton icon="home-outline">{t('common.home')}</TabButton>
              </TabTrigger>
              <TabTrigger name="history" href="/history" asChild>
                <TabButton icon="time-outline">{t('common.history')}</TabButton>
              </TabTrigger>
              <TabTrigger name="swap" href="/swap" asChild>
                <TabButton icon="swap-horizontal-outline">{t('common.swap')}</TabButton>
              </TabTrigger>
              <TabTrigger name="crypto" href="/crypto" asChild>
                <TabButton icon="key-outline">{t('common.crypto')}</TabButton>
              </TabTrigger>
            </CustomTabList>
          </TabList>
          <TabSlot style={styles.tabSlot} />
        </Tabs>
      </SidebarContext.Provider>
    );
  }

  // Mobile web: Bottom tab bar layout
  return (
    <Tabs style={styles.mobileTabsContainer}>
      <TabSlot style={styles.mobileTabSlot} />
      <TabList asChild>
        <MobileTabList>
          <TabTrigger name="home" href="/" asChild>
            <MobileTabButton icon="home-outline">{t('common.home')}</MobileTabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/history" asChild>
            <MobileTabButton icon="time-outline">{t('common.history')}</MobileTabButton>
          </TabTrigger>
          <TabTrigger name="swap" href="/swap" asChild>
            <MobileTabButton icon="swap-horizontal-outline">{t('common.swap')}</MobileTabButton>
          </TabTrigger>
          <TabTrigger name="crypto" href="/crypto" asChild>
            <MobileTabButton icon="key-outline">{t('common.crypto')}</MobileTabButton>
          </TabTrigger>
        </MobileTabList>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  icon: keyof typeof Ionicons.glyphMap;
}

export function TabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { isCollapsed } = useContext(SidebarContext);

  return (
    <Pressable {...props} style={({ pressed }) => [
      styles.tabPressable,
      pressed && styles.pressed
    ]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[
          styles.tabButtonView,
          isCollapsed && styles.tabButtonViewCollapsed,
          isFocused && { borderColor: theme.primary, borderWidth: 1 }
        ]}>
        <Ionicons
          name={icon}
          size={20}
          color={isFocused ? theme.primary : theme.textSecondary}
          style={!isCollapsed ? { marginRight: 12 } : undefined}
        />
        {!isCollapsed && (
          <ThemedText
            type="smallBold"
            themeColor={isFocused ? 'text' : 'textSecondary'}
            style={styles.buttonText}
          >
            {children}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const router = useRouter();
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { t } = useTranslation();
  const { isCollapsed, toggleSidebar } = useContext(SidebarContext);

  // State for user info
  const [userName, setUserName] = useState('User');

  // Load user info from JWT token on mount
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const token = await storage.getItem('auth_token');
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              if (payload?.email) {
                const namePart = payload.email.split('@')[0];
                const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                setUserName(displayName);
              }
            }
          } catch (e) {
            console.error('Failed to parse JWT token:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };

    loadUserInfo();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View 
      {...props} 
      style={[
        styles.tabListContainer, 
        isCollapsed && styles.tabListContainerCollapsed,
        { backgroundColor: theme.backgroundElement, borderRightColor: theme.border }
      ]}
    >
      <View style={styles.innerContainer}>
        {/* Brand Header & Collapse/Expand Toggle Button */}
        <View style={[styles.brandContainer, isCollapsed && styles.brandContainerCollapsed]}>
          <View style={styles.brandLeftGroup}>
            <Image
              source={require('@/assets/images/logo-leder.png')}
              style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }}
            />
            {!isCollapsed && (
              <ThemedText type="subtitle" style={styles.brandText}>
                Ledger
              </ThemedText>
            )}
          </View>

          {/* Toggle Sidebar Collapse/Expand Button */}
          <TouchableOpacity
            onPress={toggleSidebar}
            style={[styles.toggleBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            activeOpacity={0.7}
            id="sidebar-toggle-btn"
          >
            <Ionicons
              name={isCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation Items */}
        <View style={[styles.tabsWrapper, isCollapsed && styles.tabsWrapperCollapsed]}>
          {props.children}
        </View>

        {/* Profile Link at the Bottom */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[
            styles.profileButton, 
            isCollapsed && styles.profileButtonCollapsed, 
            { borderTopColor: theme.border }
          ]}
        >
          <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="code" style={styles.avatarText}>
              {getInitials(userName)}
            </ThemedText>
          </View>
          {!isCollapsed && (
            <>
              <View style={styles.profileTextWrapper}>
                <ThemedText type="smallBold" numberOfLines={1}>{userName}</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                  {t('settings.settingsTitle')}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Mobile bottom tab list container
function MobileTabList(props: TabListProps) {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View {...props} style={[styles.mobileTabList, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
      {props.children}
    </View>
  );
}

// Mobile bottom tab button
function MobileTabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable {...props} style={styles.mobileTabPressable}>
      <View style={styles.mobileTabItem}>
        <Ionicons
          name={icon}
          size={22}
          color={isFocused ? theme.primary : theme.textSecondary}
        />
        <ThemedText
          type="code"
          style={[styles.mobileTabLabel, { color: isFocused ? theme.primary : theme.textSecondary }]}
        >
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    minWidth: 0,
  },
  mobileTabsContainer: {
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  mobileTabSlot: {
    flex: 1,
  },
  mobileTabList: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 4,
  },
  mobileTabPressable: {
    flex: 1,
    alignItems: 'center',
  },
  mobileTabItem: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  mobileTabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabListContainer: {
    width: 260,
    flexShrink: 0,
    zIndex: 10,
    height: '100%',
    padding: Spacing.four,
    borderRightWidth: 1.5,
    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  } as any,
  tabListContainerCollapsed: {
    width: 80,
    paddingHorizontal: 12,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.five,
  },
  brandContainerCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  brandLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  toggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsWrapper: {
    flex: 1,
    gap: 8,
  },
  tabsWrapperCollapsed: {
    alignItems: 'center',
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
  tabButtonViewCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignSelf: 'center',
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
  profileButtonCollapsed: {
    justifyContent: 'center',
    gap: 0,
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
