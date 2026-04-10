# Update Notes

Perubahan batch ini:

- perbaikan checkout panel agar startup, docker image, dan environment egg bisa diambil otomatis dari konfigurasi egg Pterodactyl
- panel web cukup isi username, lalu login panel digenerate otomatis setelah payment sukses
- panel ditampilkan sebagai **Auto Ready 24/7**
- tambahan halaman panel dengan list RAM populer dari 1GB sampai unlimited
- navbar mobile dirapikan jadi grid supaya tidak mepet
- bot Telegram dibagi dua:
  - `/api/telegram/webhook` untuk cek order
  - `/api/telegram/auto-order-webhook` untuk auto order, topup, dan admin saldo
- bot auto order memakai QRIS dinamis untuk pembayaran Telegram
- order code Telegram dan topup kini memakai prefix `KGP-`
- sinkronisasi status Midtrans ditambah agar status pending bisa dicocokkan ulang dari API status Midtrans
- callback button Telegram sekarang mengganti / menghapus pesan sebelumnya agar chat lebih rapi
- saldo web tetap bisa dipakai untuk pembelian dari web maupun Telegram
- `.env.local` dari user sudah dibawa masuk, lalu hanya ditambah variabel baru yang dibutuhkan

Checklist deploy:

1. Jalankan SQL migration yang relevan di folder `supabase/`
2. Pastikan Notification URL Midtrans mengarah ke `/api/webhook`
3. Set webhook Telegram check bot ke `/api/telegram/webhook`
4. Set webhook Telegram auto order bot ke `/api/telegram/auto-order-webhook`
5. Pastikan env Pterodactyl, Midtrans, dan Supabase terisi di server deploy
