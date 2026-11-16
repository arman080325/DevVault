import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  isExternal?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
