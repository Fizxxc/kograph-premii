import { notFound } from "next/navigation";
import { Bot, ServerCog, ShieldCheck, Star } from "lucide-react";
import { CheckoutCard } from "@/components/checkout-card";
import { LiveChatLauncher } from "@/components/live-chat/live-chat-launcher";
import { ReviewForm } from "@/components/reviews/review-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import { PANEL_RAM_PRESETS, getPanelPresetPriceRange } from "@/lib/panel-packages";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, price, description, category, image_url, stock, featured, sold_count, service_type, is_active"
    )
    .eq("id", params.id)
    .single();

  if (!product || product.is_active === false) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles(full_name)")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  let canReview = false;
  let alreadyReviewed = false;
  let userBalance = 0;

  if (user) {
    const [{ data: settledTransaction }, { data: myReview }, { data: profile }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .eq("status", "settlement")
        .limit(1)
        .maybeSingle(),
      supabase.from("reviews").select("id").eq("product_id", product.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("balance").eq("id", user.id).single()
    ]);

    canReview = Boolean(settledTransaction);
    alreadyReviewed = Boolean(myReview);
    userBalance = Number((profile as { balance?: number | null } | null)?.balance || 0);
  }

  const ratingAverage =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)
      : null;

  const isPanel = (product.service_type || "credential") === "pterodactyl";
  const stockBadgeText = isPanel ? "Auto Ready 24/7" : product.stock > 0 ? `Stock ${product.stock}` : "Sold Out";
  const panelRange = getPanelPresetPriceRange();

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <img src={product.image_url} alt={product.name} className="aspect-[16/10] w-full object-cover" />

          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{product.category}</Badge>
              <Badge className={isPanel || product.stock > 0 ? "text-emerald-300" : "text-rose-300"}>{stockBadgeText}</Badge>
              <Badge className="text-brand-200">{isPanel ? "Panel Bot WA" : "Akun / Credential"}</Badge>
              <Badge className="text-slate-300">Terjual {product.sold_count || 0}</Badge>
              {product.featured && <Badge className="text-fuchsia-300">Featured</Badge>}
              {ratingAverage && (
                <Badge className="text-yellow-300">
                  <Star className="mr-1 h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {ratingAverage} / 5
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-4xl font-black text-white">{product.name}</h1>
              <div className="mt-3 text-2xl font-bold text-brand-300">
                {isPanel ? `${formatRupiah(panelRange.min)} - ${formatRupiah(panelRange.max)}` : formatRupiah(product.price)}
              </div>
              {isPanel && <div className="mt-2 text-sm text-slate-400">Khusus panel bot WhatsApp dengan pilihan paket 1GB sampai Unlimited.</div>}
            </div>

            <p className="leading-7 text-slate-300">{product.description}</p>

            {isPanel && (
              <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 p-5">
                <div className="text-lg font-semibold text-white">Pilihan paket panel bot WA</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {PANEL_RAM_PRESETS.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-white">{item.label}</div>
                        <div className="font-bold text-brand-200">{formatRupiah(item.price)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{item.tagline}</div>
                      <div className="mt-2 text-xs leading-6 text-slate-300">
                        RAM {item.memoryMb === 0 ? "Unlimited" : `${Math.round(item.memoryMb / 1024)}GB`}<br />
                        Disk {item.diskMb === 0 ? "Unlimited" : `${Math.max(1, Math.round(item.diskMb / 1024))}GB`}<br />
                        CPU {item.cpuPercent === 0 ? "Unlimited" : `${item.cpuPercent}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

{product.live_chat_enabled && <LiveChatLauncher productId={product.id} />}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Keamanan pengguna
                </div>
                Kami mengutamakan ketepatan akun, pemisahan saldo per user, dan jalur report jika ada saldo yang bermasalah.
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                  {isPanel ? <ServerCog className="h-4 w-4 text-brand-300" /> : <Bot className="h-4 w-4 text-brand-300" />}
                  Auto order support
                </div>
                Cek order di @{SITE.botUsername} dan auto order di @{SITE.autoOrderBotUsername}. Admin siap bantu lewat @{SITE.support.telegram}.
              </div>
            </div>
          </div>
        </Card>

        <CheckoutCard product={product as never} isAuthenticated={Boolean(user)} userBalance={userBalance} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="mb-4 text-2xl font-bold text-white">Ulasan Pembeli</div>

          {reviews?.length ? (
            <div className="space-y-4">
              {reviews.map((review) => {
                const profileValue = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;

                return (
                  <div key={review.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{profileValue?.full_name || "Customer"}</div>
                        <div className="text-xs text-slate-400">{formatDate(review.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-300">
                        {Array.from({ length: Number(review.rating) }).map((_, index) => (
                          <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">{review.comment}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-300">Belum ada ulasan untuk produk ini.</div>
          )}
        </Card>

        <Card>
          <div className="mb-4 text-2xl font-bold text-white">Tulis Ulasan</div>
          {canReview && !alreadyReviewed ? (
            <ReviewForm productId={product.id} />
          ) : alreadyReviewed ? (
            <div className="text-slate-300">Anda sudah memberikan ulasan untuk produk ini.</div>
          ) : (
            <div className="text-slate-300">Ulasan bisa diberikan setelah Anda menyelesaikan pembelian produk ini.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
