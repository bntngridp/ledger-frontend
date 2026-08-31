import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import jsQR from 'jsqr';

import { ThemedText } from './themed-text';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (scannedAddress: string) => void;
}

export function QrScannerModal({ visible, onClose, onScanSuccess }: QrScannerModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');

  // Camera state
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // File upload state
  const [uploadError, setUploadError] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Extract EVM address from scanned raw string (e.g. "ethereum:0x123..." or "0x123...")
  const parseEvmAddress = (rawText: string): string | null => {
    if (!rawText) return null;
    const cleaned = rawText.trim();

    // Match 0x followed by 40 hex characters
    const evmMatch = cleaned.match(/(0x[a-fA-F0-9]{40})/);
    if (evmMatch && evmMatch[1]) {
      return evmMatch[1];
    }
    return null;
  };

  // Start Real Camera Stream (Web)
  const startCamera = async () => {
    if (Platform.OS !== 'web') return;

    setCameraError('');
    setCameraLoading(true);

    try {
      stopCamera();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        setCameraLoading(false);
        // Start scanning loop
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraLoading(false);
      setCameraError(t('qrScannerModal.cameraPermissionError'));
    }
  };

  // Real-time camera QR scanning frame loop
  const scanFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Create offscreen canvas for decoding frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Decode with jsQR engine
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const evmAddr = parseEvmAddress(code.data);
        if (evmAddr) {
          stopCamera();
          onScanSuccess(evmAddr);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Process uploaded QR Code Image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const code = jsQR(imageData.data, imageData.width, imageData.height);

          setIsProcessingFile(false);
          if (code && code.data) {
            const evmAddr = parseEvmAddress(code.data);
            if (evmAddr) {
              onScanSuccess(evmAddr);
            } else {
              setUploadError(t('qrScannerModal.uploadErrorInvalidEvm'));
            }
          } else {
            setUploadError(t('qrScannerModal.uploadErrorUndetected'));
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (visible && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [visible, activeTab]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        stopCamera();
        onClose();
      }}
    >
      <View style={styles.modalBackdrop}>
        <Card style={[styles.qrModalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} bordered>
          {/* Header */}
          <View style={styles.qrModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.qrHeaderIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="qr-code" size={20} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={{ fontSize: 17, fontWeight: '700' }}>
                {t('qrScannerModal.title')}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => {
                stopCamera();
                onClose();
              }}
              style={styles.closeBtn}
              id="qr-modal-close-btn"
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs (Camera vs Upload File) */}
          <View style={[styles.tabBar, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('camera')}
              style={[
                styles.tabItem,
                activeTab === 'camera' && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1.5 },
              ]}
              id="qr-tab-camera"
            >
              <Ionicons name="videocam-outline" size={16} color={activeTab === 'camera' ? theme.primary : theme.textSecondary} />
              <ThemedText
                type="smallBold"
                style={{ fontSize: 12, marginLeft: 6, color: activeTab === 'camera' ? theme.primary : theme.textSecondary }}
              >
                {t('qrScannerModal.tabCamera')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('upload')}
              style={[
                styles.tabItem,
                activeTab === 'upload' && { backgroundColor: theme.primary + '15', borderColor: theme.primary, borderWidth: 1.5 },
              ]}
              id="qr-tab-upload"
            >
              <Ionicons name="cloud-upload-outline" size={16} color={activeTab === 'upload' ? theme.primary : theme.textSecondary} />
              <ThemedText
                type="smallBold"
                style={{ fontSize: 12, marginLeft: 6, color: activeTab === 'upload' ? theme.primary : theme.textSecondary }}
              >
                {t('qrScannerModal.tabUpload')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* TAB 1: REAL CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <View style={styles.contentSection}>
              <View style={[styles.viewfinderBox, { backgroundColor: '#000000', borderColor: theme.border }]}>
                {/* HTML Video Stream for Real Camera */}
                {Platform.OS === 'web' && (
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: cameraError ? 'none' : 'block',
                    }}
                  />
                )}

                {cameraLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText type="code" style={{ fontSize: 11, color: '#FFFFFF', marginTop: 8 }}>
                      {t('qrScannerModal.cameraLoading')}
                    </ThemedText>
                  </View>
                )}

                {cameraError ? (
                  <View style={styles.errorOverlay}>
                    <Ionicons name="videocam-off-outline" size={36} color={theme.danger} />
                    <ThemedText style={{ color: theme.danger, fontSize: 12, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 }}>
                      {cameraError}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={startCamera}
                      style={[styles.retryCameraBtn, { backgroundColor: theme.primary }]}
                    >
                      <ThemedText type="smallBold" style={{ color: '#FFFFFF', fontSize: 11 }}>
                        {t('qrScannerModal.retryCamera')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Animated Scanning Laser Overlay */
                  <View style={styles.laserContainer}>
                    <style>{`
                      @keyframes laserScanReal {
                        0% { top: 10%; opacity: 0.7; }
                        50% { top: 85%; opacity: 1; }
                        100% { top: 10%; opacity: 0.7; }
                      }
                      .laser-beam-real {
                        position: absolute;
                        left: 8%;
                        right: 8%;
                        height: 3px;
                        background-color: ${theme.primary};
                        box-shadow: 0 0 12px ${theme.primary};
                        animation: laserScanReal 2s ease-in-out infinite;
                        border-radius: 2px;
                        z-index: 5;
                      }
                    `}</style>
                    <div className="laser-beam-real" />
                  </View>
                )}
              </View>

              <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                {t('qrScannerModal.cameraHint')}
              </ThemedText>
            </View>
          )}

          {/* TAB 2: UPLOAD QR CODE IMAGE FILE */}
          {activeTab === 'upload' && (
            <View style={styles.contentSection}>
              <TouchableOpacity
                onPress={() => fileInputRef.current?.click()}
                style={[styles.uploadDropzone, { backgroundColor: theme.background, borderColor: theme.border }]}
                id="qr-file-dropzone"
              >
                {/* Hidden HTML File Input */}
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                )}

                {isProcessingFile ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <>
                    <View style={[styles.uploadIconCircle, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="image-outline" size={32} color={theme.primary} />
                    </View>
                    <ThemedText type="smallBold" style={{ marginTop: 12 }}>
                      {t('qrScannerModal.uploadTitle')}
                    </ThemedText>
                    <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                      {t('qrScannerModal.uploadFormats')}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {uploadError ? (
                <ThemedText style={{ color: theme.danger, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                  {uploadError}
                </ThemedText>
              ) : null}
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  contentSection: {
    marginBottom: 16,
  },
  viewfinderBox: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  errorOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 10,
  },
  retryCameraBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  laserContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  uploadDropzone: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
