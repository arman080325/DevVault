import { z } from "zod";
import { PlatformType, ResourceCategory, ResourceStatus } from "@/types/resource";

export const ResourceSchema = z.object({
  url: z.string().url({ message: "Please enter a valid HTTP or HTTPS URL" }),
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(120, { message: "Title cannot exceed 120 characters" }),
  description: z
    .string()
    .max(500, { message: "Description cannot exceed 500 characters" })
    .optional()
    .or(z.literal("")),
  platform: z.enum(
    [
      "GITHUB",
      "YOUTUBE",
      "INSTAGRAM",
      "WEBSITE",
      "DOCS",
      "DESIGN",
      "TOOL",
    ] as const,
    { message: "Please select a valid platform" }
  ),
  category: z.enum(
    [
      "Frontend",
      "Backend",
      "DevOps & Cloud",
      "Cybersecurity",
      "UI/UX & Design",
      "Databases",
      "AI & Machine Learning",
      "Career & Roadmaps",
    ] as const,
    { message: "Please select a category" }
  ),
  tags: z.string().optional().or(z.literal("")),
  status: z.enum(["INBOX", "SAVED", "EXPLORING", "COMPLETED", "ARCHIVED"] as const).default("SAVED"),
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  author: z.string().optional().or(z.literal("")),
});

export type ResourceFormData = z.infer<typeof ResourceSchema>;

export function detectPlatformFromUrl(url: string): PlatformType {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("github.com") || host.includes("gist.github.com")) {
      return "GITHUB";
    }
    if (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("m.youtube.com")
    ) {
      return "YOUTUBE";
    }
    if (host.includes("instagram.com")) {
      return "INSTAGRAM";
    }
    if (
      host.includes("docs.") ||
      parsed.pathname.includes("/docs") ||
      host.includes("documentation")
    ) {
      return "DOCS";
    }
    if (
      host.includes("figma.com") ||
      host.includes("dribbble.com") ||
      host.includes("mobbin.com") ||
      host.includes("behance.net")
    ) {
      return "DESIGN";
    }
    if (
      host.includes("raycast.com") ||
      host.includes("v0.dev") ||
      host.includes("postman.com")
    ) {
      return "TOOL";
    }
    return "WEBSITE";
  } catch {
    return "WEBSITE";
  }
}
