import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Spacing } from '@/constants/theme';
import { api } from '@/services/api';

interface RecoveryCodesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RecoveryCodesModal({ visible, onClose }: RecoveryCodesModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hidden, setHidden] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchCodes = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.auth.get2FARecoveryCodes();
      if (res.status === 'success' && res.data) {
        setCodes(res.data);
      } else {
        setError(res.message || 'Gagal memuat kode pemulihan');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat kode pemulihan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchCodes();
    }
  }, [visible]);

  const handleCopyAll = () => {
    if (codes.length === 0) return;
    const textContent = `LEDGER 2FA RECOVERY CODES\nGenerated on: ${new Date().toLocaleString()}\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nSimpan kode pemulihan ini di tempat yang aman. Setiap kode hanya dapat digunakan sekali.`;

    Clipboard.setString(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (codes.length === 0) return;
    const textContent = `LEDGER 2FA RECOVERY CODES\nGenerated on: ${new Date().toLocaleString()}\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nSimpan kode pemulihan ini di tempat yang aman. Setiap kode hanya dapat digunakan sekali.`;

    if (Platform.OS === 'web') {
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ledger-2fa-recovery-codes.txt';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      handleCopyAll();
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError('');
    setMessage('');
    try {
      const res = await api.auth.regenerate2FARecoveryCodes();
      if (res.status === 'success' && res.data) {
        setCodes(res.data);
        setMessage('16 Kode pemulihan baru berhasil dibuat!');
      } else {
        setError(res.message || 'Gagal membuat ulang kode pemulihan');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat ulang kode pemulihan');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconCircle, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="key-outline" size={20} color={theme.primary} />
              </View>
              <View>
                <ThemedText type="smallBold" style={styles.title}>
                  {t('profile.recoveryCodesTitle') || 'Kode Pemulihan Cadangan'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
                  2FA Backup Recovery Codes ({codes.length} Available)
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} id="recovery-modal-close-btn">
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <ThemedText
            type="small"
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {t('auth.recoveryCodesSubtitle') || 'Simpan kode-kode ini di tempat aman. Gunakan kode pemulihan sekali pakai ini jika Anda kehilangan akses ke aplikasi authenticator.'}
          </ThemedText>

          {/* Feedback Alerts */}
          {message ? (
            <View
              style={[
                styles.alertBox,
                { backgroundColor: theme.success + '15', borderColor: theme.success },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
              <ThemedText type="smallBold" style={{ color: theme.success, flex: 1, fontSize: 12 }}>
                {message}
              </ThemedText>
            </View>
          ) : null}

          {error ? (
            <View
              style={[
                styles.alertBox,
                { backgroundColor: theme.danger + '15', borderColor: theme.danger },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <ThemedText type="small" style={{ color: theme.danger, flex: 1, fontSize: 12 }}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Code Grid */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                {t('common.loading') || 'Memuat kode pemulihan...'}
              </ThemedText>
            ) : codes.length > 0 ? (
              <View style={styles.codesGrid}>
                {codes.map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.codeBadge,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <ThemedText type="code" style={styles.codeText}>
                      {hidden ? '•••••-•••••' : c}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                -
              </ThemedText>
            )}
          </ScrollView>

          {/* Actions Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => setHidden(!hidden)}
              style={[styles.toolBtn, { borderColor: theme.border }]}
            >
              <Ionicons
                name={hidden ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color={theme.textSecondary}
              />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                {hidden ? 'Show' : 'Hide'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCopyAll}
              style={[styles.toolBtn, { borderColor: theme.border }]}
              id="btn-copy-all-recovery-codes"
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? theme.success : theme.primary}
              />
              <ThemedText
                type="smallBold"
                style={{ color: copied ? theme.success : theme.primary, marginLeft: 6 }}
              >
                {copied ? (t('common.copied') || 'Tersalin!') : (t('auth.copyAllCodes') || 'Salin Semua')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownload}
              style={[styles.toolBtn, { borderColor: theme.primary, backgroundColor: theme.primary + '12' }]}
              id="btn-download-recovery-codes"
            >
              <Ionicons name="download-outline" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary, marginLeft: 6 }}>
                Download (.txt)
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <Button
              title={t('auth.regenerateCodes') || 'Regenerate'}
              variant="ghost"
              loading={regenerating}
              onPress={handleRegenerate}
              style={{ flex: 1.3 }}
              id="btn-regenerate-recovery-codes"
            />
            <Button
              title={t('common.done') || 'Tutup'}
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: Spacing.three,
  },
  alertBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  scrollArea: {
    maxHeight: 220,
    marginVertical: Spacing.two,
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  codeBadge: {
    width: '48%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});
