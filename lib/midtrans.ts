import "server-only";

import crypto from "crypto";
import midtransClient from "midtrans-client";

type MidtransCustomer = {
  first_name?: string;
  email?: string;
};

type MidtransItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

function normalize(value?: string | null) {
  return String(value ?? "").trim();
}

function isTrue(value?: string | null) {
  return normalize(value).toLowerCase() === "true";
}

function getServerKey() {
  const key = normalize(process.env.MIDTRANS_SERVER_KEY);
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi");
  return key;
}

export function isMidtransProductionServer() {
  const flag = normalize(process.env.MIDTRANS_IS_PRODUCTION);
  if (flag) return isTrue(flag);
  return !getServerKey().startsWith("SB-");
}

function getMidtransApiBaseUrl() {
  return isMidtransProductionServer()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getMidtransBasicAuth() {
  return `Basic ${Buffer.from(`${getServerKey()}:`).toString("base64")}`;
}

export const midtransSnap = new midtransClient.Snap({
  isProduction: isMidtransProductionServer(),
  serverKey: getServerKey()
});

export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${getServerKey()}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === payload.signature_key;
}

async function midtransRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${getMidtransApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getMidtransBasicAuth(),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (json as { status_message?: string }).status_message ||
        (json as { error_messages?: string[] }).error_messages?.[0] ||
        `Midtrans request gagal: ${path}`
    );
  }

  return json as any;
}

export async function createMidtransQrisTransaction(input: {
  orderId: string;
  amount: number;
  itemDetails: MidtransItem[];
  customerDetails?: MidtransCustomer;
}) {
  const response = await midtransRequest("/v2/charge", {
    method: "POST",
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount
      },
      item_details: input.itemDetails,
      customer_details: input.customerDetails,
      qris: {
        acquirer: normalize(process.env.MIDTRANS_QRIS_ACQUIRER) || "gopay"
      }
    })
  });

  const actions = Array.isArray(response.actions) ? response.actions : [];
  const qrAction =
    actions.find((item: any) =>
      ["generate-qr-code", "generate-qr-code-v2", "deeplink-redirect", "mobile_deeplink_checkout_url"].includes(
        item?.name
      )
    ) || actions[0];

  return {
    orderId: String(response.order_id || input.orderId),
    transactionId: String(response.transaction_id || ""),
    transactionStatus: String(response.transaction_status || "pending"),
    paymentType: String(response.payment_type || "qris"),
    qrUrl: String(qrAction?.url || ""),
    actions,
    raw: response
  };
}

export async function getMidtransTransactionStatus(orderId: string) {
  return midtransRequest(`/v2/${encodeURIComponent(orderId)}/status`, {
    method: "GET"
  });
}
