import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function DashboardScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();

  // Dashboard state
  const [showBalance, setShowBalance] = useState(true);

  // Mock data for assets
  const assets = [
    {
      id: '1',
      symbol: 'IDR',
      name: 'Rupiah Indonesia',
      balance: 'Rp 1.200.000',
      equivalent: 'Rp 1.200.000',
      icon: 'cash-outline',
      iconColor: theme.success,
    },
    {
      id: '2',
      symbol: 'USDT',
      name: 'Tether USDT',
      balance: '45.50 USDT',
      equivalent: 'Rp 750.000',
      icon: 'logo-usd',
      iconColor: theme.primary,
    },
    {
      id: '3',
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '30.20 USDC',
      equivalent: 'Rp 500.000',
      icon: 'shield-outline',
      iconColor: '#2775CA',
    },
  ];

  // Mock data for transactions
  const transactions = [
    {
      id: 'tx-1',
      type: 'Top Up',
      description: 'Top Up via Bank Transfer',
      amount: '+ Rp 500.000',
      time: 'Today, 10:45 AM',
      status: 'success',
      icon: 'arrow-down-outline',
      color: theme.success,
    },
    {
      id: 'tx-2',
      type: 'Swap',
      description: 'IDR to USDT Swap',
      amount: '- Rp 150.000',
      time: 'Yesterday, 4:20 PM',
      status: 'success',
      icon: 'swap-horizontal-outline',
      color: theme.primary,
    },
    {
      id: 'tx-3',
      type: 'Transfer',
      description: 'Transfer to Andi',
      amount: '- Rp 30.000',
      time: '12 Jul, 1:15 PM',
      status: 'success',
      icon: 'arrow-forward-outline',
      color: theme.danger,
    },
    {
      id: 'tx-4',
      type: 'Receive',
      description: 'Received from Budi',
      amount: '+ 10.00 USDT',
      time: '10 Jul, 9:30 AM',
      status: 'success',
      icon: 'arrow-back-outline',
      color: theme.success,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={{ color: theme.textSecondary }}>Welcome back,</ThemedText>
              <ThemedText type="smallBold" style={styles.username}>
                Bintang Ridwan 👋
              </ThemedText>
            </View>
            <View style={styles.headerActions}>
              {/* Theme indicator badge */}
              <View style={[styles.themeBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons
                  name={scheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                  size={16}
                  color={theme.primary}
                />
                <ThemedText type="code" style={styles.themeText}>
                  {scheme === 'dark' ? 'DARK' : 'LIGHT'}
                </ThemedText>
              </View>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="notifications-outline" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Portfolio Balance Card */}
          <Card style={[styles.portfolioCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.portfolioHeader}>
              <ThemedText style={[styles.portfolioLabel, { color: theme.textSecondary }]}>
                ESTIMATED TOTAL BALANCE
              </ThemedText>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                <Ionicons
                  name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ThemedText type="title" style={styles.totalBalance}>
              {showBalance ? 'Rp 2.450.000' : '••••••••'}
            </ThemedText>
            <View style={styles.portfolioFooter}>
              <Ionicons name="trending-up-outline" size={16} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, marginLeft: 4 }}>
                +12.4% this month
              </ThemedText>
            </View>
          </Card>

          {/* Asset List Section */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Your Assets
            </ThemedText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.assetScroll}
          >
            {assets.map((asset) => (
              <Card key={asset.id} style={styles.assetCard} bordered>
                <View style={styles.assetCardHeader}>
                  <View style={[styles.assetIconContainer, { backgroundColor: asset.iconColor + '20' }]}>
                    <Ionicons name={asset.icon as any} size={24} color={asset.iconColor} />
                  </View>
                  <ThemedText type="smallBold">{asset.symbol}</ThemedText>
                </View>
                <View style={styles.assetCardBody}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {asset.name}
                  </ThemedText>
                  <ThemedText type="default" style={styles.assetBalance}>
                    {showBalance ? asset.balance : '••••'}
                  </ThemedText>
                  {asset.symbol !== 'IDR' && (
                    <ThemedText type="code" style={{ color: theme.textSecondary }}>
                      {showBalance ? asset.equivalent : '••••'}
                    </ThemedText>
                  )}
                </View>
              </Card>
            ))}
          </ScrollView>

          {/* Quick Actions */}
          <View style={[styles.actionGrid, { backgroundColor: theme.backgroundElement }]}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/welcome')}>
              <View style={[styles.actionIconWrapper, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
              </View>
              <ThemedText type="small" style={styles.actionLabel}>Top Up</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIconWrapper, { backgroundColor: theme.success + '15' }]}>
                <Ionicons name="paper-plane-outline" size={24} color={theme.success} />
              </View>
              <ThemedText type="small" style={styles.actionLabel}>Transfer</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIconWrapper, { backgroundColor: theme.warning + '15' }]}>
                <Ionicons name="swap-horizontal-outline" size={24} color={theme.warning} />
              </View>
              <ThemedText type="small" style={styles.actionLabel}>Swap</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIconWrapper, { backgroundColor: theme.danger + '15' }]}>
                <Ionicons name="cash-outline" size={24} color={theme.danger} />
              </View>
              <ThemedText type="small" style={styles.actionLabel}>Withdraw</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Recent Transactions
            </ThemedText>
            <TouchableOpacity>
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                See All
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>
            {transactions.map((tx) => (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.txIconContainer, { backgroundColor: tx.color + '15' }]}>
                  <Ionicons name={tx.icon as any} size={20} color={tx.color} />
                </View>
                <View style={styles.txDetails}>
                  <ThemedText type="smallBold">{tx.type}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13 }}>
                    {tx.description}
                  </ThemedText>
                  <ThemedText type="code" style={styles.txTime}>
                    {tx.time}
                  </ThemedText>
                </View>
                <View style={styles.txAmountContainer}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: tx.amount.startsWith('+') ? theme.success : theme.text }}
                  >
                    {tx.amount}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  username: {
    fontSize: 18,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  themeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioCard: {
    marginVertical: Spacing.two,
    padding: Spacing.four,
    borderRadius: 20,
    // iOS shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  portfolioLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: Spacing.one,
  },
  portfolioFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  assetScroll: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  assetCard: {
    width: 160,
    marginRight: 12,
    padding: Spacing.three,
  },
  assetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  assetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetCardBody: {
    gap: 2,
  },
  assetBalance: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.three,
    borderRadius: 20,
    marginTop: Spacing.four,
  },
  actionItem: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionList: {
    marginTop: Spacing.one,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
});
