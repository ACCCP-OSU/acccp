"use client"

import { useState, useRef } from "react";

const SCARLET = "#BB0000";

const initialSessions = [
  { id: 1, name: "Q2 Reports", count: 4, date: "Jun 8", active: true },
  { id: 2, name: "Contract Templates", count: 2, date: "Jun 5", active: false },
  { id: 3, name: "Policy Docs", count: 7, date: "May 29", active: false },
  { id: 4, name: "Onboarding Pack", count: 3, date: "May 20", active: false },
];

const initialFiles = [
  {
    id: 0,
    name: "Q2_financial_summary.docx",
    pages: 12,
    size: "400 KB",
    added: "Just now",
    status: "ready",
    html: `<h1>Q2 Financial Summary — FY2025</h1>\n<p>Total revenue for Q2 was <strong>$4.2M</strong>, representing a 12% increase year-over-year.</p>\n<table>\n  <thead><tr><th>Category</th><th>Q1</th><th>Q2</th></tr></thead>\n  <tbody><tr><td>Revenue</td><td>$3.7M</td><td>$4.2M</td></tr></tbody>\n</table>`,
    warnings: [],
  },
  {
    id: 1,
    name: "board_report_june.docx",
    pages: 8,
    size: "680 KB",
    added: "2 min ago",
    status: "ready",
    html: `<h1>Board Report</h1>\n<h2>Executive Summary</h2>\n<p>This report covers operational performance for the period ending June 2025.</p>`,
    warnings: [],
  },
  {
    id: 2,
    name: "expense_breakdown.docx",
    pages: 5,
    size: "215 KB",
    added: "2 min ago",
    status: "idle",
    html: "",
    warnings: [],
  },
  {
    id: 3,
    name: "audit_notes_draft.docx",
    pages: null,
    size: "520 KB",
    added: "5 min ago",
    status: "error",
    html: "",
    warnings: [
      { title: "Embedded OLE object unsupported", desc: "Page 4 contains an embedded Excel chart that could not be converted and has been skipped." },
      { title: "Missing linked image", desc: 'Image on page 7 references an external path "C:\\Users\\jsmith\\Pictures\\logo.png" that could not be resolved.' },
      { title: "Custom font not embedded", desc: '"Ohio Serif Display" is used but not embedded. Fallback font applied in output.' },
    ],
  },
];

