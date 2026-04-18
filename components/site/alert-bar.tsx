import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const toneMap: Record<string, string> = {
  red: "border-red-200 bg-red-50 text-red-700",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export default async function AlertBar() {
  const admin = createAdminSupabaseClient();
  const { data: alert } = await admin
    .from("site_alerts")
    .select("title, message, tone")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!alert) return null;

  return (
    <div className={`border-b ${toneMap[String((alert as any).tone || "yellow")] || toneMap.yellow}`}>
      <div className="container flex flex-col gap-1 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="font-semibold">{String((alert as any).title || "Pemberitahuan")}</div>
        <p className="text-sm opacity-90">{String((alert as any).message || "")}</p>
      </div>
    </div>
  );
}
