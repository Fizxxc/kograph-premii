import crypto from "node:crypto";

type MidtransItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

type CustomerDetails = {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

type MidtransQrisInput = {
  orderId: string;
  amount: number;
  itemDetails: MidtransItem[];
  customerDetails: CustomerDetails;
  expiryMinutes?: number;
};

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const MIDTRANS_SNAP_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";

function getServerKey() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diatur.");
  return key;
}

async function midtransRequest(path: string, body: unknown) {
  const auth = Buffer.from(`${getServerKey()}:`).toString("base64");
  const response = await fetch(`${MIDTRANS_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((json as any)?.status_message || (json as any)?.error_messages?.[0] || "Gagal menghubungi Midtrans."));
  }

  return json as any;
}

export async function createMidtransQrisTransaction(input: MidtransQrisInput) {
  const response = await midtransRequest("/v2/charge", {
    payment_type: "qris",
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.amount
    },
    item_details: input.itemDetails,
    customer_details: input.customerDetails,
    qris: {
      acquirer: "gopay"
    },
    custom_expiry: {
      expiry_duration: input.expiryMinutes || 15,
      unit: "minute"
    }
  });

  const actions = Array.isArray(response.actions) ? response.actions : [];
  const qrAction = actions.find((item: any) => item?.name === "generate-qr-code");
  const deeplinkAction = actions.find((item: any) => item?.name === "deeplink-redirect");

  return {
    transactionId: String(response.transaction_id || ""),
    orderId: String(response.order_id || input.orderId),
    qrUrl: String(qrAction?.url || response.qr_url || ""),
    deeplinkUrl: String(deeplinkAction?.url || ""),
    qrString: String(response.qr_string || ""),
    actions,
    raw: response
  };
}

export async function createMidtransSnapTransaction(input: {
  orderId: string;
  amount: number;
  itemDetails: MidtransItem[];
  customerDetails: CustomerDetails;
  enabledPayments?: string[];
}) {
  const auth = Buffer.from(`${getServerKey()}:`).toString("base64");
  const response = await fetch(`${MIDTRANS_SNAP_BASE_URL}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount
      },
      item_details: input.itemDetails,
      customer_details: input.customerDetails,
      enabled_payments: input.enabledPayments || ["qris"]
    }),
    cache: "no-store"
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((json as any)?.error_messages?.[0] || (json as any)?.status_message || "Gagal membuat transaksi Snap."));
  }

  return {
    token: String((json as any).token || ""),
    redirectUrl: String((json as any).redirect_url || "")
  };
}

export function verifyMidtransSignature(input: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const raw = `${input.order_id}${input.status_code}${input.gross_amount}${getServerKey()}`;
  const digest = crypto.createHash("sha512").update(raw).digest("hex");
  return digest === input.signature_key;
}

export async function getMidtransTransactionStatus(orderId: string) {
  const auth = Buffer.from(`${getServerKey()}:`).toString("base64");
  const response = await fetch(`${MIDTRANS_BASE_URL}/v2/${orderId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((json as any)?.status_message || "Gagal mengambil status Midtrans."));
  }
  return json;
}
