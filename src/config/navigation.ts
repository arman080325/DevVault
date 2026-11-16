import {
  LayoutDashboard,
  Bookmark,
  Compass,
  Layers,
  Activity,
  Settings,
  Sparkles,
  Github,
  Youtube,
  Instagram,
  FileCode,
} from "lucide-react";
import { NavGroup, NavItem } from "@/types/navigation";

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Resource Library",
    href: "/resources",
    icon: Bookmark,
    badge: "148",
  },
  {
    title: "Explore Later",
    href: "/explore",
    icon: Compass,
    badge: "19",
  },
  {
    title: "Collections",
    href: "/collections",
    icon: Layers,
    badge: "6",
  },
  {
    title: "Activity & Insights",
    href: "/activity",
    icon: Activity,
  },
];

export const PLATFORM_NAV_ITEMS: NavItem[] = [
  {
    title: "GitHub Repos",
    href: "/resources?platform=GITHUB",
    icon: Github,
    badge: "52",
  },
  {
    title: "YouTube Videos",
    href: "/resources?platform=YOUTUBE",
    icon: Youtube,
    badge: "38",
  },
  {
    title: "Instagram Technical",
    href: "/resources?platform=INSTAGRAM",
    icon: Instagram,
    badge: "18",
  },
  {
    title: "Docs & Guides",
    href: "/resources?platform=DOCS",
    icon: FileCode,
    badge: "24",
  },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: MAIN_NAV_ITEMS,
  },
  {
    label: "Platforms",
    items: PLATFORM_NAV_ITEMS,
  },
  {
    label: "System",
    items: SECONDARY_NAV_ITEMS,
  },
];
