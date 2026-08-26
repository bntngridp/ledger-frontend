import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
import { PinVerificationModal } from '@/components/ui/pin-modal';
import {
  TransactionResultModal,
  TransactionResultDetails,
} from '@/components/ui/transaction-result-modal';

// Clean number formatter that strips unnecessary trailing zeros (e.g. 90 instead of 90.0000)
function cleanNumberString(val: number, maxDecimals: number = 6): string {
  if (isNaN(val) || val === 0) return '0';
  const fixed = val.toFixed(maxDecimals);
  return parseFloat(fixed).toString();
}

export default function SwapScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

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

  const swapFeePercentage = 0.005; // 0.5% platform fee

  // Modal Review, PIN, & Asset Selection states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState<'from' | 'to' | null>(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [resultModalData, setResultModalData] = useState<TransactionResultDetails | null>(null);

  const availableAssets = ['IDR', 'USDT', 'USDC'];

  const handleSelectAsset = (asset: string) => {
    if (showAssetModal === 'from') {
      if (asset === toAsset) {
        setToAsset(fromAsset);
      }
      setFromAsset(asset);
    } else if (showAssetModal === 'to') {
      if (asset === fromAsset) {
        setFromAsset(toAsset);
      }
      setToAsset(asset);
    }
    setShowAssetModal(null);
  };

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
        const liveRate = parseFloat(response.data.rate || response.data.exchange_rate || 1);
        setRate(liveRate);
      } else {
        setError(response.message || 'Gagal memuat kurs nilai tukar');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat kurs');
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

  // Live calculation effect for destination amount after 0.5% fee
  useEffect(() => {
    const val = parseFloat(fromAmount);
    if (isNaN(val) || val <= 0 || loadingRate) {
      setToAmount('');
      return;
    }

    const calculated = val * rate;
    const netAmount = calculated * (1 - swapFeePercentage);
    if (toAsset === 'IDR') {
      setToAmount(cleanNumberString(netAmount, 2));
    } else {
      setToAmount(cleanNumberString(netAmount, 6));
    }
  }, [fromAmount, rate, loadingRate, toAsset]);

  const handleFlip = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleApplyPercentage = (pct: number) => {
    const currentBal = balances[fromAsset] || 0;
    if (currentBal <= 0) return;
    if (pct === 1) {
      // For MAX (100%), take the clean balance without unnecessary trailing zeroes
      setFromAmount(cleanNumberString(currentBal, fromAsset === 'IDR' ? 0 : 6));
    } else {
      const computed = currentBal * pct;
      setFromAmount(cleanNumberString(computed, fromAsset === 'IDR' ? 0 : 4));
    }
  };

  const handleInitiateSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setError('');
    setShowReviewModal(true);
  };

  const handleProceedToPin = () => {
    setShowReviewModal(false);
    setIsPinModalVisible(true);
  };

  const executeConfirmSwap = async () => {
    setIsPinModalVisible(false);
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
        await loadBalances();
        const txId = response.data?.transaction_id || `SWAP-${Date.now().toString().slice(-6)}`;
        setResultModalData({
          title: 'Penukaran Aset Berhasil!',
          type: 'swap',
          status: 'success',
          amount: `${toAmount}`,
          asset: toAsset,
          recipientOrAddress: `Saldo Dompet ${toAsset}`,
          txHash: txId,
          notes: `Tukar ${parseFloat(fromAmount).toLocaleString('id-ID')} ${fromAsset} ke ${toAmount} ${toAsset} (Biaya: 0.5%)`,
          timestamp: new Date().toLocaleString('id-ID'),
        });
        setFromAmount('');
        setToAmount('');
      } else {
        setResultModalData({
          title: 'Penukaran Aset Gagal',
          type: 'swap',
          status: 'failed',
          errorMessage: response.message || 'Transaksi penukaran gagal diproses.',
          notes: `Gagal menukar ${fromAmount} ${fromAsset} ke ${toAsset}`,
        });
      }
    } catch (err: any) {
      setResultModalData({
        title: 'Penukaran Aset Gagal',
        type: 'swap',
        status: 'failed',
        errorMessage: err.message || 'Terjadi kesalahan sistem saat melakukan swap.',
        notes: `Gagal menukar ${fromAmount} ${fromAsset} ke ${toAsset}`,
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Verification checks
  const isInsufficient = parseFloat(fromAmount) > (balances[fromAsset] || 0);
  const canSwap =
    Boolean(fromAmount) &&
    parseFloat(fromAmount) > 0 &&
    !isInsufficient &&
    !loadingRate &&
    !isSwapping;

  const feeAmount = fromAmount
    ? cleanNumberString(parseFloat(fromAmount) * swapFeePercentage, fromAsset === 'IDR' ? 2 : 4)
    : '0';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('swap.swapTitle') || 'Tukar Aset (Swap)'}
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Rate Card */}
          <Card style={[styles.rateCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.rateHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="stats-chart" size={16} color={theme.primary} />
                <ThemedText type="smallBold" style={{ marginLeft: 6 }}>
                  {t('swap.liveRates') || 'Kurs Real-Time'}
                </ThemedText>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: theme.success + '1A' }]}>
                <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
                <ThemedText style={[styles.liveText, { color: theme.success }]}>LIVE</ThemedText>
              </View>
            </View>
            <View style={styles.rateGrid}>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.currentRate') || 'Nilai Tukar Saat Ini'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ marginTop: 2 }}>
                  {loadingRate
                    ? (t('swap.loadingRate') || 'Memuat kurs...')
                    : rate < 0.01
                    ? `1 ${fromAsset} = ${rate.toFixed(6)} ${toAsset} (1 ${toAsset} ≈ Rp ${(1 / rate).toLocaleString('id-ID', { maximumFractionDigits: 0 })})`
                    : `1 ${fromAsset} = ${rate.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${toAsset}`}
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
                  {t('swap.payFrom') || 'Bayar Dari'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.balance') || 'Saldo'}: {balances[fromAsset]?.toLocaleString('id-ID')} {fromAsset}
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
                  id="swap-from-amount-input"
                />
                <TouchableOpacity
                  onPress={() => setShowAssetModal('from')}
                  style={[styles.assetSelector, { backgroundColor: theme.backgroundSelected }]}
                  id="swap-from-asset-btn"
                >
                  <AssetIcon symbol={fromAsset} size={22} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="smallBold">{fromAsset}</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {/* Quick Percentages */}
              <View style={styles.percentRow}>
                {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const label = pct === 1 ? 'MAX' : `${pct * 100}%`;
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => handleApplyPercentage(pct)}
                      style={[
                        styles.percentChip,
                        { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      id={`swap-chip-${pct === 1 ? '100' : pct * 100}`}
                    >
                      <ThemedText type="small" style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                        {label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* FLIP BUTTON */}
            <View style={styles.flipWrapper}>
              <TouchableOpacity
                onPress={handleFlip}
                style={[styles.flipBtn, { backgroundColor: theme.primary }]}
                id="swap-flip-btn"
                accessibilityLabel="Tukar Arah Equity"
              >
                <Ionicons name="swap-vertical" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* TO CARD */}
            <Card style={styles.calcCard} bordered>
              <View style={styles.cardHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.receiveTo') || 'Terima Ke'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t('swap.balance') || 'Saldo'}: {balances[toAsset]?.toLocaleString('id-ID')} {toAsset}
                </ThemedText>
              </View>
              <View style={styles.inputRow}>
                <Input
                  placeholder="0.00"
                  value={toAmount}
                  editable={false}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  style={styles.amountInput}
                  id="swap-to-amount-input"
                />
                <TouchableOpacity
                  onPress={() => setShowAssetModal('to')}
                  style={[styles.assetSelector, { backgroundColor: theme.backgroundSelected }]}
                  id="swap-to-asset-btn"
                >
                  <AssetIcon symbol={toAsset} size={22} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="smallBold">{toAsset}</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Fee summary breakdown */}
            {fromAmount ? (
              <View style={styles.feeBreakdown}>
                <View style={styles.feeRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('swap.swapFee') || 'Biaya Penukaran (0.5%)'}
                  </ThemedText>
                  <ThemedText type="code">
                    {feeAmount} {fromAsset}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {isInsufficient && (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                {t('swap.insufficientBalance') || 'Saldo tidak mencukupi untuk penukaran ini.'}
              </ThemedText>
            )}

            {error ? (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </ThemedText>
            ) : null}

            <Button
              title={t('swap.performSwap') || 'Tukar Sekarang'}
              variant="primary"
              disabled={!canSwap}
              onPress={handleInitiateSwap}
              style={styles.actionBtn}
              id="swap-submit-btn"
            />
          </View>
        </ScrollView>

        {/* 1. Swap Review Confirmation Modal */}
        <Modal
          visible={showReviewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReviewModal(false)}
          >
            <View
              style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onStartShouldSetResponder={() => true}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.headerIconCircle, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="swap-horizontal" size={20} color={theme.primary} />
                  </View>
                  <View>
                    <ThemedText type="subtitle" style={styles.modalTitle}>
                      {t('swap.confirmSwap') || 'Konfirmasi Penukaran'}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {t('swap.reviewDetails') || 'Periksa rincian konversi equity Anda'}
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReviewModal(false)}
                  id="swap-review-close-btn"
                  accessibilityLabel="Tutup modal konfirmasi"
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Conversion Flow Display */}
              <View style={[styles.conversionFlowBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                {/* FROM BOX */}
                <View style={styles.flowRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <AssetIcon symbol={fromAsset} size={28} />
                    <View>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {t('swap.youSell') || 'Anda Jual'}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                        {fromAmount} {fromAsset}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.assetBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                      {fromAsset}
                    </ThemedText>
                  </View>
                </View>

                {/* FLOW ARROW & RATE PILL */}
                <View style={styles.flowDividerWrapper}>
                  <View style={[styles.flowLine, { backgroundColor: theme.border }]} />
                  <View style={[styles.ratePill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Ionicons name="arrow-down" size={14} color={theme.primary} />
                    <ThemedText type="small" style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                      1 {fromAsset} ≈ {rate < 0.01 ? rate.toFixed(6) : rate.toLocaleString('id-ID', { maximumFractionDigits: 4 })} {toAsset}
                    </ThemedText>
                  </View>
                  <View style={[styles.flowLine, { backgroundColor: theme.border }]} />
                </View>

                {/* TO BOX */}
                <View style={styles.flowRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <AssetIcon symbol={toAsset} size={28} />
                    <View>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {t('swap.youGet') || 'Anda Terima'}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ fontSize: 16, color: theme.success }}>
                        +{toAmount} {toAsset}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.assetBadge, { backgroundColor: theme.success + '18' }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 12, color: theme.success }}>
                      {toAsset}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Detailed Breakdown Card */}
              <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                <View style={styles.summaryItem}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('swap.exchangeRate') || 'Kurs Nilai Tukar'}
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 12 }}>
                    1 {fromAsset} = {rate.toLocaleString('id-ID', { maximumFractionDigits: 6 })} {toAsset}
                  </ThemedText>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={styles.summaryItem}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('swap.swapFee') || 'Biaya Penukaran (0.5%)'}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                    {feeAmount} {fromAsset}
                  </ThemedText>
                </View>
              </Card>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  title={t('common.cancel') || 'Batal'}
                  variant="ghost"
                  onPress={() => setShowReviewModal(false)}
                  style={{ flex: 1 }}
                  id="swap-review-cancel-btn"
                />
                <Button
                  title={t('common.confirm') || 'Konfirmasi'}
                  variant="primary"
                  loading={isSwapping}
                  onPress={handleProceedToPin}
                  style={{ flex: 1.6 }}
                  id="swap-review-confirm-btn"
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 2. Asset Selection Modal */}
        <Modal visible={showAssetModal !== null} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAssetModal(null)}
          >
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  {showAssetModal === 'from' ? (t('swap.payFrom') || 'Pilih Aset Asal') : (t('swap.receiveTo') || 'Pilih Aset Tujuan')}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowAssetModal(null)}>
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {availableAssets.map((asset) => {
                const isSelected = showAssetModal === 'from' ? asset === fromAsset : asset === toAsset;
                return (
                  <TouchableOpacity
                    key={asset}
                    onPress={() => handleSelectAsset(asset)}
                    style={[
                      styles.assetItemRow,
                      {
                        backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    id={`swap-asset-option-${asset}`}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AssetIcon symbol={asset} size={32} containerStyle={{ marginRight: 12 }} />
                      <View>
                        <ThemedText type="smallBold">{asset}</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {asset === 'IDR' ? 'Rupiah Indonesia (Fiat)' : asset === 'USDT' ? 'Tether USD (ERC-20)' : 'USD Coin (ERC-20)'}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                      {balances[asset]?.toLocaleString('id-ID') || 0} {asset}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 3. 6-Digit Transaction PIN & Biometric Verification Modal */}
        <PinVerificationModal
          visible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          onSuccess={executeConfirmSwap}
          title="PIN Konfirmasi Swap"
          subtitle={`Konfirmasi Tukar Aset ${fromAmount} ${fromAsset} ke ${toAmount} ${toAsset}`}
        />

        {/* 4. Sleek Transaction Result Modal */}
        <TransactionResultModal
          visible={resultModalData !== null}
          onClose={() => setResultModalData(null)}
          result={resultModalData}
          onViewHistory={() => {
            setResultModalData(null);
            router.push('/history');
          }}
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  percentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  percentChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  assetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 46,
    borderRadius: 14,
    minWidth: 95,
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
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  conversionFlowBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginVertical: Spacing.two,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flowDividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  flowLine: {
    flex: 1,
    height: 1,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCard: {
    padding: Spacing.three,
    marginVertical: Spacing.two,
    borderRadius: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
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
  assetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
});
