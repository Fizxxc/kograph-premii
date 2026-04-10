import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/constants";

const TELEGRAM_API = "https://api.telegram.org";

type SendMessageOptions = {
  parse_mode?: "HTML" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  reply_markup?: Record<string, unknown>;
  bot?: "check" | "auto";
};

function getToken(bot: "check" | "auto" = "check") {
  const token =
    bot === "auto"
      ? process.env.TELEGRAM_AUTO_ORDER_BOT_TOKEN?.trim()
      : process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token)
    throw new Error(
      bot === "auto" ? "TELEGRAM_AUTO_ORDER_BOT_TOKEN belum diisi" : "TELEGRAM_BOT_TOKEN belum diisi"
    );
  return token;
}

export async function telegramRequest(
  method: string,
  body: Record<string, unknown>,
  bot: "check" | "auto" = "check"
) {
  const response = await fetch(`${TELEGRAM_API}/bot${getToken(bot)}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !(json as { ok?: boolean }).ok)
    throw new Error((json as { description?: string }).description || `Telegram ${method} gagal`);
  return (json as { result: unknown }).result;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {}
) {
  return telegramRequest(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || "HTML",
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      reply_markup: options.reply_markup
    },
    options.bot || "check"
  );
}

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  options: SendMessageOptions = {}
) {
  return telegramRequest(
    "sendPhoto",
    {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: options.parse_mode || "HTML",
      reply_markup: options.reply_markup
    },
    options.bot || "check"
  );
}

export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  options: SendMessageOptions = {}
) {
  return telegramRequest(
    "editMessageText",
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options.parse_mode || "HTML",
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      reply_markup: options.reply_markup
    },
    options.bot || "check"
  );
}

export async function deleteTelegramMessage(
  chatId: string | number,
  messageId: number,
  bot: "check" | "auto" = "check"
) {
  return telegramRequest(
    "deleteMessage",
    {
      chat_id: chatId,
      message_id: messageId
    },
    bot
  );
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text: string,
  bot: "check" | "auto" = "check"
) {
  return telegramRequest(
    "answerCallbackQuery",
    { callback_query_id: callbackQueryId, text, show_alert: false },
    bot
  );
}

export async function setTelegramWebhook(url: string, bot: "check" | "auto" = "check") {
  return telegramRequest(
    "setWebhook",
    {
      url,
      secret_token:
        bot === "auto"
          ? process.env.TELEGRAM_AUTO_ORDER_WEBHOOK_SECRET
          : process.env.TELEGRAM_WEBHOOK_SECRET
    },
    bot
  );
}

export function buildCheckBotButtons() {
  return {
    inline_keyboard: [
      [{ text: "🔎 Cek order", url: `https://t.me/${SITE.botUsername}` }],
      [{ text: "🤖 Auto order", url: `https://t.me/${SITE.autoOrderBotUsername}` }],
      [{ text: "🛟 Hubungi admin", url: `https://t.me/${SITE.support.telegram}` }]
    ]
  };
}

export function buildAutoOrderButtons() {
  return {
    inline_keyboard: [
      [{ text: "🛒 Beli produk", callback_data: "catalog:list" }],
      [{ text: "💳 Top up saldo", callback_data: "topup:menu" }],
      [{ text: "👛 Cek saldo saya", callback_data: "wallet:info" }],
      [{ text: "🔎 Cek order", url: `https://t.me/${SITE.botUsername}` }],
      [{ text: "🛟 Hubungi admin", url: `https://t.me/${SITE.support.telegram}` }]
    ]
  };
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
  const statusEmoji = input.status === "settlement" ? "✅" : input.status === "expire" ? "⛔" : "⏳";
  const credentialBlock = input.credential
    ? `\n<blockquote><b>Detail Pengiriman</b>\n${escapeHtml(input.credential)}</blockquote>`
    : "\n<blockquote>Detail pengiriman belum tersedia. Tunggu settlement atau hubungi support.</blockquote>";
  return [
    `${statusEmoji} <b>Status Pesanan Kograph Premium</b>`,
    "",
    `<b>Order ID</b>: <code>${escapeHtml(input.orderId)}</code>`,
    `<b>Produk</b>: ${escapeHtml(input.productName)}`,
    `<b>Status</b>: ${escapeHtml(input.status)}`,
    `<b>Total Bayar</b>: Rp ${Intl.NumberFormat("id-ID").format(input.finalAmount)}`,
    `<b>Token Cek</b>: <code>${escapeHtml(input.supportToken)}</code>`,
    credentialBlock,
    "",
    `Butuh bantuan? <b>Telegram Support</b> @${SITE.support.telegram}`
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
    "",
    `<b>Produk</b>: ${escapeHtml(input.productName)}`,
    `<b>Pembeli</b>: ${escapeHtml(input.customerName)}`,
    `<b>Rating</b>: ${stars}`,
    "",
    `<blockquote>${escapeHtml(input.comment)}</blockquote>`,
    "",
    `Belanja premium yang cepat, aman, dan realtime di <b>${SITE.name}</b>.`
  ].join("\n");
}

export function buildTelegramBroadcastMessage(message: string) {
  return [`📣 <b>Broadcast Resmi ${SITE.name}</b>`, "", escapeHtml(message), "", `Support: @${SITE.support.telegram}`].join("\n");
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
  return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
