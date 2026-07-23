import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssetIcon } from '@/components/ui/asset-icon';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';

export default function SwapScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  // Swap states
  const [fromAsset, setFromAsset] = useState('IDR');
  const [toAsset, setToAsset] = useState('USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loadingRate, setLoadingRate] = useState(false);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');

  // Available balances loaded from API
  const [balances, setBalances] = useState<{ [key: string]: number }>({
    IDR: 0,
    USDT: 0,
    USDC: 0,
  });

  const swapFeePercentage = 0.005; // 0.5%

  // Modal Review Swap state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);

  const loadBalances = async () => {
    try {
      const response = await api.wallet.getDashboard();
      if (response.status === 'success' && response.data?.balances) {
        const newBalances: { [key: string]: number } = { IDR: 0, USDT: 0, USDC: 0 };
        response.data.balances.forEach((b: any) => {
          newBalances[b.asset_symbol] = parseFloat(b.balance);
        });
        setBalances(newBalances);
      }
    } catch (err) {
      console.error('Failed to load balances for swap:', err);
    }
  };

  const fetchRate = async () => {
    if (fromAsset === toAsset) {
      setRate(1);
      return;
    }

    setLoadingRate(true);
    setError('');

    try {
      const response = await api.wallet.getExchangeRate(fromAsset, toAsset);
      if (response.status === 'success' && response.data) {
        // Handle rate payload from backend
        // In backend, exchange_rate response typically has rate in data.rate or data.exchange_rate
        const liveRate = parseFloat(response.data.rate || response.data.exchange_rate || 1);
        setRate(liveRate);
      } else {
        setError(response.message || 'Failed to fetch exchange rate');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching rate');
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fromAsset, toAsset]);

  // Live calculation effect
  useEffect(() => {
    const val = parseFloat(fromAmount);
    if (isNaN(val) || val <= 0 || loadingRate) {
      setToAmount('');
      return;
    }

    // Apply fee deduction on output amount
    const calculated = val * rate;
    const netAmount = calculated * (1 - swapFeePercentage);
    setToAmount(netAmount.toFixed(toAsset === 'IDR' ? 2 : 6));
  }, [fromAmount, rate, loadingRate]);

  const handleFlip = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleInitiateSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setError('');
    setShowReviewModal(true);
  };

  const handleConfirmSwap = async () => {
    const val = parseFloat(fromAmount);
    setIsSwapping(true);
    setError('');

    try {
      const response = await api.wallet.swap({
        from_asset: fromAsset,
        to_asset: toAsset,
        amount: val,
      });

      if (response.status === 'success') {
        setSwapSuccess(true);
        await loadBalances(); // Refresh balances
        setTimeout(() => {
          setSwapSuccess(false);
          setShowReviewModal(false);
          setFromAmount('');
          setToAmount('');
        }, 2000);
      } else {
        setIsSwapping(false);
        setError(response.message || 'Swap transaction failed');
      }
    } catch (err: any) {
      setIsSwapping(false);
      setError(err.message || 'An error occurred during swap');
    }
  };

  // Verification checks
  const isInsufficient = parseFloat(fromAmount) > balances[fromAsset];
  const canSwap = fromAmount && parseFloat(fromAmount) > 0 && !isInsufficient && !loadingRate;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('swap.swapTitle')}
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Rate Card */}
          <Card style={[styles.rateCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.rateHeader}>
              <Ionicons name="stats-chart" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ marginLeft: 6 }}>
                {t('swap.liveRates')}
              </ThemedText>
            </View>
            <View style={styles.rateGrid}>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('swap.currentRate')}</ThemedText>
                <ThemedText type="smallBold">
                  {loadingRate ? t('swap.loadingRate') : `1 ${fromAsset} = ${rate.toLocaleString('id-ID', { maximumFractionDigits: 6 })} ${toAsset}`}
                </ThemedText>
              </View>
            </View>
          </Card>

          {/* Calculator */}
          <View style={styles.calculator}>
            {/* FROM CARD */}
            <Card style={styles.calcCard} bordered>
              <View style={styles.cardHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.payFrom')}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.balance')}: {balances[fromAsset]?.toLocaleString('id-ID')} {fromAsset}
                </ThemedText>
              </View>
              <View style={styles.inputRow}>
                <Input
                  placeholder="0.00"
                  value={fromAmount}
                  onChangeText={(text) => setFromAmount(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  style={styles.amountInput}
                />
                <View style={[styles.assetSelector, { backgroundColor: theme.backgroundSelected }]}>
                  <AssetIcon symbol={fromAsset} size={22} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="smallBold">{fromAsset}</ThemedText>
                </View>
              </View>
            </Card>

            {/* FLIP BUTTON */}
            <View style={styles.flipWrapper}>
              <TouchableOpacity
                onPress={handleFlip}
                style={[styles.flipBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="swap-vertical" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* TO CARD */}
            <Card style={styles.calcCard} bordered>
              <View style={styles.cardHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.receiveTo')}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.balance')}: {balances[toAsset]?.toLocaleString('id-ID')} {toAsset}
                </ThemedText>
              </View>
              <View style={styles.inputRow}>
                <Input
                  placeholder="0.00"
                  value={toAmount}
                  editable={false}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  style={styles.amountInput}
                />
                <View style={[styles.assetSelector, { backgroundColor: theme.backgroundSelected }]}>
                  <AssetIcon symbol={toAsset} size={22} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="smallBold">{toAsset}</ThemedText>
                </View>
              </View>
            </Card>

            {/* Fee summary breakdown */}
            {fromAmount ? (
              <View style={styles.feeBreakdown}>
                <View style={styles.feeRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('swap.swapFee')}
                  </ThemedText>
                  <ThemedText type="code">
                    {(parseFloat(fromAmount) * swapFeePercentage).toFixed(4)} {fromAsset}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {isInsufficient && (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                {t('swap.insufficientBalance')}
              </ThemedText>
            )}

            {error ? (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              title={t('swap.performSwap')}
              variant="primary"
              disabled={!canSwap}
              onPress={handleInitiateSwap}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>

        {/* Swap Review Modal / Bottom Sheet */}
        <Modal visible={showReviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              {!swapSuccess ? (
                <>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    {t('swap.confirmSwap')}
                  </ThemedText>
                  <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    {t('swap.reviewDetails')}
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('swap.youSell')}</ThemedText>
                      <ThemedText type="smallBold">{fromAmount} {fromAsset}</ThemedText>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('swap.youGet')}</ThemedText>
                      <ThemedText type="smallBold" style={{ color: theme.success }}>
                        {toAmount} {toAsset}
                      </ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('swap.exchangeRate')}</ThemedText>
                      <ThemedText type="code">
                        1 {fromAsset} = {rate.toLocaleString('id-ID', { maximumFractionDigits: 6 })} {toAsset}
                      </ThemedText>
                    </View>
                  </Card>

                  {error ? (
                    <ThemedText style={{ color: theme.danger, marginBottom: Spacing.two, fontWeight: '500' }}>
                      {error}
                    </ThemedText>
                  ) : null}

                  <View style={styles.modalButtons}>
                    <Button
                      title={t('common.cancel')}
                      variant="ghost"
                      onPress={() => setShowReviewModal(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('swap.confirmSwap')}
                      variant="primary"
                      loading={isSwapping}
                      onPress={handleConfirmSwap}
                      style={{ flex: 1.5 }}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.successState}>
                  <View style={[styles.successIconContainer, { backgroundColor: theme.success + '20' }]}>
                    <Ionicons name="checkmark-circle" size={56} color={theme.success} />
                  </View>
                  <ThemedText type="subtitle" style={{ marginTop: Spacing.three }}>
                    {t('swap.swapSuccess')}
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    {t('swap.swapSuccessDesc')}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  rateCard: {
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.three,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calculator: {
    gap: 8,
  },
  calcCard: {
    padding: Spacing.three,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
  },
  assetSelector: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  flipWrapper: {
    alignItems: 'center',
    marginVertical: -16,
    zIndex: 10,
  },
  flipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  feeBreakdown: {
    paddingHorizontal: Spacing.one,
    marginTop: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionBtn: {
    marginTop: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  summaryCard: {
    padding: Spacing.three,
    marginVertical: Spacing.two,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  summaryDivider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.one,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
