/**
 * useBiometric — WebAuthn hook for fingerprint/biometric authentication
 *
 * Supports:
 *  - Checking if WebAuthn platform authenticator is available (Touch ID / Face ID / Windows Hello)
 *  - Registering fingerprint credential with backend
 *  - Verifying fingerprint with a backend-issued challenge
 *  - Persisting registration state in localStorage
 */

import { Platform } from 'react-native';
import { api } from '@/services/api';

const BIOMETRIC_CREDENTIAL_KEY = 'ledger_biometric_credential_id';
const BIOMETRIC_REGISTERED_KEY = 'ledger_biometric_registered';

// --- Utility: ArrayBuffer <-> Base64URL ---
function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  if (!buffer || buffer.byteLength === 0) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64URLToArrayBuffer(base64url?: string | null): ArrayBuffer {
  if (!base64url || typeof base64url !== 'string') {
    // Generate a fallback 32-byte cryptographically secure random buffer
    const randomBytes = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    }
    return randomBytes.buffer;
  }
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (err) {
    const randomBytes = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    }
    return randomBytes.buffer;
  }
}

/**
 * Check if WebAuthn platform authenticator (fingerprint, Face ID, Windows Hello) is available
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has already registered a biometric credential
 */
export function isBiometricRegistered(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(BIOMETRIC_REGISTERED_KEY) === 'true';
}

/**
 * Get the stored credential ID from localStorage
 */
export function getStoredCredentialId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
}

/**
 * Register the user's biometric (fingerprint/Face ID) via WebAuthn
 * Sends the credential public key to the backend for storage
 */
export async function registerBiometric(
  userIdBytes: Uint8Array,
  userDisplayName: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !navigator.credentials) {
      return { success: false, error: 'WebAuthn tidak didukung pada browser ini.' };
    }

    // 1. Fetch challenge from backend
    let challenge = '';
    try {
      const challengeRes = (await api.auth.getBiometricChallenge()) as any;
      if (challengeRes) {
        challenge =
          challengeRes.challenge ||
          challengeRes.data?.challenge ||
          (typeof challengeRes.data === 'string' ? challengeRes.data : '') ||
          '';
      }
    } catch (e: any) {
      console.warn('Could not fetch server challenge, generating client-side challenge buffer:', e);
    }

    const challengeBuffer = base64URLToArrayBuffer(challenge);

    // Prepare user ID buffer
    const userBuffer =
      userIdBytes && userIdBytes.byteLength > 0
        ? userIdBytes
        : new TextEncoder().encode(userEmail || 'ledger_user');

    // 2. Trigger browser Touch ID / Platform Authenticator prompt
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          name: 'Ledger App',
          id: window.location.hostname,
        },
        user: {
          id: userBuffer.buffer as ArrayBuffer,
          name: userEmail || 'user@ledger.io',
          displayName: userDisplayName || 'Ledger User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (ECDSA with P-256)
          { alg: -257, type: 'public-key' }, // RS256 (RSA fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Pendaftaran biometrik dibatalkan' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = arrayBufferToBase64URL(credential.rawId);
    const clientDataJSON = arrayBufferToBase64URL(response.clientDataJSON);
    const authenticatorData = arrayBufferToBase64URL(response.attestationObject);

    // Extract public key
    let publicKeyBase64 = '';
    try {
      const publicKeyBuffer = (response as any).getPublicKey?.();
      if (publicKeyBuffer) {
        publicKeyBase64 = arrayBufferToBase64URL(publicKeyBuffer);
      }
    } catch {
      publicKeyBase64 = authenticatorData;
    }
    if (!publicKeyBase64) {
      publicKeyBase64 = authenticatorData;
    }

    // 3. Send to backend
    const registerRes = await api.auth.registerBiometric({
      credential_id: credentialId,
      public_key_base64: publicKeyBase64,
      client_data_json: clientDataJSON,
      authenticator_data: authenticatorData,
    });

    if (registerRes.status !== 'success') {
      return { success: false, error: registerRes.message || 'Gagal mendaftarkan biometrik ke server' };
    }

    // Persist credential ID locally
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);
    localStorage.setItem(BIOMETRIC_REGISTERED_KEY, 'true');

    return { success: true };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Pendaftaran dibatalkan atau sensor Touch ID tidak tersentuh.' };
    }
    if (err?.name === 'InvalidStateError') {
      return { success: false, error: 'Perangkat ini sudah terdaftar sebelumnya.' };
    }
    if (err?.name === 'NotSupportedError') {
      return { success: false, error: 'Browser atau mode incognito tidak mengizinkan platform authenticator.' };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan saat mendaftar biometrik' };
  }
}

/**
 * Verify the user's biometric by completing a WebAuthn authentication assertion
 * Calls the backend to generate a challenge, then asks user to authenticate with fingerprint/Face ID
 */
export async function verifyBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !navigator.credentials) {
      return { success: false, error: 'WebAuthn tidak didukung pada browser ini.' };
    }

    const credentialId = getStoredCredentialId();
    if (!credentialId) {
      return { success: false, error: 'Fingerprint belum terdaftar di perangkat ini' };
    }

    // Get challenge from backend
    let challenge = '';
    try {
      const challengeRes = (await api.auth.getBiometricChallenge()) as any;
      if (challengeRes) {
        challenge =
          challengeRes.challenge ||
          challengeRes.data?.challenge ||
          (typeof challengeRes.data === 'string' ? challengeRes.data : '') ||
          '';
      }
    } catch (e: any) {
      console.warn('Could not fetch server challenge:', e);
    }

    const challengeBuffer = base64URLToArrayBuffer(challenge);
    const credentialIdBuffer = base64URLToArrayBuffer(credentialId);

    // Trigger browser fingerprint prompt
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        allowCredentials: [
          {
            id: credentialIdBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
        rpId: window.location.hostname,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Verifikasi biometrik dibatalkan' };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const clientDataJSON = arrayBufferToBase64URL(response.clientDataJSON);
    const authenticatorData = arrayBufferToBase64URL(response.authenticatorData);
    const signature = arrayBufferToBase64URL(response.signature);

    // Send assertion to backend for server-side verification
    const verifyRes = await api.auth.verifyBiometric({
      credential_id: credentialId,
      client_data_json: clientDataJSON,
      authenticator_data: authenticatorData,
      signature,
      challenge,
    });

    if (verifyRes.status === 'success') {
      return { success: true };
    }
    return { success: false, error: verifyRes.message || 'Verifikasi biometrik gagal' };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Verifikasi dibatalkan atau waktu habis.' };
    }
    if (err?.name === 'SecurityError') {
      return { success: false, error: 'Error keamanan: pastikan origin browser valid.' };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan saat verifikasi biometrik' };
  }
}
