function normalize(value?: string | null) {
  return String(value ?? "").trim();
}

function isTrue(value?: string | null) {
  return normalize(value).toLowerCase() === "true";
}

function isSandboxClientKey(clientKey?: string | null) {
  const key = normalize(clientKey);
  return key.startsWith("SB-");
}

function isProductionClientKey(clientKey?: string | null) {
  const key = normalize(clientKey);
  return !!key && !key.startsWith("SB-");
}

export function isMidtransProduction() {
  const publicFlag = normalize(process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION);
  const clientKey = normalize(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);

  if (publicFlag) {
    return isTrue(publicFlag);
  }

  if (isProductionClientKey(clientKey)) {
    return true;
  }

  if (isSandboxClientKey(clientKey)) {
    return false;
  }

  return false;
}

export function getMidtransSnapScriptUrl() {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function getMidtransEnvironmentLabel() {
  return isMidtransProduction() ? "production" : "sandbox";
}