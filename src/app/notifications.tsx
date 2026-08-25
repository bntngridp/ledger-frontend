import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { OctopusLoader } from '@/components/ui/octopus-loader';

// ─── Types ─────────────────────────────────────────────────────────────────
interface NotificationItem {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  unread_count: number;
}

// ─── Icon/Color helpers ─────────────────────────────────────────────────────
function getNotifIconName(type: string): any {
  switch (type) {
    case 'topup': return 'add-circle-outline';
    case 'transfer': return 'paper-plane-outline';
    case 'withdraw': return 'cash-outline';
    case 'swap': return 'swap-horizontal-outline';
    case 'security': return 'shield-checkmark-outline';
    case 'crypto': return 'logo-bitcoin';
    default: return 'notifications-outline';
  }
}

function getNotifIconColor(type: string, theme: any): string {
  switch (type) {
    case 'topup': return theme.success;
    case 'transfer': return theme.primary;
    case 'withdraw': return theme.danger;
    case 'swap': return theme.warning;
    case 'security': return '#6C63FF';
    case 'crypto': return '#F7931A';
    default: return theme.textSecondary;
  }
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const token = await storage.getItem('auth_token');
      if (!token) {
        setError('authorization header required');
        setLoading(false);
        setRefreshing(false);
        router.replace('/login');
        return;
      }

      const res = await api.notifications.getNotifications({ per_page: 50 });
      if (res.status === 'success' && res.data) {
        const data = res.data as NotificationListResponse;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } else {
        if (res.message && (res.message.includes('authorization') || res.message.includes('Unauthorized') || res.message.includes('401'))) {
          await storage.removeItem('auth_token');
          router.replace('/login');
          return;
        }
        setError(res.message || t('notifications.loadError'));
      }
    } catch (err: any) {
      setError(err.message || t('notifications.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, router]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await api.notifications.markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert(t('common.error'), 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = (notifId: string) => {
    Alert.alert(
      t('notifications.delete'),
      'Remove this notification?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.notifications.deleteNotification(notifId);
              const deleted = notifications.find((n) => n.notification_id === notifId);
              setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
              if (deleted && !deleted.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            } catch {
              Alert.alert(t('common.error'), 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} id="notif-back-btn">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText type="smallBold" style={styles.headerTitle}>
              {t('notifications.title')}
            </ThemedText>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <ThemedText style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              disabled={markingAll}
              style={styles.markAllBtn}
              id="notif-mark-all-read-btn"
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ThemedText style={[styles.markAllText, { color: theme.primary }]}>
                  {t('notifications.markAllRead')}
                </ThemedText>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRightPlaceholder} />
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerState}>
            <OctopusLoader size="large" message="Memuat notifikasi..." />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons
              name={error.toLowerCase().includes('authorization') || error.toLowerCase().includes('unauthorized') ? 'lock-closed-outline' : 'alert-circle-outline'}
              size={48}
              color={error.toLowerCase().includes('authorization') || error.toLowerCase().includes('unauthorized') ? theme.primary : theme.danger}
            />
            <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
              {error.toLowerCase().includes('authorization') || error.toLowerCase().includes('unauthorized')
                ? 'Sesi Anda telah berakhir. Silakan masuk kembali.'
                : error}
            </ThemedText>
            {error.toLowerCase().includes('authorization') || error.toLowerCase().includes('unauthorized') ? (
              <Button
                title="Masuk Akun"
                onPress={() => router.replace('/login')}
                style={{ marginTop: Spacing.three }}
              />
            ) : (
              <Button
                title={t('common.retry')}
                onPress={() => loadNotifications()}
                style={{ marginTop: Spacing.three }}
              />
            )}
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="notifications-off-outline" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText type="smallBold" style={[styles.stateTitle, { color: theme.text }]}>
              {t('notifications.empty')}
            </ThemedText>
            <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
              {t('notifications.emptyDesc')}
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications(true)}
                tintColor={theme.primary}
              />
            }
          >
            {notifications.map((notif) => {
              const iconName = getNotifIconName(notif.type);
              const iconColor = getNotifIconColor(notif.type, theme);
              return (
                <TouchableOpacity
                  key={notif.notification_id}
                  id={`notif-item-${notif.notification_id}`}
                  onPress={() => !notif.is_read && handleMarkAsRead(notif.notification_id)}
                  activeOpacity={0.8}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: notif.is_read
                        ? theme.backgroundElement
                        : (theme.backgroundElement + 'EE'),
                      borderColor: notif.is_read ? theme.border : (theme.primary + '40'),
                      borderLeftColor: notif.is_read ? theme.border : iconColor,
                      borderLeftWidth: notif.is_read ? 1 : 3,
                    },
                  ]}
                >
                  {/* Left icon */}
                  <View style={[styles.notifIconWrap, { backgroundColor: iconColor + '18' }]}>
                    <Ionicons name={iconName} size={20} color={iconColor} />
                  </View>

                  {/* Content */}
                  <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                      <ThemedText
                        type={notif.is_read ? 'default' : 'smallBold'}
                        style={[styles.notifTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {notif.title}
                      </ThemedText>
                      {!notif.is_read && (
                        <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                      )}
                    </View>
                    <ThemedText
                      style={[styles.notifBody, { color: theme.textSecondary }]}
                      numberOfLines={2}
                    >
                      {notif.body}
                    </ThemedText>
                    <ThemedText style={[styles.notifTime, { color: theme.textSecondary }]}>
                      {formatTime(notif.created_at)}
                    </ThemedText>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.notifActions}>
                    {!notif.is_read && (
                      <TouchableOpacity
                        onPress={() => handleMarkAsRead(notif.notification_id)}
                        style={[styles.actionBtn, { backgroundColor: theme.primary + '18' }]}
                        id={`notif-read-${notif.notification_id}`}
                      >
                        <Ionicons name="checkmark" size={14} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(notif.notification_id)}
                      style={[styles.actionBtn, { backgroundColor: theme.danger + '18' }]}
                      id={`notif-delete-${notif.notification_id}`}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Footer message */}
            <View style={styles.footerMsg}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
                {t('notifications.allCaughtUp')}
              </ThemedText>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // States
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.three,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // List
  listContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: 32,
  },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    fontSize: 13,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 4,
  },
  notifActions: {
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footerMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
  },
});
