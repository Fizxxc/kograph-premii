-- =========================================================
-- KOGRAPH PREMIUM V2 SEED
-- Jalankan setelah schema-v2.sql
-- =========================================================

insert into public.products (name, price, description, category, image_url, featured, stock)
values
  (
    'Netflix Premium 1 Bulan',
    55000,
    'Akun Netflix premium siap pakai untuk kebutuhan streaming personal dengan proses delivery credential otomatis setelah payment settlement.',
    'Streaming',
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1200&q=80',
    true,
    0
  ),
  (
    'Spotify Premium Family Invite',
    28000,
    'Akses Spotify premium dengan proses invite cepat dan akun yang sudah lolos quality check internal.',
    'Music',
    'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=1200&q=80',
    false,
    0
  ),
  (
    'Canva Pro Private Access',
    35000,
    'Untuk desain harian, social media, dan kebutuhan branding dengan akun private access berkualitas.',
    'Design',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80',
    true,
    0
  ),
  (
    'ChatGPT Plus Shared Access',
    75000,
    'Akses premium AI tools untuk productivity, research, dan pembuatan konten secara praktis.',
    'AI Tools',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    true,
    0
  )
on conflict do nothing;

insert into public.coupons (code, type, value, min_purchase, max_discount, quota, is_active)
values
  ('WELCOME10', 'percentage', 10, 20000, 15000, 200, true),
  ('HEMAT25K', 'fixed', 25000, 100000, null, 100, true),
  ('STREAM15', 'percentage', 15, 30000, 20000, 80, true)
on conflict (code) do nothing;

with p as (
  select id, name from public.products
)
insert into public.app_credentials (product_id, account_data, is_used)
select p.id, x.account_data, false
from p
join (
  values
    ('Netflix Premium 1 Bulan', 'netflixpremium01@mail.com:PassNetflix#01'),
    ('Netflix Premium 1 Bulan', 'netflixpremium02@mail.com:PassNetflix#02'),
    ('Netflix Premium 1 Bulan', 'netflixpremium03@mail.com:PassNetflix#03'),
    ('Spotify Premium Family Invite', 'spotifyfamily01@mail.com:InviteCode#01'),
    ('Spotify Premium Family Invite', 'spotifyfamily02@mail.com:InviteCode#02'),
    ('Canva Pro Private Access', 'canvapro01@mail.com:CanvaPrivate#01'),
    ('Canva Pro Private Access', 'canvapro02@mail.com:CanvaPrivate#02'),
    ('ChatGPT Plus Shared Access', 'chatgptshared01@mail.com:SharedAI#01'),
    ('ChatGPT Plus Shared Access', 'chatgptshared02@mail.com:SharedAI#02')
) as x(product_name, account_data)
on p.name = x.product_name
on conflict do nothing;

update public.products p
set stock = (
  select count(*)::int
  from public.app_credentials c
  where c.product_id = p.id and c.is_used = false
);
