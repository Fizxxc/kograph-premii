import { notFound } from "next/navigation";
import CheckoutCard from "@/components/checkout-card";
import { Badge } from "@/components/ui/badge";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LiveChatLauncher } from "@/components/live-chat/live-chat-launcher";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient();
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = user?.id
    ? await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null as any };

  const { data: product } = await admin
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      category,
      stock,
      service_type,
      is_active,
      live_chat_enabled,
      product_variants ( id, name, price, compare_at_price, duration_label, short_description, sort_order, is_active )
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (!product || !product.is_active) notFound();

  const variants = (Array.isArray((product as any).product_variants) ? (product as any).product_variants : [])
    .filter((item: any) => item.is_active)
    .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  return (
    <div className="container py-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
        <section className="space-y-6 reveal-up">
          <div className="surface-card overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr,0.95fr]">
              <div className="relative min-h-[360px] overflow-hidden bg-slate-100 dark:bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/25 via-transparent to-transparent dark:from-amber-300/10" />
                <img
                  src={product.image_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-6 p-6 lg:p-8">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-300/15 dark:text-amber-300">{product.category || "Digital"}</Badge>
                  <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">{product.service_type || "instant"}</Badge>
                  {product.live_chat_enabled ? <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">Bisa live chat</Badge> : null}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white">{product.name}</h1>
                  <p className="mt-3 text-sm leading-8 text-slate-600 md:text-base dark:text-slate-300">
                    {product.description || "Produk digital dengan alur pembelian yang sudah dirapikan ulang agar lebih nyaman dipakai dari desktop maupun mobile."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Pembayaran</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">QRIS dinamis Midtrans dengan tampilan pembayaran yang lebih fokus dan tidak bercampur dengan metode lama.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Pelacakan</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">Guest dan member tetap dapat resi untuk cek status order kapan saja tanpa alur yang membingungkan.</p>
                  </div>
                </div>
                {product.live_chat_enabled ? <LiveChatLauncher productId={product.id} /> : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="reveal-up">
          <CheckoutCard
            product={{
              id: product.id,
              name: product.name,
              description: product.description,
              price: Number(product.price || 0),
              service_type: product.service_type
            }}
            variants={variants.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price || 0),
              compare_at_price: item.compare_at_price ? Number(item.compare_at_price) : null,
              duration_label: item.duration_label,
              short_description: item.short_description
            }))}
            user={user ? { email: user.email, full_name: String((profile as any)?.full_name || user.user_metadata?.full_name || "") } : null}
          />
        </aside>
      </div>
    </div>
  );
}
