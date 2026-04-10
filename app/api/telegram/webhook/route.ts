import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildCheckBotButtons, buildTelegramStatusMessage, sendTelegramMessage, upsertTelegramUser } from "@/lib/telegram";
import { SITE } from "@/lib/constants";

function helpText() {
  return [`🤖 <b>${SITE.botUsername}</b> siap membantu.`,``,`<b>Command tersedia:</b>`,`/start - mulai bot`,`/help - bantuan command`,`/contact - info kontak support`,`/status TOKEN - cek status pesanan`,``,`Untuk auto order dan top up saldo via Telegram, lanjut ke <b>@${SITE.autoOrderBotUsername}</b>.`].join("\n");
}

function contactText() {
  return [`💎 <b>Kontak ${SITE.name}</b>`,``,`<b>WA</b>: ${SITE.support.whatsapp}`,`<b>Email</b>: ${SITE.support.email}`,`<b>Telegram</b>: @${SITE.support.telegram}`].join("\n");
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    const admin = createAdminSupabaseClient();
    const payload = await request.json();
    const message = payload.message;
    if (!message?.chat?.id || !message?.from) return NextResponse.json({ ok: true });
    const chatId = Number(message.chat.id);
    const text = String(message.text ?? "").trim();
    await upsertTelegramUser({ chat_id: chatId, username: message.from.username ?? null, first_name: message.from.first_name ?? null, last_name: message.from.last_name ?? null });
    if (text.startsWith("/start")) {
      await sendTelegramMessage(chatId, [`✨ <b>Selamat datang di ${SITE.name}</b>`,``,`Bot ini khusus untuk cek status order dengan cepat.`,`Gunakan <code>/status TOKEN</code> untuk cek pesanan.`,`Kalau ingin beli otomatis atau top up saldo via Telegram, buka @${SITE.autoOrderBotUsername}.`].join("\n"), { reply_markup: buildCheckBotButtons() });
      return NextResponse.json({ ok: true });
    }
    if (text.startsWith("/help")) { await sendTelegramMessage(chatId, helpText(), { reply_markup: buildCheckBotButtons() }); return NextResponse.json({ ok: true }); }
    if (text.startsWith("/contact")) { await sendTelegramMessage(chatId, contactText(), { reply_markup: buildCheckBotButtons() }); return NextResponse.json({ ok: true }); }
    if (text.startsWith("/status")) {
      const token = text.replace("/status", "").trim().toUpperCase();
      if (!token) { await sendTelegramMessage(chatId, `Masukkan token status. Contoh: <code>/status ABCD1234EF56</code>`, { reply_markup: buildCheckBotButtons() }); return NextResponse.json({ ok: true }); }
      const { data: tx } = await admin.from("transactions").select(`order_id, status, amount, final_amount, status_token, fulfillment_data, products ( name ), app_credentials ( account_data )`).eq("status_token", token).maybeSingle();
      if (!tx) { await sendTelegramMessage(chatId, `Token tidak ditemukan. Cek lagi token Anda dari halaman waiting payment atau orders.`, { reply_markup: buildCheckBotButtons() }); return NextResponse.json({ ok: true }); }
      const product = Array.isArray((tx as any).products) ? (tx as any).products[0] : (tx as any).products;
      const credential = Array.isArray((tx as any).app_credentials) ? (tx as any).app_credentials[0] : (tx as any).app_credentials;
      const fulfillmentData = (tx as any).fulfillment_data;
      const credentialText = credential?.account_data || (fulfillmentData?.type === "pterodactyl" ? `Panel URL: ${fulfillmentData.panel_url}\nEmail: ${fulfillmentData.panel_email}\nServer UUID: ${fulfillmentData.server_uuid}` : null);
      await sendTelegramMessage(chatId, buildTelegramStatusMessage({ orderId: (tx as any).order_id, productName: product?.name || "Produk Premium", status: (tx as any).status, amount: Number((tx as any).amount), finalAmount: Number((tx as any).final_amount ?? (tx as any).amount), credential: credentialText, supportToken: (tx as any).status_token }), { reply_markup: buildCheckBotButtons() });
      return NextResponse.json({ ok: true });
    }
    await sendTelegramMessage(chatId, helpText(), { reply_markup: buildCheckBotButtons() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
