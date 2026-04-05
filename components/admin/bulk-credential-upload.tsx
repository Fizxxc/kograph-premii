"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseCredentialText } from "@/lib/utils";

export function BulkCredentialUpload({
  products
}: {
  products: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => parseCredentialText(rawText), [rawText]);

  async function handleFile(file: File) {
    const text = await file.text();
    setRawText(text);
  }

  async function upload() {
    if (!selectedProductId) {
      alert("Pilih produk terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, accounts: parsed })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Bulk upload gagal");

      alert(`${json.inserted} credential berhasil diupload.`);
      setRawText("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bulk upload gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-5">
        <div className="text-lg font-semibold text-white">Bulk Upload Account Data</div>
        <p className="mt-1 text-sm text-slate-300">Format: <span className="font-mono">email:password</span> per baris atau CSV <span className="font-mono">email,password</span>.</p>
      </div>

      <div className="space-y-4">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
        >
          {products.map((product) => (
            <option key={product.id} value={product.id} className="bg-slate-900">{product.name}</option>
          ))}
        </select>

        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
            <FileUp className="h-4 w-4 text-brand-300" />
            Upload .txt / .csv
            <input
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        </div>

        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"netflix1@mail.com:pass123\nspotify2@mail.com:key-abc-123"}
        />

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
          Terdeteksi <span className="font-semibold text-white">{parsed.length}</span> credential valid.
        </div>

        <Button className="w-full" onClick={upload} disabled={loading || parsed.length === 0}>
          {loading ? "Mengupload..." : "Upload Bulk Credential"}
        </Button>
      </div>
    </Card>
  );
}
