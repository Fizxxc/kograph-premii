import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/constants";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 4L3.8 10.7c-1.1.4-1 2 .1 2.3l4.3 1.3 1.6 4.9c.3 1 1.6 1.2 2.2.4l2.4-3 4.3 3.2c.8.6 2 .2 2.2-.8L23 5.6C23.2 4.5 22 3.6 21 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.1 14.2 19.8 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M14.2 4c.5 2 1.9 3.8 4.1 4.5v3a7.6 7.6 0 0 1-4.1-1.3v5.6a5.6 5.6 0 1 1-5.6-5.6c.4 0 .8 0 1.2.1v3.1a2.5 2.5 0 1 0 1.3 2.2V4h3.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  icon,
  accentClass
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 ${accentClass}`}
      >
        {icon}
      </div>

      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400 transition group-hover:text-slate-300">
          Kunjungi akun resmi
        </div>
      </div>
    </a>
  );
}

export function Footer() {
  const whatsappLink = `https://wa.me/${SITE.support.whatsapp}`;
  const emailLink = `mailto:${SITE.support.email}`;
  const telegramSupportLink = `https://t.me/${SITE.support.telegram}`;

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-hero-premium">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

      <div className="container-shell relative py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="max-w-md">
            <h3 className="text-[32px] font-bold tracking-tight text-white">
              {SITE.name}
            </h3>

            <p className="mt-6 text-[15px] leading-8 text-slate-300">
              Kograph Premium adalah marketplace digital premium untuk kebutuhan akun aplikasi,
              tools produktivitas, hiburan, dan layanan digital lainnya dengan proses pembelian
              cepat, pembayaran aman, serta pengiriman credential yang realtime.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Transaksi aman, pengiriman cepat, dan support responsif.
            </div>
          </div>

          <div>
            <h4 className="text-2xl font-bold text-white">Jelajahi</h4>
            <div className="mt-6 space-y-4 text-[15px]">
              <Link href="/" className="block text-slate-300 transition hover:text-white">
                Home
              </Link>
              <Link href="/orders" className="block text-slate-300 transition hover:text-white">
                History
              </Link>
              <Link href="/login" className="block text-slate-300 transition hover:text-white">
                Login
              </Link>
              <Link href="/register" className="block text-slate-300 transition hover:text-white">
                Register
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-2xl font-bold text-white">Bantuan</h4>
            <div className="mt-6 space-y-4 text-[15px]">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-slate-300 transition hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Hubungi Kami (Chat)
              </a>

              <a
                href={emailLink}
                className="flex items-center gap-3 text-slate-300 transition hover:text-white"
              >
                <Mail className="h-4 w-4 text-sky-400" />
                {SITE.support.email}
              </a>

              <a
                href={telegramSupportLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-slate-300 transition hover:text-white"
              >
                <TelegramIcon className="h-4 w-4 text-sky-400" />
                @{SITE.support.telegram}
              </a>

              <div className="pt-2 text-sm text-slate-500">
                Bot cek status:{" "}
                <span className="font-medium text-slate-300">@{SITE.botUsername}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-2xl font-bold text-white">Ikuti Kami</h4>
            <div className="mt-6 space-y-4">
              <SocialLink
                href={SITE.socials.tiktok}
                label="TikTok"
                accentClass="bg-white/5 text-white"
                icon={<TikTokIcon className="h-5 w-5" />}
              />

              <SocialLink
                href={SITE.socials.instagram}
                label="Instagram"
                accentClass="bg-pink-500/10 text-pink-300"
                icon={<InstagramIcon className="h-5 w-5" />}
              />

              <SocialLink
                href={SITE.socials.telegram}
                label="Telegram"
                accentClass="bg-sky-500/10 text-sky-300"
                icon={<TelegramIcon className="h-5 w-5" />}
              />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 md:justify-end">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-300"
              >
                WhatsApp
              </a>
              <a href={emailLink} className="transition hover:text-slate-300">
                Email
              </a>
              <a
                href={telegramSupportLink}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-300"
              >
                Telegram Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}