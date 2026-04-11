-- Kograph Premium V4: Telegram guest registration, live chat, push notifications
create extension if not exists pgcrypto;

alter table public.products
  add column if not exists live_chat_enabled boolean not null default false,
  add column if not exists support_admin_ids text[] default '{}',
  add column if not exists external_link text;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_admin_id uuid null references public.profiles(id) on delete set null,
  telegram_chat_id text,
  status text not null default 'open',
  title text not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_chat_rooms(id) on delete cascade,
  sender_user_id uuid null references public.profiles(id) on delete set null,
  sender_role text not null,
  message text,
  image_url text,
  link_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.live_chat_room_admins (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_chat_rooms(id) on delete cascade,
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(room_id, admin_user_id)
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_live_chat_rooms_customer on public.live_chat_rooms(customer_user_id, last_message_at desc);
create index if not exists idx_live_chat_rooms_product on public.live_chat_rooms(product_id, last_message_at desc);
create index if not exists idx_live_chat_messages_room on public.live_chat_messages(room_id, created_at asc);
create index if not exists idx_live_chat_room_admins_room on public.live_chat_room_admins(room_id);
create index if not exists idx_live_chat_room_admins_admin on public.live_chat_room_admins(admin_user_id);

create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();
create trigger set_live_chat_rooms_updated_at before update on public.live_chat_rooms for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.live_chat_rooms enable row level security;
alter table public.live_chat_messages enable row level security;
alter table public.live_chat_room_admins enable row level security;

create policy "push own read" on public.push_subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "push own delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "room own/admin read" on public.live_chat_rooms for select to authenticated using (
  customer_user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.live_chat_room_admins a where a.room_id = id and a.admin_user_id = auth.uid()
  )
);
create policy "room own create" on public.live_chat_rooms for insert to authenticated with check (customer_user_id = auth.uid() or public.is_admin());
create policy "room own/admin update" on public.live_chat_rooms for update to authenticated using (
  customer_user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.live_chat_room_admins a where a.room_id = id and a.admin_user_id = auth.uid()
  )
) with check (
  customer_user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.live_chat_room_admins a where a.room_id = id and a.admin_user_id = auth.uid()
  )
);

create policy "message related read" on public.live_chat_messages for select to authenticated using (
  exists (
    select 1 from public.live_chat_rooms r
    where r.id = room_id
      and (
        r.customer_user_id = auth.uid() or public.is_admin() or exists (
          select 1 from public.live_chat_room_admins a where a.room_id = r.id and a.admin_user_id = auth.uid()
        )
      )
  )
);
create policy "message related insert" on public.live_chat_messages for insert to authenticated with check (
  exists (
    select 1 from public.live_chat_rooms r
    where r.id = room_id
      and (
        r.customer_user_id = auth.uid() or public.is_admin() or exists (
          select 1 from public.live_chat_room_admins a where a.room_id = r.id and a.admin_user_id = auth.uid()
        )
      )
  )
);

create policy "room admins read" on public.live_chat_room_admins for select to authenticated using (public.is_admin() or admin_user_id = auth.uid());
create policy "room admins manage" on public.live_chat_room_admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Public can view chat images" on storage.objects for select using (bucket_id = 'chat-images');
create policy "Authenticated can upload chat images" on storage.objects for insert to authenticated with check (bucket_id = 'chat-images');
create policy "Authenticated can update chat images" on storage.objects for update to authenticated using (bucket_id = 'chat-images') with check (bucket_id = 'chat-images');
