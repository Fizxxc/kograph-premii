"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitReview() {
    setLoading(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal mengirim ulasan");

      alert("Ulasan berhasil dikirim dan akan otomatis tampil di channel testimoni jika bot aktif.");
      setComment("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengirim ulasan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-lg font-semibold text-white">Tulis Ulasan</div>
      <p className="mt-1 text-sm text-slate-300">Form ini hanya muncul untuk user dengan transaksi settlement pada produk ini.</p>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 transition hover:bg-white/5">
            <Star className={`h-5 w-5 ${value <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-500"}`} />
          </button>
        ))}
      </div>

      <Textarea
        className="mt-4"
        placeholder="Ceritakan kualitas akun, kecepatan pengiriman credential, dan pengalaman Anda."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <Button className="mt-4" onClick={submitReview} disabled={loading || comment.trim().length < 3}>
        {loading ? "Mengirim..." : "Kirim Ulasan"}
      </Button>
    </div>
  );
}
