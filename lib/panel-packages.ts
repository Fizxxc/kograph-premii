export type PanelPreset = {
  key: string;
  label: string;
  memoryMb: number;
  diskMb: number;
  cpuPercent: number;
  price: number;
  tagline: string;
  description: string;
};

export const PANEL_RAM_PRESETS: PanelPreset[] = [
  { key: "1gb", label: "1GB", memoryMb: 1024, diskMb: 2048, cpuPercent: 40, price: 1000, tagline: "Paket WA bot paling hemat", description: "Cocok untuk bot WhatsApp ringan dan kebutuhan uji jalan." },
  { key: "2gb", label: "2GB", memoryMb: 2048, diskMb: 3072, cpuPercent: 55, price: 2000, tagline: "Lebih lega untuk bot aktif", description: "Lebih aman untuk bot yang mulai aktif dipakai harian." },
  { key: "3gb", label: "3GB", memoryMb: 3072, diskMb: 4096, cpuPercent: 70, price: 3000, tagline: "Masuk paket favorit", description: "Pas untuk bot WhatsApp dengan plugin dan proses ringan-menengah." },
  { key: "4gb", label: "4GB", memoryMb: 4096, diskMb: 5120, cpuPercent: 85, price: 4000, tagline: "Stabil untuk penggunaan ramai", description: "Lebih nyaman untuk bot dengan trafik dan fitur lebih banyak." },
  { key: "5gb", label: "5GB", memoryMb: 5120, diskMb: 6144, cpuPercent: 100, price: 5000, tagline: "Mulai longgar", description: "Cocok untuk bot WA dengan fitur lengkap dan beban yang lebih rutin." },
  { key: "6gb", label: "6GB", memoryMb: 6144, diskMb: 8192, cpuPercent: 120, price: 7000, tagline: "Performa lebih enak", description: "Pilihan pas kalau ingin lebih aman untuk proses berat." },
  { key: "7gb", label: "7GB", memoryMb: 7168, diskMb: 10240, cpuPercent: 140, price: 9000, tagline: "Untuk bot yang ramai", description: "Dipakai kalau bot mulai banyak command, session, dan aktivitas." },
  { key: "8gb", label: "8GB", memoryMb: 8192, diskMb: 12288, cpuPercent: 160, price: 12000, tagline: "Paket high usage", description: "Lebih lega untuk bot yang aktif dan dipakai beberapa fitur sekaligus." },
  { key: "9gb", label: "9GB", memoryMb: 9216, diskMb: 14336, cpuPercent: 180, price: 15000, tagline: "Naik kelas", description: "Mulai cocok untuk bot dengan proses lebih padat." },
  { key: "10gb", label: "10GB", memoryMb: 10240, diskMb: 16384, cpuPercent: 200, price: 18000, tagline: "Paket besar favorit", description: "Sering dipilih untuk kebutuhan yang ingin lebih aman dan lega." },
  { key: "unlimited", label: "Unlimited", memoryMb: 0, diskMb: 0, cpuPercent: 0, price: 20000, tagline: "Mentok harga 20.000", description: "Paket marketing unlimited mengikuti limit panel yang Anda izinkan di node/egg." }
];

export function getPanelPresetByKey(key?: string | null) {
  const normalized = String(key || '').trim().toLowerCase();
  return PANEL_RAM_PRESETS.find((item) => item.key === normalized) || PANEL_RAM_PRESETS[0];
}

export function getPanelPresetPriceRange() {
  const prices = PANEL_RAM_PRESETS.map((item) => item.price).sort((a, b) => a - b);
  return { min: prices[0], max: prices[prices.length - 1] };
}

export function formatPanelPlanSummary(key?: string | null) {
  const preset = getPanelPresetByKey(key);
  const memory = preset.memoryMb === 0 ? 'Unlimited' : `${Math.round(preset.memoryMb / 1024)}GB`;
  const disk = preset.diskMb === 0 ? 'Unlimited' : `${Math.max(1, Math.round(preset.diskMb / 1024))}GB`;
  const cpu = preset.cpuPercent === 0 ? 'Unlimited' : `${preset.cpuPercent}%`;
  return `${preset.label} • RAM ${memory} • Disk ${disk} • CPU ${cpu}`;
}

export function getDefaultWhatsappBotEnvironment(base?: Record<string, string>) {
  return {
    AUTO_UPDATE: '0',
    NODE_PACKAGES: '',
    UNNODE_PACKAGES: '',
    CUSTOM_ENVIRONMENT_VARIABLES: '',
    CMD_RUN: 'npm start',
    ...(base || {})
  };
}
