"use client";

import React, { useState } from "react";
import { Icon } from "@/components/shared/icon";

interface SettingsViewProps {
  theme: "light" | "dark";
  onTheme: () => void;
  onExportData?: () => void;
  onClearData?: () => void;
}

export function SettingsView({
  theme,
  onTheme,
  onExportData,
  onClearData,
}: SettingsViewProps) {
  const [digest, setDigest] = useState(true);
  const [metadata, setMetadata] = useState(true);
  const [confirming, setConfirming] = useState(false);

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
            <div className="profile-setting">
              <span>AL</span>
              <div>
                <b>Alex Lin</b>
                <small>alex@devvault.app</small>
              </div>
              <button>Edit profile</button>
            </div>
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
                onClick={() => setMetadata(!metadata)}
                role="switch"
                aria-checked={metadata}
                aria-label="Toggle automatic metadata fetching"
              >
                <i />
              </button>
            </div>

            <div className="setting-row">
              <div>
                <b>Default status</b>
                <small>New resources enter your exploration queue.</small>
              </div>
              <button className="select-button">
                To explore <Icon name="chevron" size={13} />
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
                onClick={() => setDigest(!digest)}
                role="switch"
                aria-checked={digest}
                aria-label="Toggle weekly rediscovery digest"
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
                onClick={onExportData}
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
                  <button onClick={() => setConfirming(false)}>Keep vault</button>
                  <button
                    onClick={() => {
                      setConfirming(false);
                      onClearData?.();
                    }}
                  >
                    Confirm delete
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)}>Delete vault</button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
