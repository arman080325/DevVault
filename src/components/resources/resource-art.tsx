"use client";

import React, { useState } from "react";
import { Icon, IconName } from "@/components/shared/icon";

export type ResourceKind = "motion" | "github" | "video" | "article" | "docs" | "instagram";

export interface ResourceArtProps {
  kind: ResourceKind;
  title?: string;
  domain?: string;
  category?: string;
  url?: string;
  imageUrl?: string;
  large?: boolean;
  className?: string;
}

function getDerivedThumbnail(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const trimmed = url.trim();
    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
      const match = trimmed.match(/(?:watch\?v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
    }
    if (trimmed.includes("github.com")) {
      const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match && match[1] && match[2]) {
        const repo = match[2].replace(/\.git$/, "");
        return `https://opengraph.githubassets.com/1/${match[1]}/${repo}`;
      }
    }
  } catch {
    // Ignore parse error
  }
  return undefined;
}

function getPlatformMeta(kind: ResourceKind, domain?: string): {
  icon: IconName;
  label: string;
  badge: string;
} {
  switch (kind) {
    case "github":
      return { icon: "github", label: "GitHub", badge: "REPOSITORY" };
    case "video":
      return { icon: "youtube", label: "YouTube", badge: "VIDEO" };
    case "instagram":
      return { icon: "instagram", label: "Instagram", badge: "REEL" };
    case "docs":
      return { icon: "docs", label: domain?.replace(/^www\./, "") || "Docs", badge: "DOCUMENTATION" };
    case "motion":
      return { icon: "spark", label: "Motion", badge: "GUIDE" };
    case "article":
    default:
      return { icon: "globe", label: domain?.replace(/^www\./, "") || "Article", badge: "ARTICLE" };
  }
}

export function ResourceArt({
  kind,
  title,
  domain,
  category,
  url,
  imageUrl,
  large = false,
  className,
}: ResourceArtProps) {
  const [imgError, setImgError] = useState(false);
  const activeThumbnail = !imgError ? (imageUrl || getDerivedThumbnail(url)) : undefined;
  const platform = getPlatformMeta(kind, domain);

  if (activeThumbnail) {
    return (
      <div
        className={`resource-art ${kind} ${large ? "large" : ""} has-thumbnail ${className ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeThumbnail}
          alt={title || `${platform.label} thumbnail`}
          className="resource-art-img"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className="resource-art-thumbnail-badge">
          <Icon name={platform.icon} size={15} />
          <span>{platform.label}</span>
        </div>
      </div>
    );
  }

  const displayCategory = category?.toUpperCase() || platform.badge;
  const displayTitle = title || (kind === "github" ? "Repository" : "Resource Discovery");

  return (
    <div className={`resource-art ${kind} ${large ? "large" : ""} ${className ?? ""}`}>
      <div className="resource-art-header">
        <div className="platform-tag">
          <Icon name={platform.icon} size={14} />
          <span>{platform.label}</span>
        </div>
        <span className="category-pill">{displayCategory}</span>
      </div>

      <b>{displayTitle}</b>

      {kind === "motion" && (
        <>
          <i className="orbit one" />
          <i className="orbit two" />
        </>
      )}
      {kind === "github" && (
        <i className="github-watermark">
          <Icon name="github" size={80} />
        </i>
      )}
      {kind === "video" && <i className="play">▶</i>}
      {kind === "article" && <i className="article-rule" />}
      {kind === "docs" && <i className="docs-mark">⌘</i>}
      {kind === "instagram" && <i className="reel-lines" />}
    </div>
  );
}
