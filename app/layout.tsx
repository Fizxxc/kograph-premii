import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AlertBar from "@/components/site/alert-bar";
import PromoPopup from "@/components/site/promo-popup";
import NotificationPermission from "@/components/notification-permission";
import ThemeScript from "@/components/theme-script";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kograph Premium",
  description: "Belanja digital dengan QRIS dinamis, alur rapi, dan dashboard admin yang lebih nyaman."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = createAdminSupabaseClient();
  const { data: popup } = await admin
    .from("site_popups")
    .select("id, title, message, image_url, button_label, button_href")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <Header />
        <AlertBar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <NotificationPermission />
        <PromoPopup popup={popup as any} />
      </body>
    </html>
  );
}
