import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AssetIcon } from '@/components/ui/asset-icon';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';

export default function TopUpScreen() {
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

  // Input states
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Bottom sheet / Modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const quickAmounts = ['50000', '100000', '250000', '500000'];

  // Auto-polling transaction status while modal is open
  React.useEffect(() => {
    let interval: any = null;
    if (showPayModal && transactionId && !isSuccess) {
      interval = setInterval(async () => {
        try {
          const res = await api.wallet.checkTopUpStatus({ transaction_id: transactionId });
          if (res.status === 'success' && res.data && res.data.is_settled) {
            setIsSuccess(true);
            if (interval) clearInterval(interval);
          }
        } catch {
          // silent
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showPayModal, transactionId, isSuccess]);

  const handleCheckStatus = async () => {
    if (!transactionId) return;
    setCheckingStatus(true);
    try {
      const res = await api.wallet.checkTopUpStatus({ transaction_id: transactionId });
      setCheckingStatus(false);
      if (res.status === 'success' && res.data && res.data.is_settled) {
        setIsSuccess(true);
      } else {
        Alert.alert('Status Pembayaran', 'Pembayaran masih diproses/pending. Jika Anda telah membayar via simulator, klik tombol "Verifikasi Pembayaran Simulasi" di bawah.');
      }
    } catch {
      setCheckingStatus(false);
    }
  };

  const handleSimulateSettlement = async () => {
    if (!transactionId) return;
    setSimulating(true);
    try {
      const res = await api.wallet.simulateTopUpSettlement({ transaction_id: transactionId });
      setSimulating(false);
      if (res.status === 'success') {
        setIsSuccess(true);
      } else {
        Alert.alert('Error', res.message || 'Gagal memverifikasi simulasi pembayaran.');
      }
    } catch (err: any) {
      setSimulating(false);
      Alert.alert('Error', err.message || 'Gagal memproses simulasi.');
    }
  };

  const handleQuickSelect = (amt: string) => {
    setAmount(amt);
  };

  const handleInitiateTopUp = async () => {
    const val = parseFloat(amount);

    // Validation
    if (isNaN(val) || val <= 0) {
      setError(t('topup.invalidAmount') || 'Amount must be greater than 0');
      return;
    }

    if (val < 10000) {
      setError('Minimum top-up amount is Rp 10,000');
      return;
    }

    if (val > 100000000) {
      setError('Maximum top-up amount is Rp 100,000,000');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.wallet.initiateTopUp({
        amount: val,
        notes: notes || undefined,
      });
      setLoading(false);

      if (response.status === 'success' && response.data) {
        setTransactionId(response.data.transaction_id || '');
        setRedirectUrl(response.data.redirect_url || '');
        setShowPayModal(true);
      } else {
        setError(response.message || 'Failed to initiate Top Up transaction. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Top-up error:', err);
      setError(err.message || 'Failed to process top-up. Please check your connection and try again.');
    }
  };

  const handleOpenPaymentPage = () => {
    if (!redirectUrl) {
      setError('Payment redirect URL is not available. Please try again.');
      return;
    }

    Linking.openURL(redirectUrl).catch((err) => {
      console.error('Failed to open payment gateway:', err);
      Alert.alert(
        'Error',
        'Failed to open payment gateway. Please try again or contact support.'
      );
    });
  };

  const isInputValid = amount && parseFloat(amount) > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} id="topup-back-btn">
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AssetIcon symbol="IDR" size={24} containerStyle={{ marginRight: 8 }} />
            <ThemedText type="smallBold" style={styles.headerTitle}>
              {t('topup.topUpTitle')}
            </ThemedText>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main amount inputs */}
          <View style={styles.amountSection}>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              {t('topup.enterAmount')}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.currencyPrefix}>Rp</ThemedText>
              <Input
                placeholder="0"
                value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setAmount(cleaned);
                }}
                keyboardType="numeric"
                containerStyle={{ flex: 1, marginBottom: 0 }}
                style={styles.amountInput}
              />
            </View>

            {/* Quick chips */}
            <View style={styles.quickGrid}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => handleQuickSelect(amt)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: amount === amt ? theme.primary : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: amount === amt ? '#ffffff' : theme.text,
                      fontWeight: '600',
                    }}
                  >
                    {`Rp ${parseInt(amt).toLocaleString('id-ID')}`}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <Input
            label={t('topup.notesLabel')}
            placeholder={t('topup.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            iconLeft="document-text-outline"
          />

          {error ? (
            <ThemedText style={{ color: theme.danger, marginVertical: Spacing.two, fontWeight: '500' }}>
              {error}
            </ThemedText>
          ) : null}

          <Button
            title={t('topup.continuePayment')}
            variant="primary"
            disabled={!isInputValid}
            loading={loading}
            onPress={handleInitiateTopUp}
            style={styles.submitBtn}
          />
        </ScrollView>

          {/* Midtrans Snap Bottom Sheet */}
        <Modal visible={showPayModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              {isSuccess ? (
                <View style={{ alignItems: 'center', paddingVertical: Spacing.four }}>
                  <View style={[styles.successBadge, { backgroundColor: theme.success + '20' }]}>
                    <Ionicons name="checkmark-circle" size={64} color={theme.success} />
                  </View>
                  <ThemedText type="smallBold" style={{ fontSize: 20, marginTop: 12, textAlign: 'center' }}>
                    Pembayaran Berhasil
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8 }}>
                    Top Up sebesar <ThemedText type="smallBold" style={{ color: theme.success }}>Rp {amount ? parseInt(amount).toLocaleString('id-ID') : '0'}</ThemedText> telah berhasil ditambahkan ke saldo dompet Anda.
                  </ThemedText>

                  <Button
                    title="Selesai & Ke Dashboard"
                    variant="primary"
                    onPress={() => {
                      setShowPayModal(false);
                      setIsSuccess(false);
                      router.replace('/(tabs)');
                    }}
                    style={{ marginTop: Spacing.four, width: '100%' }}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.modalHeader}>
                    <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
                    <ThemedText type="smallBold" style={{ marginLeft: 8 }}>
                      {t('topup.secureGateway')}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.three }}>
                    {t('topup.processedBy')}
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('topup.orderId')}</ThemedText>
                      <ThemedText type="code">{transactionId}</ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{t('topup.totalAmount')}</ThemedText>
                      <ThemedText type="smallBold">
                        {`Rp ${amount ? parseInt(amount).toLocaleString('id-ID') : '0'}`}
                      </ThemedText>
                    </View>
                  </Card>

                  {/* Midtrans Sandbox Simulation Banner */}
                  <View style={[styles.simBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.text, flex: 1, marginLeft: 8 }}>
                      Mode Simulasi Sandbox: Setelah bayar di simulator, klik <ThemedText type="smallBold" style={{ color: theme.primary }}>Verifikasi Pembayaran</ThemedText> di bawah.
                    </ThemedText>
                  </View>

                  {/* Instant Verification Button */}
                  <Button
                    title="Verifikasi Pembayaran Simulasi"
                    variant="primary"
                    loading={simulating}
                    onPress={handleSimulateSettlement}
                    style={{ marginBottom: Spacing.two }}
                  />

                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://simulator.sandbox.midtrans.com/')}
                    style={[styles.simulatorBtn, { borderColor: theme.primary }]}
                  >
                    <Ionicons name="flask-outline" size={18} color={theme.primary} />
                    <ThemedText type="smallBold" style={{ color: theme.primary, marginLeft: 6 }}>
                      Buka Midtrans Payment Simulator
                    </ThemedText>
                  </TouchableOpacity>

                  <View style={styles.modalButtons}>
                    <Button
                      title={t('common.cancel')}
                      variant="ghost"
                      onPress={() => setShowPayModal(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('topup.openPaymentPage')}
                      variant="secondary"
                      onPress={handleOpenPaymentPage}
                      style={{ flex: 1.5 }}
                    />
                  </View>
                </>
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
  amountSection: {
    alignItems: 'center',
    marginVertical: Spacing.four,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    width: '100%',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    borderWidth: 0,
    height: 60,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.four,
    justifyContent: 'center',
  },
  quickChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  simBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  simulatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: Spacing.two,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
