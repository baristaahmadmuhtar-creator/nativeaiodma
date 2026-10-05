CREATE TABLE notification_reads (
  tenant_id text NOT NULL REFERENCES tenants(id),
  principal_id uuid NOT NULL,
  through_seq bigint NOT NULL DEFAULT 0 CHECK (through_seq >= 0),
  PRIMARY KEY (tenant_id, principal_id)
);
CREATE TABLE ai_policies (
  tenant_id text PRIMARY KEY REFERENCES tenants(id),
  enabled boolean NOT NULL DEFAULT true,
  daily_request_limit integer NOT NULL DEFAULT 100 CHECK (daily_request_limit BETWEEN 1 AND 10000),
  version integer NOT NULL DEFAULT 1
);
CREATE TABLE ai_usage_runs (
  tenant_id text NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL,
  message_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'running',
  usage jsonb,
  PRIMARY KEY (tenant_id, session_id, message_id)
);
CREATE INDEX ai_usage_day ON ai_usage_runs(tenant_id, created_at);
INSERT INTO ai_usage_runs(tenant_id,session_id,message_id,created_at,mode,usage)
SELECT tenant_id,session_id,message_id,created_at,COALESCE(result->>'mode','running'),result->'usage' FROM ai_messages;
DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['notification_reads','ai_policies','ai_usage_runs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', relation);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))', relation);
  END LOOP;
END $$;
