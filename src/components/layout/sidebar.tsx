/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Brand } from "./brand";
import { Icon, type IconName } from "@/components/shared/icon";
import { DesktopSidebar, MobileSidebar, useSidebar } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "motion/react";

export type NavPage = "home" | "library" | "explore" | "collections" | "activity" | "settings";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
}

interface SidebarProps {
  page: NavPage;
  onPage: (page: NavPage) => void;
  onCapture: () => void;
  exploreCount?: number;
  onSelectCollection?: (name: string) => void;
  userProfile?: UserProfile;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
}

interface NavItem {
  id: NavPage;
  label: string;
  icon: IconName;
  badge?: number;
}

export function Sidebar({
  page,
  onPage,
  onCapture,
  exploreCount = 7,
  onSelectCollection,
  userProfile,
  isAuthenticated = false,
  onOpenAuth,
  onSignOut,
}: SidebarProps) {
  const { open, setOpen } = useSidebar();

  const displayName = userProfile?.name || "Alex Lin";
  const displayRole = userProfile?.role || "Personal vault";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AL";

  const navItems: NavItem[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "library", label: "Library", icon: "library" },
    { id: "explore", label: "Explore", icon: "explore", badge: exploreCount },
    { id: "collections", label: "Collections", icon: "collection" },
    { id: "activity", label: "Activity", icon: "activity" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const handleNavClick = (target: NavPage) => {
    onPage(target);
    if (open) {
      // In mobile drawer mode, close the drawer after selection
      // (DesktopSidebar open is hover-driven and will collapse on mouse leave)
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setOpen(false);
      }
    }
  };

  const handleCollectionClick = (name: string) => {
    if (onSelectCollection) {
      onSelectCollection(name);
    } else {
      onPage("collections");
    }
    if (open && typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const handleCaptureClick = () => {
    onCapture();
    if (open && typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Animated Sidebar (72px collapsed -> 260px expanded on hover) */}
      <DesktopSidebar
        widthCollapsed="72px"
        widthExpanded="260px"
        className="sidebar sidebar-desktop-container px-3 py-6"
      >
        <div className="flex flex-col h-full w-full justify-between">
          {/* Top section: Brand, Capture, and Nav Links */}
          <div className="flex flex-col w-full">
            {/* Brand Logo */}
            <div
              className={`sidebar-brand-wrapper h-10 flex items-center overflow-hidden transition-all duration-200 ${
                open ? "justify-start px-2" : "justify-center px-0 w-full"
              }`}
            >
              <button
                onClick={() => handleNavClick("home")}
                className={`focus:outline-none flex items-center transition-all duration-200 ${
                  open ? "justify-start w-auto" : "justify-center w-full"
                }`}
                aria-label="DevVault Home"
              >
                <Brand compact={!open} size={!open ? 28 : 26} />
              </button>
            </div>

            {/* Save a link button */}
            <div className="sidebar-capture-wrapper mt-5 w-full flex items-center justify-center">
              {open ? (
                <button
                  className="sidebar-capture w-full"
                  onClick={handleCaptureClick}
                  aria-label="Save a link to your vault (Press C)"
                  title="Save a link (Press C)"
                >
                  <span className="sidebar-capture-icon">
                    <Icon name="plus" size={15} />
                  </span>
                  <span className="sidebar-capture-text whitespace-nowrap">Save a link</span>
                  <kbd className="sidebar-capture-kbd" aria-label="Keyboard shortcut C">
                    C
                  </kbd>
                  <span className="sidebar-capture-shimmer" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="sidebar-capture-compact"
                  onClick={handleCaptureClick}
                  aria-label="Save a link to your vault (Press C)"
                  title="Save a link (Press C)"
                >
                  <span className="sidebar-capture-icon">
                    <Icon name="plus" size={15} />
                  </span>
                </button>
              )}
            </div>

            {/* Main Navigation Links */}
            <nav
              className="sidebar-nav-container mt-6 flex flex-col gap-1 w-full"
              aria-label="Main Navigation"
            >
              {navItems.map((item) => {
                const isActive = page === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-button ${isActive ? "active" : ""} ${
                      !open ? "compact" : ""
                    }`}
                    onClick={() => handleNavClick(item.id)}
                    aria-label={item.label}
                    title={!open ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="sidebar-nav-icon-box shrink-0">
                      <Icon name={item.icon} />
                      {!open && item.badge !== undefined && (
                        <span className="sidebar-explore-dot" aria-hidden="true" />
                      )}
                    </span>

                    {open && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="sidebar-nav-label whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left"
                      >
                        {item.label}
                      </motion.span>
                    )}

                    {open && item.badge !== undefined && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="sidebar-nav-badge font-mono text-xs"
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Collections Section */}
            <AnimatePresence>
              {open ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="sidebar-collection mt-7 flex flex-col w-full overflow-hidden"
                >
                  <span className="sidebar-collection-heading px-2 mb-2">COLLECTIONS</span>
                  <button
                    className="sidebar-collection-item"
                    onClick={() => handleCollectionClick("Frontend")}
                  >
                    <i className="rust-dot shrink-0" />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1">
                      Frontend inspiration
                    </span>
                    <small className="shrink-0 font-mono">12</small>
                  </button>
                  <button
                    className="sidebar-collection-item"
                    onClick={() => handleCollectionClick("Backend")}
                  >
                    <i className="ink-dot shrink-0" />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1">
                      Backend engineering
                    </span>
                    <small className="shrink-0 font-mono">28</small>
                  </button>
                  <button
                    className="sidebar-collection-item"
                    onClick={() => handleCollectionClick("Roadmaps")}
                  >
                    <i className="sage-dot shrink-0" />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1">
                      Learning roadmaps
                    </span>
                    <small className="shrink-0 font-mono">9</small>
                  </button>
                </motion.div>
              ) : (
                <div
                  className="sidebar-collection-collapsed mt-6 flex flex-col items-center gap-2 py-2"
                  title="Collections (Hover to expand)"
                  aria-hidden="true"
                >
                  <i className="rust-dot" />
                  <i className="ink-dot" />
                  <i className="sage-dot" />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Profile / Authentication Section */}
          <div className="sidebar-bottom-section pt-3 border-t border-[var(--rule)] w-full">
            {isAuthenticated || userProfile?.avatar_url ? (
              open ? (
                <div className="sidebar-profile-card">
                  <button
                    type="button"
                    className="profile text-left w-full"
                    onClick={() => handleNavClick("settings")}
                    aria-label={`Settings for ${displayName}`}
                  >
                    <span className="avatar-circle overflow-hidden shrink-0">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        initials
                      )}
                    </span>
                    <div className="overflow-hidden">
                      <b className="whitespace-nowrap overflow-hidden text-ellipsis block">
                        {displayName}
                      </b>
                      <small className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                        Synced Vault
                      </small>
                    </div>
                    <Icon name="chevron" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="sidebar-signout-btn"
                    title="Sign out of vault"
                    aria-label="Sign out"
                  >
                    <Icon name="log-out" size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <button
                    type="button"
                    className="sidebar-profile-compact"
                    onClick={() => handleNavClick("settings")}
                    title={`${displayName} (${displayRole}) — Synced`}
                    aria-label={`${displayName} profile`}
                  >
                    <span className="avatar-circle overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        initials
                      )}
                    </span>
                    <span className="avatar-pulse-dot" />
                  </button>
                </div>
              )
            ) : open ? (
              <div className="sidebar-auth-prompt w-full">
                <button
                  type="button"
                  className="sidebar-signin-btn w-full"
                  onClick={() => onOpenAuth?.("sign-in")}
                  aria-label="Sign in to sync your vault"
                >
                  <span className="sidebar-signin-icon">
                    <Icon name="log-in" size={16} />
                  </span>
                  <div className="sidebar-signin-text">
                    <b>Sign In</b>
                    <small>Sync to cloud vault</small>
                  </div>
                  <span className="sidebar-signin-pill">Login</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <button
                  type="button"
                  className="sidebar-profile-compact"
                  onClick={() => onOpenAuth?.("sign-in")}
                  title="Sign in to sync your vault"
                  aria-label="Sign in"
                >
                  <span className="avatar-circle signin-circle">
                    <Icon name="log-in" size={15} />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </DesktopSidebar>

      {/* Mobile Navigation Drawer */}
      <MobileSidebar>
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col">
            {/* Drawer Brand */}
            <div className="mb-6">
              <button
                onClick={() => handleNavClick("home")}
                className="text-left focus:outline-none"
                aria-label="DevVault Home"
              >
                <Brand compact={false} />
              </button>
            </div>

            {/* Drawer Capture Button */}
            <button
              className="sidebar-capture w-full"
              onClick={handleCaptureClick}
              aria-label="Save a link to your vault (Press C)"
            >
              <span className="sidebar-capture-icon">
                <Icon name="plus" size={15} />
              </span>
              <span className="sidebar-capture-text">Save a link</span>
              <kbd className="sidebar-capture-kbd">C</kbd>
              <span className="sidebar-capture-shimmer" aria-hidden="true" />
            </button>

            {/* Drawer Nav Items */}
            <nav className="sidebar-drawer-nav mt-6 flex flex-col gap-1" aria-label="Mobile Navigation Drawer">
              {navItems.map((item) => {
                const isActive = page === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-button ${isActive ? "active" : ""}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="sidebar-nav-icon-box shrink-0">
                      <Icon name={item.icon} />
                    </span>
                    <span className="sidebar-nav-label flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="sidebar-nav-badge font-mono text-xs">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Collections */}
            <div className="sidebar-collection mt-6 flex flex-col">
              <span className="sidebar-collection-heading px-2 mb-2">COLLECTIONS</span>
              <button
                className="sidebar-collection-item"
                onClick={() => handleCollectionClick("Frontend")}
              >
                <i className="rust-dot shrink-0" />
                <span className="flex-1 text-left">Frontend inspiration</span>
                <small className="font-mono">12</small>
              </button>
              <button
                className="sidebar-collection-item"
                onClick={() => handleCollectionClick("Backend")}
              >
                <i className="ink-dot shrink-0" />
                <span className="flex-1 text-left">Backend engineering</span>
                <small className="font-mono">28</small>
              </button>
              <button
                className="sidebar-collection-item"
                onClick={() => handleCollectionClick("Roadmaps")}
              >
                <i className="sage-dot shrink-0" />
                <span className="flex-1 text-left">Learning roadmaps</span>
                <small className="font-mono">9</small>
              </button>
            </div>
          </div>

          {/* Drawer Profile/Auth */}
          <div className="sidebar-bottom-section pt-4 border-t border-[var(--rule)]">
            {isAuthenticated || userProfile?.avatar_url ? (
              <div className="sidebar-profile-card">
                <button
                  type="button"
                  className="profile text-left w-full"
                  onClick={() => handleNavClick("settings")}
                  aria-label={`Settings for ${displayName}`}
                >
                  <span className="avatar-circle overflow-hidden shrink-0">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="overflow-hidden">
                    <b className="whitespace-nowrap overflow-hidden text-ellipsis block">
                      {displayName}
                    </b>
                    <small className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                      Synced Vault
                    </small>
                  </div>
                  <Icon name="chevron" size={14} />
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="sidebar-signout-btn"
                  title="Sign out of vault"
                  aria-label="Sign out"
                >
                  <Icon name="log-out" size={15} />
                </button>
              </div>
            ) : (
              <div className="sidebar-auth-prompt w-full">
                <button
                  type="button"
                  className="sidebar-signin-btn w-full"
                  onClick={() => {
                    setOpen(false);
                    onOpenAuth?.("sign-in");
                  }}
                  aria-label="Sign in to sync your vault"
                >
                  <span className="sidebar-signin-icon">
                    <Icon name="log-in" size={16} />
                  </span>
                  <div className="sidebar-signin-text">
                    <b>Sign In</b>
                    <small>Sync to cloud vault</small>
                  </div>
                  <span className="sidebar-signin-pill">Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </MobileSidebar>
    </>
  );
}
