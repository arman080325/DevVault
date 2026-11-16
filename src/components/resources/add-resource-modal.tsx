"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sparkles,
  Link as LinkIcon,
  Check,
  FolderPlus,
  Tag,
  Star,
  Pin,
  Compass,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResourceFormData,
  ResourceSchema,
  detectPlatformFromUrl,
} from "@/lib/validation";
import { PlatformType, ResourceCategory, ResourceItem } from "@/types/resource";

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddResource: (newResource: ResourceItem) => void;
}

const CATEGORIES: ResourceCategory[] = [
  "Frontend",
  "Backend",
  "DevOps & Cloud",
  "Cybersecurity",
  "UI/UX & Design",
  "Databases",
  "AI & Machine Learning",
  "Career & Roadmaps",
];

const PLATFORMS: { label: string; value: PlatformType }[] = [
  { label: "GitHub", value: "GITHUB" },
  { label: "YouTube", value: "YOUTUBE" },
  { label: "Instagram", value: "INSTAGRAM" },
  { label: "Docs", value: "DOCS" },
  { label: "Website", value: "WEBSITE" },
  { label: "Design", value: "DESIGN" },
  { label: "Tool", value: "TOOL" },
];

export function AddResourceModal({
  isOpen,
  onClose,
  onAddResource,
}: AddResourceModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResourceFormData>({
    resolver: zodResolver(ResourceSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      platform: "WEBSITE",
      category: "Frontend",
      tags: "",
      author: "",
      status: "SAVED",
      isPinned: false,
      isFavorite: false,
    },
  });

  const watchedUrl = watch("url");

  // Auto-detect platform from URL when pasted
  React.useEffect(() => {
    if (watchedUrl && watchedUrl.startsWith("http")) {
      const detected = detectPlatformFromUrl(watchedUrl);
      setValue("platform", detected);
    }
  }, [watchedUrl, setValue]);

  const onSubmit = (data: ResourceFormData) => {
    setIsSubmitting(true);

    // Process tags into array
    const tagArray = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean)
      : [data.category];

    const newResource: ResourceItem = {
      id: `res-${Date.now()}`,
      title: data.title,
      description: data.description || "",
      url: data.url,
      platform: data.platform,
      category: data.category,
      status: data.status,
      isPinned: data.isPinned,
      isFavorite: data.isFavorite,
      author: data.author || undefined,
      tags: tagArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onAddResource(newResource);
      setIsSubmitting(false);
      reset();
      onClose();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle>Quick Capture Resource</DialogTitle>
          </div>
          <DialogDescription>
            Save any developer link, video, repository, or article into your
            vault.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Resource URL *</span>
              <span className="text-[10px] text-muted-foreground">
                Platform auto-detected
              </span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                {...register("url")}
                placeholder="https://github.com/... or https://youtu.be/..."
                className="pl-8 text-xs font-mono"
              />
            </div>
            {errors.url && (
              <p className="text-[11px] text-destructive">{errors.url.message}</p>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Title *
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. Modern Architecture for Distributed Caching"
              className="text-xs"
            />
            {errors.title && (
              <p className="text-[11px] text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Platform and Category side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Platform */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Platform
              </label>
              <select
                {...register("platform")}
                className="flex h-9 w-full rounded-md border border-input bg-background/50 px-2.5 py-1 text-xs shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Category
              </label>
              <select
                {...register("category")}
                className="flex h-9 w-full rounded-md border border-input bg-background/50 px-2.5 py-1 text-xs shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Notes / Description (Optional)
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Key takeaways, why this is valuable, or architectural notes..."
              className="flex w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Tags and Author */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Tags (comma separated)
              </label>
              <Input
                {...register("tags")}
                placeholder="React, Redis, Architecture"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Author / Channel
              </label>
              <Input
                {...register("author")}
                placeholder="e.g. ByteByteGo"
                className="text-xs"
              />
            </div>
          </div>

          {/* Checkboxes: Pinned, Favorite */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("isPinned")}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
              />
              <Pin className="h-3 w-3 text-amber-400" />
              <span>Pin to Dashboard</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("isFavorite")}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
              />
              <Star className="h-3 w-3 text-rose-400" />
              <span>Mark Favorite</span>
            </label>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground font-medium"
            >
              {isSubmitting ? "Capturing..." : "Capture to Vault"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
