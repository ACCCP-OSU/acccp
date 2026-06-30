"use client";

import { useEffect, useState } from "react";
import { getMockRoles, addMockRole, clearMockAuth, isMockAuthEnabled } from "../../auth/mockAuth";

const SCARLET = "#BB0000";

const metrics = [
  { label: "Total users", value: 1 },
  { label: "Total jobs", value: 0 },
  { label: "Queued", value: 0 },
  { label: "Processing", value: 0 },
  { label: "Completed", value: 0 },
  { label: "Failed", value: 0 },
  { label: "Expired", value: 0 },
  { label: "Processed in last 24h", value: 0 },
];

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("admin");
  const mockEnabled = isMockAuthEnabled();

  useEffect(() => {
    if (!mockEnabled) {
      setAuthenticated(true);
      setInitialized(true);
      return;
    }

    setAuthenticated(getMockRoles().includes("dashboardadmin"));
    setInitialized(true);
  }, [mockEnabled]);

  const handleSimulateLogin = () => {
    addMockRole("dashboardadmin");
    setAuthenticated(true);
  };

  const handleSignOut = () => {
    clearMockAuth();
    setAuthenticated(false);
  };

  if (!initialized) {
    return null;
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#f5f5f5", color: "#111" }}>
        <div style={{ maxWidth: 560, width: "100%", background: "white", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.08)", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Simulated SAML SSO</div>
          <p style={{ margin: "0 0 24px", color: "#555", lineHeight: 1.6 }}>
            This admin route is protected by a simulated SAML sign-on flow. Click the button below to mock authentication for the admin portal.
          </p>
          <button
            onClick={handleSimulateLogin}
            style={{ background: "#0060df", color: "white", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Simulate SAML login
          </button>
          <div style={{ marginTop: 18, fontSize: 13, color: "#777" }}>
            The mock auth state is stored locally in your browser.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f5f5f5" }}>

      {/* Sidebar */}
      <div style={{ width: 200, background: SCARLET, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px 10px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>ACCCP</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Admin Portal</div>
        </div>

        <div style={{ flex: 1, padding: "8px 0" }}>
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "admin", label: "Admin Metrics" },
          ].map(item => (
            <div
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                padding: "9px 16px",
                cursor: "pointer",
                background: activeTab === item.key ? "rgba(255,255,255,0.18)" : "transparent",
                borderLeft: activeTab === item.key ? "3px solid white" : "3px solid transparent",
                transition: "background 0.1s",
                color: "white",
                fontSize: 13,
                fontWeight: activeTab === item.key ? 600 : 400,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ padding: 12 }}>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.15)",
              border: "0.5px solid rgba(255,255,255,0.3)",
              color: "white",
              borderRadius: 7,
              padding: "8px 0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{
          padding: "14px 24px",
          background: "white",
          borderBottom: "0.5px solid #e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 16 }}>
            {['Dashboard', 'Admin'].map(tab => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: activeTab === tab.toLowerCase() ? SCARLET : "#555",
                  cursor: "pointer",
                  borderBottom: activeTab === tab.toLowerCase() ? `2px solid ${SCARLET}` : "2px solid transparent",
                  paddingBottom: 2,
                  transition: "color 0.1s",
                }}
              >
                {tab}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleSignOut}
              style={{
                background: "white",
                border: "0.5px solid #ccc",
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* Header card */}
          <div style={{
            background: "white",
            border: "0.5px solid #e5e5e5",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin Metrics (Read-Only)</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              Operational overview for pilot monitoring. This dashboard does not expose user file contents.
            </div>
          </div>

          {/* Metrics table */}
          <div style={{
            background: "white",
            border: "0.5px solid #e5e5e5",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  alignItems: "center",
                  padding: "13px 20px",
                  borderBottom: i < metrics.length - 1 ? "0.5px solid #eee" : "none",
                  background: i % 2 === 0 ? "white" : "#fafafa",
                }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                <span style={{
                  fontSize: 13,
                  color: m.value > 0 ? SCARLET : "#999",
                  fontWeight: m.value > 0 ? 600 : 400,
                  textAlign: "right",
                }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Refresh hint */}
          <div style={{ marginTop: 12, fontSize: 11, color: "#aaa", textAlign: "right" }}>
            Metrics are read-only. Refresh the page to get the latest data.
          </div>

        </div>
      </div>
    </div>
  );
}
