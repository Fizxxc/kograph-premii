-- Incremental upgrade for dynamic QRIS, guest checkout, product variants, popup promo, and site alerts.
-- Safe to run on top of the existing schema.

create extension if not exists pgcrypto;

DO $$
BEGIN
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'capture';
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'settlement';
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'cancel';
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'deny';
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'failure';
  ALTER TYPE public.transaction_status_enum ADD VALUE IF NOT EXISTS 'expire';
END $$;

alter table if exists public.transactions
  alter column user_id drop not null;

alter table if exists public.transactions
  add column if not exists buyer_name text null,
  add column if not exists buyer_email text null,
  add column if not exists buyer_phone text null,
  add column if not exists payment_method text not null default 'qris',
  add column if not exists payment_type text null,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists gateway_payload jsonb not null default '{}'::jsonb,
  add column if not exists notification_payload jsonb not null default '{}'::jsonb,
  add column if not exists public_order_code text null,
  add column if not exists paid_at timestamptz null,
  add column if not exists email_sent_at timestamptz null,
  add column if not exists midtrans_reference text null,
  add column if not exists note text null;

create unique index if not exists transactions_public_order_code_key on public.transactions(public_order_code) where public_order_code is not null;
create index if not exists transactions_buyer_email_idx on public.transactions(buyer_email);
create index if not exists transactions_status_idx on public.transactions(status);
create index if not exists transactions_payment_method_idx on public.transactions(payment_method);

alter table if exists public.wallet_topups
  add column if not exists gateway_payload jsonb not null default '{}'::jsonb,
  add column if not exists notification_payload jsonb not null default '{}'::jsonb,
  add column if not exists public_order_code text null,
  add column if not exists payment_method text not null default 'qris',
  add column if not exists payment_type text null,
  add column if not exists email_sent_at timestamptz null,
  add column if not exists paid_at timestamptz null,
  add column if not exists midtrans_reference text null;

create unique index if not exists wallet_topups_public_order_code_key on public.wallet_topups(public_order_code) where public_order_code is not null;
create index if not exists wallet_topups_status_idx on public.wallet_topups(status);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price bigint not null check (price >= 0),
  compare_at_price bigint null check (compare_at_price is null or compare_at_price >= 0),
  duration_label text null,
  short_description text null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants(product_id, sort_order);

create table if not exists public.site_popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  image_url text null,
  button_label text null,
  button_href text null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_popups_active_idx on public.site_popups(is_active, updated_at desc);

create table if not exists public.site_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  tone text not null default 'yellow' check (tone in ('red','yellow','green')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_alerts_active_idx on public.site_alerts(is_active, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_product_variants_updated_at') THEN
    CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_popups_updated_at') THEN
    CREATE TRIGGER set_site_popups_updated_at BEFORE UPDATE ON public.site_popups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_alerts_updated_at') THEN
    CREATE TRIGGER set_site_alerts_updated_at BEFORE UPDATE ON public.site_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

alter table public.product_variants enable row level security;
alter table public.site_popups enable row level security;
alter table public.site_alerts enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants' AND policyname = 'product_variants_public_read'
  ) THEN
    CREATE POLICY product_variants_public_read ON public.product_variants FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_popups' AND policyname = 'site_popups_public_read'
  ) THEN
    CREATE POLICY site_popups_public_read ON public.site_popups FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_alerts' AND policyname = 'site_alerts_public_read'
  ) THEN
    CREATE POLICY site_alerts_public_read ON public.site_alerts FOR SELECT USING (is_active = true);
  END IF;
END $$;
