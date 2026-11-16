import { PlatformType } from "@/types/resource";

export interface PlatformConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
  accentColor: string;
}

export const PLATFORM_CONFIG: Record<PlatformType, PlatformConfig> = {
  GITHUB: {
    label: "GitHub",
    badgeClass: "bg-muted/70 text-foreground border-border/70",
    dotColor: "#A3B2A6",
    accentColor: "#A3B2A6",
  },
  YOUTUBE: {
    label: "YouTube",
    badgeClass: "bg-rose-950/20 text-rose-300 dark:text-rose-300 light:text-rose-800 border-rose-900/30",
    dotColor: "#C87D7D",
    accentColor: "#C87D7D",
  },
  INSTAGRAM: {
    label: "Instagram",
    badgeClass: "bg-purple-950/20 text-purple-300 dark:text-purple-300 light:text-purple-800 border-purple-900/30",
    dotColor: "#B388A4",
    accentColor: "#B388A4",
  },
  DOCS: {
    label: "Docs",
    badgeClass: "bg-emerald-950/20 text-emerald-300 dark:text-emerald-300 light:text-emerald-800 border-emerald-900/30",
    dotColor: "#79B28F",
    accentColor: "#79B28F",
  },
  WEBSITE: {
    label: "Website",
    badgeClass: "bg-stone-900/30 text-stone-300 dark:text-stone-300 light:text-stone-800 border-stone-800/30",
    dotColor: "#92A89B",
    accentColor: "#92A89B",
  },
  DESIGN: {
    label: "Design",
    badgeClass: "bg-indigo-950/20 text-indigo-300 dark:text-indigo-300 light:text-indigo-800 border-indigo-900/30",
    dotColor: "#988DB5",
    accentColor: "#988DB5",
  },
  TOOL: {
    label: "Tool",
    badgeClass: "bg-amber-950/20 text-amber-300 dark:text-amber-300 light:text-amber-800 border-amber-900/30",
    dotColor: "#C4A674",
    accentColor: "#C4A674",
  },
};
