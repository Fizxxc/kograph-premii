# Update Notes - Final Detail Refresh

Perubahan tambahan di batch ini:

- username bot auto order diubah menjadi `@kographautoBot`
- navbar mobile dirapikan agar tidak terlalu mepet dan memakai scroll pills
- web checkout panel sekarang meminta **username panel saja**
- sistem generate otomatis **username login, email login, dan password login panel**
- produk panel ditampilkan sebagai **Auto Ready** dan tidak lagi bergantung ke stok akun premium biasa
- checkout panel bisa dibayar dengan **saldo web** atau Midtrans
- bot auto order sekarang punya pilihan bayar via **Midtrans** atau **saldo web**
- webhook Telegram tetap dua endpoint:
  - `/api/telegram/webhook` untuk bot cek order
  - `/api/telegram/auto-order-webhook` untuk bot auto order
- detail login panel tampil lebih lengkap di waiting payment dan orders
- fallback `docker_image` ditambahkan agar error `The docker image field is required.` lebih aman ditangani
- `.env.example` ditambah `PTERODACTYL_LOGIN_DOMAIN` dan `PTERODACTYL_DEFAULT_DOCKER_IMAGE`

Catatan:
- Untuk provisioning panel yang benar-benar jalan, pastikan config produk panel mengandung resource Pterodactyl yang valid.
- Jika egg panel Anda butuh environment tertentu, isi di `pterodactyl_config.environment`.
