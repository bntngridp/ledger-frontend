import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/theme';
import { Chart } from '@/components/chart';

export default function DashboardScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive state
  const isLargeScreen = Platform.OS === 'web' && width > 1024;

  // Dashboard state
  const [showBalance, setShowBalance] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for assets (expanded for web view)
  const assets = [
    {
      id: '1',
      symbol: 'BTC',
      name: 'Bitcoin',
      balance: '2.45 BTC',
      equivalent: '$195,350.00',
      change: '+5.2%',
      changeType: 'up',
      icon: 'logo-bitcoin',
      iconColor: '#F7931A',
    },
    {
      id: '2',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '14.2 ETH',
      equivalent: '$18,460.00',
      change: '-1.1%',
      changeType: 'down',
      icon: 'logo-octocat', // simplified representation
      iconColor: '#627EEA',
    },
    {
      id: '3',
      symbol: 'USDT',
      name: 'Tether',
      balance: '782.80 USDT',
      equivalent: '$782.80',
      change: '0.0%',
      changeType: 'flat',
      icon: 'logo-usd',
      iconColor: theme.success,
    },
  ];

  // Mobile assets
  const mobileAssets = [
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

  // Mock transactions (expanded for web table view)
  const transactions = [
    {
      id: 'tx-1',
      asset: 'BTC',
      assetName: 'Bitcoin',
      type: 'Received',
      amount: '+0.045 BTC',
      status: 'Completed',
      time: 'Today, 10:45 AM',
      color: theme.success,
    },
    {
      id: 'tx-2',
      asset: 'ETH',
      assetName: 'Ethereum',
      type: 'Swapped',
      amount: '-1.20 ETH',
      status: 'Pending',
      time: 'Yesterday, 4:20 PM',
      color: theme.warning,
    },
    {
      id: 'tx-3',
      asset: 'USD',
      assetName: 'US Dollar',
      type: 'Deposit',
      amount: '+$5,800.00',
      status: 'Completed',
      time: '12 Jul, 1:15 PM',
      color: theme.success,
    },
  ];

  // Mobile layout
  const renderMobile = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mobileScrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={{ color: theme.textSecondary }}>Welcome back,</ThemedText>
          <ThemedText type="smallBold" style={styles.username}>
            Bintang Ridwan 👋
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
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
        {mobileAssets.map((asset) => (
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
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/topup')}>
          <View style={[styles.actionIconWrapper, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
          </View>
          <ThemedText type="small" style={styles.actionLabel}>Top Up</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/transfer')}>
          <View style={[styles.actionIconWrapper, { backgroundColor: theme.success + '15' }]}>
            <Ionicons name="paper-plane-outline" size={24} color={theme.success} />
          </View>
          <ThemedText type="small" style={styles.actionLabel}>Transfer</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/swap')}>
          <View style={[styles.actionIconWrapper, { backgroundColor: theme.warning + '15' }]}>
            <Ionicons name="swap-horizontal-outline" size={24} color={theme.warning} />
          </View>
          <ThemedText type="small" style={styles.actionLabel}>Swap</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/withdraw')}>
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
        <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
            See All
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionList}>
        {transactions.map((tx) => (
          <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.txIconContainer, { backgroundColor: tx.color + '15' }]}>
              <Ionicons
                name={tx.type === 'Received' ? 'arrow-down-outline' : tx.type === 'Swapped' ? 'swap-horizontal-outline' : 'cash-outline'}
                size={20}
                color={tx.color}
              />
            </View>
            <View style={styles.txDetails}>
              <ThemedText type="smallBold">{tx.type} {tx.asset}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13 }}>
                {tx.type} {tx.assetName}
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
  );

  // Desktop Responsive Widescreen layout
  const renderDesktop = () => (
    <View style={styles.desktopContainer}>
      {/* Top Navbar */}
      <View style={[styles.topNavbar, { borderBottomColor: theme.border }]}>
        <ThemedText type="subtitle" style={styles.topNavbarTitle}>
          Overview
        </ThemedText>
        
        <View style={styles.navbarRight}>
          {/* Search Assets */}
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchBarContainer}
            iconLeft="search-outline"
          />

          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[styles.profileAvatar, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="code" style={styles.avatarText}>BR</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Grid */}
      <View style={styles.gridContent}>
        {/* Left Column (Main Panel) */}
        <View style={styles.leftColumn}>
          {/* Overview Portfolio & Chart */}
          <Card style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>TOTAL BALANCE</ThemedText>
                <View style={styles.balanceContainer}>
                  <ThemedText type="subtitle" style={styles.desktopBalanceText}>
                    $124,592.80
                  </ThemedText>
                  <View style={[styles.gainBadge, { backgroundColor: theme.success + '15' }]}>
                    <ThemedText type="code" style={{ color: theme.success, fontWeight: '700' }}>
                      +2.4%
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Segmented Filter */}
              <View style={[styles.segmentedWrapper, { backgroundColor: theme.background }]}>
                {['All', 'Crypto', 'Fiat'].map((tab) => (
                  <TouchableOpacity key={tab} style={[styles.segmentBtn, tab === 'All' && { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="code" style={{ fontSize: 11 }}>{tab}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Line Chart */}
            <Chart />
          </Card>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            {[
              { title: 'Send', desc: 'Transfer assets P2P', icon: 'paper-plane-outline', route: '/transfer', color: theme.primary },
              { title: 'Receive', desc: 'Show wallet address', icon: 'qr-code-outline', route: '/(tabs)/crypto', color: theme.success },
              { title: 'Swap', desc: 'Exchange currencies', icon: 'swap-horizontal-outline', route: '/(tabs)/swap', color: theme.warning },
              { title: 'Buy', desc: 'Top up Rupiah', icon: 'add-circle-outline', route: '/topup', color: theme.danger },
            ].map((action) => (
              <TouchableOpacity
                key={action.title}
                onPress={() => router.push(action.route as any)}
                style={{ flex: 1 }}
              >
                <Card style={styles.actionCard} bordered>
                  <View style={[styles.actionIconBg, { backgroundColor: action.color + '15' }]}>
                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <ThemedText type="smallBold" style={{ marginTop: 8 }}>{action.title}</ThemedText>
                  <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>{action.desc}</ThemedText>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Transactions Table */}
          <Card style={styles.tableCard} bordered>
            <View style={styles.tableHeaderRow}>
              <ThemedText type="smallBold">Recent Transactions</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>View All</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Table headers */}
            <View style={[styles.tableColumns, { borderBottomColor: theme.border }]}>
              <ThemedText type="code" style={[styles.col, { flex: 1 }]}>ASSET</ThemedText>
              <ThemedText type="code" style={[styles.col, { flex: 1 }]}>TYPE</ThemedText>
              <ThemedText type="code" style={[styles.col, { flex: 1, textAlign: 'right' }]}>AMOUNT</ThemedText>
              <ThemedText type="code" style={[styles.col, { flex: 1, textAlign: 'right' }]}>STATUS</ThemedText>
            </View>

            {/* Table rows */}
            {transactions.map((tx) => (
              <View key={tx.id} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <View style={styles.assetCol}>
                  <View style={[styles.smallIconCircle, { backgroundColor: tx.color + '15' }]}>
                    <ThemedText type="code" style={{ color: tx.color, fontSize: 10 }}>{tx.asset[0]}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">{tx.assetName}</ThemedText>
                </View>
                <ThemedText type="small" style={[styles.col, { color: theme.textSecondary }]}>
                  {tx.type}
                </ThemedText>
                <ThemedText type="smallBold" style={[styles.col, { textAlign: 'right', color: tx.amount.startsWith('+') ? theme.success : theme.text }]}>
                  {tx.amount}
                </ThemedText>
                <View style={styles.statusCol}>
                  <View style={[styles.statusPill, { backgroundColor: (tx.status === 'Completed' ? theme.success : theme.warning) + '15' }]}>
                    <ThemedText type="code" style={{ fontSize: 10, color: tx.status === 'Completed' ? theme.success : theme.warning, fontWeight: '700' }}>
                      {tx.status}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Right Column (Sidebar Assets) */}
        <View style={styles.rightColumn}>
          <Card style={styles.assetsSidebar} bordered>
            <View style={styles.sidebarHeader}>
              <ThemedText type="smallBold">Your Assets</ThemedText>
              <TouchableOpacity>
                <Ionicons name="add" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.assetsSidebarList}>
              {assets.map((asset) => (
                <View key={asset.id} style={[styles.sidebarAssetRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.assetIconContainer, { backgroundColor: asset.iconColor + '15' }]}>
                    <Ionicons name={asset.icon as any} size={22} color={asset.iconColor} />
                  </View>
                  <View style={styles.assetSidebarDetails}>
                    <ThemedText type="smallBold">{asset.name}</ThemedText>
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
                      {asset.balance}
                    </ThemedText>
                  </View>
                  <View style={styles.assetSidebarValues}>
                    <ThemedText type="smallBold">{asset.equivalent}</ThemedText>
                    <ThemedText type="code" style={{ color: asset.changeType === 'up' ? theme.success : theme.danger, fontSize: 11, fontWeight: '700' }}>
                      {asset.change}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.managePortfolioBtn}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: '600' }}>
                Manage Portfolio
              </ThemedText>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {isLargeScreen ? renderDesktop() : renderMobile()}
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
    width: '100%',
  },
  // Mobile styles
  mobileScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
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

  // Desktop responsive styles
  desktopContainer: {
    flex: 1,
    height: '100%',
  },
  topNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 18,
    borderBottomWidth: 1.5,
  },
  topNavbarTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  searchBarContainer: {
    width: 240,
    marginBottom: 0,
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
  },
  gridContent: {
    flex: 1,
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  leftColumn: {
    flex: 2.5,
    gap: Spacing.three,
  },
  rightColumn: {
    flex: 1,
  },
  overviewCard: {
    padding: Spacing.four,
    borderRadius: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  desktopBalanceText: {
    fontSize: 32,
    fontWeight: '800',
  },
  gainBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionCard: {
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCard: {
    padding: Spacing.three,
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  tableColumns: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1.5,
  },
  col: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  assetCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  assetsSidebar: {
    padding: Spacing.three,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  assetsSidebarList: {
    gap: Spacing.two,
    flex: 1,
  },
  sidebarAssetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  assetSidebarDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  assetSidebarValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
  managePortfolioBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.three,
  },
});
