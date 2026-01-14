/**
 * Client-Side Encryption Module
 *
 * SECURITY: This encryption happens in the browser.
 * The server NEVER sees plaintext data.
 * Only the employer can decrypt their own data.
 *
 * Key derivation: We derive encryption keys from wallet signatures.
 * This means:
 * - No passwords to manage
 * - Keys are tied to wallet ownership
 * - Keys never leave the client
 */

import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

// Constants for encryption
const ENCRYPTION_DOMAIN = "stealthpay-v1";
const KEY_DERIVATION_MESSAGE = `Sign this message to derive your StealthPay encryption key.\n\nDomain: ${ENCRYPTION_DOMAIN}\nThis will NOT submit any transaction or cost any fees.`;

/**
 * Derive an encryption key from a wallet signature
 * This key is used to encrypt all sensitive data client-side
 */
export async function deriveEncryptionKey(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  publicKey: PublicKey
): Promise<CryptoKey> {
  // Create a deterministic message to sign
  const message = new TextEncoder().encode(
    `${KEY_DERIVATION_MESSAGE}\n\nWallet: ${publicKey.toBase58()}`
  );

  // Get signature from wallet
  const signature = await signMessage(message);

  // Use signature as seed for key derivation
  // We hash it to get a proper 256-bit key
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    signature.buffer as ArrayBuffer
  );

  // Import as AES-GCM key
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64 encoded: iv + ciphertext + tag
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt - convert to ArrayBuffer for type compatibility
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    plaintext.buffer.slice(
      plaintext.byteOffset,
      plaintext.byteOffset + plaintext.byteLength
    ) as ArrayBuffer
  );

  // Combine iv + ciphertext (tag is included in ciphertext by WebCrypto)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64 (using Array.from for compatibility)
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  // Decode from base64
  const combined = new Uint8Array(
    atob(encrypted)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // Decrypt - convert to ArrayBuffer for type compatibility
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    ciphertext.buffer.slice(
      ciphertext.byteOffset,
      ciphertext.byteOffset + ciphertext.byteLength
    ) as ArrayBuffer
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt employee data (name, salary, wallet)
 * All encryption happens client-side
 */
export interface EmployeePlainData {
  name: string;
  salary: number;
  walletAddress: string;
}

export interface EmployeeEncryptedData {
  nameEncrypted: string;
  salaryEncrypted: string;
  walletAddressEncrypted: string;
}

export async function encryptEmployeeData(
  data: EmployeePlainData,
  key: CryptoKey
): Promise<EmployeeEncryptedData> {
  const [nameEncrypted, salaryEncrypted, walletAddressEncrypted] =
    await Promise.all([
      encryptData(data.name, key),
      encryptData(data.salary.toString(), key),
      encryptData(data.walletAddress, key),
    ]);

  return {
    nameEncrypted,
    salaryEncrypted,
    walletAddressEncrypted,
  };
}

export async function decryptEmployeeData(
  data: EmployeeEncryptedData,
  key: CryptoKey
): Promise<EmployeePlainData> {
  const [name, salaryStr, walletAddress] = await Promise.all([
    decryptData(data.nameEncrypted, key),
    decryptData(data.salaryEncrypted, key),
    decryptData(data.walletAddressEncrypted, key),
  ]);

  return {
    name,
    salary: parseFloat(salaryStr),
    walletAddress,
  };
}

/**
 * Store encryption key in session (memory only)
 * Key is lost on page refresh - user must re-sign
 */
let cachedKey: CryptoKey | null = null;

export function cacheEncryptionKey(key: CryptoKey): void {
  cachedKey = key;
}

export function getCachedKey(): CryptoKey | null {
  return cachedKey;
}

export function clearCachedKey(): void {
  cachedKey = null;
}

/**
 * Check if we have a cached encryption key
 */
export function hasEncryptionKey(): boolean {
  return cachedKey !== null;
}
