ALTER TABLE users
  ADD COLUMN mfa_secret text,
  ADD COLUMN mfa_last_step bigint NOT NULL DEFAULT -1 CHECK (mfa_last_step >= -1),
  ADD COLUMN mfa_pending text;

COMMENT ON COLUMN users.mfa_secret IS 'User-bound AES-256-GCM envelope; never plaintext TOTP secret';
COMMENT ON COLUMN users.mfa_pending IS 'User-bound encrypted enrollment secret; promote only after verified TOTP';
COMMENT ON COLUMN users.mfa_last_step IS 'Highest accepted TOTP step; update atomically to prevent concurrent replay';

CREATE TABLE mfa_recovery_codes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  used_at timestamptz,
  PRIMARY KEY (user_id, code_hash)
);

COMMENT ON TABLE mfa_recovery_codes IS 'Store only hashes of random recovery codes; consume with user scope and used_at IS NULL atomically';
