"use client";

import React from "react";

interface BrandProps {
  compact?: boolean;
  size?: number;
  className?: string;
}

export function VaultEmblem({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`vault-emblem ${className}`}
      aria-hidden="true"
    >
      {/* Outer Chamfered Vault Perimeter */}
      <path
        d="M7 2h14l5 5v14l-5 5H7l-5-5V7l5-5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="vault-casing"
      />
      {/* D Monogram Vault Arch */}
      <path
        d="M8.5 7.5v13h4.5a6.5 6.5 0 0 0 0-13H8.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* V Monogram Vault Core Lock */}
      <path
        d="M13 13.5L16.75 20.5 20.5 13.5"
        stroke="var(--accent, #B94F37)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Vault Tumbler Keystone */}
      <circle
        cx="13"
        cy="14"
        r="1.8"
        fill="var(--accent, #B94F37)"
      />
    </svg>
  );
}

export function Brand({ compact = false, size, className }: BrandProps) {
  const emblemSize = size ?? (compact ? 28 : 26);
  return (
    <div className={`brand ${compact ? "brand-compact" : ""} ${className ?? ""}`} aria-label="DevVault">
      <VaultEmblem size={emblemSize} />
      {!compact && (
        <span className="brand-wordmark">
          <span className="brand-dev">Dev</span>
          <span className="brand-vault">Vault</span>
        </span>
      )}
    </div>
  );
}
