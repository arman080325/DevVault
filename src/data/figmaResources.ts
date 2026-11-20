import type { ResourceKind } from "@/components/resources/resource-art";

export interface FigmaResource {
  id: number;
  remoteId?: string;
  kind: ResourceKind;
  source: string;
  domain: string;
  title: string;
  description: string;
  category: string;
  length: string;
  saved: string;
  status: "To explore" | "Exploring" | "Completed";
  progress?: number;
  collection?: string;
  url?: string;
  notes?: string;
  tags?: string[];
  pinned?: boolean;
  favorite?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AdvancedSortOption =
  | "recent"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "updated"
  | "relevance";

export type LegacySortOption = "title";

export type SortOption = AdvancedSortOption | LegacySortOption;

export interface SavedSearchItem {
  id: string;
  userId?: string;
  name: string;
  query?: string;
  platform?: string;
  category?: string;
  status?: string;
  collection?: string;
  tags?: string[];
  favorite?: boolean;
  pinned?: boolean;
  bookmarked?: boolean;
  datePreset?: "all" | "today" | "7d" | "30d" | "year";
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: AdvancedSortOption;
  createdAt: string;
  updatedAt?: string;
  lastUsedAt?: string;
}

export const INITIAL_FIGMA_RESOURCES: FigmaResource[] = [
  {
    id: 1,
    kind: "motion",
    source: "Motion",
    domain: "motion.dev",
    title: "Layout animations: the missing guide",
    description: "A practical introduction to smooth, interruptible layout transitions in React.",
    category: "Animation",
    length: "12 min read",
    saved: "Today",
    status: "Exploring",
    progress: 48,
    collection: "Frontend inspiration",
    url: "https://motion.dev/docs/react-layout-animations",
    notes: "The examples are unusually clear. Return to the section on shared layout transitions when building the collection view.",
    tags: ["Animation", "React", "Motion", "UI"],
    pinned: true,
    favorite: true,
  },
  {
    id: 2,
    kind: "github",
    source: "GitHub",
    domain: "github.com/shadcn-ui",
    title: "shadcn/ui: Beautifully designed components",
    description: "Accessible components you can copy, customize and make your own.",
    category: "UI systems",
    length: "Repository",
    saved: "Today",
    status: "To explore",
    collection: "UI component libraries",
    url: "https://github.com/shadcn-ui/ui",
    imageUrl: "https://opengraph.githubassets.com/1/shadcn-ui/ui",
    notes: "Reference for accessible component primitives with Radix and Tailwind CSS.",
    tags: ["UI systems", "Components", "Tailwind", "Radix"],
    pinned: true,
  },
  {
    id: 3,
    kind: "video",
    source: "YouTube",
    domain: "youtube.com",
    title: "How browsers render a page",
    description: "Follow a page from HTML and CSS all the way to pixels on screen.",
    category: "Web performance",
    length: "21 min watch",
    saved: "Yesterday",
    status: "To explore",
    url: "https://youtube.com/watch?v=SmE4Ow95En4",
    imageUrl: "https://img.youtube.com/vi/SmE4Ow95En4/hqdefault.jpg",
    notes: "Deep dive into layout recalculation, composite layers, and paint triggers.",
    tags: ["Web performance", "Browser", "DOM", "Rendering"],
  },
  {
    id: 4,
    kind: "article",
    source: "Article",
    domain: "joshwcomeau.com",
    title: "A friendly introduction to container queries",
    description: "Build resilient components that respond to the space they actually occupy.",
    category: "CSS",
    length: "9 min read",
    saved: "2 days ago",
    status: "Completed",
    collection: "Frontend inspiration",
    url: "https://www.joshwcomeau.com/css/container-queries-introduction/",
    notes: "Great mental model for building responsive cards without viewport media queries.",
    tags: ["CSS", "Container Queries", "Responsive"],
    favorite: true,
  },
  {
    id: 5,
    kind: "docs",
    source: "Documentation",
    domain: "react.dev",
    title: "Thinking in React",
    description: "Break a user interface into a component hierarchy and connect the data flow.",
    category: "React",
    length: "14 min read",
    saved: "May 19",
    status: "Completed",
    url: "https://react.dev/learn/thinking-in-react",
    notes: "Core philosophy of state lifting, component breakdown, and unidirectional data flow.",
    tags: ["React", "Architecture", "Docs"],
  },
  {
    id: 6,
    kind: "instagram",
    source: "Instagram",
    domain: "instagram.com",
    title: "Five CSS details that make interfaces feel polished",
    description: "Small interaction and spacing refinements demonstrated in under a minute.",
    category: "UI craft",
    length: "54 sec watch",
    saved: "May 18",
    status: "To explore",
    collection: "Frontend inspiration",
    url: "https://instagram.com/p/C6Z5y3xL",
    notes: "Subtle micro-interactions, border-radius nesting, and font-feature-settings.",
    tags: ["UI craft", "CSS", "Polish", "Shortform"],
  },
];

export interface CollectionItem {
  id?: string;
  name: string;
  count: number;
  note: string;
  tone: "rust" | "ink" | "sage" | "sand" | "paper";
}

export const INITIAL_COLLECTIONS: CollectionItem[] = [
  {
    name: "Frontend inspiration",
    count: 12,
    note: "Interfaces, motion and details worth borrowing.",
    tone: "rust",
  },
  {
    name: "Backend engineering",
    count: 28,
    note: "Systems thinking, APIs and resilient architecture.",
    tone: "ink",
  },
  {
    name: "Learning roadmaps",
    count: 9,
    note: "Long-form paths for the skills still in progress.",
    tone: "sage",
  },
  {
    name: "Weekend experiments",
    count: 6,
    note: "Small ideas that deserve a quiet afternoon.",
    tone: "sand",
  },
];
