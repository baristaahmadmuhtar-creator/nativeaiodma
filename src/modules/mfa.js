'use strict';

const crypto = require('node:crypto');
const OTPAuth = require('otpauth');
const { AppError, requireValue } = require('../shared/errors');

const TOTP_CONFIG = Object.freeze({ issuer: 'AIODMA', algorithm: 'SHA1', digits: 6, period: 30 });
const ENCRYPTION_CONTEXT = 'AIODMA:mfa:v1';

function parseSecret(secret) {
  requireValue(typeof secret === 'string' && /^[A-Z2-7]{32,103}$/.test(secret),
    'MFA_INVALID_SECRET', 'Invalid MFA secret.');
  const decoded = OTPAuth.Secret.fromBase32(secret);
  requireValue(decoded.bytes.length >= 20 && decoded.bytes.length <= 64 && decoded.base32 === secret,
    'MFA_INVALID_SECRET', 'Invalid MFA secret.');
  return decoded;
}

function keyFor(sessionSecret) {
  requireValue(typeof sessionSecret === 'string' && Buffer.byteLength(sessionSecret) >= 32 &&
    Buffer.byteLength(sessionSecret) <= 4096, 'MFA_KEY_CONFIG', 'SESSION_SECRET must contain 32 to 4096 bytes.', 500);
  return Buffer.from(crypto.hkdfSync('sha256', sessionSecret, ENCRYPTION_CONTEXT, 'secret-encryption', 32));
}

function aadFor(userId) {
  requireValue(typeof userId === 'string' && userId.length > 0 && userId.length <= 128 && userId.trim() === userId,
    'MFA_USER_REQUIRED', 'A stable server-owned user ID is required.');
  return Buffer.from(JSON.stringify([ENCRYPTION_CONTEXT, userId]), 'utf8');
}

/**
 * encryptSecret(base32Secret, SESSION_SECRET, userId) -> versioned encrypted text.
 * decryptSecret(encryptedText, SESSION_SECRET, userId) -> base32Secret.
 * No environment/database access. Encryption uses fresh random 96-bit IVs and
 * 128-bit GCM tags; userId is authenticated data, preventing cross-user swaps.
 * Both mfa_pending and mfa_secret use this same user binding so promotion needs
 * no plaintext storage. Rotating SESSION_SECRET requires decrypt/re-encrypt with
 * old/new keys; silently replacing the key makes existing enrollments unreadable.
 */
function encryptSecret(secret, sessionSecret, userId) {
  parseSecret(secret);
  const aad = aadFor(userId);
  const key = keyFor(sessionSecret);
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  } finally { key.fill(0); }
}

function decryptSecret(encrypted, sessionSecret, userId) {
  const aad = aadFor(userId);
  const key = keyFor(sessionSecret);
  try {
    if (typeof encrypted !== 'string' || encrypted.length > 256) throw new Error('Invalid envelope');
    const parts = encrypted.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid envelope');
    const values = parts.slice(1).map(part => {
      if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid encoding');
      const value = Buffer.from(part, 'base64url');
      if (value.toString('base64url') !== part) throw new Error('Noncanonical encoding');
      return value;
    });
    const [iv, ciphertext, tag] = values;
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 32 || ciphertext.length > 103) throw new Error('Invalid lengths');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    try {
      const secret = plaintext.toString('utf8');
      parseSecret(secret);
      return secret;
    } finally { plaintext.fill(0); }
  } catch {
    throw new AppError('MFA_DECRYPT_FAILED', 'MFA secret could not be authenticated.', 422);
  } finally { key.fill(0); }
}

/**
 * generateEnrollment(email) -> {secret,otpauthUri}; disclose only to the enrolling
 * authenticated owner over the parent secure flow. This does NOT enable MFA.
 * Encrypt into mfa_pending; validate a first TOTP before promoting to mfa_secret,
 * clearing pending and storing the acceptedStep atomically. Never log this result.
 */
function generateEnrollment(email) {
  requireValue(typeof email === 'string' && email.length <= 254 && /^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/.test(email),
    'MFA_INVALID_EMAIL', 'A valid enrollment email is required.');
  const totp = new OTPAuth.TOTP({ ...TOTP_CONFIG, label: email, secret: new OTPAuth.Secret({ size: 20 }) });
  return Object.freeze({ secret: totp.secret.base32, otpauthUri: totp.toString() });
}

