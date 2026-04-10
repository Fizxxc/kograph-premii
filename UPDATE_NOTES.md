# Kograph Premium – update panel bot WA + Telegram QRIS backup

Update yang masuk di paket ini:

- Produk panel sekarang bisa dipakai sebagai **1 produk dengan banyak pilihan paket**.
- Pilihan paket panel bot WA dari **1GB sampai Unlimited**, dengan harga bertingkat sampai **Rp20.000**.
- Checkout web panel sekarang menyimpan pilihan paket RAM / disk / CPU ke order.
- Fulfillment panel Pterodactyl mengikuti paket yang dipilih user, bukan satu limit statis.
- Bot auto order Telegram sekarang:
  - menampilkan pilihan paket panel,
  - mendukung bayar via QRIS dinamis atau saldo web,
  - memberi **link bayar backup** jika gambar QR tidak muncul.
- Navbar mobile dirapikan supaya tidak menutupi konten; mobile menu dibuat horizontal scroll yang lebih lega.
- File `.env.local` disalin dari env user yang diunggah.
- `.env.example` tetap placeholder agar aman untuk repo Git.

## Catatan penting

1. Jalankan migrasi database `supabase/schema-v3-wallet-panel.sql`.
2. Pastikan webhook Midtrans mengarah ke:
   - `/api/webhook`
3. Pastikan webhook Telegram mengarah ke:
   - check bot: `/api/telegram/webhook`
   - auto order bot: `/api/telegram/auto-order-webhook`
4. Jangan push `.env.local` ke GitHub.
