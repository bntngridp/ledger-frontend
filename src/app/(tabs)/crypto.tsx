import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  ActivityIndicator,
  Alert,
  Modal,
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
import { OctopusLoader } from '@/components/ui/octopus-loader';

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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // QR Scanner Modal State
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [scannedToast, setScannedToast] = useState(false);

  const handleScanQr = () => {
    setIsQrModalVisible(true);
  };

  const handleSelectScannedAddress = (scannedAddr: string) => {
    setRecipientAddress(scannedAddr);
    setIsQrModalVisible(false);
    setScannedToast(true);
    setTimeout(() => setScannedToast(false), 2500);
  };

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
    (async () => {
      await loadBalances();
    })();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'receive') {
      (async () => {
        await fetchDepositAddress(selectedAsset);
      })();
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
                {['USDT', 'USDC'].map((asset) => {
                  const isSelected = selectedAsset === asset;
                  return (
                    <TouchableOpacity
                      key={asset}
                      onPress={() => setSelectedAsset(asset as any)}
                      style={[
                        styles.selectorBadge,
                        {
                          backgroundColor: isSelected ? theme.primary + '15' : theme.backgroundElement,
                          borderColor: isSelected ? theme.primary : theme.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      id={`crypto-deposit-asset-${asset.toLowerCase()}-btn`}
                    >
                      <AssetIcon symbol={asset} size={20} containerStyle={{ marginRight: 8 }} />
                      <ThemedText
                        style={{
                          color: isSelected ? theme.primary : theme.textSecondary,
                          fontWeight: '700',
                          fontSize: 13,
                        }}
                      >
                        {asset}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
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
                    <OctopusLoader size="small" message="Swimming to generate address... 🐙" />
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
                <ThemedText type="small" style={{ color: theme.warning, marginLeft: 8, flex: 1 }}>
                  {t('crypto.depositWarning')}
                </ThemedText>
              </Card>
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Card bordered style={{ padding: Spacing.four, borderRadius: 24 }}>
                {success ? (
                  <View style={{ alignItems: 'center', paddingVertical: Spacing.four }}>

                    <Ionicons name="checkmark-circle-outline" size={64} color={theme.success} />
                    <ThemedText type="subtitle" style={{ marginTop: Spacing.two }}>
                      {t('crypto.sendSuccess')}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 4 }}>
                      {t('crypto.sendSuccessDesc')}
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    {/* Send Asset Selector */}
                    <View style={styles.selectorRow}>
                      {['USDT', 'USDC'].map((asset) => {
                        const isSelected = sendAsset === asset;
                        return (
                          <TouchableOpacity
                            key={asset}
                            onPress={() => setSendAsset(asset as any)}
                            style={[
                              styles.selectorBadge,
                              {
                                backgroundColor: isSelected ? theme.primary + '15' : theme.backgroundElement,
                                borderColor: isSelected ? theme.primary : theme.border,
                                borderWidth: isSelected ? 2 : 1,
                              },
                            ]}
                            id={`crypto-send-asset-${asset.toLowerCase()}-btn`}
                          >
                            <AssetIcon symbol={asset} size={20} containerStyle={{ marginRight: 8 }} />
                            <ThemedText
                              style={{
                                color: isSelected ? theme.primary : theme.textSecondary,
                                fontWeight: '700',
                                fontSize: 13,
                              }}
                            >
                              {asset}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>


                  {/* Toast Feedback for Scanned Address */}
                  {scannedToast && (
                    <View style={[styles.scannedToast, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                      <ThemedText type="smallBold" style={{ color: theme.success, marginLeft: 6, fontSize: 12 }}>
                        Alamat Wallet berhasil di-scan! ✨
                      </ThemedText>
                    </View>
                  )}

                  {/* Recipient Address with Dual Actions: Scan QR & Paste */}
                  <Input
                    label={t('crypto.recipientAddress')}
                    placeholder={t('crypto.recipientPlaceholder')}
                    value={recipientAddress}
                    onChangeText={setRecipientAddress}
                    error={isAddressInvalid ? t('crypto.invalidAddress') : undefined}
                    iconLeft="wallet-outline"
                    autoCapitalize="none"
                    rightComponent={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={handleScanQr}
                          style={[styles.inputActionIcon, { backgroundColor: theme.primary + '15' }]}
                          id="crypto-scan-qr-btn"
                          title="Scan QR Code"
                        >
                          <Ionicons name="qr-code-outline" size={18} color={theme.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handlePasteAddress}
                          style={styles.inputActionIcon}
                          id="crypto-paste-addr-btn"
                          title="Paste Clipboard"
                        >
                          <Ionicons name="clipboard-outline" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    }
                  />

                  {/* Amount Input */}
                  <View style={styles.amountWrapper}>
                    <Input
                      label={`${t('crypto.withdrawAmount')} (${sendAsset})`}
                      placeholder="0.00"
                      value={amount}
                      onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                      error={isAmountInvalid ? t('crypto.insufficientBalance') : undefined}
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
              )}
            </Card>
          </View>
        )}

        </ScrollView>

        {/* Modal QR Code Scanner */}
        <Modal
          visible={isQrModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsQrModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={[styles.qrModalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} bordered>
              {/* Modal Header */}
              <View style={styles.qrModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.qrHeaderIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="qr-code" size={22} color={theme.primary} />
                  </View>
                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: 16 }}>Scan Barcode / QR Wallet</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      Scan QR Code penerima EVM Wallet
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsQrModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Viewfinder Camera Simulation */}
              <View style={[styles.viewfinderBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={[styles.viewfinderFrame, { borderColor: theme.primary }]}>
                  <Ionicons name="camera-outline" size={36} color={theme.primary} style={{ opacity: 0.8 }} />
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary, marginTop: 8 }}>
                    Arahkan Kamera ke QR Code Penerima
                  </ThemedText>

                  {/* Animated Laser Scanning Beam */}
                  <style>{`
                    @keyframes laserScan {
                      0% { top: 12%; opacity: 0.6; }
                      50% { top: 82%; opacity: 1; }
                      100% { top: 12%; opacity: 0.6; }
                    }
                    .laser-beam {
                      position: absolute;
                      left: 6%;
                      right: 6%;
                      height: 2.5px;
                      background-color: ${theme.primary};
                      box-shadow: 0 0 10px ${theme.primary};
                      animation: laserScan 2s ease-in-out infinite;
                      border-radius: 2px;
                    }
                  `}</style>
                  <div className="laser-beam" />
                </View>
              </View>

              {/* Sample QR Addresses for testing / demo */}
              <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 10 }}>
                Pilih Alamat EVM hasil Scan / Simulasi QR:
              </ThemedText>

              <View style={{ gap: 8 }}>
                {[
                  { label: 'Vitalik.eth Wallet (EVM)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
                  { label: 'Binance Hot Wallet (EVM)', address: '0x28C6c06298d514Db089934071355E5743bf21d60' },
                  { label: 'Trust Wallet Recipient', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.address}
                    onPress={() => handleSelectScannedAddress(item.address)}
                    style={[styles.demoAddressRow, { backgroundColor: theme.background, borderColor: theme.border }]}
                    id={`qr-sample-${item.label.split(' ')[0].toLowerCase()}`}
                  >
                    <View style={[styles.qrDemoIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="qr-code-outline" size={16} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold" style={{ fontSize: 12 }}>{item.label}</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                        {item.address.substring(0, 14)}...{item.address.slice(-8)}
                      </ThemedText>
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
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
  inputActionIcon: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedToast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 20,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  viewfinderBox: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  viewfinderFrame: {
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  demoAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  qrDemoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
