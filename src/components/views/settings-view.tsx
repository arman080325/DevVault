/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon, IconName } from "@/components/shared/icon";
import { IconCamera } from "@tabler/icons-react";
import { type UserProfile } from "@/components/layout/sidebar";
import { avatarService } from "@/services/avatar-service";
import { AvatarCropModal } from "@/components/modals/avatar-crop-modal";

export type SettingsTab =
  | "profile"
  | "appearance"
  | "capture"
  | "notifications"
  | "data"
  | "shortcuts";

interface SettingsViewProps {
  theme: "light" | "dark";
  onTheme: (event?: React.MouseEvent<HTMLElement>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
  onClearData?: () => void;
  onToast?: (message: string) => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  resourcesCount?: number;
  collectionsCount?: number;
  exploredCount?: number;
  vaultSizeKb?: number;
  isAuthenticated?: boolean;
  authUserId?: string | null;
  authEmail?: string | null;
  onOpenAuth?: (mode?: "sign-in" | "sign-up") => void;
  onSignOut?: () => void;
  onMigrateLocal?: () => void;
  migrationAvailable?: boolean;
  isMigrating?: boolean;
  migrationProgress?: { current: number; total: number };
}

const CANONICAL_STATUSES = ["To explore", "Exploring", "Completed"] as const;
const CANONICAL_CATEGORIES = [
  "Frontend",
  "Backend",
  "Cybersecurity",
  "Databases",
  "DevOps & Cloud",
  "UI/UX & Design",
  "Tools",
  "Animation",
  "Other",
] as const;

export function SettingsView({
  theme,
  onTheme,
  onExportData,
  onImportData,
  onClearData,
  onToast,
  userProfile,
  onUpdateProfile,
  resourcesCount = 10,
  collectionsCount = 4,
  exploredCount = 3,
  vaultSizeKb = 24,
  isAuthenticated = false,
  authUserId,
  authEmail,
  onOpenAuth,
  onSignOut,
  onMigrateLocal,
  migrationAvailable = false,
  isMigrating = false,
  migrationProgress = { current: 0, total: 0 },
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(userProfile?.name || "Alex Lin");
  const [email, setEmail] = useState(userProfile?.email || "alex@devvault.app");
  const [role, setRole] = useState(userProfile?.role || "Personal vault");

  // Avatar Upload & Crop State
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  // Appearance State
  const [fontPref, setFontPref] = useState<"newsreader" | "instrument" | "plex">("newsreader");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Capture Defaults State
  const [autoMetadata, setAutoMetadata] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<string>("To explore");
  const [defaultCategory, setDefaultCategory] = useState<string>("Frontend");
  const [autoTagging, setAutoTagging] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState(true);

  // Dropdown Open States
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDigestScheduleOpen, setIsDigestScheduleOpen] = useState(false);

  // Notifications State
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [digestSchedule, setDigestSchedule] = useState("Sunday morning (9:00 AM)");
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // Data / Confirmation State
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar Handlers
  const handleSelectAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    const validation = await avatarService.validateAvatarFile(file);
    if (!validation.valid || !validation.image) {
      setAvatarError(validation.error || "Invalid image file selected.");
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
      return;
    }

    setSelectedImage(validation.image);
    setSelectedFile(file);
    setIsCropModalOpen(true);
  };

