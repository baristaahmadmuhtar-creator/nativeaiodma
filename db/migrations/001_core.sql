CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  currency text NOT NULL CHECK (currency IN ('BND','IDR')),
  config jsonb NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  tenant_id text NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('owner','manager','cashier','kitchen','waiter')),
  PRIMARY KEY (tenant_id,user_id)
);
CREATE TABLE dining_tables (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id integer NOT NULL CHECK (id BETWEEN 1 AND 999),
  active boolean NOT NULL DEFAULT true,
  qr_version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id,id)
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  csrf_hash text NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  table_id integer,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  FOREIGN KEY (tenant_id,table_id) REFERENCES dining_tables(tenant_id,id),
  CHECK ((user_id IS NOT NULL AND table_id IS NULL) OR (user_id IS NULL AND table_id IS NOT NULL)),
  UNIQUE (tenant_id,id)
);
CREATE TABLE catalog_items (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id text NOT NULL,
  content jsonb NOT NULL,
  available boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  stock integer CHECK (stock >= 0),
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id,id)
);
CREATE TABLE carts (
  tenant_id text NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  lines jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (tenant_id,session_id),
  FOREIGN KEY (tenant_id,session_id) REFERENCES sessions(tenant_id,id)
);
CREATE TABLE quotes (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  cart_version integer NOT NULL,
  tenant_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,session_id) REFERENCES carts(tenant_id,session_id)
);
CREATE TABLE orders (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  quote_id uuid NOT NULL,
  table_id integer NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','accepted','preparing','ready','served','completed','cancelled','rejected')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','partially_refunded','refunded')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,quote_id),
  FOREIGN KEY (tenant_id,quote_id) REFERENCES quotes(tenant_id,id),
  FOREIGN KEY (tenant_id,session_id) REFERENCES sessions(tenant_id,id),
  FOREIGN KEY (tenant_id,table_id) REFERENCES dining_tables(tenant_id,id)
);
CREATE TABLE payment_events (
  tenant_id text NOT NULL,
  id uuid NOT NULL,
  order_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('settlement','refund')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  actor_id uuid NOT NULL REFERENCES users(id),
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,order_id) REFERENCES orders(tenant_id,id)
);
CREATE UNIQUE INDEX one_settlement_per_order ON payment_events(tenant_id,order_id) WHERE kind='settlement';
CREATE TABLE idempotency_records (
  tenant_id text NOT NULL REFERENCES tenants(id),
  principal_id uuid NOT NULL,
  operation text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,principal_id,operation,key)
);
CREATE TABLE outbox_events (
  seq bigserial PRIMARY KEY,
  id uuid NOT NULL UNIQUE,
  tenant_id text NOT NULL REFERENCES tenants(id),
  audience_session uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_tenant_cursor ON outbox_events(tenant_id,seq);
CREATE TABLE audit_events (
  seq bigserial PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  entity_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE waiter_calls (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  table_id integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','acknowledged','resolved')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,session_id) REFERENCES sessions(tenant_id,id),
  FOREIGN KEY (tenant_id,table_id) REFERENCES dining_tables(tenant_id,id)
);
CREATE TABLE tenant_resources (
  tenant_id text NOT NULL REFERENCES tenants(id),
  kind text NOT NULL CHECK (kind IN ('knowledge','promo','profile','ai_config')),
  id text NOT NULL,
  content jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,kind,id)
);
CREATE TABLE ai_messages (
  tenant_id text NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL,
  message_id uuid NOT NULL,
  request_hash text NOT NULL,
  input text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,session_id,message_id),
  FOREIGN KEY (tenant_id,session_id) REFERENCES sessions(tenant_id,id)
);
CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['memberships','dining_tables','catalog_items','carts','quotes','orders','payment_events','idempotency_records','outbox_events','audit_events','waiter_calls','tenant_resources','ai_messages']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))', relation);
  END LOOP;
END $$;

CREATE FUNCTION prevent_audit_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append only';
END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_rewrite();
