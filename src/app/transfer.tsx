import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
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

export default function TransferScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Input states
  const [recipientId, setRecipientId] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<'IDR' | 'USDT' | 'USDC'>('IDR');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const balances = {
    IDR: 1200000,
    USDT: 45.50,
    USDC: 30.20,
  };

  const handlePasteId = () => {
    // Paste logic (mock)
    setRecipientId('da8f9f0d-eef9-4548-91d7-54bdfee8c567');
  };

  const handleReviewTransfer = () => {
    if (!recipientId || !amount || parseFloat(amount) <= 0) return;
    setShowReviewModal(true);
  };

  const handleConfirmTransfer = () => {
    setLoading(true);
    // Simulate API POST /api/v1/transfer
    setTimeout(() => {
      setLoading(false);
      setTransferSuccess(true);
      setTimeout(() => {
        setTransferSuccess(false);
        setShowReviewModal(false);
        router.replace('/(tabs)');
      }, 2000);
    }, 1500);
  };

  const isIdInvalid = recipientId && recipientId.length < 10;
  const isAmountInvalid = parseFloat(amount) > balances[selectedAsset];
  const canSend = recipientId && amount && !isIdInvalid && !isAmountInvalid;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
              {['IDR', 'USDT', 'USDC'].map((asset) => (
                <TouchableOpacity
                  key={asset}
                  onPress={() => {
                    setSelectedAsset(asset as any);
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
              {selectedAsset === 'IDR' ? `Available Balance: Rp ${balances.IDR.toLocaleString('id-ID')}` : `Available Balance: ${balances[selectedAsset]} ${selectedAsset}`}
            </ThemedText>
          </View>

          {/* Amount Input */}
          <Input
            label="AMOUNT"
            placeholder="0"
            value={amount}
            onChangeText={setAmount}
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
                        {selectedAsset === 'IDR' ? `- Rp ${parseInt(amount).toLocaleString('id-ID')}` : `- ${amount} ${selectedAsset}`}
                      </ThemedText>
                    </View>
                    {notes ? (
                      <View style={styles.summaryItem}>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>Notes</ThemedText>
                        <ThemedText type="small">{notes}</ThemedText>
                      </View>
                    ) : null}
                  </Card>

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
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  assetSection: {
    marginBottom: Spacing.three,
    width: '100%',
  },
  selectorContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  selectorTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  balanceHint: {
    fontSize: 13,
    marginTop: 8,
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
