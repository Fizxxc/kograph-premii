export function normalizeServiceType(value?: string | null) {
  return String(value || "credential").trim().toLowerCase();
}

export function isPanelService(value?: string | null) {
  return normalizeServiceType(value) === "pterodactyl";
}

export function isChatBasedService(value?: string | null) {
  return ["design", "service", "live_chat", "custom"].includes(normalizeServiceType(value));
}

export function isStockManagedService(value?: string | null) {
  return !isPanelService(value) && !isChatBasedService(value);
}
