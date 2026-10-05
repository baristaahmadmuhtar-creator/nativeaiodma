ALTER TABLE users ADD COLUMN default_tenant_id text REFERENCES tenants(id);
