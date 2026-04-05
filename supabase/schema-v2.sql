-- =========================================================
-- KOGRAPH PREMIUM V2
-- =========================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_enum') then
    create type public.user_role_enum as enum ('admin', 'customer');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_status_enum') then
    create type public.transaction_status_enum as enum ('pending', 'settlement', 'expire');
  end if;

  if not exists (select 1 from pg_type where typname = 'coupon_type_enum') then
    create type public.coupon_type_enum as enum ('fixed', 'percentage');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role_enum not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price bigint not null check (price >= 0),
  description text not null,
  category text not null,
  image_url text not null,
  featured boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.coupon_type_enum not null,
  value bigint not null check (value > 0),
  min_purchase bigint not null default 0 check (min_purchase >= 0),
  max_discount bigint null check (max_discount is null or max_discount >= 0),
  quota integer null check (quota is null or quota > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_coupon_window check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique check (length(order_id) <= 50),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  amount bigint not null check (amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  final_amount bigint not null check (final_amount >= 0),
  coupon_code text null,
  status public.transaction_status_enum not null default 'pending',
  snap_token text not null,
  status_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_credentials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  account_data text not null,
  is_used boolean not null default false,
  transaction_id uuid unique references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_credentials_usage_check
    check (
      (is_used = false and transaction_id is null)
      or
      (is_used = true and transaction_id is not null)
    )
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 3 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null unique,
  username text null,
  first_name text null,
  last_name text null,
  is_blocked boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  sent_count integer not null default 0 check (sent_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_featured on public.products(featured);
create index if not exists idx_products_created_at on public.products(created_at desc);

create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_active on public.coupons(is_active);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_product_id on public.transactions(product_id);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_status_token on public.transactions(status_token);

create index if not exists idx_credentials_product_unused on public.app_credentials(product_id, is_used, created_at);
create index if not exists idx_credentials_transaction_id on public.app_credentials(transaction_id);
create index if not exists idx_reviews_product_created_at on public.reviews(product_id, created_at desc);
create index if not exists idx_telegram_users_chat_id on public.telegram_users(chat_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();

drop trigger if exists set_app_credentials_updated_at on public.app_credentials;
create trigger set_app_credentials_updated_at before update on public.app_credentials for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();

drop trigger if exists set_telegram_users_updated_at on public.telegram_users;
create trigger set_telegram_users_updated_at before update on public.telegram_users for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.increment_product_stock(
  p_product_id uuid,
  p_amount integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set stock = greatest(stock + p_amount, 0),
      updated_at = now()
  where id = p_product_id;
$$;

create or replace function public.fulfill_transaction(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
  v_credential public.app_credentials%rowtype;
begin
  select *
  into v_tx
  from public.transactions
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Transaction not found for order_id: %', p_order_id;
  end if;

  if v_tx.status = 'settlement' then
    select *
    into v_credential
    from public.app_credentials
    where transaction_id = v_tx.id
    limit 1;

    return jsonb_build_object(
      'fulfilled', v_credential.id is not null,
      'transaction_id', v_tx.id,
      'credential_id', v_credential.id,
      'account_data', v_credential.account_data
    );
  end if;

  update public.transactions
  set status = 'settlement',
      updated_at = now()
  where id = v_tx.id
  returning * into v_tx;

  select *
  into v_credential
  from public.app_credentials
  where product_id = v_tx.product_id
    and is_used = false
    and transaction_id is null
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object(
      'fulfilled', false,
      'reason', 'No available credential',
      'transaction_id', v_tx.id
    );
  end if;

  update public.app_credentials
  set is_used = true,
      transaction_id = v_tx.id,
      updated_at = now()
  where id = v_credential.id
  returning * into v_credential;

  update public.products
  set stock = greatest(stock - 1, 0),
      updated_at = now()
  where id = v_tx.product_id;

  if v_tx.coupon_code is not null then
    update public.coupons
    set used_count = used_count + 1,
        updated_at = now()
    where code = v_tx.coupon_code;
  end if;

  return jsonb_build_object(
    'fulfilled', true,
    'transaction_id', v_tx.id,
    'credential_id', v_credential.id,
    'account_data', v_credential.account_data
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.transactions enable row level security;
alter table public.app_credentials enable row level security;
alter table public.reviews enable row level security;
alter table public.telegram_users enable row level security;
alter table public.telegram_broadcasts enable row level security;

drop policy if exists "profiles self select" on public.profiles;
drop policy if exists "profiles admin select all" on public.profiles;
drop policy if exists "products public read" on public.products;
drop policy if exists "products admin manage" on public.products;
drop policy if exists "coupons public read active" on public.coupons;
drop policy if exists "coupons admin manage" on public.coupons;
drop policy if exists "transactions own select" on public.transactions;
drop policy if exists "transactions admin select" on public.transactions;
drop policy if exists "credentials admin view all" on public.app_credentials;
drop policy if exists "credentials own settled view" on public.app_credentials;
drop policy if exists "credentials admin manage" on public.app_credentials;
drop policy if exists "reviews public read" on public.reviews;
drop policy if exists "reviews settled insert" on public.reviews;
drop policy if exists "reviews own update" on public.reviews;
drop policy if exists "reviews own delete" on public.reviews;
drop policy if exists "telegram users admin select" on public.telegram_users;
drop policy if exists "telegram broadcasts admin select" on public.telegram_broadcasts;
drop policy if exists "telegram broadcasts admin insert" on public.telegram_broadcasts;

create policy "profiles self select"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles admin select all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "products public read"
on public.products
for select
using (true);

create policy "products admin manage"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "coupons public read active"
on public.coupons
for select
using (is_active = true);

create policy "coupons admin manage"
on public.coupons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "transactions own select"
on public.transactions
for select
to authenticated
using (user_id = auth.uid());

create policy "transactions admin select"
on public.transactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "credentials admin view all"
on public.app_credentials
for select
to authenticated
using (public.is_admin());

create policy "credentials own settled view"
on public.app_credentials
for select
to authenticated
using (
  exists (
    select 1
    from public.transactions t
    where t.id = app_credentials.transaction_id
      and t.user_id = auth.uid()
      and t.status = 'settlement'
  )
);

create policy "credentials admin manage"
on public.app_credentials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "reviews public read"
on public.reviews
for select
using (true);

create policy "reviews settled insert"
on public.reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.transactions t
    where t.user_id = auth.uid()
      and t.product_id = reviews.product_id
      and t.status = 'settlement'
  )
);

create policy "reviews own update"
on public.reviews
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reviews own delete"
on public.reviews
for delete
to authenticated
using (user_id = auth.uid());

create policy "telegram users admin select"
on public.telegram_users
for select
to authenticated
using (public.is_admin());

create policy "telegram broadcasts admin select"
on public.telegram_broadcasts
for select
to authenticated
using (public.is_admin());

create policy "telegram broadcasts admin insert"
on public.telegram_broadcasts
for insert
to authenticated
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;

create policy "Public can view product images"
on storage.objects
for select
using (bucket_id = 'product-images');

create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admins can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admins can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

do $$
begin
  begin
    alter publication supabase_realtime add table public.transactions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.app_credentials;
  exception when duplicate_object then null;
  end;
end $$;

-- OPTIONAL:
-- update public.profiles set role = 'admin' where id = 'YOUR_USER_UUID';
