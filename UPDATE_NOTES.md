# Kograph Premium Update Notes

Source ini sudah diperbarui dengan fitur utama berikut:

- Menu khusus **Panel Pterodactyl** di web
- **2 bot Telegram terpisah**
  - Bot cek order
  - Bot auto order + top up saldo + admin adjustment saldo Telegram
- **Saldo/deposit per akun**
- **Top up saldo** via web dan Telegram
- **Admin security manager** untuk akses user, update data keamanan, dan adjustment saldo
- **Sold count** di katalog, detail produk, panel page, dan admin
- **Profile page**: nama, foto, nomor telepon, Telegram ID, password
- **Footer legal**: privacy policy, terms, faq, report
- **Report saldo hilang** via web
- Fulfillment **Pterodactyl panel** setelah pembayaran settle

## Langkah setelah extract

1. Install dependency
   - `npm ci`
2. Jalankan migrasi database
   - `supabase/schema-v3-wallet-panel.sql`
3. Isi file env lokal berdasarkan `.env.example`
4. Jalankan project
   - `npm run dev`

## Catatan penting

- `.env.example` sengaja memakai placeholder agar aman untuk GitHub.
- Jangan commit secret asli ke repository.
- Isi token bot, key Midtrans, dan key Pterodactyl di `.env.local` atau env deployment Anda.
