CREATE TABLE staff_invitations (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','cashier','kitchen','waiter')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
  accepted_at timestamptz,
  PRIMARY KEY(tenant_id,id)
);
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_invitations USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
