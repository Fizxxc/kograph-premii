import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/constants";

const TELEGRAM_API = "https://api.telegram.org";

type SendMessageOptions = {
  parse_mode?: "HTML" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  reply_markup?: Record<string, unknown>;
};

export async function telegramRequest(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diisi");

  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const json = await response.json();
  if (!response.ok || !json.ok) {
    throw new Error(json.description || `Telegram ${method} gagal`);
  }

  return json.result;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {}
) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    reply_markup: options.reply_markup
  });
}

export async function setTelegramWebhook(url: string) {
  return telegramRequest("setWebhook", {
    url,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET
  });
}

export function buildTelegramStatusMessage(input: {
  orderId: string;
  productName: string;
  status: string;
  amount: number;
  finalAmount: number;
  credential: string | null;
  supportToken: string;
}) {
  const statusEmoji =
    input.status === "settlement" ? "✅" : input.status === "expire" ? "⛔" : "⏳";

  const credentialBlock = input.credential
    ? `\n<blockquote><b>Credential</b>\n${escapeHtml(input.credential)}</blockquote>`
    : "\n<blockquote>Credential belum tersedia. Tunggu settlement atau hubungi support.</blockquote>";

  return [
    `${statusEmoji} <b>Status Pesanan Kograph Premium</b>`,
    ``,
    `<b>Order ID</b>: <code>${escapeHtml(input.orderId)}</code>`,
    `<b>Produk</b>: ${escapeHtml(input.productName)}`,
    `<b>Status</b>: ${escapeHtml(input.status)}`,
    `<b>Total Bayar</b>: Rp ${Intl.NumberFormat("id-ID").format(input.finalAmount)}`,
    `<b>Token Cek</b>: <code>${escapeHtml(input.supportToken)}</code>`,
    credentialBlock,
    ``,
    `Butuh bantuan? <b>WA</b> ${SITE.support.whatsapp} • <b>Email</b> ${SITE.support.email} • <b>Telegram</b> ${SITE.support.telegram}`
  ].join("\n");
}

export function buildTelegramTestimonialMessage(input: {
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
}) {
  const stars = "⭐".repeat(input.rating);
  return [
    `🌟 <b>Testimoni Baru Kograph Premium</b>`,
    ``,
    `<b>Produk</b>: ${escapeHtml(input.productName)}`,
    `<b>Pembeli</b>: ${escapeHtml(input.customerName)}`,
    `<b>Rating</b>: ${stars}`,
    ``,
    `<blockquote>${escapeHtml(input.comment)}</blockquote>`,
    ``,
    `Belanja premium yang cepat, aman, dan realtime di <b>${SITE.name}</b>.`
  ].join("\n");
}

export function buildTelegramBroadcastMessage(message: string) {
  return [
    `📣 <b>Broadcast Resmi ${SITE.name}</b>`,
    ``,
    escapeHtml(message),
    ``,
    `Support: WA ${SITE.support.whatsapp} • Email ${SITE.support.email} • Telegram ${SITE.support.telegram}`
  ].join("\n");
}

export async function upsertTelegramUser(input: {
  chat_id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const admin = createAdminSupabaseClient();

  await admin.from("telegram_users").upsert({
    chat_id: input.chat_id,
    username: input.username ?? null,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    is_blocked: false,
    last_seen_at: new Date().toISOString()
  });
}

export function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
