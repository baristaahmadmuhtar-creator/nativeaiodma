ALTER TABLE sessions ADD COLUMN mfa_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN mfa_pending_expires_at timestamptz;
