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
  const [snapToken, setSnapToken] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [error, setError] = useState('');

  const quickAmounts = ['50000', '100000', '250000', '500000'];

  const handleQuickSelect = (amt: string) => {
    setAmount(amt);
  };

  const handleInitiateTopUp = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    
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
        setSnapToken(response.data.snap_token || '');
        setRedirectUrl(response.data.redirect_url || '');
        setShowPayModal(true);
      } else {
        setError(response.message || 'Failed to initiate Top Up transaction');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred');
    }
  };

  const handleOpenPaymentPage = () => {
    if (redirectUrl) {
      Linking.openURL(redirectUrl).catch(() => {
        Alert.alert('Error', 'Failed to open payment gateway redirection URL.');
      });
    }
  };

  const isInputValid = amount && parseFloat(amount) > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AssetIcon symbol="IDR" size={24} containerStyle={{ marginRight: 8 }} />
            <ThemedText type="smallBold" style={styles.headerTitle}>
              {t('topup.topUpTitle')}
            </ThemedText>
          </View>
          <View style={{ width: 32 }} />
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

              <View style={styles.modalButtons}>
                <Button
                  title={t('common.cancel')}
                  variant="ghost"
                  onPress={() => setShowPayModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('topup.openPaymentPage')}
                  variant="primary"
                  onPress={handleOpenPaymentPage}
                  style={{ flex: 1.5 }}
                />
              </View>
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
});
