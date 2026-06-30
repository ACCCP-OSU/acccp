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
    ready: { label: "Ready", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-600" },
    processing: { label: "Processing", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-600" },
    error: { label: "Error", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-600" },
    idle: { label: "Queued", bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200", dot: "bg-zinc-500" },
  };
  const s = map[status] || map.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
      {status === "processing"
        ? <span className={`inline-block h-2 w-2 rounded-full border-2 ${s.border}`} style={{ borderTopColor: s.dot.replace("bg-", "") }} />
        : <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  );
}

function FileRow({ file, expanded, onToggle, onDownload, onCopy, onPublish }) {
  return (
    <div className="border-b border-zinc-200">
      <div
        onClick={() => file.status !== "idle" && onToggle()}
        className={`grid grid-cols-[1fr_110px_80px_90px_28px] items-center gap-2 px-5 py-2.5 ${expanded ? "bg-zinc-50" : "bg-white"} ${file.status !== "idle" ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${file.status === "error" ? "bg-rose-50" : file.status === "idle" ? "bg-zinc-100" : "bg-rose-100"}`}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={file.status === "error" ? "#A32D2D" : file.status === "idle" ? "#999" : SCARLET} strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-800">{file.name}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{file.pages ? `${file.pages} pages` : "Could not read"}</div>
          </div>
        </div>
        <div><StatusPill status={file.status} /></div>
        <div className="text-xs text-zinc-600">{file.size}</div>
        <div className="text-xs text-zinc-600">{file.added}</div>
        <div className={`text-lg text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""} ${file.status === "idle" ? "invisible" : "visible"}`}>
          ▾
        </div>
      </div>

      {expanded && file.status === "ready" && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="mb-3 flex gap-2">
            <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-md bg-[#BB0000] px-3.5 py-2 text-[12px] font-medium text-white">
              ↓ Download HTML
            </button>
            <button onClick={onCopy} className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-[12px] text-zinc-700">
              Copy HTML
            </button>
            <button onClick={onPublish} className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-[12px] text-zinc-700">
              Publish to Canvas
            </button>
          </div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">Output preview</div>
          <div className="relative max-h-[130px] overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 p-3 font-mono text-[11px] leading-7 text-zinc-600">
            <pre className="m-0 whitespace-pre-wrap">{file.html}</pre>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-zinc-100 to-transparent" />
          </div>
        </div>
      )}

      {expanded && file.status === "error" && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex flex-col gap-2">
            {file.warnings.map((w, i) => (
              <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                <div className="text-[12px] font-semibold text-rose-700">{w.title}</div>
                <div className="mt-1 text-[11px] leading-5 text-rose-800">{w.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-zinc-600">
            Partial output was generated.
            <button className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px]">Download anyway</button>
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
    <div className="flex h-screen bg-zinc-100 text-[13px] text-zinc-800">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } button:focus-visible { outline: 2px solid #BB0000; outline-offset: 2px; }`}</style>

      {/* Sidebar */}
      <div className="flex w-[200px] shrink-0 flex-col bg-[#BB0000] text-white">
        <div className="px-4 py-4">
          <div className="text-[13px] font-bold tracking-[0.01em]">Sessions</div>
          <div className="mt-1 text-[11px] text-white/60">Conversion history</div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={`cursor-pointer border-l-2 px-4 py-2.5 transition-colors ${activeSession === s.id ? "border-white bg-white/15" : "border-transparent bg-transparent"}`}
            >
              <div className="text-[13px] font-semibold">{s.name}</div>
              <div className="mt-1 text-[11px] text-white/60">{s.count} files · {s.date}</div>
            </div>
          ))}
        </div>

        <div className="p-3">
          <button
            onClick={handleNewSession}
            className="w-full rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-[12px] font-semibold text-white"
          >
            + New session
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Convert documents</div>
            {activeSessionUuid ? (
              <div className="mt-1.5 text-[12px] text-zinc-600">
                Session UUID: <span className="font-mono text-[#BB0000]">{activeSessionUuid}</span>
              </div>
            ) : null}
          </div>
          <span className="rounded-full border border-[#E8B4B4] bg-[#F5E6E6] px-2.5 py-1 text-[11px] font-semibold text-[#BB0000]">
            {files.length} files queued
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            className={`mb-5 cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? "border-[#BB0000] bg-[#FFF5F5]" : "border-zinc-300 bg-zinc-50"}`}
          >
            <input ref={fileInputRef} type="file" accept=".docx" multiple className="hidden" onChange={e => {
              const newFiles = Array.from(e.target.files).map((f, i) => ({
                id: files.length + i, name: f.name, pages: null,
                size: `${Math.round(f.size / 1024)} KB`, added: "Just now",
                status: "idle", html: "", warnings: [],
              }));
              setFiles(prev => [...prev, ...newFiles]);
              showToast(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} added`);
            }} />
            <div className="text-[13px] text-zinc-600">
              Drop .docx files here, or{" "}
              <span className="font-semibold text-[#BB0000] underline">browse to upload</span>
            </div>
          </div>

          {/* File table */}
          {files.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1fr_110px_80px_90px_28px] gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-2">
                {['FILE', 'STATUS', 'SIZE', 'ADDED', ''].map((h, i) => (
                  <span key={i} className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-500">{h}</span>
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
        <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-3">
          <div className="text-[12px] text-zinc-600">
            {files.length} files · {totalSize} KB total
          </div>
          <button
            onClick={handleConvertAll}
            disabled={converting}
            className={`rounded-lg px-5 py-2 text-[13px] font-semibold text-white transition-colors ${converting ? "cursor-not-allowed bg-zinc-500" : "bg-[#BB0000]"}`}
          >
            {converting ? "Converting..." : "Convert all"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#1f2937] px-5 py-3 text-[13px] font-medium text-white shadow-lg" style={{ animation: "fadeIn 0.2s ease" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
