import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';

export default function WithdrawScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Input states
  const [bankCode, setBankCode] = useState('bca');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Modal Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [error, setError] = useState('');

  // Real IDR balance loaded from API
  const [availableBalance, setAvailableBalance] = useState(0);
  const adminFee = 6500;

  const loadBalance = async () => {
    try {
      const response = await api.wallet.getDashboard();
      if (response.status === 'success' && response.data?.balances) {
        const idrBalance = response.data.balances.find((b: any) => b.asset_symbol === 'IDR');
        if (idrBalance) {
          setAvailableBalance(parseFloat(idrBalance.balance));
        }
      }
    } catch (err) {
      console.error('Failed to load balance for withdrawal:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleReviewWithdraw = () => {
    if (!accountNumber || !accountName || !amount || parseFloat(amount) <= 0) return;
    setError('');
    setShowReviewModal(true);
  };

  const handleConfirmWithdraw = async () => {
    const val = parseFloat(amount);
    setLoading(true);
    setError('');

    try {
      const response = await api.wallet.initiateWithdraw({
        bank_code: bankCode,
        account_number: accountNumber,
        amount: val,
        notes: notes || undefined,
      });

      if (response.status === 'success') {
        setWithdrawSuccess(true);
        setTimeout(() => {
          setWithdrawSuccess(false);
          setShowReviewModal(false);
          router.replace('/(tabs)');
        }, 2000);
      } else {
        setLoading(false);
        setError(response.message || 'Withdrawal failed');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred during withdrawal');
    }
  };

  const isAmountInvalid = parseFloat(amount) + adminFee > availableBalance;
  const canWithdraw = accountNumber && accountName && amount && !isAmountInvalid && !balanceLoading;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Withdraw to Bank
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Bank Picker Dropdown (Simulated) */}
          <View style={styles.bankPickerContainer}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              BENEFICIARY BANK
            </ThemedText>
            <View style={[styles.pickerRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="business-outline" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <ThemedText type="smallBold" style={{ flex: 1 }}>
                {bankCode.toUpperCase()} - PT. Bank Central Asia
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
            </View>
          </View>

          {/* Account Number */}
          <Input
            label="ACCOUNT NUMBER"
            placeholder="Enter destination account number"
            value={accountNumber}
            onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            iconLeft="card-outline"
          />

          {/* Account Name */}
          <Input
            label="ACCOUNT HOLDER NAME"
            placeholder="E.g. Budi Purwanto"
            value={accountName}
            onChangeText={setAccountName}
            iconLeft="person-outline"
          />

          {/* Amount */}
          <View style={styles.amountWrapper}>
            <Input
              label="WITHDRAWAL AMOUNT"
              placeholder="0"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
              error={isAmountInvalid ? 'Insufficient balance including admin fee' : undefined}
              keyboardType="numeric"
              iconLeft="logo-usd"
            />
            <TouchableOpacity
              style={[styles.maxBtn, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => {
                const maxAmount = availableBalance - adminFee;
                setAmount(maxAmount > 0 ? maxAmount.toString() : '0');
              }}
            >
              <ThemedText type="code" style={{ fontWeight: '700' }}>MAX</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText type="small" style={[styles.balanceHint, { color: theme.textSecondary }]}>
            {`Available Balance: Rp ${availableBalance.toLocaleString('id-ID')}`}
          </ThemedText>

          {/* Admin Fee Notice */}
          <View style={[styles.feeCard, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8, flex: 1 }}>
              Setiap penarikan dana fiat dikenakan biaya administrasi tetap sebesar{' '}
              <Text style={{ color: theme.text, fontWeight: '700' }}>Rp 6.500</Text>.
            </ThemedText>
          </View>

          {/* Notes */}
          <Input
            label="NOTES (OPTIONAL)"
            placeholder="Add withdrawal note"
            value={notes}
            onChangeText={setNotes}
            iconLeft="document-text-outline"
          />

          <Button
            title="Withdraw"
            variant="primary"
            disabled={!canWithdraw}
            onPress={handleReviewWithdraw}
            style={styles.submitBtn}
          />
        </ScrollView>

        {/* Withdraw Review Modal */}
        <Modal visible={showReviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              {!withdrawSuccess ? (
                <>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Confirm Withdrawal
                  </ThemedText>
                  <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    Rincian transaksi penarikan dana rekening tujuan.
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Bank tujuan</ThemedText>
                      <ThemedText type="smallBold">{bankCode.toUpperCase()}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>No. Rekening</ThemedText>
                      <ThemedText type="code">{accountNumber}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Nama Rekening</ThemedText>
                      <ThemedText type="smallBold">{accountName}</ThemedText>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Jumlah Penarikan</ThemedText>
                      <ThemedText type="small">Rp {parseInt(amount || '0').toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Biaya Admin</ThemedText>
                      <ThemedText type="small">Rp {adminFee.toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Potong Saldo</ThemedText>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        Rp {(parseInt(amount || '0') + adminFee).toLocaleString('id-ID')}
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
                      title="Cancel"
                      variant="ghost"
                      onPress={() => setShowReviewModal(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Confirm Withdraw"
                      variant="primary"
                      loading={loading}
                      onPress={handleConfirmWithdraw}
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
                    Withdrawal Requested!
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    Penarikan bank diproses (pending status).
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  bankPickerContainer: {
    marginVertical: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  amountWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  maxBtn: {
    position: 'absolute',
    right: 12,
    top: 30, // Aligns button vertically inside the input structure
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  balanceHint: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: Spacing.two,
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    marginVertical: Spacing.two,
  },
  submitBtn: {
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
