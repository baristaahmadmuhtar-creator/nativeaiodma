'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const OTPAuth = require('otpauth');
const { encryptSecret, decryptSecret, generateEnrollment, verifyTotp,
  generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode } = require('../../src/modules/mfa');

const key = 'test-only-session-secret-with-at-least-32-bytes';
const userId = '1e5e0eaf-bec6-4ed2-bb3f-a3d90215e3d5';
const secret = OTPAuth.Secret.fromUTF8('12345678901234567890').base32;
const now = 1800000000000;
const step = Math.floor(now / 30000);
const tokenAt = timestamp => OTPAuth.TOTP.generate({ secret: OTPAuth.Secret.fromBase32(secret),
  algorithm: 'SHA1', digits: 6, period: 30, timestamp });

test('enrollment is unique, standard, and URI round-trips through OTPAuth', () => {
  const first = generateEnrollment('owner+test@example.com');
  const second = generateEnrollment('owner+test@example.com');
  assert.notEqual(first.secret, second.secret);
  assert.match(first.secret, /^[A-Z2-7]{32}$/);
  const parsed = OTPAuth.URI.parse(first.otpauthUri);
  assert.ok(parsed instanceof OTPAuth.TOTP);
  assert.equal(parsed.issuer, 'AIODMA');
  assert.equal(parsed.label, 'owner+test@example.com');
  assert.equal(parsed.secret.base32, first.secret);
  assert.equal(parsed.algorithm, 'SHA1');
  assert.equal(parsed.digits, 6);
  assert.equal(parsed.period, 30);
  assert.equal(verifyTotp(first.secret, parsed.generate({ timestamp: now }), -1, now), step);
  assert.ok(Object.isFrozen(first));
});

test('invalid enrollment labels fail without echoing submitted values', () => {
  for (const email of ['', null, {}, 'owner', 'x\ny@example.com', 'issuer:owner@example.com', 'x'.repeat(255)]) {
    assert.throws(() => generateEnrollment(email), { code: 'MFA_INVALID_EMAIL', status: 422 });
  }
});

