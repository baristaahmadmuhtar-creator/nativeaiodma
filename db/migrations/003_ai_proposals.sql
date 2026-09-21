CREATE TABLE ai_proposals (
  tenant_id text NOT NULL,
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  message_id uuid NOT NULL,
  cart_version integer NOT NULL,
  action jsonb NOT NULL,
  result jsonb,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,session_id,message_id) REFERENCES ai_messages(tenant_id,session_id,message_id)
);
ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_proposals
  USING (tenant_id=current_setting('app.tenant_id',true))
  WITH CHECK (tenant_id=current_setting('app.tenant_id',true));
