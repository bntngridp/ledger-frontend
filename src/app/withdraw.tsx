import React, { useState, useEffect, useCallback } from 'react';
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
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';
import { PinVerificationModal } from '@/components/ui/pin-modal';

export default function WithdrawScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  // Safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Supported channels
  const SUPPORTED_CHANNELS = [
    { code: 'bca', name: 'Bank Central Asia (BCA)', type: 'Bank', category: 'bank' },
    { code: 'mandiri', name: 'Bank Mandiri', type: 'Bank', category: 'bank' },
    { code: 'bni', name: 'Bank Negara Indonesia (BNI)', type: 'Bank', category: 'bank' },
    { code: 'bri', name: 'Bank Rakyat Indonesia (BRI)', type: 'Bank', category: 'bank' },
    { code: 'permata', name: 'Permata Bank', type: 'Bank', category: 'bank' },
    { code: 'cimb', name: 'CIMB Niaga', type: 'Bank', category: 'bank' },
    { code: 'dana', name: 'DANA E-Wallet', type: 'E-Wallet', category: 'ewallet' },
    { code: 'gopay', name: 'GoPay E-Wallet', type: 'E-Wallet', category: 'ewallet' },
    { code: 'ovo', name: 'OVO E-Wallet', type: 'E-Wallet', category: 'ewallet' },
    { code: 'shopeepay', name: 'ShopeePay E-Wallet', type: 'E-Wallet', category: 'ewallet' },
    { code: 'linkaja', name: 'LinkAja E-Wallet', type: 'E-Wallet', category: 'ewallet' },
  ];

  // Input states
  const [bankCode, setBankCode] = useState('bca');
  const [showBankModal, setShowBankModal] = useState(false);
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
  const adminFee = 2500;

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    setError('');
    try {
      const response = await api.wallet.getDashboard();
      if (response.status === 'success' && response.data?.balances) {
        const idrBalance = response.data.balances.find((b: any) => b.asset_symbol === 'IDR');
        if (idrBalance) {
          setAvailableBalance(parseFloat(idrBalance.balance));
        } else {
          setError('IDR balance not found. Please try again.');
        }
      } else {
        setError('Failed to load balance. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to load balance:', err);
      setError('Failed to load balance. Please check your connection.');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadBalance();
    })();
  }, [loadBalance]);

  const handleReviewWithdraw = () => {
    // Validate all fields
    if (!accountNumber) {
      setError(t('withdraw.accountNumberRequired') || 'Account number is required');
      return;
    }

    if (!accountName) {
      setError(t('withdraw.accountNameRequired') || 'Account holder name is required');
      return;
    }

    if (!amount) {
      setError(t('withdraw.amountRequired') || 'Withdrawal amount is required');
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (val > availableBalance - adminFee) {
      setError(t('withdraw.insufficientBalance') || 'Insufficient balance for this withdrawal');
      return;
    }

    setError('');
    setShowReviewModal(true);
  };

  // PIN Verification State
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);

  const handleConfirmWithdraw = () => {
    setShowReviewModal(false);
    setIsPinModalVisible(true);
  };

  const executeConfirmWithdraw = async () => {
    setIsPinModalVisible(false);
    const val = parseFloat(amount);

    // Revalidate before submission
    if (isNaN(val) || val <= 0) {
      setError('Invalid amount');
      return;
    }

    if (val + adminFee > availableBalance) {
      setError(t('withdraw.insufficientBalance') || 'Insufficient balance');
      return;
    }

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
        // Wait 2 seconds then redirect back to dashboard
        setTimeout(() => {
          setWithdrawSuccess(false);
          setShowReviewModal(false);
          // Reset form
          setAccountNumber('');
          setAccountName('');
          setAmount('');
          setNotes('');
          router.replace('/(tabs)');
        }, 2000);
      } else {
        setLoading(false);
        setError(response.message || 'Withdrawal failed. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Withdraw error:', err);
      setError(err.message || 'Failed to process withdrawal. Please check your connection and try again.');
    }
  };

  const isAmountInvalid = parseFloat(amount) + adminFee > availableBalance;
  const canWithdraw = accountNumber && accountName && amount && !isAmountInvalid && !balanceLoading;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} id="withdraw-back-btn">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t('withdraw.withdrawTitle')}
          </ThemedText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Bank / E-Wallet Selector */}
          <View style={styles.bankPickerContainer}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              {t('withdraw.beneficiaryBank')} / E-Wallet
            </ThemedText>
            <TouchableOpacity
              onPress={() => setShowBankModal(true)}
              style={[styles.pickerRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              id="withdraw-bank-selector-btn"
            >
              <Ionicons
                name={SUPPORTED_CHANNELS.find((c) => c.code === bankCode)?.category === 'ewallet' ? 'wallet-outline' : 'business-outline'}
                size={20}
                color={theme.primary}
                style={{ marginRight: 10 }}
              />
              <ThemedText type="smallBold" style={{ flex: 1 }}>
                {SUPPORTED_CHANNELS.find((c) => c.code === bankCode)?.name || bankCode.toUpperCase()}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Account Number */}
          <Input
            label={t('withdraw.accountNumber')}
            placeholder={t('withdraw.accountNumberPlaceholder')}
            value={accountNumber}
            onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            iconLeft="card-outline"
          />

          {/* Account Name */}
          <Input
            label={t('withdraw.accountHolder')}
            placeholder={t('withdraw.accountHolderPlaceholder')}
            value={accountName}
            onChangeText={setAccountName}
            iconLeft="person-outline"
          />

          {/* Amount */}
          <View style={styles.amountWrapper}>
            <Input
              label={t('withdraw.amountLabel')}
              placeholder="0"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
              error={isAmountInvalid ? t('withdraw.insufficientBalance') : undefined}
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
            {`${t('withdraw.availableBalance')}: Rp ${availableBalance.toLocaleString('id-ID')}`}
          </ThemedText>

          {/* Admin Fee Notice */}
          <View style={[styles.feeCard, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8, flex: 1 }}>
              {t('withdraw.adminFeeText')}{' '}
              <Text style={{ color: theme.text, fontWeight: '700' }}>{`Rp ${adminFee.toLocaleString('id-ID')}`}</Text>.
            </ThemedText>
          </View>

          {/* Notes */}
          <Input
            label={t('withdraw.notesLabel')}
            placeholder={t('withdraw.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            iconLeft="document-text-outline"
          />

          <Button
            title={t('withdraw.submitWithdrawal')}
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
                    {t('withdraw.confirmWithdraw')}
                  </ThemedText>
                  <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    {t('withdraw.reviewDetails')}
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.bankTarget')}</ThemedText>
                      <ThemedText type="smallBold">{bankCode.toUpperCase()}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.accountNo')}</ThemedText>
                      <ThemedText type="code">{accountNumber}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.accountName')}</ThemedText>
                      <ThemedText type="smallBold">{accountName}</ThemedText>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.amountLabel')}</ThemedText>
                      <ThemedText type="small">Rp {parseInt(amount || '0').toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.adminFee')}</ThemedText>
                      <ThemedText type="small">Rp {adminFee.toLocaleString('id-ID')}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('withdraw.totalDeducted')}</ThemedText>
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
                      title={t('common.cancel')}
                      variant="ghost"
                      onPress={() => setShowReviewModal(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('withdraw.confirmWithdraw')}
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
                    {t('withdraw.withdrawSuccess')}
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    {t('withdraw.withdrawSuccessDesc')}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Bank & E-Wallet Selection Modal */}
        <Modal visible={showBankModal} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBankModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, maxHeight: '80%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  Pilih Bank / E-Wallet Tujuan
                </ThemedText>
                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                  <Ionicons name="business-outline" size={14} color={theme.textSecondary} />
                  <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                    BANK TRANSFER (IDR)
                  </ThemedText>
                </View>
                {SUPPORTED_CHANNELS.filter((c) => c.category === 'bank').map((channel) => {
                  const isSelected = channel.code === bankCode;
                  return (
                    <TouchableOpacity
                      key={channel.code}
                      onPress={() => {
                        setBankCode(channel.code);
                        setShowBankModal(false);
                      }}
                      style={[
                        styles.channelItemRow,
                        {
                          backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      id={`withdraw-bank-option-${channel.code}`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="business-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                        <ThemedText type="smallBold">{channel.name}</ThemedText>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                    </TouchableOpacity>
                  );
                })}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8, gap: 6 }}>
                  <Ionicons name="phone-portrait-outline" size={14} color={theme.textSecondary} />
                  <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                    E-WALLET (IDR)
                  </ThemedText>
                </View>
                {SUPPORTED_CHANNELS.filter((c) => c.category === 'ewallet').map((channel) => {
                  const isSelected = channel.code === bankCode;
                  return (
                    <TouchableOpacity
                      key={channel.code}
                      onPress={() => {
                        setBankCode(channel.code);
                        setShowBankModal(false);
                      }}
                      style={[
                        styles.channelItemRow,
                        {
                          backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      id={`withdraw-bank-option-${channel.code}`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="wallet-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                        <ThemedText type="smallBold">{channel.name}</ThemedText>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 6-Digit Transaction PIN Verification Modal */}
        <PinVerificationModal
          visible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          onSuccess={executeConfirmWithdraw}
          title="PIN Penarikan Rekening"
          subtitle={`Konfirmasi penarikan Rp ${parseFloat(amount || '0').toLocaleString('id-ID')} ke ${SUPPORTED_CHANNELS.find((b: any) => b.code === bankCode)?.name || bankCode.toUpperCase()} (${accountNumber})`}
        />
      </SafeAreaView>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
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
  channelItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
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
