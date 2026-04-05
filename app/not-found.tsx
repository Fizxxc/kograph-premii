import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="text-sm uppercase tracking-[0.2em] text-slate-400">404</div>
      <h1 className="mt-3 text-4xl font-bold text-white">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-slate-300">
        URL yang Anda tuju tidak tersedia atau produk telah dihapus dari katalog Kograph Premium.
      </p>
      <Link href="/" className="mt-6">
        <Button>Kembali ke Home</Button>
      </Link>
    </div>
  );
}
