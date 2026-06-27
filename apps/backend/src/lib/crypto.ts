import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Authenticated symmetric encryption (AES-256-GCM) for platform refresh tokens
 * at rest. We never store the user's raw platform credential (PSN NPSSO); we do
 * store the derived refresh token encrypted with this, behind a TTL, so the app
 * can refresh in the background without re-prompting. `/account/disconnect`
 * deletes the ciphertext outright.
 *
 * Wire format (base64):  [12-byte IV][16-byte auth tag][ciphertext]
 */
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

const KEY = Buffer.from(env.TOKEN_ENC_KEY, 'base64');

export interface SealedSecret {
  /** base64-encoded sealed blob. */
  ciphertext: string;
}

export function seal(plaintext: string): SealedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([iv, tag, enc]).toString('base64') };
}

export function open(sealed: SealedSecret | string): string {
  const blob = Buffer.from(typeof sealed === 'string' ? sealed : sealed.ciphertext, 'base64');
  if (blob.length < IV_BYTES + TAG_BYTES) {
    throw new Error('Malformed sealed secret');
  }
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const enc = blob.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** Constant-time string comparison for secrets/signatures. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
