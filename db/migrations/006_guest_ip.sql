ALTER TABLE events ADD COLUMN IF NOT EXISTS client_ip TEXT;
CREATE INDEX IF NOT EXISTS idx_events_client_ip ON events(client_ip) WHERE client_ip IS NOT NULL;
