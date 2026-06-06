-- Sequences for human-readable refs
CREATE SEQUENCE IF NOT EXISTS asset_seq START 1;
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;
CREATE SEQUENCE IF NOT EXISTS report_seq START 1;

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR(255) UNIQUE NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  mobile      VARCHAR(15) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  address     TEXT,
  tfa         VARCHAR(10) DEFAULT 'sms',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR(255) UNIQUE,
  full_name   VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  mobile      VARCHAR(15),
  role        VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'ticket_manager')),
  status      VARCHAR(20) DEFAULT 'invited',
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_ref       VARCHAR(20) UNIQUE NOT NULL DEFAULT ('ORN-' || LPAD(nextval('asset_seq')::TEXT, 4, '0')),
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  perspective     VARCHAR(20) DEFAULT 'customer' CHECK (perspective IN ('customer', 'appraiser', 'heritage')),
  metal           VARCHAR(50) NOT NULL,
  purity          VARCHAR(20) NOT NULL,
  huid            VARCHAR(50),
  gross           DECIMAL(10,3) NOT NULL,
  deduction       DECIMAL(10,3) DEFAULT 0,
  net             DECIMAL(10,3) NOT NULL,
  purchase_price  DECIMAL(12,2) DEFAULT 0,
  purchase_date   DATE,
  purchased_from  VARCHAR(255),
  invoice_ref     VARCHAR(100),
  provenance      TEXT,
  occasion        VARCHAR(100),
  gifted_by       VARCHAR(255),
  location_type   VARCHAR(60),
  location_detail JSONB DEFAULT '{}',
  last_verified   TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('verified', 'in_review', 'pending', 'rejected')),
  images          TEXT[] DEFAULT '{}',
  appraised_value DECIMAL(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_ref       VARCHAR(20) UNIQUE NOT NULL DEFAULT ('TKT-' || LPAD(nextval('ticket_seq')::TEXT, 4, '0')),
  customer_id      UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  asset_id         UUID REFERENCES assets(id) NOT NULL,
  service_type     VARCHAR(30) NOT NULL CHECK (service_type IN ('appraisal_purity', 'repair', 'refurbishment', 'gold_loan')),
  status           VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'assigned', 'in_progress', 'awaiting_info', 'quote_ready', 'awaiting_payment', 'report_ready', 'closed', 'cancelled')),
  priority         VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assigned_to      UUID REFERENCES staff(id),
  customer_notes   TEXT,
  preferred_date   DATE,
  time_slot        VARCHAR(50),
  visit_type       VARCHAR(30),
  dispatch_address TEXT,
  extra            JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_ref      VARCHAR(30) UNIQUE NOT NULL DEFAULT ('BIS-AV-' || LPAD(nextval('report_seq')::TEXT, 6, '0')),
  ticket_id       UUID REFERENCES service_tickets(id) ON DELETE CASCADE NOT NULL,
  asset_id        UUID REFERENCES assets(id) NOT NULL,
  appraised_value DECIMAL(12,2) NOT NULL,
  notes           TEXT,
  images          TEXT[] DEFAULT '{}',
  status          VARCHAR(20) DEFAULT 'under_review' CHECK (status IN ('certified', 'provisional', 'under_review')),
  appraised_by    UUID REFERENCES staff(id),
  appraised_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  type         VARCHAR(20) CHECK (type IN ('invoice', 'hallmark', 'appraisal', 'other')),
  filename     VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id),
  ticket_id    UUID REFERENCES service_tickets(id),
  asset_id     UUID REFERENCES assets(id),
  service_type VARCHAR(30),
  amount       DECIMAL(12,2) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       VARCHAR(255) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   VARCHAR(100),
  detail      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Precious metal rates cache
CREATE TABLE IF NOT EXISTS rates (
  id           SERIAL PRIMARY KEY,
  gold         DECIMAL(12,2) NOT NULL,
  silver       DECIMAL(12,2) NOT NULL,
  platinum     DECIMAL(12,2) NOT NULL,
  diamond_usd  DECIMAL(12,2) NOT NULL,
  fetched_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_customer_id ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON service_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_reports_ticket_id ON reports(ticket_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Seed initial rates (₹/gram for metals, USD/ct for diamond)
INSERT INTO rates (gold, silver, platinum, diamond_usd)
VALUES (7200.00, 95.00, 3200.00, 12.50)
ON CONFLICT DO NOTHING;
