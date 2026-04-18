import Link from "next/link";

const footerLinks = [
  {
    title: "Belanja",
    links: [
      { href: "/products", label: "Semua produk" },
      { href: "/cek-pesanan", label: "Cek pesanan" },
      { href: "/profile", label: "Top up saldo" }
    ]
  },
  {
    title: "Akun",
    links: [
      { href: "/login", label: "Masuk" },
      { href: "/register", label: "Daftar" },
      { href: "/orders", label: "Riwayat order" }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200/70 bg-[rgba(15,23,42,0.98)] text-slate-200 dark:border-white/10 dark:bg-[#030712]">
      <div className="container grid gap-10 py-14 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <img src="/logo.png" alt="Kograph Premium" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white">Kograph Premium</div>
              <p className="text-sm text-slate-400">Layanan digital yang dibuat rapi dari awal sampai selesai.</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Pesan lebih tenang, cek status lebih jelas, dan lanjut tanpa ribet.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Kami fokus ke pengalaman yang simpel dan profesional. Kamu bisa pilih paket, lanjut bayar, lalu pantau status order dengan alur yang terasa jelas di desktop maupun mobile.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            <div className="font-semibold text-white">Pembayaran diverifikasi dulu, baru order diproses.</div>
            <p className="mt-2">
              Jadi alurnya lebih aman dan tidak bikin bingung. Saat status sudah valid, sistem baru melanjutkan proses sesuai pesanan.
            </p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{group.title}</h3>
              <div className="mt-4 space-y-3 text-sm">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="block text-slate-300 transition hover:text-amber-300">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Kograph Premium. Semua tampilan dirapikan agar lebih nyaman dipakai.</p>
          <p>QRIS dinamis • cek resi • desktop dan mobile lebih bersih</p>
        </div>
      </div>
    </footer>
  );
}
