-- Migración 002: Stripe Integration
-- Ejecutar: psql $DB_CONN_STR -f db/migrations/002_stripe.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id    VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer
    ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
