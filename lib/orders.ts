import crypto from "node:crypto";

export function createOrderId(prefix = "KGP") {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createStatusToken() {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export function createPublicOrderCode() {
  return `RESI-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function buildPublicOrderUrl(orderId: string, publicOrderCode: string) {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const path = `/waiting-payment/${orderId}?resi=${encodeURIComponent(publicOrderCode)}`;
  return appUrl ? `${appUrl}${path}` : path;
}
