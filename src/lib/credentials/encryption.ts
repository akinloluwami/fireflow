import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32",
    );
  }
  if (key.length !== 64) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt credential data using AES-256-GCM
 * @param data - The credential data object to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(data: object): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt credential data using AES-256-GCM
 * @param encryptedString - The encrypted string in format: iv:authTag:encryptedData
 * @returns The decrypted credential data object
 */
export function decrypt<T = object>(encryptedString: string): T {
  const key = getEncryptionKey();
  const parts = encryptedString.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivB64, authTagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
