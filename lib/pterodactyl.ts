import "server-only";

type PteroConfig = { nest_id: number; egg_id: number; allocation_id: number; location_id?: number; memory: number; disk: number; cpu: number; databases?: number; backups?: number; allocations?: number; startup?: string; docker_image?: string; environment?: Record<string, string>; };

function getBaseUrl() { const url = process.env.PTERODACTYL_PANEL_URL?.trim(); if (!url) throw new Error("PTERODACTYL_PANEL_URL belum diisi"); return url.replace(/\/$/, ""); }
function getKey() { const key = process.env.PTERODACTYL_APPLICATION_API_KEY?.trim(); if (!key) throw new Error("PTERODACTYL_APPLICATION_API_KEY belum diisi"); return key; }

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${getBaseUrl()}${path}`, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${getKey()}`, ...(init?.headers || {}) }, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.errors?.[0]?.detail || json?.error || `Pterodactyl request gagal: ${path}`);
  return json;
}

export async function createPterodactylUser(input: { email: string; username: string; first_name: string; last_name: string; }) {
  try {
    const existing = await request(`/api/application/users?filter[email]=${encodeURIComponent(input.email)}`);
    const match = existing?.data?.find((item: any) => item?.attributes?.email === input.email);
    if (match) return match.attributes;
  } catch {}
  const created = await request("/api/application/users", { method: "POST", body: JSON.stringify({ email: input.email, username: input.username, first_name: input.first_name, last_name: input.last_name, password: `Kograph!${Math.random().toString(36).slice(2, 10)}` }) });
  return created.attributes;
}

export async function createPterodactylServer(input: { name: string; user_id: number; config: PteroConfig; external_id: string; }) {
  const cfg = input.config;
  const created = await request("/api/application/servers", { method: "POST", body: JSON.stringify({ name: input.name, user: input.user_id, egg: cfg.egg_id, docker_image: cfg.docker_image || undefined, startup: cfg.startup || undefined, environment: cfg.environment || {}, limits: { memory: cfg.memory, swap: 0, disk: cfg.disk, io: 500, cpu: cfg.cpu, threads: null, oom_disabled: false }, feature_limits: { databases: cfg.databases ?? 0, backups: cfg.backups ?? 0, allocations: cfg.allocations ?? 1 }, allocation: { default: cfg.allocation_id }, external_id: input.external_id, deploy: cfg.location_id ? { locations: [cfg.location_id], dedicated_ip: false, port_range: [] } : undefined, start_on_completion: true }) });
  return created.attributes;
}
