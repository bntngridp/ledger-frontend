import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
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
import { toLocalizedDigits } from '@/utils/format';

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

// ─── Icon/Color Helpers ─────────────────────────────────────────────────────
function getNotifIconName(type: string): any {
  const t = (type || '').toLowerCase();
  if (t.includes('deposit') || t === 'crypto_deposit') return 'arrow-down-circle';
  if (t.includes('withdraw') || t === 'crypto_withdrawal') return 'arrow-up-circle';
  if (t.includes('topup')) return 'add-circle';
  if (t.includes('transfer')) return 'paper-plane';
  if (t.includes('swap')) return 'swap-horizontal';
  if (t.includes('security')) return 'shield-checkmark';
  if (t.includes('crypto')) return 'logo-bitcoin';
  return 'notifications';
}

function getNotifIconColor(type: string, theme: any): string {
  const t = (type || '').toLowerCase();
  if (t.includes('deposit') || t === 'crypto_deposit' || t.includes('topup')) {
    return theme.success || '#10B981';
  }
  if (t.includes('withdraw') || t === 'crypto_withdrawal') {
    return theme.danger || '#EF4444';
  }
  if (t.includes('swap')) {
    return '#8B5CF6';
  }
  if (t.includes('transfer')) {
    return theme.primary || '#3B82F6';
  }
  if (t.includes('security')) {
    return '#6366F1';
  }
  if (t.includes('crypto')) {
    return '#F59E0B';
  }
  return theme.textSecondary || '#6B7280';
}

