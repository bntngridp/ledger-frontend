/**
 * useBiometric — WebAuthn hook for fingerprint/biometric authentication
 *
 * Supports:
 *  - Checking if WebAuthn platform authenticator is available
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
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64URLToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if WebAuthn platform authenticator (fingerprint, Face ID, Windows Hello) is available
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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
    const challengeRes = (await api.auth.getBiometricChallenge()) as any;
    if (challengeRes.status !== 'success') {
      return { success: false, error: 'Gagal mendapatkan challenge dari server' };
    }
    const challenge: string = challengeRes.challenge as string;
    const challengeBuffer = base64URLToArrayBuffer(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          name: 'Ledger App',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes.buffer as ArrayBuffer,
          name: userEmail,
          displayName: userDisplayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (ECDSA with P-256)
          { alg: -257, type: 'public-key' }, // RS256 (RSA fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'Pendaftaran biometrik dibatalkan' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = arrayBufferToBase64URL(credential.rawId);
    const clientDataJSON = arrayBufferToBase64URL(response.clientDataJSON);
    const authenticatorData = arrayBufferToBase64URL(response.attestationObject);

    // Extract and encode the public key
    let publicKeyBase64 = '';
    try {
      const publicKeyBuffer = (response as any).getPublicKey?.();
      if (publicKeyBuffer) {
        publicKeyBase64 = arrayBufferToBase64URL(publicKeyBuffer);
      }
    } catch {
      // getPublicKey() may not be available in older browsers — use attestationObject as fallback
      publicKeyBase64 = authenticatorData;
    }

    const registerRes = await api.auth.registerBiometric({
      credential_id: credentialId,
      public_key_base64: publicKeyBase64,
      client_data_json: clientDataJSON,
      authenticator_data: authenticatorData,
    });

    if (registerRes.status !== 'success') {
      return { success: false, error: registerRes.message || 'Gagal mendaftarkan biometrik' };
    }

    // Persist credential ID locally
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);
    localStorage.setItem(BIOMETRIC_REGISTERED_KEY, 'true');

    return { success: true };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Pendaftaran dibatalkan oleh pengguna' };
    }
    if (err?.name === 'InvalidStateError') {
      return { success: false, error: 'Perangkat ini sudah terdaftar sebelumnya' };
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
    const credentialId = getStoredCredentialId();
    if (!credentialId) {
      return { success: false, error: 'Fingerprint belum terdaftar di perangkat ini' };
    }

    // Get challenge from backend
    const challengeRes = (await api.auth.getBiometricChallenge()) as any;
    if (challengeRes.status !== 'success') {
      return { success: false, error: 'Gagal mendapatkan challenge dari server' };
    }
    const challenge: string = challengeRes.challenge as string;
    const challengeBuffer = base64URLToArrayBuffer(challenge);
    const credentialIdBuffer = base64URLToArrayBuffer(credentialId);

    // Trigger browser fingerprint prompt
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        allowCredentials: [
          {
            id: credentialIdBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
        rpId: window.location.hostname,
      },
    }) as PublicKeyCredential;

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
      return { success: false, error: 'Verifikasi dibatalkan atau timeout' };
    }
    if (err?.name === 'SecurityError') {
      return { success: false, error: 'Error keamanan: pastikan menggunakan HTTPS' };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan saat verifikasi biometrik' };
  }
}
