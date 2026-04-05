import "server-only";

import crypto from "crypto";
import midtransClient from "midtrans-client";

export const midtransSnap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!
});

export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY!}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === payload.signature_key;
}