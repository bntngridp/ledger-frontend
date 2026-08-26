import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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

  // Filter options - now using translated labels
  const transactionTypes = [
    { label: t('history.allTypes'), value: 'All' },
    { label: t('history.topUps'), value: 'Top Up' },
    { label: t('history.transfers'), value: 'Transfer' },
    { label: t('history.swaps'), value: 'Swap' },
    { label: t('history.crypto'), value: 'Crypto' },
    { label: t('history.withdrawals'), value: 'Withdrawal' },
  ];
  const assetTypes = ['All', 'IDR', 'USDT', 'USDC'];

  const loadTransactions = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await api.wallet.getTransactions({ page: 1, per_page: 100 });
      if (response.status === 'success' && response.data) {
        const txArray = Array.isArray(response.data) ? response.data : (response.data.transactions || []);
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

  // Map API transaction item to UI structure
  const getMappedTransactions = () => {
    if (!Array.isArray(transactions)) return [];
    return transactions.map((tx) => {
      let color: string = theme.success;
      let sign = '+';
      let icon = 'arrow-down-outline';
      const tLower = (tx.type || '').toLowerCase();

      if (tLower === 'withdraw' || tLower === 'transfer_out' || tLower === 'crypto_withdrawal' || tLower === 'crypto_withdraw') {
        color = theme.danger;
        sign = '-';
        icon = tLower.includes('transfer') ? 'arrow-forward-outline' : 'cash-outline';
      } else if (tLower === 'transfer_in') {
        color = theme.success;
        sign = '+';
        icon = 'arrow-back-outline';
      } else if (tLower === 'swap') {
        color = theme.primary;
        sign = '';
        icon = 'swap-horizontal-outline';
      } else if (tLower === 'topup' || tLower === 'crypto_deposit' || tLower === 'crypto_topup') {
        color = theme.success;
        sign = '+';
        icon = 'add-outline';
      }

      if (tx.status.toLowerCase() === 'pending' || tx.status.toLowerCase() === 'processing') {
        color = theme.warning;
      }

      // Nice type display name
      let typeDisplay = tx.type;
      if (tLower === 'transfer_out') typeDisplay = t('dashboard.txTransferSent') || 'Transfer Sent';
      else if (tLower === 'transfer_in') typeDisplay = t('dashboard.txTransferReceived') || 'Transfer Received';
      else if (tLower === 'topup' || tLower === 'crypto_deposit' || tLower === 'crypto_topup') typeDisplay = t('dashboard.txTopUp') || 'Top Up';
      else if (tLower === 'withdraw' || tLower === 'crypto_withdrawal' || tLower === 'crypto_withdraw') typeDisplay = t('dashboard.txWithdrawal') || 'Withdrawal';
      else if (tLower === 'swap') typeDisplay = t('dashboard.txSwap') || 'Swap';

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
        uiType, // used for filtering category
        asset: tx.asset_symbol,
        description: tx.transaction_notes || `${typeDisplay} ${tx.asset_symbol}`,
        amount: formattedAmount,
        time: timeDisplay,
        status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
        icon,
        color,
      };
    });
  };

  const uiTransactions = getMappedTransactions();

  // Filtering logic
  const filteredTransactions = uiTransactions.filter((tx) => {
    // Selected Type filter map
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
            {t('history.historyTitle')}
          </ThemedText>
        </View>

        {/* Filter type scroll */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {transactionTypes.map((typeItem) => (
              <TouchableOpacity
                key={typeItem.value}
                onPress={() => setSelectedType(typeItem.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedType === typeItem.value ? theme.primary : theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedType === typeItem.value ? '#ffffff' : theme.textSecondary,
                    fontWeight: '600',
                  }}
                >
                  {typeItem.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filter asset selector */}
        <View style={styles.assetFilterSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: 8 }}>
            {t('history.assetLabel')}
          </ThemedText>
          {assetTypes.map((asset) => (
            <TouchableOpacity
              key={asset}
              onPress={() => setSelectedAsset(asset)}
              style={[
                styles.assetChip,
                {
                  backgroundColor: selectedAsset === asset ? theme.backgroundSelected : 'transparent',
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedAsset === asset ? theme.text : theme.textSecondary,
                  fontWeight: selectedAsset === asset ? '700' : '500',
                }}
              >
                {asset}
              </ThemedText>
            </TouchableOpacity>
          ))}
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
                <Ionicons name="receipt-outline" size={48} color={theme.textSecondary + '80'} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 12 }}>
                  {t('history.noHistory') || 'Belum ada transaksi ditemukan.'}
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.txCard} bordered>
                <View style={[styles.txIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.txDetails}>
                  <ThemedText type="smallBold" style={{ textAlign: 'left' }}>
                    {item.type}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'left' }}>
                    {item.description}
                  </ThemedText>
                  <ThemedText type="code" style={[styles.txTime, { textAlign: 'left' }]}>
                    {item.time}
                  </ThemedText>
                </View>
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
                      { backgroundColor: getStatusColor(item.status) + '15' },
                    ]}
                  >
                    <ThemedText
                      type="code"
                      style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '700' }}
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  assetFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  assetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
    gap: 12,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
  },
  txIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    flexShrink: 0,
  },
  txDetails: {
    flex: 1,
    gap: 2,
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
    gap: 6,
    minWidth: 90,
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
