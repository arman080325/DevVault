"use client";

import React from "react";

interface BrandProps {
  compact?: boolean;
  className?: string;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <div className={`brand ${className ?? ""}`}>
      <span className="brand-glyph">
        <span />
      </span>
      {!compact && <span>DevVault</span>}
    </div>
  );
}