function formatRelativeTime(dateStr: string, lang: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'id') {
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (lang === 'es') {
      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays < 7) return `Hace ${diffDays} d`;
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } else if (lang === 'ar') {
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${toLocalizedDigits(diffMins, 'ar')} دقيقة`;
      if (diffHours < 24) return `منذ ${toLocalizedDigits(diffHours, 'ar')} ساعة`;
      if (diffDays < 7) return `منذ ${toLocalizedDigits(diffDays, 'ar')} يوم`;
      return toLocalizedDigits(date.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }), 'ar');
    } else {
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }
  } catch {
    return dateStr;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Processing indicators
  const [isProcessingAllRead, setIsProcessingAllRead] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
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
          if (
            res.message &&
            (res.message.includes('authorization') ||
              res.message.includes('Unauthorized') ||
              res.message.includes('401'))
          ) {
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
    },
    [t, router]
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Filtered list
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Selection handlers
  const isAllSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.notification_id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredNotifications.forEach((n) => next.add(n.notification_id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Mark single as read
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

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsProcessingAllRead(true);
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert(t('common.error'), 'Gagal menandai semua notifikasi sebagai dibaca');
    } finally {
      setIsProcessingAllRead(false);
    }
  };

  // Mark selected as read
  const handleMarkSelectedAsRead = async () => {
    const unreadSelected = Array.from(selectedIds).filter((id) => {
      const notif = notifications.find((n) => n.notification_id === id);
      return notif && !notif.is_read;
    });

    if (unreadSelected.length === 0) return;

    try {
      await Promise.all(unreadSelected.map((id) => api.notifications.markAsRead(id)));
      setNotifications((prev) =>
        prev.map((n) => (selectedIds.has(n.notification_id) ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - unreadSelected.length));
    } catch {
      // silent
    }
  };

  // Single delete
  const handleDeleteSingle = (notifId: string) => {
    const performDelete = async () => {
      try {
        await api.notifications.deleteNotification(notifId);
        const deleted = notifications.find((n) => n.notification_id === notifId);
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notifId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(notifId);
          return next;
        });
        if (deleted && !deleted.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        Alert.alert(t('common.error'), 'Gagal menghapus notifikasi');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Hapus notifikasi ini?')) {
        performDelete();
      }
    } else {
      Alert.alert(t('notifications.delete'), 'Hapus notifikasi ini?', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.delete'), style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  // Bulk delete selected
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const performDelete = async () => {
      setIsProcessingDelete(true);
      try {
        const ids = Array.from(selectedIds);
        await api.notifications.deleteBulkNotifications(ids);

        const unreadDeletedCount = notifications.filter(
          (n) => selectedIds.has(n.notification_id) && !n.is_read
        ).length;

        setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.notification_id)));
        setUnreadCount((prev) => Math.max(0, prev - unreadDeletedCount));
        setSelectedIds(new Set());
      } catch {
        Alert.alert(t('common.error'), 'Gagal menghapus notifikasi terpilih');
      } finally {
        setIsProcessingDelete(false);
      }
    };

    const confirmMsg = `${t('notifications.deleteSelectedConfirm')} (${selectedIds.size} ${t(
      'notifications.selectedCount'
    )})`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        performDelete();
      }
    } else {
      Alert.alert(t('notifications.deleteSelected'), confirmMsg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.delete'), style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  // Delete all notifications
  const handleDeleteAll = () => {
    if (notifications.length === 0) return;

    const performDelete = async () => {
      setIsProcessingDelete(true);
      try {
        await api.notifications.deleteAllNotifications();
        setNotifications([]);
        setUnreadCount(0);
        setSelectedIds(new Set());
      } catch {
        Alert.alert(t('common.error'), 'Gagal menghapus semua notifikasi');
      } finally {
        setIsProcessingDelete(false);
      }
    };

    const confirmMsg = t('notifications.deleteAllConfirm');

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        performDelete();
      }
    } else {
      Alert.alert(t('notifications.deleteAll'), confirmMsg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('notifications.deleteAll'), style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              onPress={handleBack}
              style={[
                styles.backBtn,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              id="notif-back-btn"
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleGroup}>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                {t('notifications.title')}
              </ThemedText>
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <ThemedText style={styles.badgeText}>
                    {unreadCount > 99 ? toLocalizedDigits('99+', language) : toLocalizedDigits(unreadCount, language)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Quick Header Actions */}
          <View style={styles.headerRightActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                disabled={isProcessingAllRead}
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
                ]}
                id="notif-mark-all-read-btn"
                accessibilityLabel={t('notifications.markAllRead')}
              >
                {isProcessingAllRead ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color={theme.primary} />
                    {isDesktop && (
                      <ThemedText style={[styles.headerActionText, { color: theme.primary }]}>
                        {t('notifications.markAllRead')}
                      </ThemedText>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}

            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleDeleteAll}
                disabled={isProcessingDelete}
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: theme.danger + '12', borderColor: theme.danger + '25' },
                ]}
                id="notif-delete-all-btn"
                accessibilityLabel={t('notifications.deleteAll')}
              >
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
                {isDesktop && (
                  <ThemedText style={[styles.headerActionText, { color: theme.danger }]}>
                    {t('notifications.deleteAll')}
                  </ThemedText>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips & Batch Selection Toolbar */}
        {!loading && notifications.length > 0 && (
          <View style={[styles.controlBar, { borderBottomColor: theme.border }]}>
            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity
                onPress={() => setFilter('all')}
                style={[
                  styles.filterChip,
                  filter === 'all'
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
                id="notif-filter-all"
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: filter === 'all' ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {t('notifications.filterAll')} ({notifications.length})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilter('unread')}
                style={[
                  styles.filterChip,
                  filter === 'unread'
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
                id="notif-filter-unread"
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: filter === 'unread' ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {t('notifications.filterUnread')} ({toLocalizedDigits(unreadCount, language)})
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Select All Checkbox & Batch Delete Action */}
            <View style={styles.selectionBar}>
              <TouchableOpacity
                onPress={handleToggleSelectAll}
                style={styles.selectAllBtn}
                id="notif-select-all-btn"
              >
                <Ionicons
                  name={isAllSelected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isAllSelected ? theme.primary : theme.textSecondary}
                />
                <ThemedText style={[styles.selectAllText, { color: theme.text }]}>
                  {isAllSelected ? t('notifications.deselectAll') : t('notifications.selectAll')}
                </ThemedText>
              </TouchableOpacity>

              {selectedIds.size > 0 && (
                <View style={styles.batchActionsRow}>
                  <ThemedText style={[styles.selectedCountText, { color: theme.textSecondary }]}>
                    {selectedIds.size} {t('notifications.selectedCount')}
                  </ThemedText>

                  {/* Mark Selected Read */}
                  <TouchableOpacity
                    onPress={handleMarkSelectedAsRead}
                    style={[
                      styles.batchActionBtn,
                      { backgroundColor: theme.primary + '18', borderColor: theme.primary + '35' },
                    ]}
                    id="notif-mark-selected-read-btn"
                    accessibilityLabel={t('notifications.markRead')}
                  >
                    <Ionicons name="checkmark-done" size={15} color={theme.primary} />
                  </TouchableOpacity>

                  {/* Delete Selected */}
                  <TouchableOpacity
                    onPress={handleDeleteSelected}
                    disabled={isProcessingDelete}
                    style={[
                      styles.batchActionBtn,
                      { backgroundColor: theme.danger + '18', borderColor: theme.danger + '35' },
                    ]}
                    id="notif-delete-selected-btn"
                    accessibilityLabel={t('notifications.deleteSelected')}
                  >
                    <Ionicons name="trash-outline" size={15} color={theme.danger} />
                    <ThemedText style={[styles.batchDeleteText, { color: theme.danger }]}>
                      {t('notifications.deleteSelected')} ({selectedIds.size})
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Content Body */}
        {loading ? (
          <View style={styles.centerState}>
            <OctopusLoader size="large" message="Memuat notifikasi..." />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons
              name={
                error.toLowerCase().includes('authorization') ||
                error.toLowerCase().includes('unauthorized')
                  ? 'lock-closed-outline'
                  : 'alert-circle-outline'
              }
              size={48}
              color={
                error.toLowerCase().includes('authorization') ||
                error.toLowerCase().includes('unauthorized')
                  ? theme.primary
                  : theme.danger
              }
            />
            <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
              {error.toLowerCase().includes('authorization') ||
              error.toLowerCase().includes('unauthorized')
                ? 'Sesi Anda telah berakhir. Silakan masuk kembali.'
                : error}
            </ThemedText>
            {error.toLowerCase().includes('authorization') ||
            error.toLowerCase().includes('unauthorized') ? (
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
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.centerState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="notifications-off-outline" size={44} color={theme.textSecondary} />
            </View>
            <ThemedText type="smallBold" style={[styles.stateTitle, { color: theme.text }]}>
              {filter === 'unread' ? 'Semua notifikasi telah dibaca' : t('notifications.empty')}
            </ThemedText>
            <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
              {filter === 'unread'
                ? 'Tidak ada notifikasi belum dibaca saat ini.'
                : t('notifications.emptyDesc')}
            </ThemedText>
            {filter === 'unread' && (
              <TouchableOpacity
                onPress={() => setFilter('all')}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.primary, borderColor: theme.primary, marginTop: 12 },
                ]}
              >
                <ThemedText style={[styles.filterChipText, { color: '#fff' }]}>
                  Lihat Semua Notifikasi
                </ThemedText>
              </TouchableOpacity>
            )}
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
            {filteredNotifications.map((notif) => {
              const iconName = getNotifIconName(notif.type);
              const iconColor = getNotifIconColor(notif.type, theme);
              const isSelected = selectedIds.has(notif.notification_id);

              return (
                <Card
                  key={notif.notification_id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: isSelected
                        ? theme.primary
                        : notif.is_read
                        ? theme.border
                        : theme.primary + '50',
                      borderLeftColor: isSelected ? theme.primary : iconColor,
                      borderLeftWidth: 4,
                    },
                  ]}
                >
                  {/* Selection Checkbox */}
                  <TouchableOpacity
                    onPress={() => handleToggleSelectItem(notif.notification_id)}
                    style={styles.checkboxTouch}
                    id={`notif-checkbox-${notif.notification_id}`}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Left Category Icon */}
                  <View style={[styles.notifIconWrap, { backgroundColor: iconColor + '18' }]}>
                    <Ionicons name={iconName} size={20} color={iconColor} />
                  </View>

                  {/* Notification Content */}
                  <TouchableOpacity
                    style={styles.notifContent}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!notif.is_read) {
                        handleMarkAsRead(notif.notification_id);
                      } else {
                        handleToggleSelectItem(notif.notification_id);
                      }
                    }}
                    id={`notif-item-${notif.notification_id}`}
                  >
                    <View style={styles.notifHeader}>
                      <ThemedText
                        type={notif.is_read ? 'default' : 'smallBold'}
                        style={[
                          styles.notifTitle,
                          { color: theme.text, fontWeight: notif.is_read ? '500' : '700' },
                        ]}
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
                      numberOfLines={3}
                    >
                      {notif.body}
                    </ThemedText>

                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                      <ThemedText style={[styles.notifTime, { color: theme.textSecondary }]}>
                        {formatRelativeTime(notif.created_at, language)}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>

                  {/* Individual Action Buttons */}
                  <View style={styles.notifActions}>
                    {!notif.is_read && (
                      <TouchableOpacity
                        onPress={() => handleMarkAsRead(notif.notification_id)}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: theme.primary + '15',
                            borderColor: theme.primary + '30',
                          },
                        ]}
                        id={`notif-read-${notif.notification_id}`}
                        accessibilityLabel={t('notifications.markRead')}
                      >
                        <Ionicons name="checkmark" size={15} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteSingle(notif.notification_id)}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: theme.danger + '15',
                          borderColor: theme.danger + '30',
                        },
                      ]}
                      id={`notif-delete-${notif.notification_id}`}
                      accessibilityLabel={t('notifications.delete')}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}

            {/* Footer summary */}
            <View style={styles.footerMsg}>
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.textSecondary} />
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
  root: {
    flex: 1,
  },
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
    gap: Spacing.two,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    minWidth: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Control & Filter Bar
  controlBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  filterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    minHeight: 36,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  batchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  batchDeleteText: {
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
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 17,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  // List
  listContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: 40,
  },

  // Notification Card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  checkboxTouch: {
    paddingTop: 8,
    paddingRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifTitle: {
    fontSize: 14,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notifTime: {
    fontSize: 11,
  },
  notifActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footerMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
  },
});
