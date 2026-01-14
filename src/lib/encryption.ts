import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encryption service for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  /**
   * Generate a new encryption key for an organization
   */
  static generateKey(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Encrypt a value using AES-256-GCM
   * Returns format: iv:tag:encrypted (all in hex)
   */
  static encrypt(plaintext: string, keyHex: string): string {
    const iv = randomBytes(IV_LENGTH);
    const key = Buffer.from(keyHex, "hex");

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  static decrypt(ciphertext: string, keyHex: string): string {
    const [ivHex, tagHex, encrypted] = ciphertext.split(":");

    if (!ivHex || !tagHex || !encrypted) {
      throw new Error("Invalid ciphertext format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const key = Buffer.from(keyHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt a salary amount
   */
  static encryptSalary(salary: number, keyHex: string): string {
    return this.encrypt(salary.toString(), keyHex);
  }

  /**
   * Decrypt a salary amount
   */
  static decryptSalary(encrypted: string, keyHex: string): number {
    const decrypted = this.decrypt(encrypted, keyHex);
    return parseFloat(decrypted);
  }

  /**
   * Encrypt the organization key with the master key
   */
  static encryptOrgKey(orgKey: string, masterKey: string): string {
    return this.encrypt(orgKey, masterKey);
  }

  /**
   * Decrypt the organization key with the master key
   */
  static decryptOrgKey(encryptedOrgKey: string, masterKey: string): string {
    return this.decrypt(encryptedOrgKey, masterKey);
  }
}

/**
 * Get the master encryption key from environment
 * CRITICAL: This should never be exposed to the client
 */
export function getMasterKey(): string {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return key;
}

/**
 * Helper to encrypt employee data
 */
export interface EmployeeData {
  name: string;
  salary: number;
  walletAddress: string;
}

export interface EncryptedEmployeeData {
  nameEncrypted: string;
  salaryEncrypted: string;
  walletAddressEncrypted: string;
}

export function encryptEmployeeData(
  data: EmployeeData,
  orgKey: string
): EncryptedEmployeeData {
  return {
    nameEncrypted: EncryptionService.encrypt(data.name, orgKey),
    salaryEncrypted: EncryptionService.encryptSalary(data.salary, orgKey),
    walletAddressEncrypted: EncryptionService.encrypt(
      data.walletAddress,
      orgKey
    ),
  };
}

export function decryptEmployeeData(
  data: EncryptedEmployeeData,
  orgKey: string
): EmployeeData {
  return {
    name: EncryptionService.decrypt(data.nameEncrypted, orgKey),
    salary: EncryptionService.decryptSalary(data.salaryEncrypted, orgKey),
    walletAddress: EncryptionService.decrypt(
      data.walletAddressEncrypted,
      orgKey
    ),
  };
}
