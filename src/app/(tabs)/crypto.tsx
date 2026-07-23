import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

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

export default function CryptoScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  // Tab state
  const [activeSubTab, setActiveSubTab] = useState<'receive' | 'send'>('receive');

  // Receive state
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'USDC'>('USDT');
  const [depositAddress, setDepositAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Send state
  const [sendAsset, setSendAsset] = useState<'USDT' | 'USDC'>('USDT');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Available balances
  const [balances, setBalances] = useState<{ USDT: number; USDC: number }>({
    USDT: 0,
    USDC: 0,
  });

  const loadBalances = async () => {
    try {
      const response = await api.wallet.getDashboard();
      if (response.status === 'success' && response.data?.balances) {
        const cryptoBalances = { USDT: 0, USDC: 0 };
        response.data.balances.forEach((b: any) => {
          if (b.asset_symbol === 'USDT') cryptoBalances.USDT = parseFloat(b.balance);
          if (b.asset_symbol === 'USDC') cryptoBalances.USDC = parseFloat(b.balance);
        });
        setBalances(cryptoBalances);
      }
    } catch (err) {
      console.error('Failed to load crypto balances:', err);
    }
  };

  const fetchDepositAddress = async (asset: 'USDT' | 'USDC') => {
    setLoadingAddress(true);
    setError('');
    try {
      const response = await api.wallet.getCryptoAddress(asset);
      if (response.status === 'success' && response.data) {
        setDepositAddress(response.data.address || '');
      } else {
        setError(response.message || 'Failed to fetch deposit address');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoadingAddress(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'receive') {
      fetchDepositAddress(selectedAsset);
    }
  }, [activeSubTab, selectedAsset]);

  const handleCopyAddress = () => {
    if (depositAddress) {
      Clipboard.setString(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setRecipientAddress(text.trim());
      } else {
        Alert.alert('Info', 'Clipboard is empty');
      }
    } catch {
      Alert.alert('Error', 'Failed to paste address');
    }
  };

  const handleSendCrypto = async () => {
    const val = parseFloat(amount);
    if (!recipientAddress || isNaN(val) || val <= 0) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await api.wallet.withdrawCrypto({
        asset: sendAsset,
        recipient_address: recipientAddress,
        amount: val,
      });
      setLoading(false);

      if (response.status === 'success') {
        setSuccess(true);
        await loadBalances(); // Refresh balances
        setTimeout(() => {
          setSuccess(false);
          setRecipientAddress('');
          setAmount('');
          setNotes('');
        }, 2000);
      } else {
        setError(response.message || 'Crypto withdrawal failed');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred');
    }
  };

  const isAddressInvalid = recipientAddress && (recipientAddress.length !== 42 || !recipientAddress.startsWith('0x'));
  const isAmountInvalid = parseFloat(amount) > balances[sendAsset];
  const canSend = recipientAddress && amount && !isAddressInvalid && !isAmountInvalid;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('crypto.cryptoTitle')}
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
                {t('crypto.depositTab')}
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
                {t('crypto.withdrawTab')}
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
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <AssetIcon symbol="USDT" size={18} containerStyle={{ marginRight: 6 }} />
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
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <AssetIcon symbol="USDC" size={18} containerStyle={{ marginRight: 6 }} />
                  <ThemedText style={{ color: selectedAsset === 'USDC' ? '#ffffff' : theme.textSecondary }}>
                    USDC
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* QR Code Container */}
              <Card style={styles.qrCard} bordered>
                <View style={[styles.networkBadge, { backgroundColor: theme.warning + '15', flexDirection: 'row', alignItems: 'center' }]}>
                  <AssetIcon symbol="Polygon" size={16} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="code" style={{ color: theme.warning, fontWeight: '700' }}>
                    POLYGON AMOY TESTNET
                  </ThemedText>
                </View>

                {/* QR Code Graphic */}
                <View style={[styles.qrMock, { borderColor: theme.border, backgroundColor: '#ffffff' }]}>
                  {loadingAddress ? (
                    <ActivityIndicator size="large" color={theme.primary} />
                  ) : depositAddress ? (
                    <QRCode value={depositAddress} size={180} />
                  ) : (
                    <Ionicons name="qr-code-outline" size={180} color="#000000" />
                  )}
                </View>

                {depositAddress ? (
                  <ThemedText type="code" style={styles.addressText}>
                    {depositAddress.substring(0, 10)}...{depositAddress.substring(depositAddress.length - 8)}
                  </ThemedText>
                ) : (
                  <ThemedText style={{ color: theme.textSecondary, marginVertical: Spacing.two }}>
                    {t('crypto.noAddress')}
                  </ThemedText>
                )}

                <Button
                  title={copied ? t('common.copied') : t('crypto.copyAddress')}
                  variant="secondary"
                  disabled={!depositAddress || loadingAddress}
                  onPress={handleCopyAddress}
                  style={styles.copyBtn}
                />
              </Card>

              {/* Warning card */}
              <Card style={[styles.warningCard, { backgroundColor: theme.warning + '10', borderColor: theme.warning }]} bordered>
                <Ionicons name="warning-outline" size={20} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: 8 }}>
                  Kirim hanya <Text style={{ fontWeight: '700', color: theme.text }}>{selectedAsset}</Text> menggunakan jaringan <Text style={{ fontWeight: '700', color: theme.text }}>Polygon</Text>. Mengirim aset lain dapat menyebabkan kehilangan dana permanen.
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
                    label={t('crypto.recipientAddress')}
                    placeholder={t('crypto.recipientPlaceholder')}
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
                      onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
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
                    {t('crypto.availableBalance')}: {balances[sendAsset]?.toLocaleString('id-ID')} {sendAsset}
                  </ThemedText>

                  {error ? (
                    <ThemedText style={{ color: theme.danger, marginVertical: Spacing.two, fontWeight: '500', textAlign: 'center' }}>
                      {error}
                    </ThemedText>
                  ) : null}

                  <Button
                    title={t('crypto.submitWithdrawal')}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    width: 160,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  tabContent: {
    marginTop: Spacing.two,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.three,
  },
  selectorBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  qrCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 24,
  },
  networkBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  qrMock: {
    width: 210,
    height: 210,
    borderWidth: 1.5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    padding: 12,
  },
  addressText: {
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  copyBtn: {
    width: '100%',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    marginTop: Spacing.three,
  },
  amountWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  maxBtn: {
    position: 'absolute',
    right: 12,
    top: 30, // Aligns max button inside the input element structure
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  balanceHint: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: Spacing.two,
  },
  sendBtn: {
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