function StatusPill({ status }) {
  const map = {
    ready: { label: "Ready", bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97", dot: "#5A9A1A" },
    processing: { label: "Processing", bg: "#FAEEDA", color: "#854F0B", border: "#FAC775", dot: "#E07B0A" },
    error: { label: "Error", bg: "#FCEBEB", color: "#A32D2D", border: "#F7C1C1", dot: "#CC3333" },
    idle: { label: "Queued", bg: "#F0F0F0", color: "#555", border: "#CCC", dot: "#999" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {status === "processing"
        ? <span style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${s.border}`, borderTopColor: s.dot, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
        : <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />}
      {s.label}
    </span>
  );
}

function FileRow({ file, expanded, onToggle, onDownload, onCopy, onPublish }) {
  return (
    <div style={{ borderBottom: "0.5px solid #e5e5e5" }}>
      <div
        onClick={() => file.status !== "idle" && onToggle()}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 110px 80px 90px 28px",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          cursor: file.status !== "idle" ? "pointer" : "default",
          background: expanded ? "#fafafa" : "white",
          transition: "background 0.1s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: file.status === "error" ? "#FCEBEB" : file.status === "idle" ? "#f0f0f0" : "#F5E6E6",
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={file.status === "error" ? "#A32D2D" : file.status === "idle" ? "#999" : SCARLET} strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{file.pages ? `${file.pages} pages` : "Could not read"}</div>
          </div>
        </div>
        <div><StatusPill status={file.status} /></div>
        <div style={{ fontSize: 12, color: "#777" }}>{file.size}</div>
        <div style={{ fontSize: 12, color: "#777" }}>{file.added}</div>
        <div style={{ color: "#aaa", fontSize: 14, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", visibility: file.status === "idle" ? "hidden" : "visible" }}>
          ▾
        </div>
      </div>

      {expanded && file.status === "ready" && (
        <div style={{ borderTop: "0.5px solid #eee", padding: "14px 20px 18px", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={onDownload} style={{ background: SCARLET, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              ↓ Download HTML
            </button>
            <button onClick={onCopy} style={{ background: "white", border: "0.5px solid #ccc", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
              Copy HTML
            </button>
            <button onClick={onPublish} style={{ background: "white", border: "0.5px solid #ccc", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
              Publish to Canvas
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Output preview</div>
          <div style={{ background: "#f0f0f0", border: "0.5px solid #ddd", borderRadius: 7, padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: "#444", lineHeight: 1.7, maxHeight: 130, overflow: "hidden", position: "relative" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{file.html}</pre>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36, background: "linear-gradient(transparent, #f0f0f0)", pointerEvents: "none" }} />
          </div>
        </div>
      )}

      {expanded && file.status === "error" && (
        <div style={{ borderTop: "0.5px solid #eee", padding: "14px 20px 18px", background: "#fafafa" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {file.warnings.map((w, i) => (
              <div key={i} style={{ background: "#FCEBEB", border: "0.5px solid #F7C1C1", borderRadius: 7, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#A32D2D" }}>{w.title}</div>
                <div style={{ fontSize: 11, color: "#791F1F", marginTop: 3, lineHeight: 1.5 }}>{w.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 8 }}>
            Partial output was generated.
            <button style={{ background: "white", border: "0.5px solid #ccc", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Download anyway</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App({ sessionId }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [files, setFiles] = useState(initialFiles);
  const [expanded, setExpanded] = useState({ 0: true });
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [activeSession, setActiveSession] = useState(1);
  const [activeSessionUuid] = useState(sessionId ? String(sessionId) : null);
  const fileInputRef = useRef();

  const showToast = (msg, color = SCARLET) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const handleConvertAll = () => {
    if (converting) return;
    const idleOrReady = files.filter(f => f.status === "idle" || f.status === "ready");
    if (!idleOrReady.length) return;
    setConverting(true);
    setFiles(f => f.map(file => file.status === "idle" ? { ...file, status: "processing" } : file));
    setTimeout(() => {
      setFiles(f => f.map(file =>
        file.status === "processing"
          ? { ...file, status: "ready", pages: file.pages || 5, html: `<h1>${file.name.replace(".docx","")}</h1>\n<p>Converted successfully. Content is accessible and Canvas-ready.</p>` }
          : file
      ));
      setConverting(false);
      showToast("All files converted successfully");
    }, 3000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".docx"));
    if (!dropped.length) { showToast("Only .docx files are supported", "#A32D2D"); return; }
    const newFiles = dropped.map((f, i) => ({
      id: files.length + i,
      name: f.name,
      pages: null,
      size: `${Math.round(f.size / 1024)} KB`,
      added: "Just now",
      status: "idle",
      html: "",
      warnings: [],
    }));
    setFiles(prev => [...prev, ...newFiles]);
    showToast(`${dropped.length} file${dropped.length > 1 ? "s" : ""} added`);
  };

  const handleNewSession = () => {
    const id = sessions.length + 1;
    const name = `Session ${id}`;
    setSessions(prev => [...prev.map(s => ({ ...s, active: false })), { id, name, count: 0, date: "Today", active: true }]);
    setActiveSession(id);
    setFiles([]);
    setExpanded({});
    showToast("New session created");
  };

  const totalSize = files.reduce((acc, f) => {
    const kb = parseInt(f.size);
    return acc + (isNaN(kb) ? 0 : kb);
  }, 0);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f5f5f5" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } button:focus { outline: 2px solid #BB0000; outline-offset: 2px; }`}</style>

      {/* Sidebar */}
      <div style={{ width: 200, background: SCARLET, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px 10px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>Sessions</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Conversion history</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              style={{
                padding: "9px 16px",
                cursor: "pointer",
                background: activeSession === s.id ? "rgba(255,255,255,0.18)" : "transparent",
                borderLeft: activeSession === s.id ? "3px solid white" : "3px solid transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{s.count} files · {s.date}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 12 }}>
          <button
            onClick={handleNewSession}
            style={{ width: "100%", background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            + New session
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px 14px", background: "white", borderBottom: "0.5px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Convert documents</div>
            {activeSessionUuid ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
                Session UUID: <span style={{ fontFamily: "monospace", color: SCARLET }}>{activeSessionUuid}</span>
              </div>
            ) : null}
          </div>
          <span style={{ background: "#F5E6E6", color: SCARLET, border: `0.5px solid #E8B4B4`, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            {files.length} files queued
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: `1.5px dashed ${dragging ? SCARLET : "#ccc"}`,
              borderRadius: 10,
              padding: "22px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "#FFF5F5" : "#fafafa",
              marginBottom: 20,
              transition: "all 0.15s",
            }}
          >
            <input ref={fileInputRef} type="file" accept=".docx" multiple style={{ display: "none" }} onChange={e => {
              const newFiles = Array.from(e.target.files).map((f, i) => ({
                id: files.length + i, name: f.name, pages: null,
                size: `${Math.round(f.size / 1024)} KB`, added: "Just now",
                status: "idle", html: "", warnings: [],
              }));
              setFiles(prev => [...prev, ...newFiles]);
              showToast(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} added`);
            }} />
            <div style={{ fontSize: 13, color: "#666" }}>
              Drop .docx files here, or{" "}
              <span style={{ color: SCARLET, fontWeight: 600, textDecoration: "underline" }}>browse to upload</span>
            </div>
          </div>

          {/* File table */}
          {files.length > 0 && (
            <div style={{ background: "white", border: "0.5px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 90px 28px", gap: 8, padding: "8px 20px", borderBottom: "0.5px solid #eee", background: "#fafafa" }}>
                {["FILE", "STATUS", "SIZE", "ADDED", ""].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                ))}
              </div>
              {files.map(f => (
                <FileRow
                  key={f.id}
                  file={f}
                  expanded={!!expanded[f.id]}
                  onToggle={() => setExpanded(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                  onDownload={() => showToast(`Downloaded ${f.name.replace(".docx", ".html")}`)}
                  onCopy={() => { navigator.clipboard?.writeText(f.html); showToast("HTML copied to clipboard"); }}
                  onPublish={() => showToast(`Published to Canvas`, "#3B6D11")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", background: "white", borderTop: "0.5px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#777" }}>
            {files.length} files · {totalSize} KB total
          </div>
          <button
            onClick={handleConvertAll}
            disabled={converting}
            style={{
              background: converting ? "#999" : SCARLET,
              color: "white", border: "none", borderRadius: 7,
              padding: "8px 22px", fontSize: 13, fontWeight: 600,
              cursor: converting ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {converting ? "Converting..." : "Convert all"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "white", borderRadius: 8,
          padding: "10px 20px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 999,
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
