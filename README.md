# Kograph Premium V2

Paket ini adalah versi 2 dari storefront e-commerce premium berbasis Next.js 14 App Router + Supabase + Midtrans + Telegram Bot.

## Fitur utama baru
- Edit & delete produk admin
- Filter + search + sort katalog
- Hero banner premium style
- Invoice PDF menggunakan `pdf-lib`
- Kupon diskon server-side
- Realtime badge status transaksi
- Seed SQL tambahan
- Telegram bot webhook:
  - `/start`
  - `/status TOKEN`
  - `/help`
  - `/contact`
- Auto send testimoni ke channel Telegram
- Admin broadcast Telegram via web panel

## Setup
1. Copy `.env.example` ke `.env.local`
2. Jalankan `supabase/schema-v2.sql`
3. Jalankan `supabase/seed-v2.sql`
4. Register 1 user lalu ubah role ke admin via SQL
5. `npm install`
6. `npm run dev`

## Set webhook Telegram
Setelah app live, buka panel admin lalu klik **Set Telegram Webhook** atau panggil endpoint:
`POST /api/admin/telegram/set-webhook`

## Command bot
- `/start`
- `/help`
- `/contact`
- `/status TOKEN_STATUS`

`TOKEN_STATUS` didapat dari halaman waiting payment / orders.
