import React, { useState } from 'react';
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

  // Modal Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const availableBalance = 1200000;
  const adminFee = 6500;

  const handleReviewWithdraw = () => {
    if (!accountNumber || !accountName || !amount || parseFloat(amount) <= 0) return;
    setShowReviewModal(true);
  };

  const handleConfirmWithdraw = () => {
    setLoading(true);
    // Simulate API POST /api/v1/fiat/withdraw
    setTimeout(() => {
      setLoading(false);
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowReviewModal(false);
        router.replace('/(tabs)');
      }, 2000);
    }, 1500);
  };

  const isAmountInvalid = parseFloat(amount) + adminFee > availableBalance;
  const canWithdraw = accountNumber && accountName && amount && !isAmountInvalid;

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
            onChangeText={setAccountNumber}
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
              onChangeText={setAmount}
              error={isAmountInvalid ? 'Insufficient balance including admin fee' : undefined}
              keyboardType="numeric"
              iconLeft="logo-usd"
            />
            <TouchableOpacity
              style={[styles.maxBtn, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => setAmount((availableBalance - adminFee).toString())}
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
                      <ThemedText type="small">Rp {parseInt(amount).toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Biaya Admin</ThemedText>
                      <ThemedText type="small">Rp {adminFee.toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Potong Saldo</ThemedText>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        Rp {(parseInt(amount) + adminFee).toLocaleString('id-ID')}
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
    marginBottom: Spacing.three,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    position: 'relative',
  },
  maxBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceHint: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: Spacing.two,
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.three,
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
