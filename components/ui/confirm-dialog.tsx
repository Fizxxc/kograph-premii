"use client";
import { Button } from "@/components/ui/button";
export function ConfirmDialog({ open, title, description, confirmText = "Lanjutkan", cancelText = "Batal", onCancel, onConfirm, loading = false }: { open: boolean; title: string; description: string; confirmText?: string; cancelText?: string; onCancel: () => void; onConfirm: () => void; loading?: boolean; }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-premium"><div className="text-xl font-bold text-white">{title}</div><p className="mt-3 text-sm leading-6 text-slate-300">{description}</p><div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>{cancelText}</Button><Button variant="danger" className="flex-1" onClick={onConfirm} disabled={loading}>{loading ? "Memproses..." : confirmText}</Button></div></div></div>;
}
