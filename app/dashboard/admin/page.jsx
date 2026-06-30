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
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 text-zinc-900">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="mb-4 text-3xl font-bold">Simulated SAML SSO</div>
          <p className="mb-6 leading-7 text-zinc-600">
            This admin route is protected by a simulated SAML sign-on flow. Click the button below to mock authentication for the admin portal.
          </p>
          <button
            onClick={handleSimulateLogin}
            className="rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-semibold text-white"
          >
            Simulate SAML login
          </button>
          <div className="mt-4 text-[13px] text-zinc-500">
            The mock auth state is stored locally in your browser.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-100 text-[13px] text-zinc-800">
      {/* Sidebar */}
      <div className="flex w-[200px] shrink-0 flex-col bg-[#BB0000] text-white">
        <div className="px-4 py-4">
          <div className="text-[13px] font-bold tracking-[0.01em]">ACCCP</div>
          <div className="mt-1 text-[11px] text-white/60">Admin Portal</div>
        </div>

        <div className="flex-1 py-2">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "admin", label: "Admin Metrics" },
          ].map(item => (
            <div
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`cursor-pointer border-l-2 px-4 py-2.5 text-[13px] transition-colors ${activeTab === item.key ? "border-white bg-white/15 font-semibold" : "border-transparent bg-transparent font-normal"}`}
            >
              {item.label}
            </div>
          ))}
        </div>

        <div className="p-3">
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-[12px] font-semibold text-white"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5">
          <div className="flex gap-4">
            {['Dashboard', 'Admin'].map(tab => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`cursor-pointer border-b-2 pb-1 text-[13px] transition-colors ${activeTab === tab.toLowerCase() ? "border-[#BB0000] font-medium text-[#BB0000]" : "border-transparent text-zinc-600"}`}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-[12px] font-medium text-zinc-700"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header card */}
          <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-1 text-xl font-bold text-zinc-900">Admin Metrics (Read-Only)</div>
            <div className="text-[12px] text-zinc-500">
              Operational overview for pilot monitoring. This dashboard does not expose user file contents.
            </div>
          </div>

          {/* Metrics table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {metrics.map((m, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_120px] items-center px-5 py-3.5 ${i < metrics.length - 1 ? "border-b border-zinc-200" : ""} ${i % 2 === 0 ? "bg-white" : "bg-zinc-50"}`}
              >
                <span className="text-[13px] font-medium text-zinc-700">{m.label}</span>
                <span className={`text-right text-[13px] ${m.value > 0 ? "font-semibold text-[#BB0000]" : "font-normal text-zinc-500"}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Refresh hint */}
          <div className="mt-3 text-right text-[11px] text-zinc-400">
            Metrics are read-only. Refresh the page to get the latest data.
          </div>
        </div>
      </div>
    </div>
  );
}
