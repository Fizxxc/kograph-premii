import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mailer";
import { formatRupiah } from "@/lib/utils";

function money(value: number) {
  return formatRupiah(value || 0);
}

function buildEmailLayout(input: { title: string; intro: string; body: string; ctaUrl?: string; ctaLabel?: string }) {
  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#facc15,#f59e0b);padding:24px 28px;">
          <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#78350f;font-weight:700;">Kograph Premium</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:#111827;">${input.title}</h1>
        </div>
        <div style="padding:28px;line-height:1.7;font-size:15px;color:#334155;">
          <p style="margin:0 0 16px;">${input.intro}</p>
          ${input.body}
          ${input.ctaUrl ? `<p style="margin:24px 0 0;"><a href="${input.ctaUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:14px;font-weight:700;">${input.ctaLabel || "Lihat Detail"}</a></p>` : ""}
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Email ini dikirim hanya setelah Midtrans mengirim status <strong>settlement</strong> ke server. Jadi pesanan tidak akan diproses hanya dari screenshot atau klaim manual.</p>
        </div>
      </div>
    </div>
  `;
}

async function resolveUserIdentity(userId: string | null, guestName?: string | null, guestEmail?: string | null) {
  if (guestEmail) return { name: guestName || "Customer", email: guestEmail };
  if (!userId) return null;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;

  return {
    name: String(data.user.user_metadata?.full_name || data.user.email || "Customer"),
    email: data.user.email
  };
}

export async function sendTransactionPaidEmail(orderId: string) {
  const admin = createAdminSupabaseClient();
  const { data: tx } = await admin
    .from("transactions")
    .select(`
      id,
      order_id,
      user_id,
      guest_name,
      guest_email,
      final_amount,
      payment_method,
      public_order_code,
      email_sent_at,
      fulfillment_data,
      products ( name )
    `)
    .eq("order_id", orderId)
    .maybeSingle();

  if (!tx || (tx as any).email_sent_at) return;

  const identity = await resolveUserIdentity((tx as any).user_id || null, (tx as any).guest_name || null, (tx as any).guest_email || null);
  if (!identity?.email) return;

  const product = Array.isArray((tx as any).products) ? (tx as any).products[0] : (tx as any).products;
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const trackingUrl = appUrl && (tx as any).public_order_code
    ? `${appUrl}/cek-pesanan?resi=${encodeURIComponent(String((tx as any).public_order_code))}`
    : undefined;

  await sendMail({
    to: identity.email,
    subject: `Pembayaran berhasil • ${String(product?.name || "Pesanan Kograph")}`,
    html: buildEmailLayout({
      title: "Pembayaran berhasil diverifikasi",
      intro: `Halo ${identity.name}, pembayaran Anda sudah kami terima dan statusnya valid di Midtrans.`,
      body: `
        <table style="width:100%;border-collapse:collapse;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:12px 16px;color:#9a3412;">Order ID</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${(tx as any).order_id}</td></tr>
          <tr><td style="padding:12px 16px;color:#9a3412;">Produk</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${String(product?.name || "Produk")}</td></tr>
          <tr><td style="padding:12px 16px;color:#9a3412;">Metode</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${String((tx as any).payment_method || "qris").toUpperCase()}</td></tr>
          <tr><td style="padding:12px 16px;color:#9a3412;">Total</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${money(Number((tx as any).final_amount || 0))}</td></tr>
          <tr><td style="padding:12px 16px;color:#9a3412;">Resi cek pesanan</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${String((tx as any).public_order_code || "-")}</td></tr>
        </table>
      `,
      ctaUrl: trackingUrl,
      ctaLabel: "Cek status pesanan"
    })
  });

  await admin.from("transactions").update({ email_sent_at: new Date().toISOString() }).eq("id", (tx as any).id);
}

export async function sendTopupPaidEmail(orderId: string) {
  const admin = createAdminSupabaseClient();
  const { data: topup } = await admin
    .from("wallet_topups")
    .select("id, order_id, user_id, amount, public_order_code, email_sent_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!topup || (topup as any).email_sent_at) return;
  const identity = await resolveUserIdentity((topup as any).user_id || null);
  if (!identity?.email) return;

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const trackingUrl = appUrl && (topup as any).public_order_code
    ? `${appUrl}/cek-pesanan?resi=${encodeURIComponent(String((topup as any).public_order_code))}`
    : undefined;

  await sendMail({
    to: identity.email,
    subject: "Top up saldo berhasil",
    html: buildEmailLayout({
      title: "Saldo berhasil ditambahkan",
      intro: `Halo ${identity.name}, top up saldo Anda sudah kami verifikasi dan aman masuk ke akun.`,
      body: `
        <table style="width:100%;border-collapse:collapse;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:12px 16px;color:#065f46;">Order ID</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${(topup as any).order_id}</td></tr>
          <tr><td style="padding:12px 16px;color:#065f46;">Nominal</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${money(Number((topup as any).amount || 0))}</td></tr>
          <tr><td style="padding:12px 16px;color:#065f46;">Resi cek pesanan</td><td style="padding:12px 16px;font-weight:700;color:#111827;">${String((topup as any).public_order_code || "-")}</td></tr>
        </table>
      `,
      ctaUrl: trackingUrl,
      ctaLabel: "Cek transaksi"
    })
  });

  await admin.from("wallet_topups").update({ email_sent_at: new Date().toISOString() }).eq("id", (topup as any).id);
}
