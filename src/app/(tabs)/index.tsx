import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
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
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

interface BalanceItem {
  asset_symbol: string;
  balance: number | string;
}

interface DashboardResponseData {
  wallet_id: string;
  balances: BalanceItem[];
  estimated_total_idr: number | string;
}

interface TransactionItem {
  transaction_id: string;
  asset_symbol: string;
  amount: number | string;
  type: string;
  status: string;
  transaction_notes: string;
  created_at: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('Ledger User');

  // Real data states
  const [dashboard, setDashboard] = useState<DashboardResponseData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load user profile details from token
      const token = await storage.getItem('auth_token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload?.email) {
              const namePart = payload.email.split('@')[0];
              setUsername(namePart.charAt(0).toUpperCase() + namePart.slice(1));
            }
          }
        } catch (e) {
          console.error('Failed to parse user info from JWT:', e);
        }
      }

      const [dashRes, txRes] = await Promise.all([
        api.wallet.getDashboard(),
        api.wallet.getTransactions({ per_page: 5 }),
      ]);

      if (dashRes.status === 'success' && dashRes.data) {
        setDashboard(dashRes.data);
      } else {
        setError(dashRes.message || 'Failed to load wallet dashboard');
      }

      if (txRes.status === 'success' && txRes.data) {
        const txArray = Array.isArray(txRes.data) ? txRes.data : (txRes.data.transactions || []);
        setTransactions(txArray);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map API balances to UI assets format
  const getUiAssets = () => {
    if (!dashboard) return [];

    return dashboard.balances.map((item) => {
      let name = 'Indonesian Rupiah';
      let icon = 'cash-outline';
      let iconColor: string = theme.success;
      let equivalent = `Rp ${parseFloat(String(item.balance)).toLocaleString('id-ID')}`;

      if (item.asset_symbol === 'USDT') {
        name = 'Tether USDT';
        icon = 'logo-usd';
        iconColor = theme.primary;
        equivalent = `${parseFloat(String(item.balance)).toLocaleString('id-ID')} USDT`;
      } else if (item.asset_symbol === 'USDC') {
        name = 'USD Coin';
        icon = 'shield-outline';
        iconColor = '#2775CA';
        equivalent = `${parseFloat(String(item.balance)).toLocaleString('id-ID')} USDC`;
      } else if (item.asset_symbol === 'BTC') {
        name = 'Bitcoin';
        icon = 'logo-bitcoin';
        iconColor = '#F7931A';
        equivalent = `${parseFloat(String(item.balance)).toLocaleString('id-ID')} BTC`;
      } else if (item.asset_symbol === 'ETH') {
        name = 'Ethereum';
        icon = 'logo-octocat';
        iconColor = '#627EEA';
        equivalent = `${parseFloat(String(item.balance)).toLocaleString('id-ID')} ETH`;
      }

      // Format clean balances
      let formattedBalance = String(item.balance);
      if (item.asset_symbol === 'IDR') {
        formattedBalance = `Rp ${parseFloat(String(item.balance)).toLocaleString('id-ID')}`;
      } else {
        formattedBalance = `${parseFloat(String(item.balance)).toLocaleString('id-ID')} ${item.asset_symbol}`;
      }

      return {
        id: item.asset_symbol,
        symbol: item.asset_symbol,
        name,
        balance: formattedBalance,
        equivalent,
        change: '0.0%',
        changeType: 'flat',
        icon,
        iconColor,
      };
    }).filter(asset => 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Map API transactions to UI format
  const getUiTransactions = () => {
    if (!Array.isArray(transactions)) return [];
    return transactions.map((tx) => {
      let color: string = theme.success;
      let sign = '+';
      if (tx.type.toLowerCase() === 'withdraw' || tx.type.toLowerCase() === 'transfer_out') {
        color = theme.danger;
        sign = '-';
      } else if (tx.status.toLowerCase() === 'pending') {
        color = theme.warning;
      }

      // Clean format amount
      let formattedAmount = '';
      const numAmount = parseFloat(String(tx.amount));
      if (tx.asset_symbol === 'IDR') {
        formattedAmount = `${sign}Rp ${numAmount.toLocaleString('id-ID')}`;
      } else {
        formattedAmount = `${sign}${numAmount.toLocaleString('id-ID')} ${tx.asset_symbol}`;
      }

      // Nice display name for transaction type
      let typeDisplay = tx.type;
      if (tx.type === 'transfer_out') typeDisplay = 'Transfer Sent';
      if (tx.type === 'transfer_in') typeDisplay = 'Transfer Received';
      if (tx.type === 'topup') typeDisplay = 'Top Up';
      if (tx.type === 'withdraw') typeDisplay = 'Withdrawal';
      if (tx.type === 'swap') typeDisplay = 'Swapped';

      // Nice format time
      const date = new Date(tx.created_at);
      const timeDisplay = isNaN(date.getTime())
        ? tx.created_at
        : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ', ' + 
          date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      return {
        id: tx.transaction_id,
        asset: tx.asset_symbol,
        assetName: tx.asset_symbol === 'IDR' ? 'Rupiah Indonesia' : tx.asset_symbol,
        type: typeDisplay,
        amount: formattedAmount,
        status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
        time: timeDisplay,
        color,
      };
    });
  };

  const uiAssets = getUiAssets();
  const uiTransactions = getUiTransactions();

  const getEstimatedTotal = () => {
    if (!dashboard) return 'Rp 0';
    return `Rp ${parseFloat(String(dashboard.estimated_total_idr)).toLocaleString('id-ID')}`;
  };

  // Mobile layout
  const renderMobile = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mobileScrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={{ color: theme.textSecondary }}>Welcome back,</ThemedText>
          <ThemedText type="smallBold" style={styles.username}>
            {username} 👋
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={loadData} style={[styles.iconButton, { backgroundColor: theme.backgroundElement, marginRight: 4 }]}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </TouchableOpacity>
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
          {showBalance ? getEstimatedTotal() : '••••••••'}
        </ThemedText>
        <View style={styles.portfolioFooter}>
          <Ionicons name="trending-up-outline" size={16} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.success, marginLeft: 4 }}>
            Active ledger wallet session
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
        {uiAssets.map((asset) => (
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
        {uiTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: theme.textSecondary }}>Belum ada transaksi terkini.</ThemedText>
          </View>
        ) : (
          uiTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.txIconContainer, { backgroundColor: tx.color + '15' }]}>
                <Ionicons
                  name={
                    tx.type.includes('Received')
                      ? 'arrow-down-outline'
                      : tx.type.includes('Swapped')
                      ? 'swap-horizontal-outline'
                      : tx.type.includes('Withdrawal')
                      ? 'cash-outline'
                      : 'paper-plane-outline'
                  }
                  size={20}
                  color={tx.color}
                />
              </View>
              <View style={styles.txDetails}>
                <ThemedText type="smallBold">{tx.type} {tx.asset}</ThemedText>
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
          ))
        )}
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

          <TouchableOpacity onPress={loadData} style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[styles.profileAvatar, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="code" style={styles.avatarText}>
              {username.slice(0, 2).toUpperCase()}
            </ThemedText>
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
                <ThemedText type="small" style={{ color: theme.textSecondary }}>ESTIMATED PORTFOLIO VALUE</ThemedText>
                <View style={styles.balanceContainer}>
                  <ThemedText type="subtitle" style={styles.desktopBalanceText}>
                    {getEstimatedTotal()}
                  </ThemedText>
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
            {uiTransactions.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <ThemedText style={{ color: theme.textSecondary }}>Belum ada transaksi terkini.</ThemedText>
              </View>
            ) : (
              uiTransactions.map((tx) => (
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
                    <View style={[styles.statusPill, { backgroundColor: (tx.color) + '15' }]}>
                      <ThemedText type="code" style={{ fontSize: 10, color: tx.color, fontWeight: '700' }}>
                        {tx.status}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Right Column (Sidebar Assets) */}
        <View style={styles.rightColumn}>
          <Card style={styles.assetsSidebar} bordered>
            <View style={styles.sidebarHeader}>
              <ThemedText type="smallBold">Your Assets</ThemedText>
            </View>

            <View style={styles.assetsSidebarList}>
              {uiAssets.map((asset) => (
                <View key={asset.id} style={[styles.sidebarAssetRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.assetIconContainer, { backgroundColor: asset.iconColor + '15' }]}>
                    <Ionicons name={asset.icon as any} size={22} color={asset.iconColor} />
                  </View>
                  <View style={styles.assetSidebarDetails}>
                    <ThemedText type="smallBold">{asset.name}</ThemedText>
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
                      {asset.symbol}
                    </ThemedText>
                  </View>
                  <View style={styles.assetSidebarValues}>
                    <ThemedText type="smallBold">{asset.balance}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>Syncing ledger data...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} />
            <ThemedText style={{ color: theme.danger, marginTop: 12, fontWeight: '600' }}>{error}</ThemedText>
            <Button title="Retry Sync" onPress={loadData} style={{ marginTop: 16 }} />
          </View>
        ) : isLargeScreen ? (
          renderDesktop()
        ) : (
          renderMobile()
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
    marginTop: Spacing.one,
  },
  assetBalance: {
    fontWeight: '700',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 20,
    marginTop: Spacing.three,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionList: {
    gap: Spacing.two,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1.5,
  },
  txIconContainer: {
    width: 44,
    height: 44,
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
    color: '#8A8C98',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },

  // Desktop styles
  desktopContainer: {
    flex: 1,
  },
  topNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1.5,
  },
  topNavbarTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBarContainer: {
    width: 240,
    marginBottom: 0,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  gridContent: {
    flexDirection: 'row',
    padding: 24,
    gap: 24,
    flex: 1,
  },
  leftColumn: {
    flex: 3,
    gap: 24,
  },
  overviewCard: {
    padding: 24,
    borderRadius: 24,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  desktopBalanceText: {
    fontSize: 36,
    fontWeight: '800',
  },
  gainBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCard: {
    padding: 20,
    borderRadius: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tableColumns: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    marginBottom: 8,
  },
  col: {
    color: '#8A8C98',
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
    gap: 12,
  },
  smallIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
  rightColumn: {
    flex: 1,
  },
  assetsSidebar: {
    padding: 20,
    borderRadius: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetsSidebarList: {
    gap: 16,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
