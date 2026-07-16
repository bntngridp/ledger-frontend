import React, { useState } from 'react';
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
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function HistoryScreen() {
  const theme = useTheme();

  // Filters state
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState('All');

  // Filter options
  const transactionTypes = ['All', 'Top Up', 'Transfer', 'Swap', 'Crypto', 'Withdrawal'];
  const assetTypes = ['All', 'IDR', 'USDT', 'USDC'];

  // Mock transaction list
  const allTransactions = [
    {
      id: 'tx-1',
      type: 'Top Up',
      asset: 'IDR',
      description: 'Top Up via BCA Virtual Account',
      amount: '+ Rp 500.000',
      time: 'Today, 10:45 AM',
      status: 'completed',
      icon: 'arrow-down-outline',
      color: theme.success,
    },
    {
      id: 'tx-2',
      type: 'Swap',
      asset: 'IDR',
      description: 'Swapped IDR to USDT',
      amount: '- Rp 150.000',
      time: 'Yesterday, 4:20 PM',
      status: 'completed',
      icon: 'swap-horizontal-outline',
      color: theme.primary,
    },
    {
      id: 'tx-3',
      type: 'Transfer',
      asset: 'IDR',
      description: 'Transferred to Andi',
      amount: '- Rp 30.000',
      time: '12 Jul, 1:15 PM',
      status: 'completed',
      icon: 'arrow-forward-outline',
      color: theme.danger,
    },
    {
      id: 'tx-4',
      type: 'Crypto',
      asset: 'USDT',
      description: 'Received from external address',
      amount: '+ 10.00 USDT',
      time: '10 Jul, 9:30 AM',
      status: 'completed',
      icon: 'arrow-back-outline',
      color: theme.success,
    },
    {
      id: 'tx-5',
      type: 'Withdrawal',
      asset: 'IDR',
      description: 'Withdrawal to Mandiri Account',
      amount: '- Rp 50.000',
      time: '08 Jul, 2:45 PM',
      status: 'processing',
      icon: 'cash-outline',
      color: theme.warning,
    },
    {
      id: 'tx-6',
      type: 'Transfer',
      asset: 'USDC',
      description: 'Transferred to Budi',
      amount: '- 5.00 USDC',
      time: '05 Jul, 11:20 AM',
      status: 'failed',
      icon: 'close-outline',
      color: theme.danger,
    },
  ];

  // Filtering logic
  const filteredTransactions = allTransactions.filter((tx) => {
    const matchesType = selectedType === 'All' || tx.type === selectedType;
    const matchesAsset = selectedAsset === 'All' || tx.asset === selectedAsset;
    return matchesType && matchesAsset;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.success;
      case 'processing':
        return theme.warning;
      case 'failed':
      default:
        return theme.danger;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Transactions
          </ThemedText>
        </View>

        {/* Filter type scroll */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {transactionTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedType === type ? theme.primary : theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedType === type ? '#ffffff' : theme.textSecondary,
                    fontWeight: '600',
                  }}
                >
                  {type}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filter asset selector */}
        <View style={styles.assetFilterSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: 8 }}>
            Asset:
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
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.txCard} bordered>
              <View style={[styles.txIconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.txDetails}>
                <ThemedText type="smallBold">{item.type}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {item.description}
                </ThemedText>
                <ThemedText type="code" style={styles.txTime}>
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
                    {item.status.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={48} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                No transactions match the filter.
              </ThemedText>
            </View>
          }
        />
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filterSection: {
    marginBottom: Spacing.two,
  },
  filterScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  assetFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    gap: 4,
  },
  assetChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
  },
  txIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  txDetails: {
    flex: 1,
    gap: 2,
  },
  txTime: {
    fontSize: 11,
    marginTop: 2,
  },
  txMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
});
