import "server-only";

type PteroConfig = {
  nest_id: number;
  egg_id: number;
  allocation_id: number;
  location_id?: number;
  memory: number;
  disk: number;
  cpu: number;
  databases?: number;
  backups?: number;
  allocations?: number;
  startup?: string;
  docker_image?: string;
  environment?: Record<string, string>;
};

type EggVariable = {
  env_variable?: string;
  default_value?: string | null;
  rules?: string | null;
  server_value?: string | null;
  name?: string;
};

function getBaseUrl() {
  const url = process.env.PTERODACTYL_PANEL_URL?.trim();
  if (!url) throw new Error("PTERODACTYL_PANEL_URL belum diisi");
  return url.replace(/\/$/, "");
}

function getKey() {
  const key = process.env.PTERODACTYL_APPLICATION_API_KEY?.trim();
  if (!key) throw new Error("PTERODACTYL_APPLICATION_API_KEY belum diisi");
  return key;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (json as { errors?: Array<{ detail?: string }> }).errors?.[0]?.detail ||
        (json as { error?: string }).error ||
        `Pterodactyl request gagal: ${path}`
    );
  }

  return json as any;
}

function defaultDockerImage() {
  return process.env.PTERODACTYL_DEFAULT_DOCKER_IMAGE?.trim() || "ghcr.io/pterodactyl/yolks:nodejs_18";
}

async function getEggDetails(nestId: number, eggId: number) {
  try {
    const response = await request(`/api/application/nests/${nestId}/eggs/${eggId}?include=variables`);
    return response?.attributes ? response : response?.data || response;
  } catch {
    try {
      const response = await request(`/api/application/eggs/${eggId}?include=variables`);
      return response?.attributes ? response : response?.data || response;
    } catch {
      return null;
    }
  }
}

function pickDockerImage(egg: any, config: PteroConfig) {
  const images = egg?.attributes?.docker_images;
  const firstImage = images && typeof images === "object" ? Object.values(images)[0] : null;
  return (
    config.docker_image ||
    egg?.attributes?.docker_image ||
    (typeof firstImage === "string" ? firstImage : null) ||
    defaultDockerImage()
  );
}

function pickStartup(egg: any, config: PteroConfig) {
  return config.startup || egg?.attributes?.startup || process.env.PTERODACTYL_DEFAULT_STARTUP || null;
}

function buildEnvironment(egg: any, config: PteroConfig) {
  const provided = { ...(config.environment || {}) };
  const variables = Array.isArray(egg?.relationships?.variables?.data)
    ? egg.relationships.variables.data
    : Array.isArray(egg?.attributes?.relationships?.variables?.data)
      ? egg.attributes.relationships.variables.data
      : [];

  const missing: string[] = [];

  for (const item of variables) {
    const attr: EggVariable = item?.attributes || {};
    const key = String(attr.env_variable || "").trim();
    if (!key) continue;

    if (provided[key] == null || String(provided[key]).trim() === "") {
      if (attr.server_value != null && String(attr.server_value).trim() !== "") {
        provided[key] = String(attr.server_value);
      } else if (attr.default_value != null && String(attr.default_value).trim() !== "") {
        provided[key] = String(attr.default_value);
      }
    }

    const rules = String(attr.rules || "");
    if (rules.includes("required") && (provided[key] == null || String(provided[key]).trim() === "")) {
      missing.push(`${key}${attr.name ? ` (${attr.name})` : ""}`);
    }
  }

  if (missing.length) {
    throw new Error(
      `Konfigurasi egg panel belum lengkap. Field environment wajib yang masih kosong: ${missing.join(", ")}`
    );
  }

  return provided;
}

export async function preparePterodactylServerConfig(config: PteroConfig) {
  const egg = await getEggDetails(Number(config.nest_id), Number(config.egg_id));
  const startup = pickStartup(egg, config);
  if (!startup) {
    throw new Error(
      "Konfigurasi panel belum lengkap. Startup command tidak ditemukan pada product config, egg, atau env default."
    );
  }

  return {
    ...config,
    startup,
    docker_image: pickDockerImage(egg, config),
    environment: buildEnvironment(egg, config)
  };
}

export async function createPterodactylUser(input: {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}) {
  try {
    const existing = await request(`/api/application/users?filter[email]=${encodeURIComponent(input.email)}`);
    const match = existing?.data?.find((item: any) => item?.attributes?.email === input.email);
    if (match) return match.attributes;
  } catch {
    // ignore lookup failure and try create directly
  }

  const created = await request("/api/application/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      password: input.password
    })
  });

  return created.attributes;
}

export async function createPterodactylServer(input: {
  name: string;
  user_id: number;
  config: PteroConfig;
  external_id: string;
}) {
  const cfg = await preparePterodactylServerConfig(input.config);

  const created = await request("/api/application/servers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      user: input.user_id,
      egg: cfg.egg_id,
      docker_image: cfg.docker_image,
      startup: cfg.startup,
      environment: cfg.environment || {},
      limits: {
        memory: cfg.memory,
        swap: 0,
        disk: cfg.disk,
        io: 500,
        cpu: cfg.cpu,
        threads: null,
        oom_disabled: false
      },
      feature_limits: {
        databases: cfg.databases ?? 0,
        backups: cfg.backups ?? 1,
        allocations: cfg.allocations ?? 1
      },
      allocation: {
        default: cfg.allocation_id
      },
      external_id: input.external_id,
      deploy: cfg.location_id
        ? {
            locations: [cfg.location_id],
            dedicated_ip: false,
            port_range: []
          }
        : undefined,
      start_on_completion: true
    })
  });

  return created.attributes;
}
