import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function SwapScreen() {
  const theme = useTheme();

  // Swap states
  const [fromAsset, setFromAsset] = useState('IDR');
  const [toAsset, setToAsset] = useState('USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Live rate config
  const rateUSDT_IDR = 16420;
  const rateUSDC_IDR = 16435;
  const swapFeePercentage = 0.005; // 0.5%

  // Modal Review Swap state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);

  // Available balances
  const balances: { [key: string]: number } = {
    IDR: 1200000,
    USDT: 45.50,
    USDC: 30.20,
  };

  // Live calculation effect
  useEffect(() => {
    const val = parseFloat(fromAmount);
    if (isNaN(val) || val <= 0) {
      setToAmount('');
      return;
    }

    let calculated = 0;
    // Simple conversions
    if (fromAsset === 'IDR' && toAsset === 'USDT') {
      calculated = val / rateUSDT_IDR;
    } else if (fromAsset === 'USDT' && toAsset === 'IDR') {
      calculated = val * rateUSDT_IDR;
    } else if (fromAsset === 'IDR' && toAsset === 'USDC') {
      calculated = val / rateUSDC_IDR;
    } else if (fromAsset === 'USDC' && toAsset === 'IDR') {
      calculated = val * rateUSDC_IDR;
    } else if (fromAsset === 'USDT' && toAsset === 'USDC') {
      calculated = val * 0.998; // Close to 1:1 with slight variance
    } else if (fromAsset === 'USDC' && toAsset === 'USDT') {
      calculated = val * 1.002;
    }

    // Apply fee deduction
    const netAmount = calculated * (1 - swapFeePercentage);
    setToAmount(netAmount.toFixed(fromAsset === 'IDR' ? 6 : 2));
  }, [fromAmount, fromAsset, toAsset]);

  const handleFlip = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleInitiateSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setShowReviewModal(true);
  };

  const handleConfirmSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      setSwapSuccess(true);
      setTimeout(() => {
        setSwapSuccess(false);
        setShowReviewModal(false);
        setFromAmount('');
        setToAmount('');
      }, 2000);
    }, 1500);
  };

  // Verification checks
  const isInsufficient = parseFloat(fromAmount) > balances[fromAsset];
  const canSwap = fromAmount && parseFloat(fromAmount) > 0 && !isInsufficient;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Exchange
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Rate Card */}
          <Card style={[styles.rateCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.rateHeader}>
              <Ionicons name="stats-chart" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ marginLeft: 6 }}>
                Live Exchange Rates
              </ThemedText>
            </View>
            <View style={styles.rateGrid}>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>1 USDT</ThemedText>
                <ThemedText type="smallBold">Rp {rateUSDT_IDR.toLocaleString('id-ID')}</ThemedText>
              </View>
              <View style={[styles.rateDivider, { backgroundColor: theme.border }]} />
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>1 USDC</ThemedText>
                <ThemedText type="smallBold">Rp {rateUSDC_IDR.toLocaleString('id-ID')}</ThemedText>
              </View>
            </View>
          </Card>

          {/* Calculator */}
          <View style={styles.calculator}>
            {/* FROM CARD */}
            <Card style={styles.calcCard} bordered>
              <View style={styles.cardHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  PAY FROM
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Balance: {balances[fromAsset]} {fromAsset}
                </ThemedText>
              </View>
              <View style={styles.inputRow}>
                <Input
                  placeholder="0.00"
                  value={fromAmount}
                  onChangeText={setFromAmount}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  style={styles.amountInput}
                />
                <View style={[styles.assetSelector, { backgroundColor: theme.backgroundSelected }]}>
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
                  RECEIVE TO
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Balance: {balances[toAsset]} {toAsset}
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
                  <ThemedText type="smallBold">{toAsset}</ThemedText>
                </View>
              </View>
            </Card>

            {/* Fee summary breakdown */}
            {fromAmount ? (
              <View style={styles.feeBreakdown}>
                <View style={styles.feeRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Swap Fee (0.5%)
                  </ThemedText>
                  <ThemedText type="code">
                    {(parseFloat(fromAmount) * swapFeePercentage).toFixed(2)} {fromAsset}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {isInsufficient && (
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                Insufficient balance for this swap.
              </ThemedText>
            )}

            <Button
              title="Exchange Now"
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
                    Confirm Swap
                  </ThemedText>
                  <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    Review your exchange details before proceeding.
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>You Sell</ThemedText>
                      <ThemedText type="smallBold">{fromAmount} {fromAsset}</ThemedText>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>You Get (Net)</ThemedText>
                      <ThemedText type="smallBold" style={{ color: theme.success }}>
                        {toAmount} {toAsset}
                      </ThemedText>
                    </View>
                  </Card>

                  <View style={styles.modalButtons}>
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => setShowReviewModal(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={isSwapping ? 'Swapping...' : 'Confirm Exchange'}
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
                    Swap Successful!
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    Aset kamu sudah berhasil dikonversi.
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  rateCard: {
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.four,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  rateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rateDivider: {
    width: 1,
    height: 32,
  },
  calculator: {
    gap: Spacing.two,
  },
  calcCard: {
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
  },
  assetSelector: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipWrapper: {
    alignItems: 'center',
    marginVertical: -Spacing.two,
    zIndex: 10,
  },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  feeBreakdown: {
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.one,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.one,
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
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: Spacing.three,
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
    marginVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
