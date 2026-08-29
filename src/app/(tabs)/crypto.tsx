import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
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
import { QrScannerModal } from '@/components/qr-scanner-modal';
import { PinVerificationModal } from '@/components/ui/pin-modal';
import {
  TransactionResultModal,
  TransactionResultDetails,
} from '@/components/ui/transaction-result-modal';
import {
  formatNumber,
  formatCurrency,
  toLocalizedDigits,
} from '@/utils/format';

export default function CryptoScreen() {
  const theme = useTheme();
  const { t, language } = useTranslation();

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
  const [error, setError] = useState('');

  // QR Scanner Modal State
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [scannedToast, setScannedToast] = useState(false);

  // Simulation state on Deposit
  const [simAmount, setSimAmount] = useState<string>('50');
  const [simulatingDeposit, setSimulatingDeposit] = useState<boolean>(false);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [toastAnim] = useState(new Animated.Value(0));

  const showNotificationToast = (
    title: string,
    description: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToastMessage({ title, description, type });
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.delay(3500),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  // Transaction Result Modal State (for both Deposit & Withdraw animations)
  const [txResult, setTxResult] = useState<TransactionResultDetails | null>(null);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);

  const handleScanQr = () => {
    setIsQrModalVisible(true);
  };

  const handleSelectScannedAddress = (scannedAddr: string) => {
    setRecipientAddress(scannedAddr);
    setIsQrModalVisible(false);
    setScannedToast(true);
    setTimeout(() => setScannedToast(false), 2500);
    showNotificationToast(
      'Alamat QR Terpindai',
      `Berhasil mendeteksi alamat: ${scannedAddr.slice(0, 10)}...${scannedAddr.slice(-6)}`,
      'info'
    );
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
        setError(response.message || 'Gagal memuat alamat setoran');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
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
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(depositAddress);
      } else {
        Clipboard.setString(depositAddress);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showNotificationToast(
        'Alamat Disalin',
        'Alamat setoran Polygon Amoy berhasil disalin ke papan klip.',
        'info'
      );
    }
  };

  const handlePasteAddress = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRecipientAddress(text.trim());
          return;
        }
      }
      const text = await Clipboard.getString();
      if (text) {
        setRecipientAddress(text.trim());
      } else {
        Alert.alert('Info', 'Clipboard kosong');
      }
    } catch {
      Alert.alert('Error', 'Gagal menempelkan alamat dari clipboard');
    }
  };

  // Deposit Simulation Handler
  const handleSimulateDeposit = async (amtVal?: string) => {
    const valStr = amtVal || simAmount;
    const numAmt = parseFloat(valStr);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Jumlah Tidak Valid', 'Masukkan jumlah setoran simulasi yang valid.');
      return;
    }

    setSimulatingDeposit(true);
    setError('');

    // Random testnet tx hash
    const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    try {
      const res = await api.wallet.simulateCryptoDeposit({
        asset_symbol: selectedAsset,
        amount: numAmt,
        tx_hash: fakeHash,
        notes: `Simulasi Setoran ${selectedAsset} Testnet`,
      });

      setSimulatingDeposit(false);

      if (res.status === 'success') {
        await loadBalances();
        setTxResult({
          title: 'Konfirmasi Setoran Crypto',
          type: 'deposit',
          status: 'success',
          amount: numAmt.toFixed(2),
          asset: selectedAsset,
          recipientOrAddress: depositAddress,
          txHash: fakeHash,
        });
        setIsResultModalVisible(true);
        showNotificationToast(
          'Setoran Berhasil Diterima',
          `+${numAmt.toFixed(2)} ${selectedAsset} telah dikreditkan ke saldo dompet Anda!`,
          'success'
        );
      } else {
        setTxResult({
          title: 'Setoran Gagal',
          type: 'deposit',
          status: 'failed',
          amount: numAmt.toFixed(2),
          asset: selectedAsset,
          errorMessage: res.message || 'Gagal memproses simulasi setoran.',
        });
        setIsResultModalVisible(true);
      }
    } catch (err: any) {
      setSimulatingDeposit(false);
      setTxResult({
        title: 'Setoran Gagal',
        type: 'deposit',
        status: 'failed',
        amount: numAmt.toFixed(2),
        asset: selectedAsset,
        errorMessage: err?.message || 'Koneksi jaringan terputus saat memproses setoran.',
      });
      setIsResultModalVisible(true);
    }
  };

  // PIN Verification State
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);

  const handleSendCrypto = () => {
    const val = parseFloat(amount);
    if (!recipientAddress || isNaN(val) || val <= 0) return;
    setIsPinModalVisible(true);
  };

  const executeWithdrawCrypto = async () => {
    setIsPinModalVisible(false);
    const val = parseFloat(amount);
    if (!recipientAddress || isNaN(val) || val <= 0) return;

    setLoading(true);
    setError('');

    // Generate simulated tx hash
    const withdrawHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    try {
      const response = await api.wallet.withdrawCrypto({
        asset_symbol: sendAsset,
        network: 'polygon_amoy',
        to_address: recipientAddress,
        amount: val,
        notes: `Penarikan ${val} ${sendAsset}`,
      });
      setLoading(false);

      if (response.status === 'success') {
        await loadBalances();
        setTimeout(() => {
          setTxResult({
            title: 'Konfirmasi Penarikan Crypto',
            type: 'withdraw',
            status: 'success',
            amount: val.toFixed(2),
            asset: sendAsset,
            recipientOrAddress: recipientAddress,
            txHash: withdrawHash,
          });
          setIsResultModalVisible(true);
        }, 150);

        showNotificationToast(
          'Penarikan Diproses',
          `-${val.toFixed(2)} ${sendAsset} berhasil dikirim ke ${recipientAddress.slice(0, 8)}...`,
          'success'
        );
        setRecipientAddress('');
        setAmount('');
      } else {
        setTimeout(() => {
          setTxResult({
            title: 'Penarikan Gagal',
            type: 'withdraw',
            status: 'failed',
            amount: val.toFixed(2),
            asset: sendAsset,
            recipientOrAddress: recipientAddress,
            errorMessage: response.message || 'Penarikan crypto gagal diproses oleh sistem.',
          });
          setIsResultModalVisible(true);
        }, 150);
      }
    } catch (err: any) {
      setLoading(false);
      setTimeout(() => {
        setTxResult({
          title: 'Penarikan Gagal',
          type: 'withdraw',
          status: 'failed',
          amount: val.toFixed(2),
          asset: sendAsset,
          recipientOrAddress: recipientAddress,
          errorMessage: err?.message || 'Terjadi kesalahan jaringan saat mengirim transaksi.',
        });
        setIsResultModalVisible(true);
      }, 150);
    }
  };

  const isAddressInvalid = recipientAddress && (recipientAddress.length !== 42 || !recipientAddress.startsWith('0x'));
  const isAmountInvalid = parseFloat(amount) > balances[sendAsset];
  const canSend = recipientAddress && amount && !isAddressInvalid && !isAmountInvalid;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Floating Live Notification Toast */}
        {toastMessage && (
          <Animated.View
            style={[
              styles.floatingToast,
              {
                backgroundColor: theme.backgroundElement,
                borderColor:
                  toastMessage.type === 'success'
                    ? theme.success
                    : toastMessage.type === 'error'
                    ? theme.danger
                    : theme.primary,
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.toastIconCircle,
                {
                  backgroundColor:
                    (toastMessage.type === 'success'
                      ? theme.success
                      : toastMessage.type === 'error'
                      ? theme.danger
                      : theme.primary) + '20',
                },
              ]}
            >
              <Ionicons
                name={
                  toastMessage.type === 'success'
                    ? 'checkmark-circle'
                    : toastMessage.type === 'error'
                    ? 'alert-circle'
                    : 'information-circle'
                }
                size={18}
                color={
                  toastMessage.type === 'success'
                    ? theme.success
                    : toastMessage.type === 'error'
                    ? theme.danger
                    : theme.primary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                {toastMessage.title}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}
                numberOfLines={2}
              >
                {toastMessage.description}
              </ThemedText>
            </View>
          </Animated.View>
        )}

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
              id="crypto-tab-receive-btn"
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
              id="crypto-tab-send-btn"
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
                      <View>
                        <ThemedText
                          style={{
                            color: isSelected ? theme.primary : theme.textSecondary,
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                        >
                          {asset}
                        </ThemedText>
                        <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                          {t('swap.balance') || 'Saldo'}: {formatNumber(balances[asset as 'USDT' | 'USDC'] || 0, language, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {asset}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* QR Code Container */}
              <Card style={styles.qrCard} bordered>
                <View
                  style={[
                    styles.networkBadge,
                    { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40', borderWidth: 1 },
                  ]}
                >
                  <AssetIcon symbol="Polygon" size={16} containerStyle={{ marginRight: 6 }} />
                  <ThemedText type="code" style={{ color: theme.warning, fontWeight: '700' }}>
                    POLYGON AMOY TESTNET
                  </ThemedText>
                </View>

                {/* QR Code Graphic */}
                <View style={[styles.qrMock, { borderColor: theme.border, backgroundColor: '#ffffff' }]}>
                  {loadingAddress ? (
                    <OctopusLoader size="small" message="Menyiapkan alamat setoran..." />
                  ) : depositAddress ? (
                    <QRCode value={depositAddress} size={180} />
                  ) : (
                    <Ionicons name="qr-code-outline" size={180} color="#000000" />
                  )}
                </View>

                {depositAddress ? (
                  <ThemedText type="code" style={styles.addressText} id="crypto-deposit-address-text">
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
                  id="crypto-copy-address-btn"
                />
              </Card>

              {/* Simulation Faucet / Quick Deposit Card */}
              <Card
                bordered
                style={[
                  styles.simulationCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.primary + '40' },
                ]}
              >
                <View style={styles.simCardHeader}>
                  <View style={[styles.simIconBox, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="flash" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">Simulasi Setoran Testnet (Faucet)</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}>
                      Kreditkan saldo instan untuk menguji alur crypto & verifikasi
                    </ThemedText>
                  </View>
                </View>

                {/* Quick amount chips */}
                <View style={styles.quickChipRow}>
                  {['10', '50', '100', '250'].map((chip) => {
                    const isSelected = simAmount === chip;
                    return (
                      <TouchableOpacity
                        key={chip}
                        onPress={() => setSimAmount(chip)}
                        style={[
                          styles.chipBtn,
                          {
                            backgroundColor: isSelected ? theme.primary + '20' : theme.background,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        id={`crypto-sim-chip-${chip}`}
                      >
                        <ThemedText
                          type="code"
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected ? theme.primary : theme.text,
                          }}
                        >
                          +{toLocalizedDigits(chip, language)} {selectedAsset}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Button
                  title={`Simulasikan Setoran +${toLocalizedDigits(simAmount, language)} ${selectedAsset}`}
                  variant="primary"
                  loading={simulatingDeposit}
                  onPress={() => handleSimulateDeposit()}
                  style={{ marginTop: Spacing.two }}
                  id="crypto-simulate-deposit-btn"
                />
              </Card>
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Card bordered style={{ padding: Spacing.four, borderRadius: 24 }}>
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
                        <View>
                          <ThemedText
                            style={{
                              color: isSelected ? theme.primary : theme.textSecondary,
                              fontWeight: '700',
                              fontSize: 13,
                            }}
                          >
                            {asset}
                          </ThemedText>
                          <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                            {t('crypto.availableBalance') || 'Tersedia'}: {formatNumber(balances[asset as 'USDT' | 'USDC'] || 0, language, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {asset}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Toast Feedback for Scanned Address */}
                {scannedToast && (
                  <View
                    style={[
                      styles.scannedToast,
                      { backgroundColor: theme.success + '20', borderColor: theme.success },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                    <ThemedText type="smallBold" style={{ color: theme.success, marginLeft: 6, fontSize: 12 }}>
                      Alamat Wallet berhasil di-scan
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
                        accessibilityLabel="Scan QR Code"
                      >
                        <Ionicons name="qr-code-outline" size={18} color={theme.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handlePasteAddress}
                        style={styles.inputActionIcon}
                        id="crypto-paste-addr-btn"
                        accessibilityLabel="Paste Alamat"
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
                    id="crypto-max-amount-btn"
                  >
                    <ThemedText type="code" style={{ fontWeight: '700' }}>
                      MAX
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <ThemedText type="small" style={[styles.balanceHint, { color: theme.textSecondary }]}>
                  {t('crypto.availableBalance')}: {formatNumber(balances[sendAsset] || 0, language, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {sendAsset}
                </ThemedText>

                {error ? (
                  <ThemedText
                    style={{
                      color: theme.danger,
                      marginVertical: Spacing.two,
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                  >
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
                  id="crypto-submit-withdraw-btn"
                />
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Real Camera & Image File QR Scanner Modal */}
        <QrScannerModal
          visible={isQrModalVisible}
          onClose={() => setIsQrModalVisible(false)}
          onScanSuccess={handleSelectScannedAddress}
        />

        {/* 6-Digit Transaction PIN Verification Modal */}
        <PinVerificationModal
          visible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          onSuccess={executeWithdrawCrypto}
          title={t('pinModal.title') || 'PIN Transaksi'}
          subtitle={`${t('crypto.withdrawTab')} ${amount} ${sendAsset}`}
        />

        {/* Transaction Result & Confirmation Animation Modal */}
        <TransactionResultModal
          visible={isResultModalVisible}
          onClose={() => setIsResultModalVisible(false)}
          result={txResult}
          onRetry={txResult?.type === 'withdraw' ? handleSendCrypto : undefined}
        />
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
    borderRadius: 14,
    padding: 4,
    minWidth: 160,
    gap: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  qrCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 24,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
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
  simulationCard: {
    padding: Spacing.four,
    borderRadius: 20,
    marginTop: Spacing.three,
  },
  simCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.two,
  },
  simIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.two,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    top: 30,
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
  floatingToast: {
    position: 'absolute',
    top: 12,
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  toastIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
