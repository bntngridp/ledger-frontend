import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Clipboard,
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

export default function CryptoScreen() {
  const theme = useTheme();

  // Tab state
  const [activeSubTab, setActiveSubTab] = useState<'receive' | 'send'>('receive');

  // Receive state
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'USDC'>('USDT');
  const mockAddress = '0xda8f9f0da8f9f0da8f9f0da8f9f0da8f9f0da8f9f';
  const [copied, setCopied] = useState(false);

  // Send state
  const [sendAsset, setSendAsset] = useState<'USDT' | 'USDC'>('USDT');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const balances = {
    USDT: 45.50,
    USDC: 30.20,
  };

  const handleCopyAddress = () => {
    Clipboard.setString(mockAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteAddress = async () => {
    // Paste logic (mock)
    setRecipientAddress('0x1234567890123456789012345678901234567890');
  };

  const handleSendCrypto = () => {
    if (!recipientAddress || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setRecipientAddress('');
        setAmount('');
        setNotes('');
      }, 2000);
    }, 1500);
  };

  const isAddressInvalid = recipientAddress && (recipientAddress.length !== 42 || !recipientAddress.startsWith('0x'));
  const isAmountInvalid = parseFloat(amount) > balances[sendAsset];
  const canSend = recipientAddress && amount && !isAddressInvalid && !isAmountInvalid;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Crypto Wallet
          </ThemedText>

          {/* Sub tabs */}
          <View style={[styles.subTabContainer, { backgroundColor: theme.backgroundElement }]}>
            <TouchableOpacity
              onPress={() => setActiveSubTab('receive')}
              style={[
                styles.subTab,
                activeSubTab === 'receive' && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: activeSubTab === 'receive' ? theme.text : theme.textSecondary }}
              >
                Receive
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSubTab('send')}
              style={[
                styles.subTab,
                activeSubTab === 'send' && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: activeSubTab === 'send' ? theme.text : theme.textSecondary }}
              >
                Send
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeSubTab === 'receive' ? (
            <View style={styles.tabContent}>
              {/* Asset Selector */}
              <View style={styles.selectorRow}>
                <TouchableOpacity
                  onPress={() => setSelectedAsset('USDT')}
                  style={[
                    styles.selectorBadge,
                    {
                      backgroundColor: selectedAsset === 'USDT' ? theme.primary : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selectedAsset === 'USDT' ? '#ffffff' : theme.textSecondary }}>
                    USDT
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedAsset('USDC')}
                  style={[
                    styles.selectorBadge,
                    {
                      backgroundColor: selectedAsset === 'USDC' ? theme.primary : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selectedAsset === 'USDC' ? '#ffffff' : theme.textSecondary }}>
                    USDC
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* QR Code Container */}
              <Card style={styles.qrCard} bordered>
                <View style={[styles.networkBadge, { backgroundColor: theme.warning + '15' }]}>
                  <ThemedText type="code" style={{ color: theme.warning, fontWeight: '700' }}>
                    POLYGON AMOY TESTNET
                  </ThemedText>
                </View>

                {/* Mock QR Code Visual */}
                <View style={[styles.qrMock, { borderColor: theme.border }]}>
                  <Ionicons name="qr-code-outline" size={180} color={theme.text} />
                </View>

                <ThemedText type="code" style={styles.addressText}>
                  {mockAddress.substring(0, 8)}...{mockAddress.substring(mockAddress.length - 8)}
                </ThemedText>

                <Button
                  title={copied ? 'Copied!' : 'Copy Wallet Address'}
                  variant="secondary"
                  onPress={handleCopyAddress}
                  style={styles.copyBtn}
                />
              </Card>

              {/* Warning card */}
              <Card style={[styles.warningCard, { backgroundColor: theme.warning + '10', borderColor: theme.warning }]} bordered>
                <Ionicons name="warning-outline" size={20} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: 8 }}>
                  Kirim hanya <ThemedText type="smallBold">{selectedAsset}</ThemedText> menggunakan jaringan <ThemedText type="smallBold">Polygon</ThemedText>. Mengirim aset lain dapat menyebabkan kehilangan dana permanen.
                </ThemedText>
              </Card>
            </View>
          ) : (
            <View style={styles.tabContent}>
              {!success ? (
                <>
                  {/* Send Asset Selector */}
                  <View style={styles.selectorRow}>
                    <TouchableOpacity
                      onPress={() => setSendAsset('USDT')}
                      style={[
                        styles.selectorBadge,
                        {
                          backgroundColor: sendAsset === 'USDT' ? theme.primary : theme.backgroundElement,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: sendAsset === 'USDT' ? '#ffffff' : theme.textSecondary }}>
                        USDT
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSendAsset('USDC')}
                      style={[
                        styles.selectorBadge,
                        {
                          backgroundColor: sendAsset === 'USDC' ? theme.primary : theme.backgroundElement,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: sendAsset === 'USDC' ? '#ffffff' : theme.textSecondary }}>
                        USDC
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Recipient Address */}
                  <Input
                    label="RECIPIENT WALLET ADDRESS"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChangeText={setRecipientAddress}
                    error={isAddressInvalid ? 'Must be a valid 42-character EVM address' : undefined}
                    iconLeft="wallet-outline"
                    iconRight="clipboard-outline"
                    onPressIconRight={handlePasteAddress}
                    autoCapitalize="none"
                  />

                  {/* Amount Input */}
                  <View style={styles.amountWrapper}>
                    <Input
                      label={`AMOUNT (${sendAsset})`}
                      placeholder="0.00"
                      value={amount}
                      onChangeText={setAmount}
                      error={isAmountInvalid ? 'Insufficient balance' : undefined}
                      keyboardType="numeric"
                      iconLeft="logo-usd"
                    />
                    <TouchableOpacity
                      style={[styles.maxBtn, { backgroundColor: theme.backgroundSelected }]}
                      onPress={() => setAmount(balances[sendAsset].toString())}
                    >
                      <ThemedText type="code" style={{ fontWeight: '700' }}>MAX</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText type="small" style={[styles.balanceHint, { color: theme.textSecondary }]}>
                    Available: {balances[sendAsset]} {sendAsset}
                  </ThemedText>

                  {/* Notes */}
                  <Input
                    label="NOTES (OPTIONAL)"
                    placeholder="E.g. crypto withdrawal test"
                    value={notes}
                    onChangeText={setNotes}
                    iconLeft="document-text-outline"
                  />

                  {/* Estimated Fee */}
                  <View style={styles.feeEstimate}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Estimated Network Fee
                    </ThemedText>
                    <ThemedText type="code">
                      0.01 MATIC
                    </ThemedText>
                  </View>

                  <Button
                    title="Send Crypto"
                    variant="primary"
                    disabled={!canSend}
                    loading={loading}
                    onPress={handleSendCrypto}
                    style={styles.sendBtn}
                  />
                </>
              ) : (
                <View style={styles.successState}>
                  <View style={[styles.successIconContainer, { backgroundColor: theme.success + '20' }]}>
                    <Ionicons name="paper-plane" size={56} color={theme.success} />
                  </View>
                  <ThemedText type="subtitle" style={{ marginTop: Spacing.three }}>
                    Transaction Sent!
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                    Permintaan withdraw crypto berhasil diproses.
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.two,
  },
  tabContent: {
    width: '100%',
    gap: Spacing.three,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  selectorBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  qrCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 20,
  },
  networkBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  qrMock: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    marginBottom: Spacing.three,
  },
  addressText: {
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: Spacing.three,
  },
  copyBtn: {
    width: '100%',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
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
    marginBottom: Spacing.one,
  },
  feeEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  sendBtn: {
    marginTop: Spacing.two,
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
