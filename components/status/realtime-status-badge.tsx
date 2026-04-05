"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeStatus } from "@/lib/utils";

export function RealtimeStatusBadge({
  transactionId,
  initialStatus
}: {
  transactionId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`status-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`
        },
        (payload) => {
          setStatus(String((payload.new as { status?: string }).status ?? initialStatus));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialStatus, transactionId]);

  const className =
    status === "settlement"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : status === "expire"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
        : "border-amber-500/20 bg-amber-500/10 text-amber-300";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
      >
        {normalizeStatus(status)}
      </motion.div>
    </AnimatePresence>
  );
}
