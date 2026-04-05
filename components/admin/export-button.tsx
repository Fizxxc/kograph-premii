"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/export");
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Gagal export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kograph-transactions-${Date.now()}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal export");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExport} variant="secondary">
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Mengexport..." : "Export Excel"}
    </Button>
  );
}
