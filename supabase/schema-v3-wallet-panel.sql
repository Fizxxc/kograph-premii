-- Kograph Premium V3 wallet, profile, report, and pterodactyl support
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists phone_number text,
  add column if not exists telegram_id text,
  add column if not exists balance bigint not null default 0 check (balance >= 0),
  add column if not exists security_notes text;

alter table public.products
  add column if not exists service_type text not null default 'credential',
  add column if not exists sold_count integer not null default 0 check (sold_count >= 0),
  add column if not exists pterodactyl_config jsonb,
  add column if not exists is_active boolean not null default true;

alter table public.transactions
  add column if not exists payment_method text not null default 'midtrans',
  add column if not exists telegram_id text,
  add column if not exists fulfillment_data jsonb;

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  status public.transaction_status_enum not null default 'pending',
  snap_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_mutations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  type text not null,
  description text not null,
  admin_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.balance_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallet_topups_user_id on public.wallet_topups(user_id);
create index if not exists idx_wallet_topups_order_id on public.wallet_topups(order_id);
create index if not exists idx_wallet_mutations_user_id on public.wallet_mutations(user_id, created_at desc);
create index if not exists idx_balance_reports_user_id on public.balance_reports(user_id, created_at desc);
create index if not exists idx_products_service_type on public.products(service_type);

create trigger set_wallet_topups_updated_at before update on public.wallet_topups for each row execute function public.set_updated_at();
create trigger set_balance_reports_updated_at before update on public.balance_reports for each row execute function public.set_updated_at();

alter table public.wallet_topups enable row level security;
alter table public.wallet_mutations enable row level security;
alter table public.balance_reports enable row level security;

drop policy if exists "wallet_topups own select" on public.wallet_topups;
create policy "wallet_topups own select" on public.wallet_topups for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "wallet_topups admin manage" on public.wallet_topups;
create policy "wallet_topups admin manage" on public.wallet_topups for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wallet_mutations own select" on public.wallet_mutations;
create policy "wallet_mutations own select" on public.wallet_mutations for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "wallet_mutations admin insert" on public.wallet_mutations;
create policy "wallet_mutations admin insert" on public.wallet_mutations for insert to authenticated with check (public.is_admin());

drop policy if exists "balance_reports own read" on public.balance_reports;
create policy "balance_reports own read" on public.balance_reports for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "balance_reports own insert" on public.balance_reports;
create policy "balance_reports own insert" on public.balance_reports for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "balance_reports admin update" on public.balance_reports;
create policy "balance_reports admin update" on public.balance_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view profile images" on storage.objects;
create policy "Public can view profile images" on storage.objects for select using (bucket_id = 'profile-images');

drop policy if exists "Users can upload own profile images" on storage.objects;
create policy "Users can upload own profile images" on storage.objects for insert to authenticated with check (bucket_id = 'profile-images');

drop policy if exists "Users can update own profile images" on storage.objects;
create policy "Users can update own profile images" on storage.objects for update to authenticated using (bucket_id = 'profile-images') with check (bucket_id = 'profile-images');

create or replace function public.apply_wallet_adjustment(
  p_user_id uuid,
  p_amount bigint,
  p_type text,
  p_description text,
  p_admin_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set balance = greatest(balance + p_amount, 0), updated_at = now()
  where id = p_user_id;

  insert into public.wallet_mutations(user_id, amount, type, description, admin_user_id)
  values (p_user_id, p_amount, p_type, p_description, p_admin_user_id);
end;
$$;