function parseStep(value) {
  const validString = typeof value === 'string' && /^(?:-1|0|[1-9]\d{0,15})$/.test(value);
  requireValue(typeof value === 'number' || typeof value === 'bigint' || validString,
    'MFA_INVALID_STEP', 'Invalid last-used MFA step.');
  const step = Number(value);
  requireValue(Number.isSafeInteger(step) && step >= -1, 'MFA_INVALID_STEP', 'Invalid last-used MFA step.');
  return step;
}

/**
 * verifyTotp(secret, token, lastUsedStep, now) -> acceptedStep:number | null.
 * now is explicit server Unix milliseconds (never client time); lastUsedStep is
 * a safe integer, bigint or canonical PostgreSQL bigint string, initially -1.
 * Invalid/wrong/expired/replayed tokens return null. Invalid server inputs throw.
 * A match must be strictly newer than lastUsedStep, including future-window use.
 * Parent MUST lock the user row or compare-and-set mfa_last_step in the same
 * transaction as authentication/enrollment. This pure check alone cannot prevent
 * concurrent replay. Enforce owner authorization, session elevation, rate limits,
 * pending expiry and recovery consumption in the parent; no routes are installed.
 */
function verifyTotp(secret, token, lastUsedStep, now) {
  const decoded = parseSecret(secret);
  const previous = parseStep(lastUsedStep);
  requireValue(Number.isSafeInteger(now) && now >= 0 && now <= 8640000000000000,
    'MFA_INVALID_TIME', 'MFA verification requires server Unix milliseconds.');
  if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return null;
  const delta = OTPAuth.TOTP.validate({ ...TOTP_CONFIG, secret: decoded, token, timestamp: now, window: 1 });
  if (delta === null) return null;
  const acceptedStep = OTPAuth.TOTP.counter({ period: TOTP_CONFIG.period, timestamp: now }) + delta;
  return acceptedStep >= 0 && acceptedStep > previous ? acceptedStep : null;
}

function normalizeRecoveryCode(code) {
  requireValue(typeof code === 'string' && /^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{8}){3})$/.test(code),
    'MFA_INVALID_RECOVERY_CODE', 'Invalid recovery code.');
  return code.replaceAll('-', '').toLowerCase();
}

// SHA-256 is appropriate here because every generated code has 128 random bits.
function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update('AIODMA:mfa:recovery:v1:').update(normalizeRecoveryCode(code)).digest('hex');
}

/**
 * generateRecoveryCodes(count=10) -> {codes,hashes}; display codes once, persist
 * ONLY hashes with user_id. Re-enrollment must invalidate all prior recovery rows.
 * Atomic use: UPDATE mfa_recovery_codes SET used_at=now() WHERE user_id=$1 AND
 * code_hash=$2 AND used_at IS NULL RETURNING user_id; authorize only one returned
 * row. Neither hashRecoveryCode nor verifyRecoveryCode tracks consumption.
 */
function generateRecoveryCodes(count = 10) {
  requireValue(Number.isInteger(count) && count >= 1 && count <= 20,
    'MFA_INVALID_RECOVERY_COUNT', 'Generate between 1 and 20 recovery codes.');
  const codes = new Set();
  while (codes.size < count) codes.add(crypto.randomBytes(16).toString('hex').match(/.{8}/g).join('-'));
  const plaintext = [...codes];
  return Object.freeze({ codes: Object.freeze(plaintext), hashes: Object.freeze(plaintext.map(hashRecoveryCode)) });
}

function verifyRecoveryCode(code, savedHash) {
  if (typeof savedHash !== 'string' || !/^[a-f0-9]{64}$/.test(savedHash)) return false;
  try { return crypto.timingSafeEqual(Buffer.from(hashRecoveryCode(code), 'hex'), Buffer.from(savedHash, 'hex')); }
  catch { return false; }
}

module.exports = { encryptSecret, decryptSecret, generateEnrollment, verifyTotp,
  generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode };
