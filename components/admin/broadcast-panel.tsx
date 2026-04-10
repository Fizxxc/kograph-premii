"use client";

import { useState } from "react";
import { Megaphone, Send, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SITE } from "@/lib/constants";

export function BroadcastPanel() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  async function sendBroadcast() {
    if (message.trim().length < 5) {
      toast.error("Tulis pesan broadcast minimal 5 karakter.");
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/admin/telegram/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal broadcast");

      toast.success(`Broadcast selesai. Berhasil ke ${json.sentCount} chat.`);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal broadcast");
    } finally {
      setSending(false);
    }
  }

  async function setWebhook() {
    setSettingWebhook(true);

    try {
      const response = await fetch("/api/admin/telegram/set-webhook", { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal set webhook");
      toast.success("Dua webhook Telegram berhasil dipasang.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal set webhook");
    } finally {
      setSettingWebhook(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="mb-4 flex items-center gap-2 text-white">
          <Megaphone className="h-5 w-5 text-brand-300" />
          <span className="font-semibold">Admin Broadcast Bot</span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis pengumuman promo, maintenance, reminder pembayaran, atau penawaran eksklusif..."
        />
        <Button className="mt-4 w-full" onClick={sendBroadcast} disabled={sending}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Mengirim..." : "Kirim Broadcast"}
        </Button>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2 text-white">
          <Webhook className="h-5 w-5 text-fuchsia-300" />
          <span className="font-semibold">Telegram Webhook</span>
        </div>
        <p className="text-sm leading-6 text-slate-300">
          Tombol ini mendaftarkan endpoint webhook Next.js untuk dua bot sekaligus: bot cek order <span className="font-semibold text-white">@{SITE.botUsername}</span> dan bot auto order <span className="font-semibold text-white">@{SITE.autoOrderBotUsername}</span>.
        </p>
        <Button className="mt-4 w-full" variant="secondary" onClick={setWebhook} disabled={settingWebhook}>
          {settingWebhook ? "Memasang webhook..." : "Set 2 Telegram Webhook"}
        </Button>
      </Card>
    </div>
  );
}