  const handleSaveCroppedAvatar = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      if (isAuthenticated && authUserId) {
        // Authenticated flow: upload to Supabase Storage avatars bucket
        const result = await avatarService.saveProfileAvatar(
          authUserId,
          croppedBlob,
          userProfile?.avatar_path
        );

        onUpdateProfile?.({
          ...(userProfile || { name, email, role }),
          avatar_url: result.avatar_url,
          avatar_path: result.avatar_path,
        });
      } else {
        // Local flow: convert cropped blob to persistent base64 data URL
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            onUpdateProfile?.({
              ...(userProfile || { name, email, role }),
              avatar_url: dataUrl,
              avatar_path: null,
            });
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(croppedBlob);
        });
      }

      setAvatarSuccess("Profile picture updated successfully.");
      onToast?.("Profile photo updated");
      setIsCropModalOpen(false);
      setSelectedImage(null);
      setSelectedFile(null);
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload profile photo.");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      if (isAuthenticated && authUserId) {
        await avatarService.removeProfileAvatar(authUserId, userProfile?.avatar_path);
      }

      onUpdateProfile?.({
        ...(userProfile || { name, email, role }),
        avatar_url: null,
        avatar_path: null,
      });

      setAvatarSuccess("Profile photo removed.");
      onToast?.("Profile photo removed");
      setShowRemoveConfirm(false);
    } catch (err: any) {
      setAvatarError(err.message || "Failed to remove profile photo.");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  // Auto-dismiss avatar success feedback after 4 seconds
  useEffect(() => {
    if (avatarSuccess) {
      const timer = setTimeout(() => {
        setAvatarSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [avatarSuccess]);

  // Sync with prop updates
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setEmail(userProfile.email);
      setRole(userProfile.role);
    }
  }, [userProfile]);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedFont = (localStorage.getItem("devvault-font-preference") as any) || "newsreader";
      setFontPref(savedFont);
      document.documentElement.setAttribute("data-font-pref", savedFont);

      const savedDensity = (localStorage.getItem("devvault-density") as any) || "comfortable";
      setDensity(savedDensity);
      if (savedDensity === "compact") {
        document.documentElement.classList.add("compact-density");
      } else {
        document.documentElement.classList.remove("compact-density");
      }

      const savedAutoMeta = localStorage.getItem("devvault-auto-metadata");
      if (savedAutoMeta !== null) setAutoMetadata(savedAutoMeta === "true");

      const savedDefStatus = localStorage.getItem("devvault-default-status");
      if (savedDefStatus) setDefaultStatus(savedDefStatus);

      const savedDefCat = localStorage.getItem("devvault-default-category");
      if (savedDefCat) setDefaultCategory(savedDefCat);

      const savedAutoTag = localStorage.getItem("devvault-auto-tagging");
      if (savedAutoTag !== null) setAutoTagging(savedAutoTag === "true");

      const savedDupWarn = localStorage.getItem("devvault-duplicate-warning");
      if (savedDupWarn !== null) setDuplicateWarning(savedDupWarn === "true");

      const savedDigest = localStorage.getItem("devvault-weekly-digest");
      if (savedDigest !== null) setWeeklyDigest(savedDigest === "true");

      const savedSchedule = localStorage.getItem("devvault-digest-schedule");
      if (savedSchedule) setDigestSchedule(savedSchedule);

      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    } catch {}
  }, []);

  // Profile Save
  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: UserProfile = {
      name: name.trim() || "Alex Lin",
      email: email.trim() || "alex@devvault.app",
      role: role.trim() || "Personal vault",
      avatar_url: userProfile?.avatar_url ?? null,
      avatar_path: userProfile?.avatar_path ?? null,
    };
    onUpdateProfile?.(updated);
    setIsEditingProfile(false);
    onToast?.("Profile saved successfully");
  };

  const handleCancelProfile = () => {
    setName(userProfile?.name || "Alex Lin");
    setEmail(userProfile?.email || "alex@devvault.app");
    setRole(userProfile?.role || "Personal vault");
    setIsEditingProfile(false);
  };

  // Font Selection
  const handleSelectFont = (font: "newsreader" | "instrument" | "plex") => {
    setFontPref(font);
    try {
      localStorage.setItem("devvault-font-preference", font);
      document.documentElement.setAttribute("data-font-pref", font);
    } catch {}
    const fontNames = {
      newsreader: "Editorial Serif (Newsreader)",
      instrument: "Modern Sans (Instrument)",
      plex: "Technical Mono (IBM Plex)",
    };
    onToast?.(`Headings typography updated to ${fontNames[font]}`);
  };

  // Density Selection
  const handleSelectDensity = (next: "comfortable" | "compact") => {
    setDensity(next);
    try {
      localStorage.setItem("devvault-density", next);
      if (next === "compact") {
        document.documentElement.classList.add("compact-density");
      } else {
        document.documentElement.classList.remove("compact-density");
      }
    } catch {}
    onToast?.(`Display density set to ${next}`);
  };

  // Notifications Request
  const handleRequestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      onToast?.("Browser notifications are not supported in this browser");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        onToast?.("Browser notifications enabled");
      } else {
        onToast?.("Browser notifications were declined");
      }
    } catch {
      onToast?.("Could not request notification permission");
    }
  };

  // File Import Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportData?.(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AL";

  const tabs: { id: SettingsTab; label: string; icon: IconName }[] = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "appearance", label: "Appearance", icon: "sun" },
    { id: "capture", label: "Capture", icon: "link" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "data", label: "Data & Storage", icon: "database" },
    { id: "shortcuts", label: "Shortcuts", icon: "command" },
  ];

  return (
    <div className="page stage-page settings-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">PERSONAL VAULT</span>
          <h1>Settings</h1>
          <p>Shape DevVault around the way you collect, organize and return.</p>
        </div>
      </header>

      {/* Mobile Horizontal Tabs */}
      <div className="settings-mobile-tabs" role="tablist" aria-label="Settings navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-layout">
        {/* Desktop Sidebar Navigation */}
        <nav className="settings-nav" aria-label="Settings categories" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={16} />
              <span>{tab.label}</span>
              {activeTab === tab.id && <span className="settings-nav-active-pill" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        {/* Settings Content Area */}
        <div className="settings-content">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">PROFILE</span>
                <h2>Your identity & vault profile</h2>
                <p>Manage your developer persona, name, and archive attribution.</p>
              </div>

              {/* Unified Profile & Identity Section */}
              {!isEditingProfile ? (
                <div className="profile-unified-card">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleSelectAvatarFile}
                  />

                  {/* Left section — Profile Avatar */}
                  <div className="profile-unified-avatar-col">
                    <div
                      className="profile-unified-avatar-wrapper"
                      onClick={() => !isUploadingAvatar && !isRemovingAvatar && avatarFileInputRef.current?.click()}
                      title={userProfile?.avatar_url ? "Click to change photo" : "Click to upload photo"}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          avatarFileInputRef.current?.click();
                        }
                      }}
                      aria-label="Upload or change profile photo"
                    >
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={name}
                          className="profile-unified-avatar-img"
                        />
                      ) : (
                        <span className="profile-unified-avatar-initials">{initials}</span>
                      )}

                      {/* Terracotta Camera / Edit Overlay Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          avatarFileInputRef.current?.click();
                        }}
                        disabled={isUploadingAvatar || isRemovingAvatar}
                        className="profile-avatar-camera-btn"
                        title={userProfile?.avatar_url ? "Change photo" : "Upload photo"}
                        aria-label="Upload or change profile photo"
                      >
                        {isUploadingAvatar ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IconCamera size={14} stroke={2.2} />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="profile-avatar-hint-btn"
                      title={userProfile?.avatar_url ? "Change profile photo" : "Upload profile photo"}
                    >
                      {isUploadingAvatar ? "Uploading..." : userProfile?.avatar_url ? "Change photo" : "Upload photo"}
                    </button>
                  </div>

                  {/* Middle section — User Identity */}
                  <div className="profile-unified-identity-col">
                    <div className="profile-unified-name-row">
                      <h3 className="profile-unified-name">{name}</h3>
                      <span className="profile-role-badge">{role}</span>
                      {isAuthenticated ? (
                        <span className="profile-status-pill synced" title="Connected to Supabase PostgreSQL">
                          <span className="status-dot green animate-pulse" />
                          Synced
                        </span>
                      ) : (
                        <span className="profile-status-pill local" title="Operating in local browser storage">
                          <span className="status-dot slate" />
                          Local
                        </span>
                      )}
                    </div>

                    <p className="profile-unified-email">{email}</p>
                    <p className="profile-unified-note">
                      {isAuthenticated
                        ? "DevVault cloud vault owner • Supabase PostgreSQL"
                        : "DevVault personal vault • Local browser storage"}
                    </p>

                    {/* Compact inline status feedback for upload/remove */}
                    {avatarError && (
                      <div className="profile-compact-feedback error" role="alert">
                        <Icon name="info" size={13} className="shrink-0" />
                        <span className="truncate">{avatarError}</span>
                        <button
                          type="button"
                          onClick={() => setAvatarError(null)}
                          aria-label="Dismiss error"
                          className="ml-auto opacity-70 hover:opacity-100"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    )}

                    {avatarSuccess && (
                      <div className="profile-compact-feedback success" role="status">
                        <Icon name="check" size={13} className="shrink-0" />
                        <span className="truncate">{avatarSuccess}</span>
                        <button
                          type="button"
                          onClick={() => setAvatarSuccess(null)}
                          aria-label="Dismiss message"
                          className="ml-auto opacity-70 hover:opacity-100"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right section — Profile Actions */}
                  <div className="profile-unified-actions-col">
                    <button
                      type="button"
                      className="outline-button profile-unified-edit-btn"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Icon name="edit" size={14} />
                      <span>Edit Profile</span>
                    </button>

                    {userProfile?.avatar_url && (
                      <button
                        type="button"
                        className="profile-unified-remove-btn"
                        disabled={isUploadingAvatar || isRemovingAvatar}
                        onClick={() => setShowRemoveConfirm(true)}
                        title="Remove custom profile photo"
                      >
                        <Icon name="trash" size={13} />
                        <span>Remove photo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form className="profile-unified-card editing" onSubmit={handleSaveProfile}>
                  {/* Avatar thumbnail in edit mode */}
                  <div className="profile-unified-avatar-col">
                    <div className="profile-unified-avatar-wrapper" style={{ width: 72, height: 72 }}>
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={name}
                          className="profile-unified-avatar-img"
                        />
                      ) : (
                        <span className="profile-unified-avatar-initials" style={{ fontSize: 22 }}>{initials}</span>
                      )}
                    </div>
                    <span className="profile-avatar-hint-text">
                      {userProfile?.avatar_url ? "Custom photo" : "Initials"}
                    </span>
                  </div>

                  <div className="profile-form-grid flex-1">
                    <div className="settings-field">
                      <label htmlFor="settings-name-input">Full Name</label>
                      <input
                        id="settings-name-input"
                        type="text"
                        className="settings-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Lin"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="settings-field">
                      <label htmlFor="settings-email-input">Email Address</label>
                      <input
                        id="settings-email-input"
                        type="email"
                        className="settings-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. alex@devvault.app"
                        required
                      />
                    </div>

                    <div className="settings-field full-width">
                      <label htmlFor="settings-role-input">Role / Vault Title</label>
                      <input
                        id="settings-role-input"
                        type="text"
                        className="settings-input"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Senior Frontend Architect / Personal Vault"
                      />
                    </div>

                    <div className="profile-edit-actions">
                      <button
                        type="button"
                        className="outline-button"
                        onClick={handleCancelProfile}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="settings-primary-btn">
                        <Icon name="check" size={15} />
                        Save changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Cloud Synchronization & Storage Status (Phase 02) */}
              <div className="profile-cloud-card">
                <div className="profile-cloud-icon">
                  <Icon name="database" size={20} />
                </div>
                <div className="profile-cloud-info">
                  <div className="flex items-center gap-2 mb-1">
                    <h4>{isAuthenticated ? "Supabase Cloud Vault Active" : "Local Browser Storage Active"}</h4>
                    <span className={`cloud-status-badge ${isAuthenticated ? "synced" : "local"}`}>
                      {isAuthenticated ? "Cloud Sync" : "Local Vault"}
                    </span>
                  </div>
                  <p>
                    {isAuthenticated
                      ? `Connected as ${authEmail || email}. Your resources, collections, and progress are securely isolated by Row Level Security in PostgreSQL.`
                      : "Operating in local storage mode. Sign in to connect your Supabase backend, enable multi-device sync, and safely back up your knowledge vault."}
                  </p>
                </div>
                <div>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={onSignOut}
                    >
                      <Icon name="log-out" size={14} />
                      Sign out
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="settings-primary-btn"
                        onClick={() => onOpenAuth?.("sign-in")}
                      >
                        <Icon name="log-in" size={15} />
                        Sign In
                      </button>
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => onOpenAuth?.("sign-up")}
                      >
                        Create Account
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Local Vault Migration Option if available */}
              {migrationAvailable && (
                <div className="vault-migration-banner mt-4">
                  <div className="vault-migration-icon">
                    <Icon name="upload" size={18} />
                  </div>
                  <div className="vault-migration-body">
                    <b>Unsynced local resources detected</b>
                    <p>You have items in your browser cache. Sync them into your PostgreSQL database.</p>
                    {isMigrating && (
                      <div className="vault-migration-bar">
                        <div
                          style={{
                            width: `${(migrationProgress.current / Math.max(migrationProgress.total, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="vault-migration-actions">
                    <button
                      type="button"
                      className="settings-primary-btn"
                      disabled={isMigrating}
                      onClick={onMigrateLocal}
                    >
                      {isMigrating
                        ? `Syncing (${migrationProgress.current}/${migrationProgress.total})...`
                        : "Sync to Cloud"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === "appearance" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">APPEARANCE</span>
                <h2>Reading atmosphere & aesthetics</h2>
                <p>Customize lighting, typography and visual density to suit your workflow.</p>
              </div>

              {/* Theme Toggle */}
              <div className="setting-row">
                <div>
                  <b>Dark theme atmosphere</b>
                  <small>Use the warm espresso and ember theme across your entire vault.</small>
                </div>
                <button
                  className={`toggle ${theme === "dark" ? "on" : ""}`}
                  onClick={(e) => onTheme(e)}
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label="Toggle dark theme"
                  type="button"
                >
                  <i />
                </button>
              </div>

              {/* Typography Preference */}
              <div className="setting-block">
                <div className="setting-block-header">
                  <b>Headings Typography Scale</b>
                  <small>Select the primary typographic personality for editorial titles.</small>
                </div>
                <div className="font-pref-cards" role="radiogroup" aria-label="Headings typography scale">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={fontPref === "newsreader"}
                    className={`font-pref-card ${fontPref === "newsreader" ? "active" : ""}`}
                    onClick={() => handleSelectFont("newsreader")}
                  >
                    <div className="font-preview font-newsreader">Newsreader</div>
                    <b>Editorial Serif</b>
                    <small>Warm literary character for deep focus and reading.</small>
                    {fontPref === "newsreader" && (
                      <span className="font-check" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={fontPref === "instrument"}
                    className={`font-pref-card ${fontPref === "instrument" ? "active" : ""}`}
                    onClick={() => handleSelectFont("instrument")}
                  >
                    <div className="font-preview font-instrument">Instrument</div>
                    <b>Modern Sans</b>
                    <small>Clean, precise geometric clarity for contemporary UI.</small>
                    {fontPref === "instrument" && (
                      <span className="font-check" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={fontPref === "plex"}
                    className={`font-pref-card ${fontPref === "plex" ? "active" : ""}`}
                    onClick={() => handleSelectFont("plex")}
                  >
                    <div className="font-preview font-plex">IBM Plex</div>
                    <b>Technical Mono</b>
                    <small>Developer-first hacker aesthetic and code discipline.</small>
                    {fontPref === "plex" && (
                      <span className="font-check" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Interface Density */}
              <div className="setting-row">
                <div>
                  <b>Display density</b>
                  <small>Choose between spacious editorial breathing room or compact efficiency.</small>
                </div>
                <div className="density-toggle" role="group" aria-label="Display density">
                  <button
                    type="button"
                    className={density === "comfortable" ? "active" : ""}
                    onClick={() => handleSelectDensity("comfortable")}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    className={density === "compact" ? "active" : ""}
                    onClick={() => handleSelectDensity("compact")}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: CAPTURE */}
          {activeTab === "capture" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">CAPTURE</span>
                <h2>Saving defaults & link intelligence</h2>
                <p>Configure how DevVault detects, categorizes, and indexes new discoveries.</p>
              </div>

              {/* Automatic Metadata */}
              <div className="setting-row">
                <div>
                  <b>Fetch metadata automatically</b>
                  <small>Find high-resolution titles, descriptions and artwork from pasted links.</small>
                </div>
                <button
                  className={`toggle ${autoMetadata ? "on" : ""}`}
                  onClick={() => {
                    const next = !autoMetadata;
                    setAutoMetadata(next);
                    try {
                      localStorage.setItem("devvault-auto-metadata", String(next));
                    } catch {}
                    onToast?.(next ? "Metadata auto-fetch enabled" : "Metadata auto-fetch disabled");
                  }}
                  role="switch"
                  aria-checked={autoMetadata}
                  aria-label="Toggle automatic metadata fetching"
                  type="button"
                >
                  <i />
                </button>
              </div>

              {/* Default Exploration Status Dropdown */}
              <div className="setting-row">
                <div>
                  <b>Default exploration status</b>
                  <small>Initial queue state assigned when capturing a new discovery.</small>
                </div>
                <div className="settings-dropdown-wrap">
                  <button
                    type="button"
                    className="select-button"
                    onClick={() => {
                      setIsStatusOpen((p) => !p);
                      setIsCategoryOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isStatusOpen}
                  >
                    <span>{defaultStatus}</span>
                    <Icon name="chevron" size={13} className={isStatusOpen ? "rotate-chevron" : ""} />
                  </button>

                  {isStatusOpen && (
                    <ul className="settings-dropdown-menu" role="listbox">
                      {CANONICAL_STATUSES.map((st) => (
                        <li
                          key={st}
                          role="option"
                          aria-selected={defaultStatus === st}
                          className={defaultStatus === st ? "selected" : ""}
                          onClick={() => {
                            setDefaultStatus(st);
                            setIsStatusOpen(false);
                            try {
                              localStorage.setItem("devvault-default-status", st);
                            } catch {}
                            onToast?.(`Default status set to "${st}"`);
                          }}
                        >
                          <span>{st}</span>
                          {defaultStatus === st && <Icon name="check" size={13} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Default Category Shelf Dropdown */}
              <div className="setting-row">
                <div>
                  <b>Default category shelf</b>
                  <small>Primary taxonomy bucket selected when opening Quick Capture.</small>
                </div>
                <div className="settings-dropdown-wrap">
                  <button
                    type="button"
                    className="select-button"
                    onClick={() => {
                      setIsCategoryOpen((p) => !p);
                      setIsStatusOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isCategoryOpen}
                  >
                    <span>{defaultCategory}</span>
                    <Icon name="chevron" size={13} className={isCategoryOpen ? "rotate-chevron" : ""} />
                  </button>

                  {isCategoryOpen && (
                    <ul className="settings-dropdown-menu" role="listbox">
                      {CANONICAL_CATEGORIES.map((cat) => (
                        <li
                          key={cat}
                          role="option"
                          aria-selected={defaultCategory === cat}
                          className={defaultCategory === cat ? "selected" : ""}
                          onClick={() => {
                            setDefaultCategory(cat);
                            setIsCategoryOpen(false);
                            try {
                              localStorage.setItem("devvault-default-category", cat);
                            } catch {}
                            onToast?.(`Default category set to "${cat}"`);
                          }}
                        >
                          <span>{cat}</span>
                          {defaultCategory === cat && <Icon name="check" size={13} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Smart Auto-Tagging */}
              <div className="setting-row">
                <div>
                  <b>Smart tag suggestion</b>
                  <small>Auto-generate helpful topic tags from domains, repos and video metadata.</small>
                </div>
                <button
                  className={`toggle ${autoTagging ? "on" : ""}`}
                  onClick={() => {
                    const next = !autoTagging;
                    setAutoTagging(next);
                    try {
                      localStorage.setItem("devvault-auto-tagging", String(next));
                    } catch {}
                    onToast?.(next ? "Smart tagging enabled" : "Smart tagging disabled");
                  }}
                  role="switch"
                  aria-checked={autoTagging}
                  aria-label="Toggle smart auto-tagging"
                  type="button"
                >
                  <i />
                </button>
              </div>

              {/* Duplicate Link Warning */}
              <div className="setting-row">
                <div>
                  <b>Duplicate link detection</b>
                  <small>Warn and surface existing notes when capturing a previously saved link.</small>
                </div>
                <button
                  className={`toggle ${duplicateWarning ? "on" : ""}`}
                  onClick={() => {
                    const next = !duplicateWarning;
                    setDuplicateWarning(next);
                    try {
                      localStorage.setItem("devvault-duplicate-warning", String(next));
                    } catch {}
                    onToast?.(next ? "Duplicate alerts active" : "Duplicate alerts muted");
                  }}
                  role="switch"
                  aria-checked={duplicateWarning}
                  aria-label="Toggle duplicate warnings"
                  type="button"
                >
                  <i />
                </button>
              </div>
            </section>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">NOTIFICATIONS</span>
                <h2>Rediscovery & gentle reminders</h2>
                <p>Never let saved gems gather digital dust. Schedule thoughtful resurfacing.</p>
              </div>

              {/* Weekly Rediscovery Toggle */}
              <div className="setting-row">
                <div>
                  <b>Weekly rediscovery digest</b>
                  <small>A curated batch of 3 saved ideas resurfaced for Sunday reading.</small>
                </div>
                <button
                  className={`toggle ${weeklyDigest ? "on" : ""}`}
                  onClick={() => {
                    const next = !weeklyDigest;
                    setWeeklyDigest(next);
                    try {
                      localStorage.setItem("devvault-weekly-digest", String(next));
                    } catch {}
                    onToast?.(next ? "Weekly digest active" : "Weekly digest paused");
                  }}
                  role="switch"
                  aria-checked={weeklyDigest}
                  aria-label="Toggle weekly rediscovery digest"
                  type="button"
                >
                  <i />
                </button>
              </div>

              {/* Digest Schedule */}
              <div className="setting-row">
                <div>
                  <b>Digest schedule & delivery time</b>
                  <small>Preferred window to receive your unread exploration queue.</small>
                </div>
                <div className="settings-dropdown-wrap">
                  <button
                    type="button"
                    className="select-button"
                    onClick={() => setIsDigestScheduleOpen((p) => !p)}
                    aria-haspopup="listbox"
                    aria-expanded={isDigestScheduleOpen}
                  >
                    <span>{digestSchedule}</span>
                    <Icon name="chevron" size={13} className={isDigestScheduleOpen ? "rotate-chevron" : ""} />
                  </button>

                  {isDigestScheduleOpen && (
                    <ul className="settings-dropdown-menu" role="listbox">
                      {[
                        "Sunday morning (9:00 AM)",
                        "Monday morning (8:00 AM)",
                        "Friday evening (6:00 PM)",
                      ].map((sch) => (
                        <li
                          key={sch}
                          role="option"
                          aria-selected={digestSchedule === sch}
                          className={digestSchedule === sch ? "selected" : ""}
                          onClick={() => {
                            setDigestSchedule(sch);
                            setIsDigestScheduleOpen(false);
                            try {
                              localStorage.setItem("devvault-digest-schedule", sch);
                            } catch {}
                            onToast?.(`Digest schedule updated to ${sch}`);
                          }}
                        >
                          <span>{sch}</span>
                          {digestSchedule === sch && <Icon name="check" size={13} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Desktop Browser Notifications */}
              <div className="setting-row">
                <div>
                  <b>Desktop system notifications</b>
                  <small>Receive native browser prompts when scheduled digests trigger.</small>
                </div>
                <div className="permission-control">
                  <span className={`permission-pill ${notificationPermission}`}>
                    {notificationPermission === "granted" ? "Allowed" : notificationPermission === "denied" ? "Blocked" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={handleRequestNotifications}
                  >
                    {notificationPermission === "granted" ? "Test Alert" : "Enable notifications"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TAB 5: DATA & STORAGE */}
          {activeTab === "data" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">DATA & PRIVACY</span>
                <h2>Archive analytics & vault ownership</h2>
                <p>Complete control over your developer knowledge base. Export, backup, or restore.</p>
              </div>

              {/* Vault Storage Stats */}
              <div className="vault-stats-grid">
                <div className="vault-stat-card">
                  <span className="stat-number">{resourcesCount}</span>
                  <span className="stat-label">Saved Resources</span>
                </div>
                <div className="vault-stat-card">
                  <span className="stat-number">{collectionsCount}</span>
                  <span className="stat-label">Curated Shelves</span>
                </div>
                <div className="vault-stat-card">
                  <span className="stat-number">{exploredCount}</span>
                  <span className="stat-label">Explored Gems</span>
                </div>
                <div className="vault-stat-card">
                  <span className="stat-number">~{vaultSizeKb} KB</span>
                  <span className="stat-label">Local Footprint</span>
                </div>
              </div>

              {/* Export Vault */}
              <div className="setting-row">
                <div>
                  <b>Export your entire vault</b>
                  <small>Download all resources, markdown notes, collections and tags as a structured JSON file.</small>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    onExportData?.();
                    onToast?.("Vault exported to JSON backup");
                  }}
                >
                  <Icon name="download" size={14} />
                  Export backup
                </button>
              </div>

              {/* Import / Restore Vault */}
              <div className="setting-row">
                <div>
                  <b>Restore or import backup</b>
                  <small>Upload a valid DevVault JSON backup file to restore or merge saved items.</small>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    id="vault-file-import-input"
                  />
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="upload" size={14} />
                    Import JSON
                  </button>
                </div>
              </div>

              {/* Danger Zone: Clear Vault */}
              <div className="danger-row">
                <div>
                  <b>Delete all vault data</b>
                  <small>Permanently purge every resource, notes record, and custom collection from browser storage.</small>
                </div>
                {confirmingDelete ? (
                  <div className="confirm-actions">
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Keep vault
                    </button>
                    <button
                      type="button"
                      className="btn-danger-confirm"
                      onClick={() => {
                        setConfirmingDelete(false);
                        onClearData?.();
                        onToast?.("Vault permanently cleared");
                      }}
                    >
                      <Icon name="trash" size={14} />
                      Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Delete vault
                  </button>
                )}
              </div>
            </section>
          )}

          {/* TAB 6: KEYBOARD SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="date-label">PRODUCTIVITY</span>
                <h2>Keyboard shortcuts cheat sheet</h2>
                <p>Navigate and command your vault at the speed of thought.</p>
              </div>

              <div className="shortcuts-table">
                <div className="shortcut-row">
                  <div className="shortcut-key-wrap">
                    <kbd className="keycap">C</kbd>
                  </div>
                  <div className="shortcut-desc">
                    <b>Quick Capture</b>
                    <small>Open the capture dialog from anywhere in DevVault</small>
                  </div>
                </div>

                <div className="shortcut-row">
                  <div className="shortcut-key-wrap">
                    <kbd className="keycap">⌘</kbd>
                    <span className="key-plus">+</span>
                    <kbd className="keycap">K</kbd>
                  </div>
                  <div className="shortcut-desc">
                    <b>Global Search</b>
                    <small>Focus the library search input across all resources</small>
                  </div>
                </div>

                <div className="shortcut-row">
                  <div className="shortcut-key-wrap">
                    <kbd className="keycap">Esc</kbd>
                  </div>
                  <div className="shortcut-desc">
                    <b>Dismiss / Close</b>
                    <small>Close any open modal, dropdown menu, or detail drawer</small>
                  </div>
                </div>

                <div className="shortcut-row">
                  <div className="shortcut-key-wrap">
                    <kbd className="keycap">⌘</kbd>
                    <span className="key-plus">+</span>
                    <kbd className="keycap">↵</kbd>
                  </div>
                  <div className="shortcut-desc">
                    <b>Save & Commit</b>
                    <small>Quickly save resource inside the Quick Capture dialog</small>
                  </div>
                </div>

                <div className="shortcut-row">
                  <div className="shortcut-key-wrap">
                    <kbd className="keycap">1</kbd>
                    <span className="key-dash">–</span>
                    <kbd className="keycap">6</kbd>
                  </div>
                  <div className="shortcut-desc">
                    <b>Switch Views</b>
                    <small>Jump directly between Home, Library, Explore, Collections, Activity, and Settings</small>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Avatar Crop & Preview Modal */}
      <AvatarCropModal
        isOpen={isCropModalOpen}
        image={selectedImage}
        file={selectedFile}
        isSaving={isUploadingAvatar}
        error={avatarError}
        onClose={() => {
          setIsCropModalOpen(false);
          setSelectedImage(null);
          setSelectedFile(null);
          if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        }}
        onSave={handleSaveCroppedAvatar}
      />

      {/* Profile Photo Removal Confirmation Toast (Modern UI/UX Toast for Phone and Desktop) */}
      {showRemoveConfirm && (
        <div className="vault-sync-toast vault-danger-toast" role="dialog" aria-modal="true" aria-labelledby="remove-photo-title">
          <div className="vault-sync-toast-content">
            <div className="vault-sync-toast-icon danger">
              <Icon name="trash" size={17} />
            </div>
            <div className="vault-sync-toast-body">
              <div className="vault-sync-toast-header">
                <span id="remove-photo-title" className="vault-sync-toast-title">Remove profile photo?</span>
                <button
                  type="button"
                  className="vault-sync-toast-close"
                  onClick={() => setShowRemoveConfirm(false)}
                  aria-label="Dismiss toast"
                  title="Cancel"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
              <p className="vault-sync-toast-text">
                Your custom avatar will be deleted and revert to your generated initials.
              </p>
              <div className="vault-sync-toast-actions">
                <button
                  type="button"
                  className="vault-danger-btn-primary"
                  disabled={isRemovingAvatar}
                  onClick={handleRemoveAvatar}
                >
                  {isRemovingAvatar ? "Removing..." : "Remove photo"}
                </button>
                <button
                  type="button"
                  className="vault-sync-btn-secondary"
                  disabled={isRemovingAvatar}
                  onClick={() => setShowRemoveConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
