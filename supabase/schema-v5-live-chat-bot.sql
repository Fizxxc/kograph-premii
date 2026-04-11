-- V5 tambahan live chat + jasa berbasis room
alter table public.products
  add column if not exists live_chat_enabled boolean not null default false,
  add column if not exists support_admin_ids text[] default '{}',
  add column if not exists external_link text;

alter table public.live_chat_rooms
  add column if not exists telegram_chat_id text,
  add column if not exists assigned_admin_id uuid null references public.profiles(id) on delete set null;

alter table public.live_chat_messages
  add column if not exists link_url text,
  add column if not exists image_url text;
