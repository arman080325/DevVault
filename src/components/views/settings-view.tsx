"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";

interface SettingsViewProps {
  theme: "light" | "dark";
  onTheme: () => void;
  onExportData?: () => void;
  onClearData?: () => void;
  onToast?: (message: string) => void;
}

export function SettingsView({
  theme,
  onTheme,
  onExportData,
  onClearData,
  onToast,
}: SettingsViewProps) {
  const [digest, setDigest] = useState(true);
  const [metadata, setMetadata] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState("Alex Lin");
  const [userEmail, setUserEmail] = useState("alex@devvault.app");
  const [defaultStatus, setDefaultStatus] = useState<"To explore" | "Exploring" | "Completed">("To explore");

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsEditingProfile(false);
    onToast?.("Profile updated");
  };

  const handleCycleDefaultStatus = () => {
    const statuses: ("To explore" | "Exploring" | "Completed")[] = [
      "To explore",
      "Exploring",
      "Completed",
    ];
    const next = statuses[(statuses.indexOf(defaultStatus) + 1) % statuses.length];
    setDefaultStatus(next);
    onToast?.(`Default status set to "${next}"`);
  };

  return (
    <div className="page stage-page settings-page">
      <header className="library-head stage-head">
        <div>
          <span className="date-label">PERSONAL VAULT</span>
          <h1>Settings</h1>
          <p>Shape DevVault around the way you collect and return.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav aria-label="Settings categories">
          <a href="#profile">Profile</a>
          <a href="#appearance">Appearance</a>
          <a href="#capture">Capture</a>
          <a href="#notifications">Notifications</a>
          <a href="#data">Data</a>
        </nav>

        <div className="settings-content">
          <section id="profile">
            <span className="date-label">PROFILE</span>
            <h2>Your details</h2>
            {isEditingProfile ? (
              <form
                className="profile-setting"
                onSubmit={handleSaveProfile}
                style={{ flexDirection: "column", alignItems: "stretch", gap: "12px" }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span>{userName.slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your full name"
                      style={{
                        padding: "8px 10px",
                        border: "1px solid var(--rule)",
                        borderRadius: "4px",
                        background: "var(--surface)",
                        color: "var(--ink)",
                        fontSize: "9px",
                      }}
                      autoFocus
                    />
                    <input
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Your email address"
                      style={{
                        padding: "8px 10px",
                        border: "1px solid var(--rule)",
                        borderRadius: "4px",
                        background: "var(--surface)",
                        color: "var(--ink)",
                        fontSize: "9px",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid var(--rule)",
                      borderRadius: "4px",
                      fontSize: "8.5px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "6px 14px",
                      background: "var(--ink)",
                      color: "var(--canvas)",
                      borderRadius: "4px",
                      fontSize: "8.5px",
                      fontWeight: 600,
                    }}
                  >
                    Save profile
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-setting">
                <span>{userName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{userName}</b>
                  <small>{userEmail}</small>
                </div>
                <button type="button" onClick={() => setIsEditingProfile(true)}>
                  Edit profile
                </button>
              </div>
            )}
          </section>

          <section id="appearance">
            <span className="date-label">APPEARANCE</span>
            <h2>Reading atmosphere</h2>
            <div className="setting-row">
              <div>
                <b>Dark theme</b>
                <small>Use the warm espresso and ember theme across your vault.</small>
              </div>
              <button
                className={`toggle ${theme === "dark" ? "on" : ""}`}
                onClick={onTheme}
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark theme"
                type="button"
              >
                <i />
              </button>
            </div>
          </section>

          <section id="capture">
            <span className="date-label">CAPTURE</span>
            <h2>Saving defaults</h2>
            <div className="setting-row">
              <div>
                <b>Fetch metadata automatically</b>
                <small>Find titles, descriptions and artwork from pasted links.</small>
              </div>
              <button
                className={`toggle ${metadata ? "on" : ""}`}
                onClick={() => {
                  const next = !metadata;
                  setMetadata(next);
                  onToast?.(next ? "Metadata auto-fetch enabled" : "Metadata auto-fetch disabled");
                }}
                role="switch"
                aria-checked={metadata}
                aria-label="Toggle automatic metadata fetching"
                type="button"
              >
                <i />
              </button>
            </div>

            <div className="setting-row">
              <div>
                <b>Default status</b>
                <small>New resources enter your exploration queue.</small>
              </div>
              <button
                className="select-button"
                type="button"
                onClick={handleCycleDefaultStatus}
                aria-label="Change default status"
              >
                {defaultStatus} <Icon name="chevron" size={13} />
              </button>
            </div>
          </section>

          <section id="notifications">
            <span className="date-label">NOTIFICATIONS</span>
            <h2>Gentle reminders</h2>
            <div className="setting-row">
              <div>
                <b>Weekly rediscovery</b>
                <small>A Sunday digest of saved ideas worth another look.</small>
              </div>
              <button
                className={`toggle ${digest ? "on" : ""}`}
                onClick={() => {
                  const next = !digest;
                  setDigest(next);
                  onToast?.(next ? "Weekly digest enabled" : "Weekly digest disabled");
                }}
                role="switch"
                aria-checked={digest}
                aria-label="Toggle weekly rediscovery digest"
                type="button"
              >
                <i />
              </button>
            </div>
          </section>

          <section id="data">
            <span className="date-label">DATA & PRIVACY</span>
            <h2>Your archive</h2>
            <div className="setting-row">
              <div>
                <b>Export your vault</b>
                <small>Download your resources, notes and collections as JSON.</small>
              </div>
              <button
                className="outline-button"
                onClick={() => {
                  onExportData?.();
                  onToast?.("Vault exported to JSON backup");
                }}
                type="button"
              >
                Export data
              </button>
            </div>

            <div className="danger-row">
              <div>
                <b>Delete all data</b>
                <small>Permanently remove every resource and collection.</small>
              </div>
              {confirming ? (
                <div className="confirm-actions">
                  <button type="button" onClick={() => setConfirming(false)}>
                    Keep vault
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false);
                      onClearData?.();
                      onToast?.("Vault cleared");
                    }}
                  >
                    Confirm delete
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)}>
                  Delete vault
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
