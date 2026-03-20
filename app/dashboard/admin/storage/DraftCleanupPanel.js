"use client";

// app/dashboard/admin/storage/DraftCleanupPanel.js
import { useMemo, useState } from "react";

const GOLD = "#c8a44d";

const card =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-hidden";

const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition disabled:opacity-60 disabled:cursor-not-allowed";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold " +
  "bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed";

const input =
  "h-10 w-28 rounded-xl border border-slate-300 px-3 text-[13px] text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export default function DraftCleanupPanel() {
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const daysSafe = useMemo(() => {
    const n = Number(days);
    if (!Number.isFinite(n)) return 7;
    return Math.min(90, Math.max(1, Math.floor(n)));
  }, [days]);

  function clearMessages() {
    setErr("");
    setSuccess("");
  }

  async function run(dryRun) {
    clearMessages();
    setResult(null);
    setBusy(true);

    try {
      const res = await fetch("/api/admin/cleanup-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: daysSafe, dryRun }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setResult(data);

      // ✅ Success banner only for destructive delete run
      if (!dryRun && data?.mode === "delete") {
        const attempted = data?.deletions?.attempted ?? 0;
        const deleted = data?.deletions?.deleted ?? 0;
        const candidates = data?.candidatesFound ?? 0;

        setSuccess(
          `Cleanup complete — deleted ${deleted}/${attempted} objects (candidates: ${candidates}).`
        );
      }
    } catch (e) {
      setErr(e?.message || "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={card}>
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-extrabold tracking-wide" style={{ color: GOLD }}>
              Draft Storage Cleanup
            </div>
            <div className="mt-1 text-[12px] text-white/80">
              Deletes unreferenced objects in <span className="font-semibold">drafts/</span> older than N days.
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-700">
          <div className="font-semibold text-[#0a2230]">Safety rules</div>
          <div className="mt-1 text-slate-600">
            Will NOT delete anything referenced by any listing (<code>heroImageUrl</code>, <code>brokerHeroImageUrl</code>,{" "}
            <code>imageUrls</code>) or any user broker logo.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[13px] font-semibold text-[#0a2230]">Older than</div>
          <input
            className={input}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            inputMode="numeric"
          />
          <div className="text-[13px] text-slate-600">days</div>

          <div className="flex-1" />

          <button className={btnPrimary} disabled={busy} onClick={() => run(true)}>
            {busy ? "Working…" : "Dry run"}
          </button>

          <button
            className={btnDanger}
            disabled={busy}
            onClick={() => {
              clearMessages();
              const ok = window.confirm("Delete unreferenced draft objects now? This cannot be undone.");
              if (!ok) return;
              run(false);
            }}
          >
            {busy ? "Working…" : "Delete now"}
          </button>
        </div>

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
            {success}
          </div>
        ) : null}

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {err}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700">
            <div className="font-semibold text-[#0a2230]">Result</div>
            <div className="mt-2 space-y-1">
              <div>
                Mode: <span className="font-semibold">{result.mode}</span>
              </div>
              <div>
                Cutoff: <span className="font-semibold">{result.cutoffDays}</span> days
              </div>
              <div>
                Scanned: <span className="font-semibold">{result.scanned}</span> objects
              </div>
              <div>
                Candidates: <span className="font-semibold">{result.candidatesFound}</span>
              </div>

              {result.deletions ? (
                <div>
                  Deleted:{" "}
                  <span className="font-semibold">
                    {result.deletions.deleted}/{result.deletions.attempted}
                  </span>
                </div>
              ) : null}

              {result.limited ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  Hit safety cap. Run again to continue.
                </div>
              ) : null}

              {result.note ? <div className="mt-2 text-slate-600">{result.note}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}