test('AES-GCM round trip uses randomized IVs and keeps plaintext out of the envelope', () => {
  const first = encryptSecret(secret, key, userId);
  const second = encryptSecret(secret, key, userId);
  assert.notEqual(first, second);
  assert.match(first, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.ok(!first.includes(secret));
  assert.equal(Buffer.from(first.split('.')[1], 'base64url').length, 12);
  assert.equal(Buffer.from(first.split('.')[3], 'base64url').length, 16);
  assert.equal(decryptSecret(first, key, userId), secret);
  assert.equal(decryptSecret(second, key, userId), secret);
});

test('ciphertext, IV, tag, key and user binding are authenticated', () => {
  const encrypted = encryptSecret(secret, key, userId);
  for (const index of [1, 2, 3]) {
    const parts = encrypted.split('.');
    const bytes = Buffer.from(parts[index], 'base64url'); bytes[0] ^= 1;
    parts[index] = bytes.toString('base64url');
    assert.throws(() => decryptSecret(parts.join('.'), key, userId), { code: 'MFA_DECRYPT_FAILED' });
  }
  assert.throws(() => decryptSecret(encrypted, key + 'wrong', userId), { code: 'MFA_DECRYPT_FAILED' });
  assert.throws(() => decryptSecret(encrypted, key, 'another-user'), { code: 'MFA_DECRYPT_FAILED' });
});

test('malformed, truncated, noncanonical or plaintext envelopes never decrypt', () => {
  const encrypted = encryptSecret(secret, key, userId);
  const parts = encrypted.split('.');
  for (const value of [undefined, {}, '', secret, encrypted.replace('v1.', 'v2.'), encrypted + '.extra',
    `v1.${parts[1]}=.${parts[2]}.${parts[3]}`, encrypted.slice(0, -3), 'x'.repeat(257)]) {
    assert.throws(() => decryptSecret(value, key, userId), { code: 'MFA_DECRYPT_FAILED', status: 422 });
  }
});

test('encryption rejects missing server key or user identity', () => {
  for (const value of [undefined, '', 'short', 'x'.repeat(4097)]) {
    assert.throws(() => encryptSecret(secret, value, userId), { code: 'MFA_KEY_CONFIG', status: 500 });
  }
  for (const value of [undefined, '', ' user ', 123]) {
    assert.throws(() => encryptSecret(secret, key, value), { code: 'MFA_USER_REQUIRED' });
  }
});

test('RFC 6238 Appendix B SHA1 vectors, reduced to this enrollment six-digit format', () => {
  // RFC vectors are eight digits. Six-digit HOTP uses the same truncation modulo 10^6.
  // https://www.rfc-editor.org/rfc/rfc6238#appendix-B
  for (const [seconds, expectedEight] of [[59, '94287082'], [1111111109, '07081804'],
    [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) {
    const token = expectedEight.slice(-6);
    assert.equal(tokenAt(seconds * 1000), token);
    assert.equal(verifyTotp(secret, token, -1, seconds * 1000), Math.floor(seconds / 30));
  }
});

test('window accepts exactly previous/current/next steps and rejects farther tokens', () => {
  for (const offset of [-1, 0, 1]) {
    assert.equal(verifyTotp(secret, tokenAt(now + offset * 30000), -1, now), step + offset);
  }
  for (const offset of [-3, -2, 2, 3]) assert.equal(verifyTotp(secret, tokenAt(now + offset * 30000), -1, now), null);
});

test('accepted step cannot replay; future-window acceptance also blocks earlier steps', () => {
  const token = tokenAt(now);
  const accepted = verifyTotp(secret, token, -1, now);
  for (const previous of [accepted, String(accepted), BigInt(accepted)]) {
    assert.equal(verifyTotp(secret, token, previous, now), null);
    assert.equal(verifyTotp(secret, token, previous, now + 30000), null);
  }
  assert.equal(verifyTotp(secret, tokenAt(now + 30000), accepted, now + 30000), step + 1);
  const future = verifyTotp(secret, tokenAt(now + 30000), -1, now);
  assert.equal(verifyTotp(secret, token, future, now), null);
  assert.equal(verifyTotp(secret, tokenAt(now + 30000), future, now + 30000), null);
});

test('wrong secret/token and malformed tokens fail closed without coercion', () => {
  const wrongSecret = OTPAuth.Secret.fromUTF8('00000000000000000000').base32;
  assert.equal(verifyTotp(wrongSecret, tokenAt(now), -1, now), null);
  for (const token of ['', null, undefined, 123456, '12345', '1234567', ' 123456', '123456\n', 'abcdef', {}, '000000']) {
    assert.equal(verifyTotp(secret, token, -1, now), null);
  }
});

test('verification is explicit about milliseconds, state types and secret encoding', () => {
  for (const value of [undefined, null, -1, NaN, Infinity, '1800000000000', 0.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => verifyTotp(secret, tokenAt(now), -1, value), { code: 'MFA_INVALID_TIME' });
  }
  for (const value of [undefined, null, false, -2, 0.5, '1e3', '01', '', Number.MAX_SAFE_INTEGER + 1, 9007199254740992n]) {
    assert.throws(() => verifyTotp(secret, tokenAt(now), value, now), { code: 'MFA_INVALID_STEP' });
  }
  for (const value of ['', 'A', secret.toLowerCase(), secret + '=', '0'.repeat(32), {}]) {
    assert.throws(() => verifyTotp(value, tokenAt(now), -1, now), { code: 'MFA_INVALID_SECRET' });
  }
  assert.equal(verifyTotp(secret, tokenAt(0), '-1', 0), 0);
  assert.equal(verifyTotp(secret, tokenAt(29999), -1, 29999), 0);
  assert.equal(verifyTotp(secret, tokenAt(30000), -1, 30000), 1);
});

test('recovery codes have 128 random bits, unique hashes and case/grouping-normalized verification', () => {
  const generated = generateRecoveryCodes();
  assert.equal(generated.codes.length, 10);
  assert.equal(new Set(generated.codes).size, 10);
  assert.equal(new Set(generated.hashes).size, 10);
  generated.codes.forEach((code, index) => {
    assert.match(code, /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/);
    assert.match(generated.hashes[index], /^[a-f0-9]{64}$/);
    assert.notEqual(code, generated.hashes[index]);
    assert.equal(hashRecoveryCode(code), generated.hashes[index]);
    assert.equal(verifyRecoveryCode(code.toUpperCase().replaceAll('-', ''), generated.hashes[index]), true);
    assert.equal(verifyRecoveryCode(code, generated.hashes[(index + 1) % 10]), false);
  });
  assert.ok(Object.isFrozen(generated.codes));
  assert.ok(Object.isFrozen(generated.hashes));
});

test('recovery helpers reject malformed inputs and cannot implicitly consume persisted codes', () => {
  for (const count of [0, -1, 21, 1.5, '10', null]) {
    assert.throws(() => generateRecoveryCodes(count), { code: 'MFA_INVALID_RECOVERY_COUNT' });
  }
  const { codes, hashes } = generateRecoveryCodes(1);
  for (const code of [undefined, '', {}, '0'.repeat(31), 'x'.repeat(32), ' ' + codes[0], codes[0] + '\n']) {
    assert.equal(verifyRecoveryCode(code, hashes[0]), false);
    assert.throws(() => hashRecoveryCode(code), { code: 'MFA_INVALID_RECOVERY_CODE' });
  }
  for (const saved of [undefined, '', {}, 'z'.repeat(64), hashes[0].slice(1)]) assert.equal(verifyRecoveryCode(codes[0], saved), false);
  // Pure matching is repeatable; the parent must atomically mark used_at to consume.
  assert.equal(verifyRecoveryCode(codes[0], hashes[0]), true);
  assert.equal(verifyRecoveryCode(codes[0], hashes[0]), true);
});
