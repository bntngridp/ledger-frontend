import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';
import { OctopusLoader } from '@/components/ui/octopus-loader';
import { formatCurrency, formatLocalizedDate } from '@/utils/format';

interface TransactionItem {
  transaction_id: string;
  asset_symbol: string;
  amount: number | string;
  type: string;
  status: string;
  transaction_notes: string;
  created_at: string;
}

// Helper to format clean, modern descriptions without clunky raw technical strings
function formatCleanDescription(notes: string, type: string, asset: string, lang: string): string {
  if (!notes) return `${type} ${asset}`;

  // 1. Swap pattern: "swap USDC -> USDT" or "swap IDR -> USDT"
  const swapMatch = notes.match(/swap\s+([A-Za-z0-9]+)\s*->\s*([A-Za-z0-9]+)/i);
  if (swapMatch) {
    const [, from, to] = swapMatch;
    return `${from} → ${to}`;
  }

  // 2. Crypto withdrawal pattern: "Crypto withdrawal to 0x... on network" (may have "(Failed: ...)")
  const withdrawMatch = notes.match(/to\s+(0x[a-fA-F0-9]{6,42}|[a-zA-Z0-9]{20,50})\s+on\s+([a-zA-Z0-9_]+)/i);
  if (withdrawMatch) {
    const [, addr, networkRaw] = withdrawMatch;
    const shortAddr = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

    let networkName = networkRaw.replace(/_/g, ' ');
    if (networkRaw.toLowerCase().includes('polygon')) networkName = 'Polygon Amoy';
    else if (networkRaw.toLowerCase().includes('sepolia')) networkName = 'Sepolia';
    else if (networkRaw.toLowerCase().includes('solana')) networkName = 'Solana Devnet';
    else {
      networkName = networkName
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    if (lang === 'id') return `Kirim ke ${shortAddr} • ${networkName}`;
    if (lang === 'es') return `A ${shortAddr} • ${networkName}`;
    if (lang === 'ar') return `إلى ${shortAddr} • ${networkName}`;
    return `To ${shortAddr} • ${networkName}`;
  }

  // 3. Crypto deposit pattern
  const depositMatch = notes.match(/from\s+(0x[a-fA-F0-9]{6,42}|[a-zA-Z0-9]{20,50})\s+on\s+([a-zA-Z0-9_]+)/i);
  if (depositMatch) {
    const [, addr, networkRaw] = depositMatch;
    const shortAddr = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

    let networkName = networkRaw.replace(/_/g, ' ');
    if (networkRaw.toLowerCase().includes('polygon')) networkName = 'Polygon Amoy';
    else if (networkRaw.toLowerCase().includes('sepolia')) networkName = 'Sepolia';
    else if (networkRaw.toLowerCase().includes('solana')) networkName = 'Solana Devnet';

    if (lang === 'id') return `Dari ${shortAddr} • ${networkName}`;
    if (lang === 'es') return `De ${shortAddr} • ${networkName}`;
    if (lang === 'ar') return `من ${shortAddr} • ${networkName}`;
    return `From ${shortAddr} • ${networkName}`;
  }

  // 4. Midtrans Topup
  if (notes.toLowerCase().includes('midtrans')) {
    if (lang === 'id') return 'Deposit via Midtrans';
    if (lang === 'es') return 'Depósito vía Midtrans';
    if (lang === 'ar') return 'إيداع عبر Midtrans';
    return 'Deposit via Midtrans';
  }

  // 5. Transfer P2P to/from email
  const transferToMatch = notes.match(/to\s+([^\s]+@[^\s]+)/i);
  if (transferToMatch) {
    const toEmail = transferToMatch[1];
    if (lang === 'id') return `Ke ${toEmail}`;
    if (lang === 'es') return `A ${toEmail}`;
    if (lang === 'ar') return `إلى ${toEmail}`;
    return `To ${toEmail}`;
  }

  const transferFromMatch = notes.match(/from\s+([^\s]+@[^\s]+)/i);
  if (transferFromMatch) {
    const fromEmail = transferFromMatch[1];
    if (lang === 'id') return `Dari ${fromEmail}`;
    if (lang === 'es') return `De ${fromEmail}`;
    if (lang === 'ar') return `من ${fromEmail}`;
    return `From ${fromEmail}`;
  }

  // Strip long error messages if present: "Notes (Failed: ...)" -> "Notes"
  const cleanNotes = notes.replace(/\s*\(Failed:.*?\)/i, '').trim();
  return cleanNotes || `${type} ${asset}`;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { t, language } = useTranslation();

  // Filters state
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [error, setError] = useState('');

  // Filter options
  const transactionTypes = [
    { label: t('history.allTypes') || 'Semua', value: 'All' },
    { label: t('history.topUps') || 'Top Up', value: 'Top Up' },
    { label: t('history.transfers') || 'Transfer', value: 'Transfer' },
    { label: t('history.swaps') || 'Swap', value: 'Swap' },
    { label: t('history.crypto') || 'Crypto', value: 'Crypto' },
    { label: t('history.withdrawals') || 'Penarikan', value: 'Withdrawal' },
  ];
  const assetTypes = ['All', 'IDR', 'USDT', 'USDC'];

  const loadTransactions = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await api.wallet.getTransactions({ page: 1, per_page: 100 });
      if (response.status === 'success' && response.data) {
        const txArray = Array.isArray(response.data) ? response.data : response.data.transactions || [];
        setTransactions(txArray);
      } else {
        setError(response.message || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadTransactions();
    })();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return theme.success;
      case 'processing':
      case 'pending':
        return theme.warning;
      case 'failed':
      default:
        return theme.danger;
    }
  };

  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success') {
      if (language === 'id') return 'Sukses';
      if (language === 'es') return 'Completado';
      if (language === 'ar') return 'ناجح';
      return 'Success';
    }
    if (s === 'processing' || s === 'pending') {
      if (language === 'id') return 'Diproses';
      if (language === 'es') return 'Pendiente';
      if (language === 'ar') return 'قيد التنفيذ';
      return 'Pending';
    }
    if (language === 'id') return 'Gagal';
    if (language === 'es') return 'Fallido';
    if (language === 'ar') return 'فاشل';
    return 'Failed';
  };

  // Map API transaction item to UI structure
  const getMappedTransactions = () => {
    if (!Array.isArray(transactions)) return [];
    return transactions.map((tx) => {
      let sign = '+';
      let icon = 'arrow-down-outline';
      const tLower = (tx.type || '').toLowerCase();

      if (tLower === 'withdraw' || tLower === 'transfer_out' || tLower === 'crypto_withdrawal' || tLower === 'crypto_withdraw') {
        sign = '-';
        icon = 'arrow-up-outline';
      } else if (tLower === 'transfer_in') {
        sign = '+';
        icon = 'arrow-down-outline';
      } else if (tLower === 'swap') {
        sign = '';
        icon = 'swap-horizontal-outline';
      } else if (tLower === 'topup' || tLower === 'crypto_deposit' || tLower === 'crypto_topup') {
        sign = '+';
        icon = 'arrow-down-outline';
      }

      // Nice type display name
      let typeDisplay = tx.type;
      if (tLower === 'transfer_out') typeDisplay = t('dashboard.txTransferSent') || 'Transfer';
      else if (tLower === 'transfer_in') typeDisplay = t('dashboard.txTransferReceived') || 'Transfer Masuk';
      else if (tLower === 'topup' || tLower === 'crypto_deposit' || tLower === 'crypto_topup') typeDisplay = t('dashboard.txTopUp') || 'Top Up';
      else if (tLower === 'withdraw' || tLower === 'crypto_withdrawal' || tLower === 'crypto_withdraw') typeDisplay = t('dashboard.txWithdrawal') || 'Penarikan';
      else if (tLower === 'swap') typeDisplay = t('dashboard.txSwap') || 'Swap';

      // Clean description
      const cleanDesc = formatCleanDescription(tx.transaction_notes, typeDisplay, tx.asset_symbol, language);

      // Locale-aware formatted amount
      const numAmount = parseFloat(String(tx.amount));
      const formattedAmount = `${sign ? sign : ''}${formatCurrency(Math.abs(numAmount), tx.asset_symbol, language)}`;

      // Locale-aware formatted time
      const timeDisplay = formatLocalizedDate(tx.created_at, language);

      // Identify Crypto network deposits/withdrawals
      let uiType = typeDisplay;
      if (tLower.includes('crypto') || (tLower === 'withdraw' && tx.asset_symbol !== 'IDR') || (tLower === 'topup' && tx.asset_symbol !== 'IDR')) {
        uiType = 'Crypto';
      }

      return {
        id: tx.transaction_id,
        type: typeDisplay,
        uiType,
        asset: tx.asset_symbol,
        description: cleanDesc,
        amount: formattedAmount,
        time: timeDisplay,
        status: getStatusLabel(tx.status),
        statusRaw: tx.status,
        icon,
      };
    });
  };

  const uiTransactions = getMappedTransactions();

  // Filtering logic
  const filteredTransactions = uiTransactions.filter((tx) => {
    const matchesType =
      selectedType === 'All' ||
      tx.uiType === selectedType ||
      tx.type === selectedType ||
      (selectedType === 'Transfer' && (tx.type.includes('Transfer') || tx.type.includes('Sent') || tx.type.includes('Received') || tx.type.includes('تحويل'))) ||
      (selectedType === 'Withdrawal' && (tx.type.includes('Withdraw') || tx.type.includes('Penarikan') || tx.type.includes('سحب'))) ||
      (selectedType === 'Swap' && (tx.type.includes('Swap') || tx.type.includes('Tukar') || tx.type.includes('Canje') || tx.type.includes('تبادل'))) ||
      (selectedType === 'Crypto' && (tx.uiType === 'Crypto' || tx.asset !== 'IDR'));

    const matchesAsset = selectedAsset === 'All' || tx.asset === selectedAsset;
    return matchesType && matchesAsset;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('history.historyTitle') || 'Riwayat Transaksi'}
          </ThemedText>
        </View>

        {/* Filter type scroll */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {transactionTypes.map((typeItem) => {
              const isActive = selectedType === typeItem.value;
              return (
                <TouchableOpacity
                  key={typeItem.value}
                  onPress={() => setSelectedType(typeItem.value)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: isActive ? '#ffffff' : theme.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                      fontSize: 12,
                    }}
                  >
                    {typeItem.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filter asset selector */}
        <View style={styles.assetFilterSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: 8, fontSize: 12 }}>
            {t('history.assetLabel') || 'Aset'}:
          </ThemedText>
          {assetTypes.map((asset) => {
            const isActive = selectedAsset === asset;
            return (
              <TouchableOpacity
                key={asset}
                onPress={() => setSelectedAsset(asset)}
                style={[
                  styles.assetChip,
                  {
                    backgroundColor: isActive ? theme.backgroundSelected : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: isActive ? theme.text : theme.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 12,
                  }}
                >
                  {asset === 'All' ? (t('dashboard.filterAll') || 'Semua') : asset}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transaction list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <OctopusLoader size="large" message={t('common.loading') || 'Memuat riwayat transaksi...'} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
            <ThemedText style={{ color: theme.danger, marginTop: 12, fontWeight: '600' }}>{error}</ThemedText>
            <TouchableOpacity onPress={() => loadTransactions()} style={styles.retryBtn}>
              <ThemedText style={{ color: '#ffffff', fontWeight: '600' }}>{t('common.retry') || 'Retry'}</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={() => loadTransactions(true)}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={44} color={theme.textSecondary + '60'} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 12 }}>
                  {t('history.noHistory') || 'Belum ada transaksi ditemukan.'}
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.txCard} bordered>
                {/* Modern subtle rounded icon */}
                <View style={[styles.txIconContainer, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name={item.icon as any} size={18} color={theme.primary} />
                </View>

                {/* Details */}
                <View style={styles.txDetails}>
                  <ThemedText type="smallBold" style={{ textAlign: 'left' }}>
                    {item.type}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'left', marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {item.description}
                  </ThemedText>
                  <ThemedText type="code" style={[styles.txTime, { textAlign: 'left' }]}>
                    {item.time}
                  </ThemedText>
                </View>

                {/* Amount & Status Badge */}
                <View style={styles.txMeta}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: item.amount.startsWith('+') ? theme.success : theme.text }}
                  >
                    {item.amount}
                  </ThemedText>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.statusRaw) + '15' },
                    ]}
                  >
                    <ThemedText
                      type="code"
                      style={{ color: getStatusColor(item.statusRaw), fontSize: 10, fontWeight: '700' }}
                    >
                      {item.status}
                    </ThemedText>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
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
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  filterSection: {
    marginBottom: Spacing.two,
  },
  filterScroll: {
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  assetFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  assetChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    flexShrink: 0,
  },
  txDetails: {
    flex: 1,
    gap: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: Spacing.two,
  },
  txTime: {
    fontSize: 11,
    color: '#8A8C98',
    marginTop: 2,
  },
  txMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    minWidth: 85,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  retryBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});
