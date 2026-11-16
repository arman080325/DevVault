export type PlatformType =
  | "GITHUB"
  | "YOUTUBE"
  | "INSTAGRAM"
  | "WEBSITE"
  | "DOCS"
  | "DESIGN"
  | "TOOL";

export type ResourceStatus =
  | "INBOX"
  | "SAVED"
  | "EXPLORING"
  | "COMPLETED"
  | "ARCHIVED";

export type ResourceCategory =
  | "Frontend"
  | "Backend"
  | "DevOps & Cloud"
  | "Cybersecurity"
  | "UI/UX & Design"
  | "Databases"
  | "AI & Machine Learning"
  | "Career & Roadmaps";

export interface GitHubMetadata {
  stars?: number;
  forks?: number;
  language?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface YouTubeMetadata {
  duration?: string;
  views?: number;
  channelName?: string;
  isShort?: boolean;
}

export interface InstagramMetadata {
  postType?: "reel" | "carousel" | "post";
  likes?: number;
  handle?: string;
}

export interface WebMetadata {
  domain?: string;
  readingTimeMin?: number;
}

export type ResourceMetadata = GitHubMetadata &
  YouTubeMetadata &
  InstagramMetadata &
  WebMetadata;

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: PlatformType;
  category: ResourceCategory;
  status: ResourceStatus;
  isPinned: boolean;
  isFavorite: boolean;
  thumbnailUrl?: string;
  faviconUrl?: string;
  author?: string;
  tags: string[];
  readTimeMin?: number;
  metadata?: ResourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceStats {
  totalResources: number;
  exploreLaterCount: number;
  pinnedCount: number;
  completedThisWeek: number;
  currentStreakDays: number;
}

export interface PlatformStat {
  platform: PlatformType;
  count: number;
  percentage: number;
  color: string;
}

export interface CategoryStat {
  category: ResourceCategory;
  count: number;
  iconName: string;
  color: string;
}

export interface ActivityEvent {
  id: string;
  type: "CAPTURED" | "EXPLORED" | "COMPLETED" | "FAVORITED" | "PINNED";
  resourceId?: string;
  resourceTitle?: string;
  platform?: PlatformType;
  timestamp: string;
  summary: string;
}
