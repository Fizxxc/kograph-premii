import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function notifyUsers(userIds: string[], title: string, body: string, url = "/") {
  const admin = createAdminSupabaseClient();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return;
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", uniqueIds);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@kograph.local";

  for (const sub of subs || []) {
    try {
      await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          TTL: "60",
          Urgency: "normal",
          "Content-Type": "application/json",
          Authorization: `WebPush ${Buffer.from(JSON.stringify({ sub: vapidSubject, k: vapidPublicKey })).toString("base64")}`
        },
        body: JSON.stringify({
          title,
          body,
          url,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        })
      }).catch(() => null);
    } catch {
      // best effort only; browser push service may reject non-standard envs.
    }
  }
}
