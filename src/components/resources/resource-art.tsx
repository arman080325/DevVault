"use client";

import React from "react";

export type ResourceKind = "motion" | "github" | "video" | "article" | "docs" | "instagram";

interface ResourceArtProps {
  kind: ResourceKind;
  large?: boolean;
  className?: string;
}

export function ResourceArt({ kind, large = false, className }: ResourceArtProps) {
  return (
    <div className={`resource-art ${kind} ${large ? "large" : ""} ${className ?? ""}`}>
      {kind === "motion" && (
        <>
          <span>GUIDE / 08</span>
          <b>
            Framer
            <br />
            Motion
          </b>
          <i className="orbit one" />
          <i className="orbit two" />
        </>
      )}
      {kind === "github" && (
        <>
          <span>OPEN SOURCE / 2025</span>
          <b>ui</b>
          <i>Beautiful components for the web.</i>
        </>
      )}
      {kind === "video" && (
        <>
          <span>21:04</span>
          <b>
            How browsers
            <br />
            render a page
          </b>
          <i className="play">▶</i>
        </>
      )}
      {kind === "article" && (
        <>
          <span>ARTICLE / CSS</span>
          <b>
            Size is
            <br />a context.
          </b>
          <i className="article-rule" />
        </>
      )}
      {kind === "docs" && (
        <>
          <span>REACT / LEARN</span>
          <b>
            Thinking
            <br />
            in React
          </b>
          <i className="docs-mark">⌘</i>
        </>
      )}
      {kind === "instagram" && (
        <>
          <span>REEL / 00:54</span>
          <b>
            Five small
            <br />
            CSS details
          </b>
          <i className="reel-lines" />
        </>
      )}
    </div>
  );
}
