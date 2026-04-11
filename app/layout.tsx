import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@/app/globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NotificationPermission } from "@/components/notification-permission";

export const metadata: Metadata = {
  title: "Kograph Premium V2.2",
  description: "Premium digital account marketplace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Header />
        <main className="container-shell py-6 md:py-8">{children}</main>
        <Footer />
        <Toaster richColors position="top-right" />
        <NotificationPermission />
      </body>
    </html>
  );
}
