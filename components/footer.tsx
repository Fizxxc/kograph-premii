import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, Mail, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { SITE } from "@/lib/constants";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-slate-300 transition hover:text-white">{children}</Link>;
}

export function Footer() {
  const whatsappLink = `https://wa.me/${SITE.support.whatsapp}`;
  const emailLink = `mailto:${SITE.support.email}`;
  const telegramSupportLink = `https://t.me/${SITE.support.telegram}`;
  const telegramAutoOrderLink = `https://t.me/${SITE.autoOrderBotUsername}`;

  return (
    <footer className="relative mt-24 border-t border-white/10 bg-slate-950">
      <div className="container-shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-brand-300" />Layanan yang terasa lebih rapi</div>
            <h3 className="mt-3 text-3xl font-black text-white">{SITE.name}</h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Kami membangun alur belanja yang lebih mudah dipahami: produk jelas, pembayaran jelas, notifikasi jelas, dan bantuan admin tetap mudah dijangkau saat Anda membutuhkannya.</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />Pembayaran otomatis, live chat aktif, dan jalur bantuan tetap tersedia.</div>
          </div>

          <div>
            <div className="text-lg font-semibold text-white">Navigasi cepat</div>
            <div className="mt-4 space-y-3 text-sm">
              <FooterLink href="/">Produk</FooterLink>
              <FooterLink href="/panel">Panel Bot</FooterLink>
              <FooterLink href="/services">Jasa Edit</FooterLink>
              <FooterLink href="/orders">Pesanan</FooterLink>
              <FooterLink href="/chat">Live Chat</FooterLink>
            </div>
          </div>

          <div>
            <div className="text-lg font-semibold text-white">Butuh bantuan?</div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <a href={telegramAutoOrderLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Bot className="h-4 w-4 text-brand-300" />Order lewat @{SITE.autoOrderBotUsername}</a>
              <a href={telegramSupportLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Bot className="h-4 w-4 text-sky-400" />Hubungi @{SITE.support.telegram}</a>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle className="h-4 w-4 text-emerald-400" />Chat WhatsApp</a>
              <a href={emailLink} className="flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4 text-fuchsia-300" />{SITE.support.email}</a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {SITE.name}. Dibuat untuk pengalaman belanja yang lebih tenang dan lebih mudah dipahami.</div>
          <div className="flex flex-wrap gap-4">
            <Link href={SITE.legal.privacy} className="hover:text-white">Privacy</Link>
            <Link href={SITE.legal.terms} className="hover:text-white">Terms</Link>
            <Link href={SITE.legal.faq} className="hover:text-white">FAQ</Link>
            <Link href={SITE.legal.report} className="hover:text-white">Report</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
