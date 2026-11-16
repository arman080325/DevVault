import { PlatformType } from "@/types/resource";

export interface PlatformConfig {
  label: string;
  badgeClass: string;
  iconColor: string;
  indicatorBg: string;
  defaultDomain: string;
}

export const PLATFORM_CONFIG: Record<PlatformType, PlatformConfig> = {
  GITHUB: {
    label: "GitHub",
    badgeClass: "bg-zinc-800 text-zinc-200 border-zinc-700/60",
    iconColor: "text-zinc-200",
    indicatorBg: "bg-zinc-400",
    defaultDomain: "github.com",
  },
  YOUTUBE: {
    label: "YouTube",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    iconColor: "text-red-500",
    indicatorBg: "bg-red-500",
    defaultDomain: "youtube.com",
  },
  INSTAGRAM: {
    label: "Instagram",
    badgeClass: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    iconColor: "text-pink-500",
    indicatorBg: "bg-pink-500",
    defaultDomain: "instagram.com",
  },
  DOCS: {
    label: "Docs",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    iconColor: "text-cyan-400",
    indicatorBg: "bg-cyan-500",
    defaultDomain: "documentation",
  },
  WEBSITE: {
    label: "Website",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    iconColor: "text-emerald-400",
    indicatorBg: "bg-emerald-500",
    defaultDomain: "web",
  },
  DESIGN: {
    label: "Design",
    badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    iconColor: "text-violet-400",
    indicatorBg: "bg-violet-500",
    defaultDomain: "design",
  },
  TOOL: {
    label: "Tool",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconColor: "text-amber-400",
    indicatorBg: "bg-amber-500",
    defaultDomain: "utility",
  },
};
