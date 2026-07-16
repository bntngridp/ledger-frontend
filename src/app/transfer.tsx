import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Clipboard,
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
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { api } from '@/services/api';

export default function TransferScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Input states
  const [recipientId, setRecipientId] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<'IDR' | 'USDT' | 'USDC'>('IDR');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Modal Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [error, setError] = useState('');

  const [balances, setBalances] = useState({
    IDR: 0,
    USDT: 0,
    USDC: 0,
  });

  const loadBalances = async () => {
    try {
      const response = await api.wallet.getDashboard();
      if (response.status === 'success' && response.data?.balances) {
        const newBalances = { IDR: 0, USDT: 0, USDC: 0 };
        response.data.balances.forEach((b: any) => {
          if (b.asset_symbol === 'IDR') newBalances.IDR = parseFloat(b.balance);
          if (b.asset_symbol === 'USDT') newBalances.USDT = parseFloat(b.balance);
          if (b.asset_symbol === 'USDC') newBalances.USDC = parseFloat(b.balance);
        });
        setBalances(newBalances);
      }
    } catch (err) {
      console.error('Failed to load wallet balances for transfer:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const handlePasteId = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setRecipientId(text.trim());
      } else {
        Alert.alert('Info', 'Clipboard is empty');
      }
    } catch {
      Alert.alert('Error', 'Failed to read from clipboard');
    }
  };

  const handleReviewTransfer = () => {
    const val = parseFloat(amount);
    if (!recipientId || isNaN(val) || val <= 0) return;
    setError('');
    setShowReviewModal(true);
  };

  const handleConfirmTransfer = async () => {
    const val = parseFloat(amount);
    setLoading(true);
    setError('');

    try {
      const response = await api.wallet.initiateTransfer({
        destination_user_id: recipientId,
        asset_symbol: selectedAsset,
        amount: val,
        notes: notes || undefined,
      });

      if (response.status === 'success') {
        setTransferSuccess(true);
        setTimeout(() => {
          setTransferSuccess(false);
          setShowReviewModal(false);
          router.replace('/(tabs)');
        }, 2000);
      } else {
        setLoading(false);
        setError(response.message || 'Transfer failed');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred during transfer');
    }
  };

  const isIdInvalid = recipientId && recipientId.length < 10;
  const isAmountInvalid = parseFloat(amount) > balances[selectedAsset];
  const canSend = recipientId && amount && !isIdInvalid && !isAmountInvalid && !balanceLoading;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Send Money
          </ThemedText>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Recipient User ID */}
          <Input
            label="RECIPIENT USER ID (UUID)"
            placeholder="Enter destination user ID"
            value={recipientId}
            onChangeText={setRecipientId}
            error={isIdInvalid ? 'Enter a valid User ID' : undefined}
            iconLeft="person-outline"
            iconRight="clipboard-outline"
            onPressIconRight={handlePasteId}
            autoCapitalize="none"
          />

          {/* Asset Selector */}
          <View style={styles.assetSection}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              SELECT ASSET
            </ThemedText>
            <View style={[styles.selectorContainer, { backgroundColor: theme.backgroundElement }]}>
              {(['IDR', 'USDT', 'USDC'] as const).map((asset) => (
                <TouchableOpacity
                  key={asset}
                  onPress={() => {
                    setSelectedAsset(asset);
                    setAmount('');
                  }}
                  style={[
                    styles.selectorTab,
                    selectedAsset === asset && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: selectedAsset === asset ? theme.text : theme.textSecondary }}
                  >
                    {asset}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <ThemedText type="small" style={[styles.balanceHint, { color: theme.textSecondary }]}>
              {selectedAsset === 'IDR'
                ? `Available Balance: Rp ${balances.IDR.toLocaleString('id-ID')}`
                : `Available Balance: ${balances[selectedAsset]} ${selectedAsset}`}
            </ThemedText>
          </View>

          {/* Amount Input */}
          <Input
            label="AMOUNT"
            placeholder="0"
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
            error={isAmountInvalid ? 'Insufficient balance' : undefined}
            keyboardType="numeric"
            iconLeft="logo-usd"
          />

          {/* Notes */}
          <Input
            label="NOTES (OPTIONAL)"
            placeholder="Add note for recipient"
            value={notes}
            onChangeText={setNotes}
            iconLeft="document-text-outline"
          />

          <Button
            title="Review Transfer"
            variant="primary"
            disabled={!canSend}
            onPress={handleReviewTransfer}
            style={styles.submitBtn}
          />
        </ScrollView>

        {/* Transfer Confirmation Modal */}
        <Modal visible={showReviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              {!transferSuccess ? (
                <>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Confirm Transfer
                  </ThemedText>
                  <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>
                    Ensure recipient ID and amount are correct.
                  </ThemedText>

                  <Card style={[styles.summaryCard, { backgroundColor: theme.background }]} bordered>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Recipient ID</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 13 }}>
                        {recipientId.substring(0, 10)}...{recipientId.substring(recipientId.length - 8)}
                      </ThemedText>
                    </View>
                    <View style={styles.summaryItem}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Amount</ThemedText>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        {selectedAsset === 'IDR' ? `- Rp ${parseInt(amount || '0').toLocaleString('id-ID')}` : `- ${amount} ${selectedAsset}`}
                      </ThemedText>
                    </View>
                    {notes ? (
                      <View style={styles.summaryItem}>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>Notes</ThemedText>
                        <ThemedText type="small">{notes}</ThemedText>
                      </View>
                    ) : null}
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
                      title="Confirm Send"
                      variant="primary"
                      loading={loading}
                      onPress={handleConfirmTransfer}
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
                    Transfer Successful!
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    Dana berhasil terkirim ke penerima.
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
  assetSection: {
    marginVertical: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  selectorTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  balanceHint: {
    fontSize: 12,
    marginTop: 6,
  },
  submitBtn: {
    marginTop: Spacing.four,
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
