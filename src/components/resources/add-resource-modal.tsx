"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link as LinkIcon,
  Star,
  Pin,
  Sparkles,
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
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm font-heading font-semibold text-foreground">
            Quick Capture Resource
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save a developer resource with automatic platform detection.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          {/* URL Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                URL *
              </label>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                Auto-detected
              </span>
            </div>
            <div className="relative">
              <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                {...register("url")}
                placeholder="https://..."
                className="pl-8 text-xs font-mono"
                autoFocus
              />
            </div>
            {errors.url && (
              <p className="text-[10px] text-destructive">{errors.url.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Title *
            </label>
            <Input
              {...register("title")}
              placeholder="Descriptive resource title..."
              className="text-xs"
            />
            {errors.title && (
              <p className="text-[10px] text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Platform and Category */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Platform
              </label>
              <select
                {...register("platform")}
                className="flex h-8.5 w-full rounded-md border border-input bg-secondary/30 px-2 text-xs text-foreground shadow-2xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-popover text-foreground">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Category
              </label>
              <select
                {...register("category")}
                className="flex h-8.5 w-full rounded-md border border-input bg-secondary/30 px-2 text-xs text-foreground shadow-2xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-popover text-foreground">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes / Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Notes (Optional)
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Why this is valuable, architectural takeaways..."
              className="flex w-full rounded-md border border-input bg-secondary/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Tags and Author */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Tags (comma separated)
              </label>
              <Input
                {...register("tags")}
                placeholder="React, CSS, Auth"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Author / Creator
              </label>
              <Input
                {...register("author")}
                placeholder="e.g. ByteByteGo"
                className="text-xs"
              />
            </div>
          </div>

          {/* Pinned & Favorite toggles */}
          <div className="flex items-center gap-5 pt-0.5">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("isPinned")}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <Pin className="h-3 w-3 text-primary" />
              <span>Pin to top</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("isFavorite")}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <Star className="h-3 w-3 text-primary" />
              <span>Favorite</span>
            </label>
          </div>

          <DialogFooter className="pt-2">
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
              {isSubmitting ? "Saving..." : "Save to Vault"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
