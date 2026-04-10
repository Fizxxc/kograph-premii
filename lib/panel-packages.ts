export type PanelPreset = {
  key: string;
  label: string;
  memoryMb: number | null;
  diskMb: number | null;
  cpuPercent: number | null;
  tagline: string;
};

export const PANEL_RAM_PRESETS: PanelPreset[] = [
  { key: "1gb", label: "1GB", memoryMb: 1024, diskMb: 10240, cpuPercent: 40, tagline: "Starter paling hemat" },
  { key: "2gb", label: "2GB", memoryMb: 2048, diskMb: 15360, cpuPercent: 60, tagline: "Cocok untuk bot ringan" },
  { key: "3gb", label: "3GB", memoryMb: 3072, diskMb: 20480, cpuPercent: 80, tagline: "Mulai lega untuk banyak fitur" },
  { key: "4gb", label: "4GB", memoryMb: 4096, diskMb: 25600, cpuPercent: 100, tagline: "Paket favorit pembeli" },
  { key: "5gb", label: "5GB", memoryMb: 5120, diskMb: 30720, cpuPercent: 120, tagline: "Lebih longgar untuk proses berat" },
  { key: "6gb", label: "6GB", memoryMb: 6144, diskMb: 35840, cpuPercent: 140, tagline: "Stabil untuk bot aktif" },
  { key: "7gb", label: "7GB", memoryMb: 7168, diskMb: 40960, cpuPercent: 160, tagline: "Untuk kebutuhan ramai" },
  { key: "8gb", label: "8GB", memoryMb: 8192, diskMb: 46080, cpuPercent: 180, tagline: "Performa lebih lega" },
  { key: "9gb", label: "9GB", memoryMb: 9216, diskMb: 51200, cpuPercent: 200, tagline: "Siap untuk beban padat" },
  { key: "10gb", label: "10GB", memoryMb: 10240, diskMb: 61440, cpuPercent: 220, tagline: "Paket besar yang paling sering dicari" },
  { key: "unlimited", label: "Unlimited", memoryMb: null, diskMb: null, cpuPercent: null, tagline: "Tampilan marketing untuk paket tanpa batas sesuai limit panel Anda" }
];
