import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number | string | bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function safeTrim(value: unknown) {
  return String(value ?? "").trim();
}

export function parseCredentialText(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const normalized: string[] = [];

  for (const line of lines) {
    if (line.includes(":")) {
      normalized.push(line);
      continue;
    }

    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      normalized.push(`${parts[0]}:${parts.slice(1).join(":")}`);
    }
  }

  return Array.from(new Set(normalized));
}

export function isValidCredentialFormat(value: string) {
  return value.includes(":") && value.split(":").every((part) => part.trim().length > 0);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function normalizeStatus(status: string) {
  const map: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    settlement: "Berhasil",
    expire: "Kadaluarsa"
  };

  return map[status] || status;
}
