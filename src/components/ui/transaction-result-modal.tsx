import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Button } from './button';
import { Card } from './card';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface TransactionResultDetails {
  title: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'swap';
  status: 'success' | 'failed' | 'pending';
  amount?: string;
  asset?: string;
  recipientOrAddress?: string;
  txHash?: string;
  errorMessage?: string;
  notes?: string;
  timestamp?: string;
}

interface TransactionResultModalProps {
  visible: boolean;
  onClose: () => void;
  result: TransactionResultDetails | null;
  onRetry?: () => void;
  onViewHistory?: () => void;
}

export function TransactionResultModal({
  visible,
  onClose,
  result,
  onRetry,
  onViewHistory,
}: TransactionResultModalProps) {
  const theme = useTheme();
  const [copiedHash, setCopiedHash] = useState(false);

  // Pulse animation on graphic
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible && result) {
      setCopiedHash(false);

      // Continuous subtle pulse on icon halo
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible, result]);

  if (!result) return null;

  const isSuccess = result.status === 'success';
  const isFailed = result.status === 'failed';
  const isPending = result.status === 'pending';

  const statusColor = isSuccess
    ? theme.success
    : isFailed
    ? theme.danger
    : theme.warning;

  const handleCopyHash = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      Clipboard.setString(text);
    }
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const getTypeText = () => {
    switch (result.type) {
      case 'deposit':
        return 'Setoran Crypto (Deposit)';
      case 'withdraw':
        return 'Penarikan Crypto (Withdraw)';
      case 'transfer':
        return 'Transfer Aset';
      case 'swap':
        return 'Penukaran Aset (Swap)';
      default:
        return 'Transaksi';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title}>
              {result.title}
            </ThemedText>
            <TouchableOpacity
              onPress={onClose}
              id="result-modal-close-btn"
              accessibilityLabel="Tutup modal konfirmasi"
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Central Animated Graphic */}
          <View style={styles.graphicContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: statusColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: statusColor + '18' },
              ]}
            >
              <Ionicons
                name={
                  isSuccess
                    ? 'checkmark-circle'
                    : isFailed
                    ? 'close-circle'
                    : 'time'
                }
                size={48}
                color={statusColor}
              />
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: statusColor + '18',
                borderColor: statusColor + '40',
              },
            ]}
          >
            <Ionicons
              name={
                isSuccess
                  ? 'shield-checkmark'
                  : isFailed
                  ? 'alert-circle'
                  : 'hourglass-outline'
              }
              size={14}
              color={statusColor}
            />
            <ThemedText
              type="smallBold"
              style={{ color: statusColor, fontSize: 12, textTransform: 'uppercase' }}
            >
              {isSuccess
                ? 'Transaksi Berhasil'
                : isFailed
                ? 'Transaksi Gagal'
                : 'Menunggu Konfirmasi Blockchain'}
            </ThemedText>
          </View>

          {/* Amount Display */}
          {result.amount && (
            <ThemedText
              type="subtitle"
              style={[
                styles.amountText,
                { color: isSuccess ? theme.success : isFailed ? theme.danger : theme.text },
              ]}
            >
              {isSuccess ? '+' : isFailed ? '' : ''}
              {result.amount} {result.asset || ''}
            </ThemedText>
          )}

          {/* Error Message or Details Card */}
          {isFailed && result.errorMessage ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.danger + '12', borderColor: theme.danger + '40' },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
              <ThemedText
                type="small"
                style={{ color: theme.danger, flex: 1, fontSize: 12, lineHeight: 16 }}
              >
                {result.errorMessage}
              </ThemedText>
            </View>
          ) : (
            <Card
              bordered
              style={[
                styles.detailsCard,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <View style={styles.detailRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Kategori
                </ThemedText>
                <ThemedText type="smallBold">{getTypeText()}</ThemedText>
              </View>

              {result.recipientOrAddress && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {result.type === 'deposit' ? 'Alamat Setoran' : 'Alamat Tujuan'}
                    </ThemedText>
                    <ThemedText type="code" style={{ fontSize: 11, maxWidth: 160 }} numberOfLines={1}>
                      {result.recipientOrAddress.slice(0, 8)}...{result.recipientOrAddress.slice(-6)}
                    </ThemedText>
                  </View>
                </>
              )}

              {result.txHash && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Tx Hash
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => result.txHash && handleCopyHash(result.txHash)}
                      style={styles.copyHashBtn}
                      id="result-copy-hash-btn"
                    >
                      <ThemedText type="code" style={{ fontSize: 11, color: theme.primary }} numberOfLines={1}>
                        {result.txHash.slice(0, 8)}...{result.txHash.slice(-6)}
                      </ThemedText>
                      <Ionicons
                        name={copiedHash ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={copiedHash ? theme.success : theme.primary}
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Jaringan
                </ThemedText>
                <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                  Polygon Amoy Testnet
                </ThemedText>
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isFailed && onRetry ? (
              <>
                <Button
                  title="Tutup"
                  variant="ghost"
                  onPress={onClose}
                  style={{ flex: 1 }}
                  id="result-modal-close-action-btn"
                />
                <Button
                  title="Coba Lagi"
                  variant="primary"
                  onPress={onRetry}
                  style={{ flex: 1.5 }}
                  id="result-modal-retry-btn"
                />
              </>
            ) : (
              <>
                {onViewHistory && (
                  <Button
                    title="Lihat Riwayat"
                    variant="secondary"
                    onPress={onViewHistory}
                    style={{ flex: 1 }}
                    id="result-modal-history-btn"
                  />
                )}
                <Button
                  title="Selesai"
                  variant="primary"
                  onPress={onClose}
                  style={{ flex: 1.5 }}
                  id="result-modal-done-btn"
                />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      } as any,
      default: {
        flex: 1,
      },
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: Spacing.five,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    zIndex: 100000,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  graphicContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.four,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  copyHashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
  },
});
