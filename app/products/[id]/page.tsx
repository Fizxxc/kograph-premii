import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { CheckoutCard } from "@/components/checkout-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, price, description, category, image_url, stock, featured")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles(full_name)")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();

  let canReview = false;
  let alreadyReviewed = false;

  if (user) {
    const { data: settledTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .eq("status", "settlement")
      .limit(1)
      .maybeSingle();

    const { data: myReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", product.id)
      .eq("user_id", user.id)
      .maybeSingle();

    canReview = Boolean(settledTransaction);
    alreadyReviewed = Boolean(myReview);
  }

  const ratingAverage =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <img src={product.image_url} alt={product.name} className="aspect-[16/10] w-full object-cover" />
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{product.category}</Badge>
              <Badge className={product.stock > 0 ? "text-emerald-300" : "text-rose-300"}>
                {product.stock > 0 ? `Stock ${product.stock}` : "Sold Out"}
              </Badge>
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
              <div className="mt-3 text-2xl font-bold text-brand-300">{formatRupiah(product.price)}</div>
            </div>

            <p className="leading-7 text-slate-300">{product.description}</p>
          </div>
        </Card>

        <CheckoutCard product={product as never} isAuthenticated={Boolean(user)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="mb-4 text-2xl font-bold text-white">Ulasan Pembeli</div>

          {reviews?.length ? (
            <div className="space-y-4">
              {reviews.map((review) => {
                const profileValue = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
                return (
                  <div key={review.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">{profileValue?.full_name || "Verified Buyer"}</div>
                      <div className="text-sm text-slate-400">{formatDate(review.created_at)}</div>
                    </div>

                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${index < Number(review.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
                        />
                      ))}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-300">{review.comment}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">Belum ada ulasan untuk produk ini.</div>
          )}
        </Card>

        {user && canReview && !alreadyReviewed ? (
          <ReviewForm productId={product.id} />
        ) : (
          <Card>
            <div className="text-lg font-semibold text-white">Review Access</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Form ulasan hanya tampil untuk pembeli yang sudah memiliki transaksi <span className="font-semibold text-white">settlement</span> pada produk ini dan belum pernah mengirim review.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
